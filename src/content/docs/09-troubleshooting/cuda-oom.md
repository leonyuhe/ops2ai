---
title: 案例库：CUDA OOM 排查全景
description: 训练 OOM 与推理 OOM 的分类排查法——从报错到根因的系统流程
order: 1
---

> CUDA out of memory 是 AI 系统的头号事故。但它不是单一故障，而是一族故障——分类才能快速定位。

## 先分类：OOM 的四种类型

### 类型一：真装不下（配置性 OOM）

启动或第一步就 OOM。训练侧对照显存账本（权重 6P + 梯度 2P + 优化器 8P + 激活）；推理侧算权重 + KV Cache 池。对策：量化、ZeRO/FSDP、activation checkpointing、减小 batch、换大显存卡。

### 类型二：跑着跑着 OOM（增长性 OOM）★

跑几小时后才炸，最难查。常见根因：

- **变长输入**：序列长度分布右移，某天来了超长样本。对策：长度上限截断 + 长度分桶。
- **显存碎片**：反复分配释放大小不一的张量，空闲显存碎成渣。对策：`PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True`；定期 `torch.cuda.memory_summary()` 看碎片率。
- **张量泄漏**：Python 侧持有引用没释放（如把每步 loss 张量 append 进列表——loss 带着整张计算图！）。对策：`.item()` 取标量、`detach()` 断图。

### 类型三：峰值性 OOM

99% 的时间显存够用，某个操作瞬间峰值打爆：大 batch 的临时 buffer、checkpoint 保存时的聚合、评估时的全量 logits。对策：峰值操作单独拆步、流式处理、预留显存水位线。

### 类型四：推理侧 KV Cache OOM

并发升高或上下文变长 → KV Cache 池耗尽。vLLM 的表现是请求排队/抢占而非直接 OOM（引擎会管理），但自建服务会直接炸。对策：KV 量化、max_model_len 合理设置、排队与拒绝策略。

## 标准排查流程

1. 看报错时刻：`nvidia-smi` 快照 + `torch.cuda.memory_summary()`——区分"真满"还是"碎片满"。
2. 看时间维度：启动即炸 → 类型一；随时间增长 → 类型二；特定操作 → 类型三。
3. 训练侧打印分步显存：前向后、反向后、优化器步后各打一次 allocated/reserved。
4. 定位到操作后，用对策表逐项消减。

## 预防清单

- 训练任务启动先跑 10 步 smoke test 并记录显存峰值
- 推理服务设显存水位告警（>90%）
- 输入长度分布入监控（右移趋势早发现）
- expandable_segments 作为默认配置候选评估
