---
name: update-daily-summary
description: Record what the user wanted and what Codex accomplished as a concise, readable Chinese work journal, save each project's entries in its own Sivan Note project directory, and sync through the remote document API. Use after Codex completes or meaningfully progresses a development task and the user asks to summarize, record, publish, or update today's work. Do not use for raw Git changelogs or for uploading an already-authored Markdown document unchanged.
---

# Update Daily Summary

Write a human-readable record of the collaboration, not a technical report or a reformatted Git diff.

## Prepare the environment

Require Node.js 18 or later and:

```bash
export SIVAN_NOTE_URL="http://192.168.231.1:8787"
export SIVAN_NOTE_TOKEN="token-configured-on-the-server"
```

Never print or persist `SIVAN_NOTE_TOKEN`.

## Understand the work

Inspect the conversation first, then use the Git diff, important files, and verification results only as evidence. Identify:

1. What the user wanted and why.
2. What Codex actually did.
3. What result is now available to the user.
4. What knowledge is genuinely useful for later reading.

Do not invent motivations or completed results. Do not make filenames, functions, routes, commit IDs, or line counts the main story.

## Write a readable entry

Write one concise Chinese entry. Prefer short paragraphs and result-oriented bullets. Use this structure:

```markdown
### <这项工作的直白标题>

#### 我想做什么
用第一人称说明目标以及遇到的问题。

#### Codex 帮我做了什么
按自然语言说明 Codex 的判断、主要操作和方案，不逐文件复述改动。

#### 最终结果
- 列出现在可以使用、确认或继续推进的结果。

#### 对我有用的知识
只记录以后仍有帮助的概念或经验。
```

Omit `对我有用的知识` when there is no meaningful lesson. Add `#### 后续事项` only for a real unfinished item. Put at most three essential file paths or commands in a final `#### 技术补充` section when they help future troubleshooting.

Keep one ordinary task easy to read in one or two minutes. Avoid code snippets unless the code itself is the lesson.

## Sync to the project document

Save only the entry to a temporary UTF-8 Markdown file. Choose a stable ID containing the project and task purpose, and reuse it when revising the same task.

Run the bundled script relative to this `SKILL.md`:

```bash
node scripts/sync-daily-summary.mjs \
  --input <temporary-entry.md> \
  --entry-id <project-task-slug> \
  --date <YYYY-MM-DD>
```

The script detects the current Git repository name and writes only to `projects/<project>/daily/YYYY-MM-DD.md`. Pass `--project <name>` only when the detected name is misleading. Different projects never share a daily file. It updates the same marked entry instead of duplicating it. Use `--dry-run` to inspect the merged document.

Do not call `/api/summary/daily` for work performed in another machine or repository. If synchronization fails, preserve the temporary entry and report its path and the error.
