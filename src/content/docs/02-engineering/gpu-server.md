---
title: GPU 服务器上手：运维视角
description: 从申请云 GPU 到跑通 PyTorch——驱动、CUDA、显存监控的完整检查清单
order: 2
---

> GPU 服务器还是服务器。你的 Linux 功底全部适用，只是多了一套要认识的硬件和工具链。

## 验收一台 GPU 机器的检查清单

```bash
nvidia-smi                # 第一命令：看卡型、显存、利用率、驱动/CUDA 版本
nvidia-smi topo -m        # 看卡间互联拓扑（NVLink 还是 PCIe，影响多卡性能）
lspci | grep -i nvidia    # 确认 PCI 识别
df -h && free -g          # 老本行：磁盘和内存
```

`nvidia-smi` 输出里你要建立直觉的三个列：

- **Memory-Usage**：显存占用。模型权重 + KV Cache + 激活都在这里，爆显存（OOM）是 GPU 世界的头号事故。
- **GPU-Util**：计算利用率。注意它低不代表空闲——Decode 阶段利用率天然低（瓶颈在显存带宽不在算力）。
- **Power**：功耗墙。降频往往先发生在功耗或温度上。

## 驱动与 CUDA 的版本关系

三个版本要分清楚，面试和排障都会考：

- **驱动版本**（nvidia-smi 右上角）：决定支持的 CUDA 运行时上限。
- **CUDA Toolkit**：编译 CUDA 程序用，PyTorch 等框架一般自带运行时，不强制要求系统装。
- **框架自带 CUDA**：`python -c "import torch; print(torch.version.cuda)"`——框架实际用的是它。

排障口诀：版本不匹配先查这三者，80% 的"CUDA error"出在它们的错位上。

## PyTorch 五分钟验证

```python
import torch
print(torch.cuda.is_available())      # True 才算过关
print(torch.cuda.get_device_name(0))  # 卡型
x = torch.randn(4096, 4096, device="cuda")
y = x @ x                             # 一个大矩阵乘，GPU 应该瞬间打满
torch.cuda.synchronize()
print(torch.cuda.max_memory_allocated() / 2**30, "GiB")  # 显存峰值
```

## 监控：把 GPU 接进你的监控体系

- **DCGM Exporter**：NVIDIA 官方的 Prometheus exporter，显存/利用率/温度/功耗指标齐全，直接进你现有的 Grafana。
- 关键告警建议：显存占用 >90%、温度 >85°C、Xid 错误（GPU 硬件/驱动级错误的统一入口，dmesg 里看）。

## 云 GPU 省钱原则

- 按需实例跑实验，关机要彻底（只关机不释放照样计费的是存储）。
- 推理测试优先选 L4/A10 这类推理卡，价格远低于 H100。
- 用完快照：环境配置一次，之后从镜像启动，不把时间浪费在重复装环境上。
