// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://leonyuhe.github.io',
  base: '/ops2ai',
  integrations: [
    starlight({
      title: 'Ops2AI 老运维的 AI 转型指南',
      customCss: ['./src/styles/custom.css'],
      favicon: '/favicon.svg',
      lastUpdated: true,
      editLink: { baseUrl: 'https://github.com/leonyuhe/ops2ai/edit/main/' },
      pagination: true,
      description: '帮助传统运维/SRE 工程师系统转型 AI Infra 与 AI 工程的开源指南',
      defaultLocale: 'root',
      locales: { root: { label: '简体中文', lang: 'zh-CN' } },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/leonyuhe/ops2ai' },
      ],
      sidebar: [
        { label: '转型地图', autogenerate: { directory: '00-roadmap' } },
        { label: 'AI 认知补课', autogenerate: { directory: '01-ai-basics' } },
        { label: '工程基础', autogenerate: { directory: '02-engineering' } },
        { label: 'AI Infra 核心', autogenerate: { directory: '03-ai-infra' } },
        { label: '生产实战', autogenerate: { directory: '04-production' } },
        { label: '关于本站', link: '/about/' },
      ],
    }),
  ],
});
