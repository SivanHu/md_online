# md_online

本地 **Markdown 知识库** + **每日代码修改总结工作台**。  
适合在 Codex 改完代码后，基于 Git 变更一键生成/归档日报，并在网页中阅读项目文档。

## 功能

- 在线浏览 `docs/**/*.md`（目录树、GFM、代码高亮、TOC）
- **Mermaid** 图表渲染（总结里自动带结构图）
- 全文搜索、最近文档、亮/暗色主题
- Git 状态 / 今日变更 / diff 摘要 API
- 每日总结生成（模板模式默认可用；可选 OpenAI 兼容 LLM）
- 变更模块分布 **SVG 统计图**
- CLI：`npm run summary:today -- --save`

## 快速开始

```bash
# 需要 Node.js 18+
npm install
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux

npm run dev
```

- 前端：http://127.0.0.1:5173  
- API：http://127.0.0.1:8787  

生产构建：

```bash
npm run build
npm start
```

`npm start` 会启动服务端，并托管 `client/dist`。

## 目录结构

```text
md_online/
  client/          # React + Vite 前端
  server/          # Express API
  docs/            # Markdown 文档库
    guide/         # 使用与 API 说明
    daily/         # 每日总结输出目录
  scripts/         # CLI 辅助脚本
```

## 每日总结

### 网页

打开 **总结工作台** → 生成预览 / 生成并保存。  
默认输出：`docs/daily/YYYY-MM-DD.md`。

### API（供 Codex / 脚本调用）

```bash
curl -X POST http://127.0.0.1:8787/api/summary/daily \
  -H "Content-Type: application/json" \
  -d "{\"save\":true,\"language\":\"zh-CN\",\"style\":\"daily_standup\"}"
```

请求体常用字段：

| 字段 | 说明 |
|------|------|
| `date` | 日期 `YYYY-MM-DD` |
| `baseRef` | 如 `main`、`HEAD~10` |
| `paths` | 路径过滤数组 |
| `style` | `daily_standup` / `changelog` / `release_note` |
| `language` | 默认 `zh-CN` |
| `save` | 是否写入 docs |
| `outputPath` | 相对 docs 的路径 |
| `includeWorkingTree` | 是否包含未提交变更 |
| `useLlm` | 是否调用 LLM |
| `customNotes` | 附加备注 |

### CLI

```bash
# 需先启动服务端
npm run summary:today -- --save
```

## 配置

复制 `.env.example` 为 `.env`：

| 变量 | 含义 |
|------|------|
| `PORT` | API 端口，默认 8787 |
| `DOCS_ROOT` | 文档根目录 |
| `DAILY_DIR` | 日报目录 |
| `GIT_REPO_PATH` | Git 仓库路径 |
| `ALLOW_WRITE` | 是否允许写文件 |
| `AUTH_TOKEN` | 非空则要求 Bearer Token |
| `LLM_ENABLED` | 是否启用 LLM |
| `OPENAI_API_KEY` | API Key |
| `OPENAI_BASE_URL` | 兼容接口 Base URL |
| `OPENAI_MODEL` | 模型名 |

未配置 API Key 时自动使用 **模板模式**（仍含统计、文件表、Mermaid）。

## 与 Codex 协作

1. 用 Codex 修改代码并自测  
2. 调用：

```text
POST /api/summary/daily  { "save": true }
```

或让 Codex 执行 `npm run summary:today -- --save`  
3. 在文档站打开 `docs/daily/当天.md` 复查  
4. 需要时把文档一并提交  

## 主要 API 一览

- `GET /api/health`
- `GET /api/docs/tree`
- `GET /api/docs/content?path=`
- `GET /api/docs/search?q=`
- `GET /api/git/status`
- `GET /api/git/today`
- `POST /api/summary/daily`
- `POST /api/summary/preview`
- `POST /api/summary/save`
- `GET /api/summary/stats.svg`

更多说明见 `docs/guide/`。

## 技术栈

- 前端：React 18、Vite、react-markdown、mermaid
- 后端：Node.js、Express、simple-git、gray-matter
- 存储：本地文件系统 + Git（无强制数据库）

## License

MIT
