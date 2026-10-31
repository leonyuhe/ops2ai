---
title: 推理部署入门：用 vLLM 起第一个模型服务
description: 从单卡部署 Qwen 到压测 TTFT/TPOT——运维上手机推理服务的完整路径
order: 1
---

> 推理服务是运维转型 AI Infra 的最佳切入点：它本质就是一个高性能在线服务，只是后端是 GPU。

## 为什么是 vLLM

vLLM 是开源推理引擎的事实标准：PagedAttention 显存管理、连续批处理、OpenAI 兼容 API、活跃的社区。学它就相当于当年学 Nginx——一个工具吃透，思想处处通用。

## 十分钟部署

```bash
uv venv && source .venv/bin/activate
uv pip install vllm
vllm serve Qwen/Qwen3-0.6B --max-model-len 4096
```

启动日志里有你要盯的三个信息：KV Cache 可用块数（决定并发容量）、最大并发数、CUDA Graph 是否启用。

调用验证（和云端 API 完全同构，OpenAI 兼容）：

```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "Qwen/Qwen3-0.6B", "messages": [{"role":"user","content":"你好"}]}'
```

## 三个必须理解的引擎机制

### PagedAttention：显存的虚拟内存

KV Cache 不按"最大可能长度"整块预留，而是像操作系统分页一样按块（block）分配——消除显存碎片，实际并发容量翻几倍。类比：这就是显存管理的"段页式改造"。

### 连续批处理（Continuous Batching）

静态批处理要等批内最慢的请求做完才放下一批（像绿皮火车按点发车）。连续批处理是每个 decode 步都重新编组——完成的请求立刻下车、新请求随时上车。类比：从班车制改成流水席。GPU 利用率因此可以从三成拉到八成以上。

### 前缀缓存（Prefix Cache）

相同前缀的请求（如共用 system prompt）共享 KV Cache 块。多轮对话和 Agent 场景命中率高，省显存又省 prefill 算力。类比：HTTP 缓存，只是缓存的是注意力中间态。

## 压测：看懂 TTFT 与 TPOT

用 `vllm bench` 或 genai-perf 压测，报告里两个核心指标：

- **TTFT**（首 token 延迟）：用户等第一个字的时间，由 prefill 决定。
- **TPOT**（每 token 耗时）：回答的流畅度，由 decode 决定。

SLO 设计要分开定：聊天场景 TTFT 敏感（建议 p95 < 2s），长文生成 TPOT 敏感（要高于人的阅读速度，约 20 token/s 以上）。

压测方法论和你的老经验一致：固定模型与输入长度分布 → 阶梯加压测并发 → 画延迟-吞吐曲线 → 找拐点（吞吐饱和、延迟陡升处），拐点前是健康区。

## 排障起手式

- 服务变慢先看 `nvidia-smi`：显存是否接近打满（KV Cache 不足 → 请求排队）。
- 吞吐不达标看调度日志：waiting 队列长 = 容量不够；preempted 多 = 显存压力导致抢占。
- 输出异常看启动参数：`max-model-len`、`rope-scaling` 配置错误是长上下文场景的高发区。
