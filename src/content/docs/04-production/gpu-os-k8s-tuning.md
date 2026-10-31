---
title: GPU 环境的 OS、Docker 与 K8s 调优
description: NUMA 亲和、CPU 频率、中断亲和、容器与编排层的 GPU 调优要点
order: 5
---

> 你的 Linux 调优功底在 GPU 世界照样值钱——只是调优对象从"CPU/磁盘"扩展到了"GPU/显存/高速网卡"。本文是操作系统层的 GPU 调优清单。

## NUMA：GPU 也有自己的"本地内存"

GPU 插在 PCIe 上，每张卡从属于某个 NUMA 节点（某颗 CPU 的内存域）。跨 NUMA 访问 = 走 UPI/互联总线，延迟高带宽低。

纪律：

- **CPU 亲和**：把训练/推理进程绑到 GPU 所在 NUMA 节点的核上（`numactl --cpunodebind --membind`）。
- `nvidia-smi topo -m` 会告诉你每张卡的 CPU Affinity 和 NUMA Affinity——照它绑定。
- K8s 里用 CPU Manager（static 策略）+ Topology Manager 自动做这件事。

## CPU 侧设置（是的，CPU 设置影响 GPU 性能）

- 性能模式：`performance` governor，关掉节能降频——GPU 等 CPU 派活，CPU 降频直接拖慢 kernel 发射。
- 中断亲和：把网卡（尤其 IB/RoCE）中断绑到靠近它的核，软中断别挤在同一个核上。
- 透明大页（THP）：训练场景建议关闭或设为 madvise——THP 的整理 Stall 会造成偶发延迟尖刺。
- `vm.zone_reclaim_mode`、swap：AI 服务器建议关 swap，宁可 OOM 暴露问题，不要 swap 抖动掩盖问题。

## Docker 层

- `--ipc=host`：PyTorch 多进程 DataLoader 用共享内存传数据，容器默认 /dev/shm 只有 64MB，不加这个会随机挂——最经典的 GPU 容器坑。
- `--gpus` 显式分配、`--ulimit memlock=-1`（RDMA 锁页内存需要）。
- 镜像与权重分层（见 GPU 容器化一文）。

## K8s 层

- Device Plugin 暴露 GPU；Topology Manager 做 NUMA 感知调度。
- 训练 Job：用 volcano / kueue 这类批调度器做 gang scheduling（要么全排上要么不排——分布式训练的 Pod 缺一不可，默认调度器逐个排会产生死锁式占坑）。
- 在线推理与离线训练**分池**：推理要高优不被抢占，训练可做可抢占的低优任务填谷——这是你熟悉的"在线离线混部"思想，在 GPU 集群上更值钱。

## 验收基线

调优后跑三个基准留档：nccl-tests（通信带宽）、nvbandwidth 或简单 PyTorch 拷贝测试（显存带宽）、一段固定训练/推理负载（端到端吞吐）。每次系统变更后复跑对比——基线管理，和你在传统系统上做的容量基线一样。
