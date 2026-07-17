---
title: API 参考
date: 2026-07-17
tags: [api, reference]
---

# API 参考

基础地址：`http://127.0.0.1:8787`

## 健康检查

`GET /api/health`

## 文档

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/docs/tree` | 文档树 |
| GET | `/api/docs/content?path=` | 读取 MD |
| PUT | `/api/docs/content` | 写入 MD |
| GET | `/api/docs/search?q=` | 搜索 |
| GET | `/api/docs/recent` | 最近文档 |

## Git

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/git/status` | 工作区状态 |
| GET | `/api/git/commits` | commit 列表 |
| GET | `/api/git/diff` | diff 摘要 |
| GET | `/api/git/today` | 今日变更 |

## 总结

### `POST /api/summary/daily`

```json
{
  "date": "2026-07-17",
  "style": "daily_standup",
  "language": "zh-CN",
  "save": true,
  "outputPath": "daily/2026-07-17.md",
  "includeWorkingTree": true,
  "useLlm": false,
  "customNotes": "可选备注",
  "baseRef": "main"
}
```

### `POST /api/summary/preview`

只生成不落盘。

### `POST /api/summary/save`

```json
{ "path": "daily/2026-07-17.md", "content": "# ..." }
```

### `GET /api/summary/stats.svg`

返回模块分布 SVG 图。
