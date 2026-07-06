const topics = [
  {
    id: 'no-rag-context-stuffing',
    name: '不用 RAG 全塞上下文',
    group: '🔍 RAG',
    type: 'warning',
    icon: '📦',
    tags: [
      { label: 'Context Stuffing', type: 'warning' },
      { label: 'Long Context', type: 'info' },
      { label: '成本', type: 'danger' },
      { label: '选型', type: 'accent' },
    ],
  },
  {
    id: 'rag-principle',
    name: 'RAG 原理',
    group: '🔍 RAG',
    type: 'accent',
    icon: '🔍',
    tags: [
      { label: 'RAG', type: 'accent' },
      { label: 'Embedding', type: 'info' },
      { label: '向量数据库', type: 'success' },
      { label: 'Rerank', type: 'warning' },
    ],
  },
  {
    id: 'what-is-agent',
    name: '什么是 Agent',
    group: '🤖 Agent',
    type: 'accent',
    icon: '🤖',
    tags: [
      { label: 'Agent', type: 'accent' },
      { label: 'LLM 对话', type: 'info' },
      { label: '贾维斯', type: 'success' },
      { label: 'ReAct', type: 'warning' },
    ],
  },
];

// ── Shared helpers ────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function tagsHtml(tags) {
  return tags.map(t => `<span class="tag tag-${escHtml(t.type)}">${escHtml(t.label)}</span>`).join('');
}

function codeBlock(label, dotClass, lang, code) {
  return `
    <div class="code-block-wrap">
      <div class="code-block-label">
        <span class="code-block-label-dot ${escHtml(dotClass)}"></span>
        <span class="code-block-label-text">${escHtml(label)}</span>
      </div>
      <pre><code class="language-${lang}">${escHtml(code)}</code></pre>
    </div>`;
}

function codeBlocksRow(blocks) {
  return `<div class="code-blocks-row">${blocks.join('')}</div>`;
}

function ruleBox(type, html) {
  return `<div class="rule-box rule-box-${type}">${html}</div>`;
}

function section(title, bodyHtml) {
  return `
    <div class="section">
      <div class="section-title">${title}</div>
      <div class="section-body">${bodyHtml}</div>
    </div>`;
}

function articleShell(t, innerHtml) {
  return `
    <div class="article-header">
      <div class="article-icon">${t.icon}</div>
      <div class="article-meta">
        <div class="article-title">${t.name}</div>
        <div class="article-tags">${tagsHtml(t.tags)}</div>
      </div>
    </div>
    <div class="article-divider"></div>
    ${innerHtml}`;
}

function compareCard(rows, headers) {
  const [h1, h2] = headers || ['传统方案', 'AI 方案'];
  const headerHtml = `
    <div class="compare-card-header">
      <div class="compare-card-header-cell frontend">${escHtml(h1)}</div>
      <div class="compare-card-header-cell ai">${escHtml(h2)}</div>
      <div class="compare-card-header-cell desc">说明</div>
    </div>`;

  const rowsHtml = rows.map(([fe, ai, desc]) => `
    <div class="compare-card-row">
      <div class="compare-card-cell frontend">${escHtml(fe)}</div>
      <div class="compare-card-cell ai">${escHtml(ai)}</div>
      <div class="compare-card-cell desc">${escHtml(desc)}</div>
    </div>`).join('');

  return `<div class="compare-card">${headerHtml}${rowsHtml}</div>`;
}
