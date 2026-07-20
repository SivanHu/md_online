---
title: API 参考
date: 2026-07-20
tags: [api, reference]
---

# API 参考

基础地址：`http://127.0.0.1:8787`

若配置了 `AUTH_TOKEN`，请求需带：

```http
Authorization: Bearer <token>
```

## 健康检查

`GET /api/health`

## 运行配置

`GET /api/config`

## 文档

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/docs/tree` | 文档树 |
| GET | `/api/docs/content?path=` | 读取 MD |
| GET | `/api/docs/exists?path=` | 是否存在 |
| PUT | `/api/docs/content` | 写入 MD |
| GET | `/api/docs/search?q=` | 搜索（标题加权） |
| GET | `/api/docs/recent` | 最近文档 |

## Git

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/git/status` | 工作区状态 |
| GET | `/api/git/commits` | commit 列表（支持 `paths`） |
| GET | `/api/git/diff` | diff 摘要（支持 `baseRef` / `paths`） |
| GET | `/api/git/today` | 今日变更（本地时区） |

## 总结

### `POST /api/summary/daily`

```json
{
  "date": "2026-07-20",
  "project": "md_online",
  "style": "daily_standup",
  "language": "zh-CN",
  "save": true,
  "force": true,
  "outputPath": "projects/md_online/daily/2026-07-20.md",
  "includeWorkingTree": true,
  "useLlm": false,
  "customNotes": "可选备注",
  "baseRef": "main",
  "paths": ["server", "client"]
}
```

已存在文件且 `force` 不为 true 时返回 **409**。

### `POST /api/summary/preview`

只生成不落盘。

### `POST /api/summary/save`

```json
{ "path": "projects/md_online/daily/2026-07-20.md", "content": "# ..." }
```

### `GET /api/summary/stats.svg`

查询参数：`date`、`baseRef`、`paths`、`includeWorkingTree`、`theme=light|dark`。
