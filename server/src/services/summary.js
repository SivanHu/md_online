import path from 'node:path';
import config from '../config.js';
import { getTodayChanges, getDiffSummary, todayBounds } from './git.js';
import { saveDocContent } from './docs.js';

function defaultOutputPath(date) {
  return path.posix.join(
    path.relative(config.docsRoot, config.dailyDir).replace(/\\/g, '/') || 'daily',
    `${date}.md`,
  );
}

function moduleOf(filePath) {
  const parts = filePath.replace(/\\/g, '/').split('/');
  if (parts.length === 1) return '(root)';
  return parts[0];
}

function groupByModule(files) {
  const map = new Map();
  for (const f of files) {
    const mod = moduleOf(f.path);
    if (!map.has(mod)) map.set(mod, []);
    map.get(mod).push(f);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function statusLabel(status) {
  const s = (status || 'M').charAt(0).toUpperCase();
  const map = { A: '新增', M: '修改', D: '删除', R: '重命名', C: '复制', '?': '未跟踪' };
  return map[s] || status || '修改';
}

function buildMermaidFlow(stats, modules) {
  const modNodes = modules.slice(0, 6).map(([name], i) => ({
    id: `M${i}`,
    label: name.replace(/"/g, "'"),
  }));

  const lines = ['flowchart LR', '  Codex[Codex / 开发改动] --> Git[Git 变更]'];
  if (modNodes.length === 0) {
    lines.push('  Git --> Summary[每日总结]');
  } else {
    for (const n of modNodes) {
      lines.push(`  Git --> ${n.id}["${n.label}"]`);
      lines.push(`  ${n.id} --> Summary[每日总结]`);
    }
  }
  lines.push('  Summary --> Docs[docs/daily]');
  lines.push(`  Stats["files ${stats.filesChanged} · +${stats.insertions} / -${stats.deletions}"]`);
  lines.push('  Summary --> Stats');
  return lines.join('\n');
}

function buildGitGraph(commits) {
  if (!commits?.length) return null;
  const lines = ['gitGraph'];
  const list = [...commits].reverse().slice(0, 12);
  for (const c of list) {
    const msg = (c.message || c.shortHash || 'commit').replace(/"/g, "'").slice(0, 40);
    const id = c.shortHash || c.hash?.slice(0, 7) || 'commit';
    lines.push(`  commit id: "${id} ${msg}"`);
  }
  return lines.join('\n');
}

function buildTemplateMarkdown({ date, style, language, changes, customNotes }) {
  const { stats, files, commits, truncated } = changes;
  const modules = groupByModule(files);
  const isZh = !language || language.toLowerCase().startsWith('zh');

  const overview = stats.filesChanged === 0
    ? (isZh ? '今日暂无检测到代码变更（含工作区）。' : 'No changes detected for this period.')
    : (isZh
      ? `共变更 ${stats.filesChanged} 个文件，+${stats.insertions} / -${stats.deletions}，涉及 ${commits.length} 个 commit。`
      : `${stats.filesChanged} files changed, +${stats.insertions}/-${stats.deletions}, ${commits.length} commits.`);

  const mainChanges = modules.map(([mod, list]) => {
    const detail = list
      .slice(0, 8)
      .map((f) => `${statusLabel(f.status)} \`${f.path}\` (+${f.insertions}/-${f.deletions})`)
      .join('；');
    return `- **${mod}**：${detail}${list.length > 8 ? ` 等 ${list.length} 个文件` : ''}`;
  });

  const fileRows = files
    .slice(0, 40)
    .map((f) => `| \`${f.path}\` | ${statusLabel(f.status)} | +${f.insertions} / -${f.deletions} |`)
    .join('\n');

  const commitLines = commits.length
    ? commits.map((c) => `- \`${c.shortHash || c.hash?.slice(0, 7)}\` ${c.message}（${c.authorName || 'unknown'}）`).join('\n')
    : (isZh ? '- （无 commit，可能仅为工作区未提交变更）' : '- (no commits; working tree only)');

  const flow = buildMermaidFlow(stats, modules);
  const gitGraph = buildGitGraph(commits);

  const styleTitle = {
    daily_standup: isZh ? '每日修改总结' : 'Daily Change Summary',
    changelog: isZh ? '变更日志' : 'Changelog',
    release_note: isZh ? '发布说明草稿' : 'Release Note Draft',
  }[style] || (isZh ? '修改总结' : 'Change Summary');

  const riskSection = isZh
    ? `## 风险与后续\n\n- [ ] 复查未提交变更是否需要拆分 commit\n- [ ] 确认测试覆盖与文档是否同步更新\n- [ ] 关注删除与重命名是否影响依赖方`
    : `## Risks & Follow-ups\n\n- [ ] Review uncommitted changes\n- [ ] Confirm tests/docs are updated\n- [ ] Check rename/delete impact`;

  const notes = customNotes
    ? (isZh ? `## 备注\n\n${customNotes}\n` : `## Notes\n\n${customNotes}\n`)
    : '';

  const truncateNote = truncated
    ? (isZh ? '\n> 注意：diff 过长已截断，统计基于 numstat，细节可能不完整。\n' : '\n> Note: diff truncated due to size.\n')
    : '';

  const gitGraphSection = gitGraph
    ? `\n## 提交演进\n\n\`\`\`mermaid\n${gitGraph}\n\`\`\`\n`
    : '';

  return `---
title: ${styleTitle} · ${date}
date: ${date}
tags: [daily, summary, ${style}]
generated_by: sivan-note
---

# ${styleTitle} · ${date}

## 一句话概述

${overview}
${truncateNote}
## 主要改动

${mainChanges.length ? mainChanges.join('\n') : (isZh ? '- 无' : '- None')}

## 变更文件

| 文件 | 变更类型 | 增删 |
|------|----------|------|
${fileRows || (isZh ? '| （无） | - | - |' : '| (none) | - | - |')}

## Commit 列表

${commitLines}

## 变更结构图

\`\`\`mermaid
${flow}
\`\`\`
${gitGraphSection}
${riskSection}

## 统计

- 文件：${stats.filesChanged}
- 新增行：${stats.insertions}
- 删除行：${stats.deletions}
- Commits：${stats.commits}

${notes}`.trim() + '\n';
}

async function buildLlmMarkdown({ date, style, language, changes, customNotes }) {
  const system = `You are a senior engineer writing a concise engineering daily summary in ${language || 'zh-CN'}.
Output pure Markdown only (no code fence wrapping the whole document).
Include YAML frontmatter with title, date, tags, generated_by: sivan-note.
Required sections:
1. 一句话概述
2. 主要改动 (bullet points by module)
3. 变更文件 table
4. Commit 列表
5. 变更结构图 (one mermaid flowchart)
6. Optional mermaid gitGraph if commits exist
7. 风险与后续 (checkboxes)
8. 统计
Be accurate to provided git data. Do not invent files or commits.
Style: ${style}.`;

  const userPayload = {
    date,
    style,
    language,
    customNotes: customNotes || null,
    stats: changes.stats,
    files: changes.files.slice(0, 80),
    commits: changes.commits.slice(0, 40),
    patchExcerpt: (changes.patch || '').slice(0, 24000),
    truncated: changes.truncated,
  };

  const res = await fetch(`${config.llm.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.llm.apiKey}`,
    },
    body: JSON.stringify({
      model: config.llm.model,
      temperature: 0.3,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify(userPayload, null, 2) },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error(`LLM request failed: ${res.status} ${text}`), { status: 502 });
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw Object.assign(new Error('LLM returned empty content'), { status: 502 });
  }
  return content.trim() + '\n';
}

export async function generateDailySummary(options = {}) {
  const {
    date: dateInput,
    since,
    until,
    baseRef,
    headRef,
    paths = [],
    style = config.summary.defaultStyle,
    language = config.summary.language,
    save = false,
    outputPath,
    customNotes = '',
    includeWorkingTree = true,
    useLlm,
  } = options;

  const bounds = todayBounds(dateInput);
  const date = bounds.date;

  let changes;
  if (baseRef) {
    changes = await getDiffSummary({
      baseRef,
      headRef: headRef || 'HEAD',
      paths,
      includeWorkingTree,
    });
  } else if (since || until) {
    changes = await getDiffSummary({
      since: since || bounds.start,
      until: until || bounds.end,
      paths,
      includeWorkingTree,
    });
  } else {
    changes = await getTodayChanges(date);
  }

  const shouldUseLlm = useLlm === undefined ? config.llm.enabled : Boolean(useLlm) && config.llm.enabled;

  let summaryMarkdown;
  let mode = 'template';
  if (shouldUseLlm) {
    try {
      summaryMarkdown = await buildLlmMarkdown({ date, style, language, changes, customNotes });
      mode = 'llm';
    } catch (err) {
      console.warn('LLM failed, fallback to template:', err.message);
      summaryMarkdown = buildTemplateMarkdown({ date, style, language, changes, customNotes });
      mode = 'template_fallback';
    }
  } else {
    summaryMarkdown = buildTemplateMarkdown({ date, style, language, changes, customNotes });
  }

  let savedPath = null;
  if (save) {
    const rel = (outputPath || defaultOutputPath(date)).replace(/\\/g, '/');
    await saveDocContent(rel, summaryMarkdown);
    savedPath = rel;
  }

  return {
    date,
    mode,
    style,
    language,
    summaryMarkdown,
    stats: changes.stats,
    commits: changes.commits,
    files: changes.files,
    truncated: changes.truncated,
    savedPath,
    llmEnabled: config.llm.enabled,
  };
}

export function buildStatsSvg(stats, modules) {
  const width = 640;
  const height = 220;
  const barMax = Math.max(...modules.map(([, n]) => n), 1);
  const bars = modules.slice(0, 8);
  const barWidth = 56;
  const gap = 18;
  const baseY = 170;
  const chartLeft = 40;

  const rects = bars.map(([name, count], i) => {
    const h = Math.round((count / barMax) * 120);
    const x = chartLeft + i * (barWidth + gap);
    const y = baseY - h;
    const label = name.length > 8 ? `${name.slice(0, 7)}…` : name;
    return `
      <rect x="${x}" y="${y}" width="${barWidth}" height="${h}" rx="6" fill="#3b82f6"/>
      <text x="${x + barWidth / 2}" y="${baseY + 16}" text-anchor="middle" font-size="11" fill="#64748b">${escapeXml(label)}</text>
      <text x="${x + barWidth / 2}" y="${y - 6}" text-anchor="middle" font-size="11" fill="#0f172a">${count}</text>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#f8fafc"/>
  <text x="20" y="28" font-size="16" font-family="Segoe UI, sans-serif" fill="#0f172a">变更模块分布 · files ${stats.filesChanged} · +${stats.insertions}/-${stats.deletions}</text>
  ${rects || '<text x="20" y="100" fill="#94a3b8">No file changes</text>'}
</svg>`;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function modulesFromFiles(files) {
  const map = new Map();
  for (const f of files) {
    const mod = moduleOf(f.path);
    map.set(mod, (map.get(mod) || 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}
