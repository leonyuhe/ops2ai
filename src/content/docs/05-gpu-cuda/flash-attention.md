---
title: FlashAttention 原理：IO 感知的注意力
description: 不减少一次计算却快好几倍——Tiling + Online Softmax 如何消除注意力的显存墙
order: 6
---

> FlashAttention 是近年最重要的算子级突破，也是"算法没换、性能翻倍"的教科书案例：它一个 FLOP 都没省，快在全在访存上。

## 先看病：标准注意力的显存墙

Attention 计算 softmax(QK^T)V。标准实现的流程是：

1. 算 S = QK^T：N×N 矩阵，**写回 HBM**
2. 对 S 做 softmax：**从 HBM 读回**，归一化后再写回
3. 乘 V：再读写一轮

对于序列长度 N，中间矩阵 S 是 N² 大小——N=8K 时就是 6400 万个元素。所有灾难都来自这个 N² 矩阵被**反复写回和读出 HBM**：

- 显存占用 O(N²)：长上下文直接爆显存
- HBM 读写量 O(N²)：回忆 Roofline——attention 的算术强度低，完全被带宽锁死

## 核心思想：永远不让 N² 矩阵落到 HBM

FlashAttention 的回答干脆利落：**把 S 切成小块，每块在片上（SRAM/共享内存）完成 softmax 和乘 V，算完就扔，从不写回 HBM。**

两个技术支柱：

### 支柱一：Tiling（分块）

把 Q、K、V 按行切块。每次只把 K、V 的一小块搬进片上，与 Q 的块算局部注意力，直接累加到输出。片上 SRAM 比 HBM 快一个数量级，且 N² 中间矩阵只存在于片上、只活一瞬间。

### 支柱二：Online Softmax ★

问题来了：softmax 需要整行的最大值和求和才能归一化，分块后手里只有局部行怎么办？

答案：流式更新。每处理一个新块时：

- 维护"到目前为止"的行最大值 m 和分母累加值 l
- 新块带来新的局部最大值时，用指数差把旧的累加结果**重新缩放**（rescale），再累加新块的贡献
- 全部块处理完，m 和 l 就是整行真正的 softmax 归一化因子，最后统一除

数学上可以严格证明这与一次性 softmax 完全等价——不是近似，是精确。代价只是多几次片上指数运算，片上算力有的是。

## 效果与代数演进

- **显存占用**：O(N²) → O(N)（只存输出和少量统计量）
- **HBM 访问量**：降一个数量级 → 实际快 2-4 倍，且越长上下文优势越大
- **无精度损失**：数学等价，不是近似算法
- V2：调换内外循环、优化 block 内分工、减少非矩阵乘运算（GPU 非矩阵单元吞吐远低于 Tensor Core，能推给 Tensor Core 的都推过去）
- V3（H100 专用）：利用异步拷贝和 FP8 进一步压流水气泡

## 给 Infra 工程师的推论

1. 这就是"Decode 为什么慢"的另一半答案——attention 若不做 IO 感知优化，长序列下是双重带宽灾难。
2. 推理引擎选型时，attention 后端（FlashAttention / FlashInfer / xFormers）的差异主要就是这些优化的实现质量差异。
3. 面试被问"FlashAttention 不减 FLOPs 为什么快"：答 HBM 访问量 + O(N²) 中间矩阵物化 + online softmax 三件套。

## 延伸阅读

- 前置：本模块的 Reduce/GEMM 优化一文（tiling 与 warp shuffle 是同款思想）
- 后续：推理优化模块的引擎核心技术一文（PagedAttention 解决的是另一个问题——显存管理而非计算）
