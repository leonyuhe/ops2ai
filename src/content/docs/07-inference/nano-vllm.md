---
title: nano-vllm 源码导读：1200 行看懂推理引擎
description: 用最小实现理解推理引擎的四层架构——接口、引擎、调度、执行
order: 13
---

> vLLM 几十万行代码劝退很多人；nano-vllm 是一个约 1200 行的极简实现，保留了全部核心机制。读源码的路线本文帮你画好。

## 为什么是 nano-vllm

大项目的复杂度 90% 来自工程细节（兼容、配置、边角特性），核心机制反而被淹没。nano-vllm 砍掉这一切，只保留：连续批处理、PagedAttention 块管理、前缀缓存、张量并行、CUDA Graph——五大核心一个不少。读完它再读 vLLM，等于先看了地图再进城。

## 四层架构总览 ★

```
接口层  LLM / LLMEngine      —— 用户 API、请求接入
引擎层  Scheduler + BlockManager —— 调度与显存分配
模型层  Model (RMSNorm/RoPE/Attention/并行Linear) —— 前向计算
执行层  ModelRunner          —— 张量准备、CUDA Graph、采样
```

一次 `generate()` 的完整数据流：请求进队列 → Scheduler 按 token 预算编组 → ModelRunner 把序列拼成张量 → 模型前向 → 采样出 token → 后处理更新状态 → 下一轮迭代。

## 阅读路线（按依赖顺序）

### 第一站：配置与入口

Config / SamplingParams 定义了所有可调参数；LLM 类是对 LLMEngine 的用户友好封装。先看懂参数面，知道旋钮都在哪。

### 第二站：Sequence 与 BlockManager

- Sequence 是请求的状态机（waiting → running → finished），携带 token 序列与块表。
- BlockManager 是 PagedAttention 的实现：块分配/释放/引用计数、基于哈希的前缀缓存命中。重点看 allocate 时的容量判断与 COW 逻辑。

### 第三站：Scheduler

waiting/running 双队列、prefill/decode 分离调度、token 预算、抢占（preempt）与恢复。这是连续批处理的心脏，也是面试"设计调度器"题的标准答案骨架。

### 第四站：模型层

RMSNorm、RoPE、SwiGLU、GQA 的最小实现；并行 Linear 族（列切/行切）展示 TP 如何落到代码；Attention 的 prefill/decode 两条路径（不同 kernel 后端）。

### 第五站：ModelRunner 与 CUDA Graph

序列张量化、KV Cache 显存预分配与切块、按 batch 档位捕获 CUDA Graph、回放执行。看这一段时对照本站的 CUDA Graph 文章，理解为什么 decode 走图、prefill 不走。

## 读源码的方法论

- **带着问题读**：先问"新请求进来显存不够会怎样"，再去代码里找答案（抢占逻辑），比顺序读有效十倍。
- **画状态机**：Sequence 的状态迁移画在纸上，调度器逻辑立刻清晰。
- **对照运行**：起服务打日志，把一次请求的生命周期和代码路径对上。
- 读完 nano-vllm 再开 vLLM：同样的类名和概念，只是多了工程铠甲。

## 面试价值

"设计一个连续批处理推理引擎的调度器"是 NVIDIA/Together 等公司原题。答出 waiting/running 队列 + token 预算 + KV 块容量判断 + 抢占重算，就是满分框架——nano-vllm 的 Scheduler 把这四件事全部示范了一遍。
