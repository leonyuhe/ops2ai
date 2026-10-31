---
title: 案例库：分布式训练 Hang 与 NCCL 超时
description: 多机训练挂起的排查——从 NCCL 日志到慢节点定位
order: 3
---

> 分布式训练最折磨人的故障：程序不报错、不死、就是不动。Hang 的本质是"有人在等一个永远不会来的消息"——排查就是找出谁没来、为什么。

## Hang 的三个层级

### 层级一：NCCL 通信 hang（最常见）

所有进程卡在 AllReduce/AllGather。根因通常是：

- **某节点掉队**：一台机器慢了（降频、网络抖动、磁盘 IO 卡），集合通信是齐步走，最慢的拖死全队。
- **网络故障**：某条 IB/RoCE 链路 flap，部分包丢失。
- **拓扑配置错误**：NCCL 选错了网卡/链路，通信走到死路。

排查：

1. `NCCL_DEBUG=INFO` 日志按时间对齐各机：看哪个 rank 最后一条日志停在哪。
2. 对嫌疑机器查硬件：`nvidia-smi`（降频/Xid）、`ibstat`（链路状态）、dmesg。
3. 跑 `nccl-tests` 全员体检：带宽异常的那对节点就是病灶。

### 层级二：应用层死锁

代码逻辑导致集合通信调用不一致：不同 rank 走了不同分支（如 if 里包了 allreduce）、数据分片不均导致某 rank 早退。排查：代码 review + 各 rank 的调用序列打点对比——**集合通信的调用必须在所有 rank 上以同样顺序发生**，这是铁律。

### 层级三：启动期 hang

init_process_group 卡住：会合地址（master addr/port）不通、防火墙、store 配置错误。排查：telnet 会合端口、`NCCL_SOCKET_IFNAME` 指定正确网卡。

## 止血与恢复

- NCCL 超时自动报错退出（`NCCL_TIMEOUT`/`TORCH_NCCL_HEARTBEAT`）——比无声 hang 好，确保超时配置开启。
- 退出后自动从最近 checkpoint 重启：训练编排层（如 torchrun 的 elastic 模式或 K8s Job 重试）配好自动恢复。
- 恢复后记录 hang 前的慢节点证据，该下线维修的下线。

## 预防清单 ★

- 训练任务标配：NCCL 超时开启、heartbeat 监控、各 rank 吞吐打点。
- 集群层：慢节点检测（同任务内各 rank 的 step 时间对比，离群者告警）。
- 变更管控：网卡固件/驱动/NCCL 版本升级必须先在测试集群跑回归。
- 容量层：别把训练 Job 和重 IO 任务（大数据导出）排在同一批网络节点上。
