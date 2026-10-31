---
title: PyTorch 性能分析与调优实战
description: PyTorch Profiler、Nsight 的配合使用，以及训练慢时的系统排查法
order: 7
---

> 性能分析的第一纪律：不测量不优化。本文给你一套"从感觉到数据"的完整流程。

## 工具分层：什么时候用什么

| 工具 | 粒度 | 回答的问题 |
| --- | --- | --- |
| nvidia-smi / DCGM | 卡级 | 卡忙不忙、显存满不满 |
| PyTorch Profiler | 算子级 | 时间花在哪些算子、CPU 还是 GPU 瓶颈 |
| Nsight Systems | 时间线级 | CPU/GPU 的时空占用、气泡在哪 |
| Nsight Compute | kernel 级 | 单个 kernel 内部的瓶颈（访存/算力/占用率） |

排查顺序永远是自上而下：先看卡级水位，再用 Profiler 定位算子，只有需要优化 kernel 本体才下 Nsight Compute。

## PyTorch Profiler 上手

```python
from torch.profiler import profile, ProfilerActivity

with profile(activities=[ProfilerActivity.CPU, ProfilerActivity.CUDA]) as prof:
    train_step()

print(prof.key_averages().table(sort_by="cuda_time_total", row_limit=15))
prof.export_chrome_trace("trace.json")  # 用 chrome://tracing 或 Perfetto 看时间线
```

三个读数姿势：

1. **算子耗时榜**（key_averages 表格）：看哪个算子吃时间最多。Top 算子若是你没想到的（如某个 reshape、copy），往往就是低级错误的入口。
2. **CPU vs CUDA 时间比**：CPU 时间显著大于 CUDA 时间 → 主机端瓶颈（数据加载、Python 开销）。
3. **Chrome trace 时间线**：GPU 空白段 = 气泡。气泡在 step 之间 → 数据加载慢；气泡在层间 → CPU 启动开销大。

## 五个最常见的性能病根 ★

按出现频率排序，排查时依次排除：

1. **数据加载瓶颈**：DataLoader 的 `num_workers=0` 或太小、`pin_memory` 没开——GPU 等数据。
2. **同步点误伤**：训练循环里 `.item()`、`print(tensor)` 都会强制 CPU-GPU 同步，流水线当场折断。
3. **没用混合精度**：`torch.autocast` 一开，Tensor Core 才上场——FP32 训练等于把新卡当老卡用。
4. **shape 不稳定**：动态 shape 导致 `torch.compile` 反复重编译、显存碎片。
5. **显存碎片**：反复分配释放大小不一的张量 → `torch.cuda.empty_cache()` 救急，`expandable_segments` 配置治本。

## torch.compile：一行换 20-50% 的可能性

`model = torch.compile(model)` 把 Python 模型编译成融合 kernel：减少启动开销、融合逐元素算子、自动选优。纪律：

- shape 固定的训练/推理循环收益最大
- 首次编译有预热成本，短任务不划算
- 报错或变慢时回退无成本（删掉即可），值得常备一试

## 排查剧本：训练突然变慢

1. `nvidia-smi`：GPU-Util 低 + 显存正常 → CPU 侧瓶颈（查 DataLoader）。
2. Profiler 表格：找异常耗时算子。
3. Chrome trace：看气泡位置（step 间 = 数据；层间 = CPU 开销；通信段 = 分布式问题）。
4. 对比基线：和上周的 trace 比，先回答"什么变了"。
