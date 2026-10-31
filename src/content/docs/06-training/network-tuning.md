---
title: 分布式网络通信调优：RDMA、NCCL 与拓扑
description: 跨机训练的命脉是网络——RDMA 原理、NCCL 调优参数、拓扑感知与常见故障
order: 5
---

> 单机 8 卡训练几乎不出通信问题；扩展到多机后，网络立刻成为第一瓶颈。本文是网络侧的排障与调优指南。

## RDMA：绕过内核的直达通道

传统 TCP 收发要经过内核协议栈、多次拷贝、CPU 参与。RDMA（Remote Direct Memory Access）让网卡直接读写远端内存：零拷贝、内核旁路、CPU 零占用。两种主流实现：

- **InfiniBand（IB）**：专用硬件，性能标杆，贵。
- **RoCE v2**：以太网上跑 RDMA，便宜通用，需要无损网络（PFC/ECN 配置）——配不好会丢包重传，性能雪崩。

验证 RDMA 真在工作：`ib_write_bw` 实测带宽；`show_gids`、`ibstat` 查链路状态。

## NCCL 调优参数速查 ★

| 参数 | 作用 | 常见场景 |
| --- | --- | --- |
| `NCCL_DEBUG=INFO` | 打印实际走的链路与拓扑 | 排查第一步必开 |
| `NCCL_IB_HCA` | 指定用哪块 IB/RoCE 网卡 | 多网卡机器选错卡是常见病 |
| `NCCL_SOCKET_IFNAME` | 走 TCP 时指定网卡 | 无 RDMA 环境的兜底 |
| `NCCL_IB_GID_INDEX` | RoCE v2 的 GID 选择 | RoCE 不通时重点查 |
| `NCCL_P2P_LEVEL` / `NCCL_SHM_DISABLE` 等 | 机内 P2P 与共享内存传输控制 | 特殊虚拟化环境排查 |

## 拓扑感知：通信要顺着物理链路走

- 机内：NVSwitch 全互联最优；PCIe 树下注意同槽/跨槽。
- 机间：Leaf-Spine 架构下，同 Leaf 下的机器通信开销小于跨 Spine。
- 训练框架和调度器都要拓扑感知：尽量把 TP 组放进单机、同 PP 段放进同 Leaf。K8s 里用拓扑标签 + 调度策略表达。

## 常见故障剧本 ★

1. **多机比单机慢**：`NCCL_DEBUG=INFO` 看是不是退回了 TCP（Socket 字样）；查 RDMA 链路。
2. **带宽只有理论值一半**：网卡绑定错（走了 PCIe 远端的口）、MTU 不一致、RoCE 无损配置缺失导致丢包。
3. **训练偶发 hang**：NCCL 超时（`NCCL_TIMEOUT`）、某机网卡 flap、时钟不同步。先统一抓各机 NCCL 日志按时间点对齐。
4. **跨机 AllReduce 时延尖刺**：检查是否有其他流量共享链路（存储/管理网混跑），RDMA 流量需要独立平面。

## 验收指标

- `nccl-tests` 的 all_reduce 实测带宽 ≥ 理论值的 80%
- 端到端：多机扩展效率（N 机吞吐 ÷ 单机吞吐 ÷ N）应 ≥ 0.85，低于此值先查网络再查并行配置
