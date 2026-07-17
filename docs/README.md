---
title: 欢迎使用 Sivan Note
date: 2026-07-17
tags: [home]
---

# 欢迎使用 Sivan Note

这是示例文档首页。你可以：

- 在 `docs/` 下继续添加项目设计、接口、笔记
- 用 **总结工作台** 根据 Git 变更生成日报
- 让 Codex 在改完代码后调用 `POST /api/summary/daily`

## 推荐目录结构

```text
docs/
  guide/          # 使用与 API 说明
  daily/          # 每日修改总结
  design/         # 设计文档（可自建）
```

## Codex 协作建议

1. 完成功能修改与自测
2. 调用总结接口或 CLI：`npm run summary:today -- --save`
3. 人工润色 `docs/daily/当天.md`
4. 需要时再 commit 文档
