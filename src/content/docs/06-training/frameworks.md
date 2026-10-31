---
title: 训练框架实战：DeepSpeed 与 Megatron-LM
description: 两大主流训练框架的能力地图、配置逻辑与选型建议
order: 10
---

> 框架的价值在于把前面学的所有概念变成配置项。本文帮你建立"概念 → 配置"的映射，而不是逐个参数说明书。

## 两大框架的分工

### DeepSpeed：微软出品，ZeRO 的发源地

- 核心能力：ZeRO-1/2/3、ZeRO-Offload（CPU/NVMe 卸载）、混合精度、梯度累积、激活检查点——一份 JSON 配置驱动。
- 心智模型："在 PyTorch 训练循环外面包一层"，侵入性低，HF Trainer/Accelerate 都原生集成。
- 适合：单机到中等规模的微调、SFT、RLHF 训练，绝大多数团队的第一选择。

### Megatron-LM：NVIDIA 出品，大规模预训练重器

- 核心能力：TP/PP/SP/CP/EP 全家族并行 + 高度优化的 kernel（与 FlashAttention、cuDNN 深度集成）。
- 心智模型："从并行拓扑出发重新组织训练"，学习曲线陡，配置维度多。
- 适合：百卡以上预训练/继续训练，对 MFU（算力利用率）有极致要求的场景。

### 组合拳

真实世界常见 Megatron 管模型并行 + DeepSpeed 管 ZeRO（Megatron-DeepSpeed），或更新的 NeMo/Megatron-Core 统一栈。选型先看团队熟悉度，再看规模。

## 概念到配置的映射表 ★

| 你学过的概念 | DeepSpeed 配置 | Megatron 参数 |
| --- | --- | --- |
| ZeRO 分片 | `zero_optimization.stage: 1/2/3` | `--use-distributed-optimizer`（近似 ZeRO-1）|
| 激活重算 | `activation_checkpointing` | `--recompute-granularity full` |
| 梯度累积 | `gradient_accumulation_steps` | `--global-batch-size ÷ micro-batch ÷ DP` |
| 张量并行 | （需结合 Megatron） | `--tensor-model-parallel-size` |
| 流水线并行 | 自带 pipe 引擎 | `--pipeline-model-parallel-size` |
| BF16 | `bf16: enabled` | `--bf16` |

## 上手路径建议

1. 先用 HF Trainer + DeepSpeed ZeRO-2 微调一个 7B——一天内跑通，建立"分片训练"手感。
2. 再用 ZeRO-3/FSDP 对比显存差异，亲眼看 16P 账本被切分。
3. 最后读 Megatron 的并行参数组合，在 8 卡上跑 TP2×PP2×DP2 的最小三维组合。

## 运维关注点

- 框架版本与 NCCL/CUDA 的兼容矩阵：升级任何一方前跑最小回归。
- 训练 metrics 必须接监控：loss、梯度范数、吞吐（tokens/s/GPU）、MFU——MFU 是训练集群的"利用率"指标，30-50% 是正常区间，低于 30% 说明系统有瓶颈可挖。
- checkpoint 格式与框架绑定，迁移框架 = 迁移 checkpoint 格式，提前规划。
