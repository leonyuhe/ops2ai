---
title: GPU 容器化：Docker 与 GPU 的正确组合
description: NVIDIA Container Toolkit、镜像分层、显存隔离——容器经验平移到 GPU 工作负载
order: 3
---

> GPU 容器化和你熟悉的 Docker 使用几乎一样，多出来的只有一个组件和几条纪律。

## 核心组件：NVIDIA Container Toolkit

容器默认看不见 GPU。NVIDIA Container Toolkit（原 nvidia-docker）负责把宿主机的驱动和 GPU 设备注入容器：

```bash
docker run --gpus all --rm nvcr.io/nvidia/pytorch:24.01-py3 nvidia-smi
```

`--gpus all` 生效 = toolkit 装好了。容器内的 `nvidia-smi` 输出与宿主机一致即验证通过。

两条纪律：

- **容器只带 CUDA 运行时，驱动来自宿主机**——宿主机驱动版本决定容器可用的 CUDA 上限，镜像里的 CUDA 版本不能超过它。
- 用官方基础镜像（NGC 的 `nvcr.io/nvidia/...` 系列），别从裸 ubuntu 自己攒 CUDA 环境——版本地狱不值当。

## 镜像分层：权重不进镜像 ★

GPU 工作负载的镜像分层原则：

- **代码 + 依赖**进镜像（GB 级以内）
- **模型权重不进镜像**：几十上百 GB 的权重打进镜像，每次发版全集群拉取是灾难。权重放对象存储/NAS，启动时拉取或挂载。

推论：CI 构建快、发版快、回滚快——和你管应用镜像的原则一致，只是"数据"的量级放大了一百倍。

## 显存与多租户

- 单机多容器时，`--gpus '"device=0"'` 指定卡，避免互相争抢。
- **显存没有 cgroup 级硬隔离**：同卡两个容器可以把显存挤爆。需要细粒度切分时用 MIG（A100/H100 支持硬件级分区）或 vGPU/时间片方案。
- K8s 环境下用 Device Plugin 做调度（见"K8s 部署大模型"一文）。

## 常见问题速查

- 容器里 `torch.cuda.is_available()` 为 False：九成是没加 `--gpus`，一成是驱动/CUDA 版本错位。
- 镜像拉取慢：基础镜像 10+ GB 是常态，配好镜像仓库代理和节点缓存。
- 训练容器挂掉难复现：挂 core dump 和 NCCL 日志持久化卷，别只留 stdout。
