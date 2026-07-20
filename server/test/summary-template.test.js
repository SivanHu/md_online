import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildTemplateMarkdown } from '../src/services/summary.js';

describe('buildTemplateMarkdown', () => {
  it('includes core sections and frontmatter', () => {
    const md = buildTemplateMarkdown({
      date: '2026-07-20',
      project: 'md_online',
      projectId: 'md_online',
      style: 'daily_standup',
      language: 'zh-CN',
      customNotes: '测试备注',
      changes: {
        stats: { filesChanged: 1, insertions: 3, deletions: 1, commits: 1 },
        files: [{ path: 'server/src/a.js', status: 'M', insertions: 3, deletions: 1 }],
        commits: [{ shortHash: 'abc1234', message: 'fix stuff', authorName: 'dev' }],
        truncated: false,
      },
    });
    assert.match(md, /generated_by: sivan-note/);
    assert.match(md, /一句话概述/);
    assert.match(md, /server\/src\/a\.js/);
    assert.match(md, /abc1234/);
    assert.match(md, /测试备注/);
    assert.match(md, /```mermaid/);
  });
});
