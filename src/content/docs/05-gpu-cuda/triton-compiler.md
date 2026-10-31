---
title: Triton 与 AI 编译器：不会 CUDA 也能写高性能算子
description: Triton 编程模型、与手写 CUDA 的关系、torch.compile 背后的编译器栈
order: 8
---

> 手写 CUDA 的门槛挡住了大多数工程师，Triton 把这扇门开到了 Python 里——性能可达手写 CUDA 的八九成，开发效率却是十倍。

## Triton 是什么

OpenAI 开源的 Python DSL：用 Python 语法写 GPU kernel，由 Triton 编译器生成高效机器码。你只管**块级（block）并行**的逻辑，线程调度、共享内存管理、向量化这些脏活编译器包了。

## 和 CUDA 的心智差异

| | CUDA | Triton |
| --- | --- | --- |
| 并行粒度 | 线程（thread） | 块（block/tile） |
| 内存管理 | 手动（共享内存、合并访问） | 编译器自动处理大部分 |
| 写法 | C++，索引计算手工 | Python，`tl.load/tl.store` 块操作 |
| 天花板 | 极限性能 | 约手写 CUDA 的 80-90% |
| 适用 | 引擎开发、极限优化 | 自定义算子、快速实验 |

一个 Triton kernel 的骨架（softmax 直觉版）：

```python
import triton
import triton.language as tl

@triton.jit
def softmax_kernel(x_ptr, out_ptr, N: tl.constexpr, BLOCK: tl.constexpr):
    row = tl.program_id(0)                    # 每个程序实例处理一行
    offs = tl.arange(0, BLOCK)
    mask = offs < N
    x = tl.load(x_ptr + row * N + offs, mask=mask, other=-float('inf'))
    m = tl.max(x, axis=0)                     # 数值稳定：先减最大值
    e = tl.exp(x - m)
    s = tl.sum(e, axis=0)
    tl.store(out_ptr + row * N + offs, e / s, mask=mask)
```

注意它和 CUDA 的对应关系：`program_id` 对应 block 索引，`tl.arange` 对应线程索引的向量化抽象——CUDA 章学的概念全部迁移，只是不再手写。

## torch.compile 背后的编译器栈 ★

`torch.compile` 的工作链路：

1. **Dynamo**：抓取 Python 字节码，截获模型计算图。
2. **AOTAutograd**：把前向/反向图规范化。
3. **Inductor**（默认后端）：把算子**融合**并生成 Triton kernel——你 torch.compile 出来的加速，很大一部分就是 Inductor 自动生成的 Triton 代码。

所以学 Triton 的另一层价值：看得懂 torch.compile 干了什么，调得动它生成的东西。

## 什么时候自己写 Triton

- 标准算子库里没有的操作（自定义融合算子）
- torch.compile 没能优化好的热点算子
- 研究原型：新算法需要新 kernel，Triton 让你今天就能跑，而不是排期等 CUDA 工程师

生产建议：先用 `torch.compile`，热点仍在再手写 Triton，还不行才上 CUDA——优化预算按顺序花。
