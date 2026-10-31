---
title: 长序列训练：Ring Attention 与上下文并行
description: 注意力的 O(N²) 困境、Ring Attention、DeepSpeed-Ulysses 与 Megatron Context Parallel
order: 8
---

> 训练 128K 上下文模型的难题不是装不下权重，而是注意力的 N² 计算和激活显存爆炸。上下文并行（CP）是这个问题的标准答案。

## 困境：长序列的三重压力

1. 注意力计算量 O(N²)：128K 是 8K 的 256 倍计算。
2. 注意力中间矩阵的显存 O(N²)（除非 FlashAttention 全程片上化）。
3. 激活显存随序列线性增长，叠上 checkpointing 也紧张。

## 核心思想：沿序列维度切开 ★

上下文并行（Context Parallel）：把序列切成若干段分到不同卡上，每卡只算自己那段——但注意力需要"看到全部 token"，所以必须交换 K/V。怎么交换，分出两个主流方案。

## Ring Attention：环形接力

卡连成环，每卡持有 Q 的一段；K/V 块沿环传递一圈，每传到一卡就叠加计算局部注意力（配合 online softmax 合并）。

- 通信与计算可重叠：传下一块 K/V 的同时算当前块。
- 通信量与序列长度成正比，但点对点小包，跨机可承受。
- 直觉：接力赛，每个人拿着自己的问题（Q），等全世界的信息（K/V）从身边流过一遍。

## DeepSpeed-Ulysses：换维切分

attention 计算前做一次 All-to-All：把"按序列切"换成"按注意力头切"——每卡拿到全部序列但只算部分头，算完再 All-to-All 换回来。

- 通信两次 All-to-All，量与头数/序列相关。
- 对头数少的模型（GQA 后 KV 头很少）扩展性受限。

## Megatron CP 与组合

Megatron 的 Context Parallel 与 TP/SP 正交组合：长序列训练的常见配方是 **TP8（机内）× CP N（跨机）× DP**，序列越长 CP 维度越大。

## 工程检查清单

- 先确认 FlashAttention 已启用且全程片上化——否则 N² 中间矩阵显存先炸。
- CP 的通信耗时打点监控：通信占比超过 20% 说明切分或拓扑有问题。
- 变长序列负载均衡：各卡分到的 token 数要均衡，否则木桶效应。
- 评测要覆盖长上下文区间（"迷失在中间"问题）：训练长了不等于会用长。
