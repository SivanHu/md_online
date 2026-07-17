---
title: md_online 使用指南
date: 2026-07-17
tags: [guide, getting-started]
---

# md_online 使用指南

`md_online` 是本地 Markdown 知识库，并提供基于 Git 变更的**每日修改总结**能力，方便 Codex 改完代码后归档日报。

## 快速开始

```bash
npm install
cp .env.example .env
npm run dev
```

- 前端：http://127.0.0.1:5173
- API：http://127.0.0.1:8787

## 文档浏览

- 将 `.md` 文件放入 `docs/` 目录
- 支持 GFM、代码高亮、Mermaid 图、YAML frontmatter
- 左侧目录树导航，右侧大纲

## 每日总结

1. 打开 **总结工作台**
2. 选择日期 / 风格
3. 点击 **生成预览** 或 **生成并保存**
4. 文件默认写入 `docs/daily/YYYY-MM-DD.md`

也可以用 API：

```bash
curl -X POST http://127.0.0.1:8787/api/summary/daily ^
  -H "Content-Type: application/json" ^
  -d "{\"save\": true, \"language\": \"zh-CN\"}"
```

## 变更结构示意

```mermaid
flowchart LR
  Codex[Codex 改代码] --> Git[Git Diff]
  Git --> API[summary API]
  API --> MD[docs/daily]
  MD --> Viewer[在线阅读]
```

## 配置 LLM（可选）

在 `.env` 中：

```env
LLM_ENABLED=true
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

未配置时使用本地模板模式，仍可生成含统计与 Mermaid 的总结。
