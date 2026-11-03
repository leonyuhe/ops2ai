---
title: 大语言模型可视化教程（交互版）
description: 一份层层递进的交互式可视化教程：从 token、注意力、Transformer 到 GRPO、推理模型与 Agent——可以动手玩的大模型原理课
order: 0
---

> 这是一份**可以动手玩**的交互式教程：用动画和可视化把大模型的内部机制一层层拆开给你看。和传统文章不同，里面的每张图都是活的——你可以拖动、点击、观察参数变化如何影响输出。

## 教程内容（13 章）

1. 一台会预测下一个 token 的概率机器
2. 模型看不见文字，只看得见 token
3. 把 token 放进可以计算的空间（Embedding）
4. 注意力：每个词都在决定"该看谁"
5. Transformer：一层一层地改写表示
6. 预训练：把"下一个 token"做到极致
7. 对齐：教模型成为你想要的助手
8. 解码：同一句话为什么每次都不一样（温度、采样）
9. 现代架构：更长的上下文，更低的成本（RoPE、GQA、MoE、MLA）
10. 九个关键函数（交叉熵、KL、LoRA 等）
11. 推理模型：让模型"多想几步"（GRPO）
12. RAG、Agent 与多模态：把能力接进现实
13. 一图收束 + 三道自测

## 打开方式

**👉 [点击打开交互式教程（新窗口，体验最佳）](/ops2ai/tutorials/llm-visual-tutorial.html)**

也可以在下方直接浏览：

<div style="border:1px solid var(--sl-color-hairline);border-radius:12px;overflow:hidden;margin-top:1rem;">
  <iframe src="/ops2ai/tutorials/llm-visual-tutorial.html" style="width:100%;height:78vh;border:none;" title="大语言模型可视化教程"></iframe>
</div>

## 学习建议

- **第一遍**：顺着章节点过去，先建立整体直觉，不必深究每个动画参数。
- **第二遍**：配合本站文字教程对照看——可视化的"注意力"对应 [Transformer 直觉](/ops2ai/01-ai-basics/transformer-intuition/)，"现代架构"对应 [推理引擎四大技术](/ops2ai/07-inference/engine-core/)，"GRPO" 对应推理模型训练。
- 教程末尾的三道自测题做完，可以去[六个月学习路线](/ops2ai/00-roadmap/learning-path/)安排下一步。
