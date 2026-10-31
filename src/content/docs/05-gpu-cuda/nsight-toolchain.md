---
title: Nsight 工具链实战：Systems 看全局，Compute 看内核
description: Nsight Systems 时间线分析与 Nsight Compute 内核分析的分工、流程与判读
order: 10
---

> Nsight 是 GPU 世界的"监控 + APM + 火焰图"。工具本身不难，难的是知道看哪。本文给判读框架。

## 分工：一张表

| | Nsight Systems | Nsight Compute |
| --- | --- | --- |
| 粒度 | 进程/线程/流的时间线 | 单个 kernel 内部 |
| 回答 | 时间花在哪、谁等谁、气泡在哪 | 这个 kernel 为什么慢 |
| 开销 | 低（可上生产采样） | 高（重放 kernel，离线用） |
| 类比 | APM 分布式追踪 | 单接口的火焰图 |

顺序铁律：先 Systems 找时间线问题，只有确定某个 kernel 是热点才上 Compute。

## Nsight Systems：时间线判读 ★

```bash
nsys profile -o report python train.py
nsys stats report.nsys-rep   # 或拖进 GUI 看时间线
```

时间线上五条泳道要会读：

1. **CUDA API 行（CPU 侧）**：每个 cudaLaunchKernel 的 CPU 耗时——过长说明发射瓶颈（想起 CUDA Graph）。
2. **GPU kernel 行**：kernel 的实际执行时段——看密度和空隙。
3. **内存拷贝行**：H2D/D2H 传输——是否与计算重叠，还是有串行等待。
4. **NCCL 行**：通信耗时占比——分布式训练的扩展瓶颈直接可见。
5. **OS 线程行**：DataLoader worker 活动——判断数据饥饿。

典型病征速查：

- GPU 行稀疏有空洞 + CPU API 行密集 → CPU 发射瓶颈 → CUDA Graph / torch.compile
- step 边界处规律性空白 → 数据加载慢
- NCCL 段占比 >20% → 通信瓶颈，查拓扑与带宽
- H2D 拷贝与 kernel 无重叠 → 没开 pin_memory / 异步拷贝

## Nsight Compute：kernel 级三板斧

```bash
ncu --set full --kernel-name regex:.*attention.* python infer.py
```

报告里先看三处：

1. **SOL（Speed of Light）**：算力利用率 vs 显存带宽利用率的对比条——哪边接近 100% 哪边是瓶颈，直接定方向。
2. **Occupancy**：寄存器/共享内存/块大小哪个限制了驻留 Warp 数。
3. **Memory Workload Analysis**：全局/共享内存流量、合并访问率、bank conflict 计数。

优化闭环：改代码 → 重测 → SOL 对比。每轮只改一个变量。

## 与 PyTorch Profiler 的分工

Profiler 找"哪个算子慢"（算子榜 + 轻量 trace），Nsight Systems 找"时间上谁等谁"（全系统时间线），Nsight Compute 找"kernel 内部为什么慢"（微架构指标）。三个问题三层工具，别越级使用——拿 Compute 扫全程序是浪费时间，拿 Profiler 猜 kernel 内部是盲人摸象。
