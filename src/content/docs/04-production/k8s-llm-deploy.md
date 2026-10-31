---
title: 在 K8s 上部署大模型推理服务
description: GPU 调度、滚动升级、自动扩缩容——把 K8s 经验平移到模型服务
order: 1
---

> 在 K8s 上跑推理服务，80% 是你已经会的，20% 是 GPU 和模型特有的。本文只讲那 20%，以及交界处。

## GPU 资源调度：和 CPU 不一样的部分

```yaml
resources:
  limits:
    nvidia.com/gpu: 1   # GPU 是整数分配，不可超卖（默认）
```

关键差异：

- GPU 默认**不可超卖、不可分割**——一个 Pod 要么拿整卡要么没有（需要 MIG 或时间片共享等机制才能细粒度切分）。
- 装 **NVIDIA Device Plugin** 后 K8s 才看得见 GPU 资源。
- 节点池按卡型分组打标签（a10、h20、h100），用 nodeSelector/亲和性把负载钉到对的卡上——和你按机型分池的思路一致。

## 推理服务的三个特殊处

### 启动慢

模型权重几十到几百 GB，拉镜像 + 加载权重可能要几分钟。对策：

- 镜像分层：权重不进镜像，放对象存储或共享盘，initContainer 预热。
- `readinessProbe` 初始延迟给足，别让探针误杀加载中的 Pod。
- 预热（warmup）：启动后先跑几条假请求，触发 CUDA Graph 捕获和编译，再接入流量。

### 滚动升级要小心

新旧版本同时占卡可能显存/配额不足。策略：maxSurge 谨慎设（GPU 资源不像 CPU 能随便超），必要时就地升级或蓝绿。

### 自动扩缩容指标要换

CPU 利用率不是推理服务的好指标。更好的扩缩信号：

- 等待队列长度（vLLM 暴露的 waiting/running 请求数）
- TTFT/TPOT 的 p95
- KV Cache 占用率

KEDA 或自定义 metrics adapter 接这些指标，比 CPU-based HPA 靠谱得多。

## 一个最小可用部署清单

1. Device Plugin 就绪，`nvidia.com/gpu` 可见
2. Deployment：资源钉卡、探针给足启动宽限、预热注入
3. Service + Ingress/网关：流式响应要确认链路支持 SSE/chunked 不被缓冲
4. HPA：基于队列长度或 TTFT 的自定义指标
5. 监控：DCGM（卡层）+ vLLM metrics（引擎层）+ 业务层 token 成本

## 成本护栏

GPU 节点是最贵的节点。给命名空间配 ResourceQuota，给推理服务配优先级抢占（训练任务可抢占、在线推理不可），并设闲置回收策略——这些是你在 CPU 集群上做过的事，只是金额大了十倍，纪律也要严十倍。
