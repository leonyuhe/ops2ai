---
title: CUDA Graph：消除 Decode 阶段的 CPU 开销
description: 为什么小批量 decode 时 GPU 在等 CPU，CUDA Graph 如何把整个计算图录制回放
order: 9
---

> 一个反直觉的事实：decode 阶段小批量推理时，瓶颈有时不是 GPU，而是 CPU 来不及"发射"kernel。CUDA Graph 是解法。

## 问题：kernel 发射开销

GPU 上每个算子（matmul、layernorm、激活……）都由 CPU 逐条发射。每条发射有固定 CPU 开销（微秒级）。decode 一步包含几十上百个小 kernel，每个 kernel 在 GPU 上可能只跑几微秒——**发射速度跟不上执行速度**，GPU 经常在等 CPU 派活，利用率出现锯齿。

症状画像：小 batch、短 kernel、decode 阶段；nvidia-smi 显示 GPU-Util 不高但延迟下不来；Nsight Systems 时间线上 GPU 密集小气泡。

## 思想：录制一次，回放千次

CUDA Graph 把整个 kernel 序列**录制成一张静态图**，之后整图一次提交、GPU 连续执行：

- CPU 开销从"每 kernel 一次发射"降到"每步一次图回放"
- GPU 端 kernel 间隙也被压缩（图内启动更快）

类比：从"每道菜单独下单"改成"套餐一键下单"。

## 约束与代价

- **shape 必须固定**：图是静态的，输入尺寸变了就要换图。推理引擎的解法：按几个典型 batch size 各录一张图（padding 到分档尺寸），decode 按档回放。
- **内存地址固定**：图捕获的是指针，KV Cache 等要用静态缓冲区设计。
- 控制流受限：图内不能有数据依赖的分支。
- 调试更难：图内错误定位不如逐 kernel 直观。

## 在推理引擎中的实际形态

vLLM 等引擎的策略：**prefill 走常规 eager 模式（shape 多变），decode 走 CUDA Graph（shape 规整可预测）**——各取所长。这就是为什么看引擎启动日志会有"Capturing CUDA graphs"这一步，以及为什么它发生在启动预热阶段。

## 运维速记

- 启动日志里 CUDA Graph 捕获失败/被禁用 → decode 吞吐直接打折，优先排查（常见于显存不足或算子不兼容）。
- 升级引擎版本后性能回退，查 CUDA Graph 分档配置是否变化。
- 自己写推理代码时：先把 shape 固定化（分档 padding），再谈 Graph 捕获。
