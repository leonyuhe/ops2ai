---
title: GPU 监控体系实战：DCGM + Prometheus + Grafana
description: 把 GPU 集群接进你现有的监控体系——指标选型、告警阈值与看板设计
order: 4
---

> 这套方案的全部组件都是老朋友：exporter、Prometheus、Grafana。新的只是指标的含义。

## 采集层：DCGM Exporter

NVIDIA 官方的 DCGM Exporter 以容器形式部署（DaemonSet），把每张卡的指标暴露给 Prometheus：

```bash
docker run -d --gpus all -p 9400:9400 nvcr.io/nvidia/k8s/dcgm-exporter:latest
```

## 指标选型：三层

### 卡层健康（每卡）

- `DCGM_FI_DEV_GPU_TEMP`：温度，>85°C 告警（接近降频线）
- `DCGM_FI_DEV_POWER_USAGE`：功耗，贴着功耗墙说明算力满载或散热不足
- `DCGM_FI_DEV_FB_USED / DCGM_FI_DEV_FB_TOTAL`：显存占用，>90% 告警
- **Xid 错误**（`DCGM_FI_DEV_XID_ERRORS`）：GPU 硬件/驱动级错误的统一入口，出现非零立刻关注——Xid 79（掉卡）、Xid 48（ECC 双比特错误）都是要换机的信号

### 利用率层（看懂业务饱和度）

- `DCGM_FI_DEV_GPU_UTIL`：SM 活跃比例。注意陷阱：decode 型负载这个值天然偏低。
- `DCGM_FI_DEV_MEM_COPY_UTIL`：显存带宽利用率——推理负载的真实饱和度看这里。
- `DCGM_FI_PROF_SM_ACTIVE`、`DCGM_FI_PROF_DRAM_ACTIVE`（需开 profiling 权限）：更精确的算力/带宽剖面。

### 应用层（接上业务）

推理引擎指标（vLLM 的 running/waiting 请求数、KV Cache 水位、TTFT/TPOT 直方图）与卡层指标打同一个 job 标签，排障时能一眼看"是卡满了还是引擎满了"。

## 看板设计建议

- **集群总览盘**：卡数健康率、平均显存占用、平均带宽利用率、Xid 计数
- **单机盘**：每卡温度/功耗/显存/带宽四图一行
- **服务盘**：QPS、TTFT/TPOT 分位、队列深度、token 吞吐

## 告警纪律（新瓶装旧酒）

- 资源告警（温度、显存、Xid）走即时通知——它们对应硬件故障。
- 性能告警（TTFT/TPOT 超 SLO）走即时通知——在线事故。
- 利用率周报（平均利用率低于 30% 的卡）走周报——成本问题，不半夜叫人的。

最后一条是 GPU 时代的新纪律：**利用率就是成本**。一张 H100 闲置一天烧掉的钱，值得每周复盘一次。
