// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://leonyuhe.github.io',
  base: '/ops2ai',
  integrations: [
    starlight({
      title: 'Ops2AI · 传统运维的 AI 转型指南',
      customCss: ['./src/styles/custom.css'],
      favicon: '/favicon.svg',
      lastUpdated: true,
      editLink: { baseUrl: 'https://github.com/leonyuhe/ops2ai/edit/main/' },
      pagination: true,
      description: '传统运维工程师的 AI Infra 转型之路：从 GPU 与 CUDA 到分布式训练与推理优化的系统指南',
      defaultLocale: 'root',
      locales: { root: { label: '简体中文', lang: 'zh-CN' } },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/leonyuhe/ops2ai' },
      ],
      sidebar: [
        { label: '转型地图', autogenerate: { directory: '00-roadmap' } },
        { label: 'AI 认知补课', autogenerate: { directory: '01-ai-basics' } },
        { label: '工程基础', autogenerate: { directory: '02-engineering' } },
        { label: 'GPU 与 CUDA', autogenerate: { directory: '05-gpu-cuda' } },
        { label: '分布式训练', autogenerate: { directory: '06-training' } },
        { label: '推理优化', autogenerate: { directory: '07-inference' } },
        { label: 'Agent 与 RAG 工程', autogenerate: { directory: '08-agentic' } },
        { label: '故障案例库', autogenerate: { directory: '09-troubleshooting' } },
        { label: '转型故事', autogenerate: { directory: '10-stories' } },
        { label: '生产实战', autogenerate: { directory: '04-production' } },
        { label: '关于本站', link: '/about/' },
      ],
    }),
  ],
});
