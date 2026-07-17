---
name: upload-markdown
description: Upload an existing Markdown file to a chosen path in the remote Sivan Note document service without rewriting, summarizing, restructuring, or wrapping its contents. Use when Codex has already generated a .md, .markdown, or .mdx file and the user asks to upload, publish, or sync that file as-is. Do not use when the user wants a formatted daily Codex work summary.
---

# Upload Markdown

Upload an already-authored Markdown document exactly as saved on disk.

## Prepare the environment

Require Node.js 18 or later and:

```bash
export SIVAN_NOTE_URL="http://192.168.231.1:8787"
export SIVAN_NOTE_TOKEN="token-configured-on-the-server"
```

Never print or persist `SIVAN_NOTE_TOKEN`.

## Select the source and destination

Use the Markdown file explicitly named by the user or the file just generated in the current task. Do not change its title, frontmatter, headings, spacing, or content for this upload.

Choose a path relative to the Sivan Note `docs` root. Preserve the source filename by default. Use a folder such as `notes/`, `guides/`, or `projects/<project>/` only when the user specified it or the context makes the destination unambiguous.

If the destination already exists, do not overwrite it unless the user explicitly asked to replace or update it.

## Upload and verify

Run the bundled script relative to this `SKILL.md`:

```bash
node scripts/upload-markdown.mjs \
  --input <local-file.md> \
  --path <docs-relative-path.md>
```

Add `--overwrite` only with explicit authorization to replace an existing document. Omit `--path` to upload to the docs root using the source filename. Use `--dry-run` to validate and display the destination without writing.

The script writes through `PUT /api/docs/content` and then reads the file back to verify exact content equality. Report the confirmed destination. If uploading fails, keep the local Markdown file and report its path and the error.
