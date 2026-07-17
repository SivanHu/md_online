---
name: update-daily-summary
description: Summarize a completed or meaningfully progressed development task as problem context, solution approach, core code, technical knowledge, and verification, then sync it from Codex CLI or the IDE to a remote Sivan Note daily Markdown document. Use when the user asks to record, update, publish, or sync a development summary, work log, daily note, or project learning. Do not use for a raw Git changelog or when no meaningful work has been completed.
---

# Update Daily Summary

Create a useful engineering narrative from the current task and update the Sivan Note service running on another machine.

## Prepare the environment

Require Node.js 18 or later and these environment variables in the Codex execution environment:

```bash
export SIVAN_NOTE_URL="http://192.168.231.1:8787"
export SIVAN_NOTE_TOKEN="token-configured-on-the-server"
```

Treat `SIVAN_NOTE_TOKEN` as a secret. Never print it, write it into the repository, or pass it as a command-line argument.

## Build the entry

Inspect the conversation, relevant Git diff, changed files, tests, and implementation before writing. Prefer evidence from the task over commit-message wording. Do not invent motivations or results.

Write one self-contained Markdown entry using this structure:

```markdown
## <short task title>

### 背景与目标
Explain the concrete problem, constraint, or user need.

### 解决方式
Explain the chosen approach and why it solves the problem. Mention meaningful tradeoffs.

### 核心代码
Name the important files, functions, routes, or data structures. Include only short snippets when they materially clarify the implementation.

### 涉及知识
Explain reusable concepts, framework behavior, protocols, or engineering lessons involved.

### 验证与结果
Record commands or checks actually run and their outcomes.
```

Add `### 遗留问题` only when a real limitation or follow-up remains. Do not turn file counts, insertion counts, or a file-by-file diff into the main narrative.

## Sync the entry

Save only the entry to a temporary UTF-8 Markdown file. Build a stable entry ID from the repository name and task purpose, using lowercase letters, digits, dots, underscores, or hyphens. Reuse that ID when revising the same task.

Run the bundled script from this skill directory:

```bash
node scripts/sync-daily-summary.mjs \
  --input <temporary-entry.md> \
  --entry-id <repository-task-slug> \
  --date <YYYY-MM-DD>
```

Resolve `scripts/sync-daily-summary.mjs` relative to this `SKILL.md`, not relative to the user's repository. Omit `--date` to use the local calendar date. Use `--dry-run` to inspect the merged document without writing it.

The script reads the existing `daily/YYYY-MM-DD.md`, inserts or replaces the marked entry, writes the merged document through `PUT /api/docs/content`, and verifies the saved document. Do not call `/api/summary/daily` for changes made in the VM because that endpoint inspects the Windows host repository instead.

If synchronization fails, preserve the generated entry locally and report the error and file path. Never claim the online document was updated without a successful response and verification.
