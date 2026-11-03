---
title: AI Infra × LLMOps 可视化教程（交互版）
description: 交互式可视化教程：AI Infra 数据通路、Roofline、并行切分、显存账本、连续批处理、压缩与投机、可靠性、LLMOps 生命周期与单位成本
order: 0
---

> 这是一份**可以动手玩**的交互式教程，主题正中本站核心：AI Infra 的整条数据通路与 LLMOps 的完整生命周期。所有图表都可以拖动、点击、调节参数，亲眼看到"快、好、省"背后的机制。

## 教程内容（11 章）

1. AI Infra 是栈，LLMOps 是生命周期
2. AI Infra 不是一堆 GPU，而是一条数据通路
3. Roofline：算力与带宽的分界线
4. 并行不是"多插几张卡"，而是切分计算与通信
5. 显存账本：每一 GB 都有名字
6. 连续批处理：让 GPU 不再等最慢的那个请求
7. 压缩与投机：用更少的字节，换更快的 token
8. 可靠性：GPU 会坏，任务不能从头再来
9. LLMOps 不是工具，是生命周期
10. 观测与单位成本：把"快、好、省"放进同一个仪表盘
11. 一张责任矩阵，三道自测

## 打开方式

**👉 [点击打开交互式教程（新窗口，体验最佳）](/ops2ai/tutorials/ai-infra-llmops-visual-tutorial.html)**

也可以在下方直接浏览：

<div style="border:1px solid var(--sl-color-hairline);border-radius:12px;overflow:hidden;margin-top:1rem;">
  <iframe src="/ops2ai/tutorials/ai-infra-llmops-visual-tutorial.html" style="width:100%;height:78vh;border:none;" title="AI Infra × LLMOps 可视化教程"></iframe>
</div>

## 与本站文章的对照阅读

| 教程章节 | 本站深度文章 |
| --- | --- |
| Roofline | [GPU 架构深入](/ops2ai/05-gpu-cuda/gpu-architecture/) |
| 并行切分 | [并行策略全景](/ops2ai/06-training/parallelism-overview/)、[TP/PP 深入](/ops2ai/06-training/tp-pp-deep/) |
| 显存账本 | [训练显存账本](/ops2ai/06-training/memory-ledger/)、[Transformer 直觉（KV Cache）](/ops2ai/01-ai-basics/transformer-intuition/) |
| 连续批处理 | [推理引擎四大核心技术](/ops2ai/07-inference/engine-core/) |
| 压缩与投机 | [量化入门](/ops2ai/07-inference/quantization-basics/)、[投机解码](/ops2ai/07-inference/speculative-decoding/) |
| 可靠性 | [故障案例库](/ops2ai/09-troubleshooting/cuda-oom/) |
| 观测与单位成本 | [LLM 可观测性](/ops2ai/04-production/llm-observability/)、[推理成本核算](/ops2ai/07-inference/inference-cost/) |

建议先玩教程建立直觉，再按上表钻深度文章——教程末尾的自测题可以检验掌握程度。
