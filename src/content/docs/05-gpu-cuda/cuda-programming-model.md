---
title: CUDA 编程模型：Grid、Block、Thread 与第一个 Kernel
description: CUDA 的三级线程组织、索引计算与 kernel 启动配置——写给有编程基础但没碰过 GPU 的工程师
order: 2
---

> CUDA 编程的心智转变只有一个：从"写一个循环"变成"描述一百万个工人各自该干什么"。

## 三级组织：Grid / Block / Thread

一个 kernel（GPU 上执行的函数）启动时要指定两级配置：

```cpp
kernel<<<gridDim, blockDim>>>(args);  // gridDim 个 block，每 block 含 blockDim 个线程
```

- **Thread**：最小执行单位，干一份具体活（如"算数组第 i 个元素"）。
- **Block**：一组线程（最多 1024），**被整体调度到同一个 SM 上**——这意味着 block 内线程可以用共享内存协作、可以同步。
- **Grid**：所有 block 的集合，被分发到全部 SM 上执行。

关键约束与推论：

- Block 是调度和资源共享的边界。跨 block 通信只能走全局内存，贵。
- Block 内的线程实际以 32 个一组（Warp）为单位统一执行。

## 索引计算：每个线程找到自己的活

```cpp
__global__ void vec_add(const float* a, const float* b, float* c, int n) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;  // 全局线程编号
    if (i < n) c[i] = a[i] + b[i];
}
```

这行索引公式是 CUDA 的肌肉记忆：`blockIdx.x * blockDim.x + threadIdx.x`。每个线程算出自己负责的元素下标，处理一个元素——循环消失了，一百万次迭代由一百万个线程同时完成。

边界检查 `if (i < n)` 必须写：grid 规模通常向上取整，尾部线程会越界。

## 启动配置的工程直觉

- blockDim 取 128/256/256 的倍数，且必须是 32 的倍数（Warp 对齐）。
- gridDim = ceil(n / blockDim)。
- block 不是越大越好：每个 SM 的寄存器和共享内存有限，block 太大反而降低 SM 的并发 block 数（占用率，后文详述）。

## 内存搬运是工作流程的一部分

GPU 有自己的显存，数据要显式搬运：

```cpp
float *d_a;
cudaMalloc(&d_a, n * sizeof(float));                    // 显存分配
cudaMemcpy(d_a, h_a, n * sizeof(float), cudaMemcpyHostToDevice);  // 主机→显存
vec_add<<<(n+255)/256, 256>>>(d_a, d_b, d_c, n);        // 启动 kernel
cudaMemcpy(h_c, d_c, n * sizeof(float), cudaMemcpyDeviceToHost);  // 取回
cudaFree(d_a);
```

运维视角：这套 malloc/memcpy/kernel/free 流程就是你管理远程资源的标准姿势——分配、传输、执行、回收。PyTorch 的 `tensor.cuda()` 内部做的就是前两步。

## 异步本质：最容易被忽略的一点 ★

kernel 启动是**异步**的：CPU 发出启动命令后立刻返回，不等待 GPU 算完。推论：

- 计时代码不加 `cudaDeviceSynchronize()`（或 PyTorch 的 `torch.cuda.synchronize()`）测的是"发射时间"不是"执行时间"——性能数字直接失真。
- CPU 和 GPU 可以重叠干活：GPU 在算当前 batch 时，CPU 可以预处理下一个 batch——推理服务的流水线优化就靠这个。

## 学习路径建议

1. 先跑通向量加法全流程（环境、编译、传输、启动）。
2. 再用它实现 SAXPY（y = ax + y），感受索引和边界。
3. 然后直接跳到本模块的 Reduce 优化一文，看一个真实算子如何被逐级榨干性能。
