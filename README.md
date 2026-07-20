# Sivan Note

本地 **Markdown 知识库** + **每日代码修改总结工作台**。  
适合在 Codex 改完代码后，基于 Git 变更一键生成/归档日报，并在网页中阅读与编辑项目文档。

## 功能

- 在线浏览 / **在线编辑** `docs/**/*.md`（可折叠目录树、GFM、代码高亮、TOC）
- **Mermaid** 图表渲染（总结里自动带结构图）
- 全文搜索（标题加权、关键词高亮、输入防抖）
- Git 状态 / 今日变更 / 路径过滤 / diff 摘要 API
- 每日总结生成（模板模式默认可用；可选 OpenAI 兼容 LLM）
- 覆盖保护：已存在日报需确认或 `force=true`
- 变更模块分布 **SVG 统计图**（随筛选条件与主题变化）
- CLI：`npm run summary:today -- --save`

## 快速开始

```bash
# 需要 Node.js 18+
npm install
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux

npm run dev
```

`npm install` 通过 npm workspaces 安装根目录、`client`、`server` 依赖。

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
sivan-note/
  client/          # React + Vite 前端
  server/          # Express API
  docs/            # Markdown 文档库
    guide/         # 使用与 API 说明
    projects/      # 按项目隔离的文档
      md_online/
        daily/     # md_online 的每日总结
  scripts/         # CLI 辅助脚本
```

## 每日总结

### 网页

打开 **总结工作台** → 生成预览 / 生成并保存。  
默认输出：`docs/projects/<project>/daily/YYYY-MM-DD.md`（本地时区日期）。  
若文件已存在，会提示确认覆盖。

### API（供 Codex / 脚本调用）

```bash
curl -X POST http://127.0.0.1:8787/api/summary/daily \
  -H "Content-Type: application/json" \
  -d "{\"project\":\"md_online\",\"save\":true,\"language\":\"zh-CN\",\"style\":\"daily_standup\",\"force\":true}"
```

请求体常用字段：

| 字段 | 说明 |
|------|------|
| `date` | 日期 `YYYY-MM-DD`（本地日历日） |
| `project` | 项目名称，决定独立的项目目录 |
| `baseRef` | 如 `main`、`HEAD~10` |
| `paths` | 路径过滤数组（commit / 文件统计一致） |
| `style` | `daily_standup` / `changelog` / `release_note` |
| `language` | 默认 `zh-CN` |
| `save` | 是否写入 docs |
| `force` | 覆盖已存在文件（否则 409） |
| `outputPath` | 相对 docs 的路径 |
| `includeWorkingTree` | 是否包含未提交变更 |
| `useLlm` | 是否调用 LLM |
| `customNotes` | 附加备注 |

### CLI

```bash
# 需先启动服务端
npm run summary:today -- --save
npm run summary:today -- --save --force
```

| 环境变量 | 含义 |
|----------|------|
| `SIVAN_NOTE_URL` | API 地址，默认 `http://127.0.0.1:8787` |
| `AUTH_TOKEN` / `SIVAN_NOTE_TOKEN` | 与服务端鉴权一致时使用 |
| `PROJECT_NAME` | 项目名 |

## 配置

复制 `.env.example` 为 `.env`：

| 变量 | 含义 |
|------|------|
| `PORT` | API 端口，默认 8787 |
| `HOST` | 监听地址，默认 `127.0.0.1` |
| `DOCS_ROOT` | 文档根目录 |
| `PROJECTS_DIR` | 项目文档根目录 |
| `PROJECT_NAME` | 当前 Git 仓库的默认项目名称 |
| `GIT_REPO_PATH` | Git 仓库路径 |
| `ALLOW_WRITE` | 是否允许写文件 |
| `AUTH_TOKEN` | 非空则要求 Bearer Token |
| `CORS_ORIGINS` | 允许的浏览器 Origin |
| `LLM_ENABLED` | 是否启用 LLM |
| `OPENAI_API_KEY` | API Key |
| `OPENAI_BASE_URL` | 兼容接口 Base URL |
| `OPENAI_MODEL` | 模型名 |

未配置 API Key 时自动使用 **模板模式**（仍含统计、文件表、Mermaid）。

前端若启用了 `AUTH_TOKEN`，请到 **设置** 页保存相同 Token。

## 与 Codex 协作

1. 用 Codex 修改代码并自测  
2. 调用：

```text
POST /api/summary/daily  { "project": "md_online", "save": true, "force": true }
```

或让 Codex 执行 `npm run summary:today -- --save --force`  
3. 在文档站打开 `docs/projects/<project>/daily/当天.md` 复查 / 编辑  
4. 需要时把文档一并提交  

## 主要 API 一览

- `GET /api/health`
- `GET /api/config`
- `GET /api/docs/tree`
- `GET /api/docs/content?path=`
- `GET /api/docs/exists?path=`
- `PUT /api/docs/content`
- `GET /api/docs/search?q=`
- `GET /api/git/status`
- `GET /api/git/today`
- `POST /api/summary/daily`
- `POST /api/summary/preview`
- `POST /api/summary/save`
- `GET /api/summary/stats.svg`

更多说明见 `docs/guide/`。

## 测试

```bash
npm test
```

## 技术栈

- 前端：React 18、Vite、react-markdown、mermaid
- 后端：Node.js、Express、simple-git、gray-matter
- 存储：本地文件系统 + Git（无强制数据库）

## License

MIT
