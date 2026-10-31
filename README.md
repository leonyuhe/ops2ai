# Ops2AI · 传统运维的 AI Infra 之路

传统运维工程师的 AI Infra 转型之路：从 GPU 与 CUDA 到分布式训练与推理优化的系统指南。

**在线阅读：** https://leonyuhe.github.io/ops2ai/

## 内容模块

- **转型地图**：运维技能 → AI Infra 技能映射、岗位图谱、六个月学习路线
- **AI 认知补课**：给运维写的大模型入门，先白话后术语
- **工程基础**：Python 速成（给会 Shell 的你）、GPU 服务器上手
- **GPU 与 CUDA**：SM 架构、显存层级、Warp/占用率、Reduce/GEMM 优化、FlashAttention 原理
- **分布式训练**：显存账本、NCCL 集合通信、DDP/FSDP/ZeRO、TP/PP 深入、并行策略全景
- **推理优化**：vLLM 部署、引擎四大核心技术、量化、投机解码、PD 分离、成本核算
- **生产实战**：K8s 部署大模型、LLM 可观测性、GPU 监控体系、容量规划

## 本地开发

```bash
npm install
npm run dev
```

## 部署

push 到 main 分支即自动构建发布（GitHub Actions → GitHub Pages）。

## License

本站原创内容采用 CC BY 4.0 协议；代码采用 MIT 协议。
