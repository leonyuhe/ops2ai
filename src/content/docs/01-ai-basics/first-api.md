---
title: 第一次调通大模型 API
description: 用 curl 和 Python 各调一次大模型 API，看懂返回结构与 token 计费
order: 3
---

> 目标：30 分钟内从零调通一次大模型 API，并看懂返回里的每一个字段。

## 准备工作

任选一个平台注册并拿到 API Key（OpenAI 兼容接口的平台均可，国内的 DeepSeek、通义、Kimi 都行）。密钥写进环境变量，**永远不要硬编码进代码或提交到仓库**：

```bash
export OPENAI_API_KEY="sk-..."
```

## 用 curl 发第一个请求

```bash
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {"role": "system", "content": "你是一名资深运维工程师"},
      {"role": "user", "content": "用一句话解释什么是负载均衡"}
    ],
    "temperature": 0
  }'
```

## 看懂返回结构

重点看三个字段：

- `choices[0].message.content`：模型的回答文本。
- `usage`：`prompt_tokens`（输入计费）、`completion_tokens`（输出计费）、`total_tokens`。养成每次调用都看 usage 的习惯——成本意识从第一天建立。
- `finish_reason`：`stop`（正常结束）、`length`（被最大长度截断——生产事故常客）、`content_filter`（被安全策略拦截）。

## 换 Python：三个工程化要点

```python
import os
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["OPENAI_API_KEY"],
    base_url="https://api.openai.com/v1",  # 换成你所用平台的地址
    timeout=30,          # 要点一：永远设超时
)

for attempt in range(3):  # 要点二：重试与退避
    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": "列出三个常见的 HTTP 状态码"}],
            temperature=0,
        )
        print(resp.choices[0].message.content)
        print("tokens:", resp.usage.total_tokens)
        break
    except Exception as e:
        print(f"第 {attempt + 1} 次失败: {e}")
```

要点三：**流式输出**。把 `stream=True` 打开，逐块打印——用户感知延迟从"全部生成完"降到"第一个字到达"。所有面向人的 AI 功能都该默认流式。

## 运维视角的检查清单

- 超时、重试（指数退避 + 抖动）、限流处理（429）——这三件套和调任何外部 API 一样，一个不能少。
- 记录每次调用的 usage 与耗时——这就是你未来做成本监控的数据源。
- 密钥走环境变量或密钥管理服务，日志里脱敏。
