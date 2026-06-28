const topics = [
  {
    id: 'python-overview',
    name: 'Python 概述',
    group: '🐍 概述',
    type: 'accent',
    icon: '🐍',
    tags: [
      { label: '概述', type: 'accent' },
      { label: '应用场景', type: 'info' },
      { label: 'AI/ML', type: 'success' },
      { label: '数据科学', type: 'warning' },
    ],
  },
  {
    id: 'uv-vs-npm',
    name: 'uv vs npm',
    group: '🛠️ 工具链',
    type: 'info',
    icon: '📦',
    tags: [
      { label: 'uv', type: 'accent' },
      { label: 'pip', type: 'info' },
      { label: '包管理', type: 'success' },
      { label: '对比', type: 'warning' },
    ],
  },
  {
    id: 'python-keywords',
    name: 'Python 关键字速查',
    group: '🐍 语法基础',
    type: 'success',
    icon: '🔑',
    tags: [
      { label: '关键字', type: 'accent' },
      { label: '语法', type: 'info' },
      { label: '速查', type: 'success' },
    ],
  },
  {
    id: 'python-crawler',
    name: 'Python 爬虫',
    group: '🕷️ 爬虫',
    type: 'warning',
    icon: '🕷️',
    tags: [
      { label: '爬虫', type: 'accent' },
      { label: 'requests', type: 'info' },
      { label: 'Playwright', type: 'success' },
      { label: 'Scrapy', type: 'warning' },
    ],
  },
  {
    id: 'rag-basics',
    name: 'RAG 基础概念',
    group: '🤖 AI 应用',
    type: 'info',
    icon: '🔍',
    tags: [
      { label: 'RAG', type: 'accent' },
      { label: 'Embedding', type: 'info' },
      { label: '向量检索', type: 'success' },
      { label: 'LLM', type: 'warning' },
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
  const [h1, h2] = headers || ['前端（npm）', 'Python（uv）'];
  const headerHtml = `
    <div class="compare-card-header">
      <div class="compare-card-header-cell frontend">${escHtml(h1)}</div>
      <div class="compare-card-header-cell python">${escHtml(h2)}</div>
      <div class="compare-card-header-cell desc">说明</div>
    </div>`;

  const rowsHtml = rows.map(([fe, py, desc]) => `
    <div class="compare-card-row">
      <div class="compare-card-cell frontend">${escHtml(fe)}</div>
      <div class="compare-card-cell python">${escHtml(py)}</div>
      <div class="compare-card-cell desc">${escHtml(desc)}</div>
    </div>`).join('');

  return `<div class="compare-card">${headerHtml}${rowsHtml}</div>`;
}
