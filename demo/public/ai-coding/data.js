const topics = [
  {
    id: 'my-view',
    name: '我对 AI Coding 的理解',
    group: '💡 认知篇',
    type: 'accent',
    icon: '💡',
    tags: [
      { label: '核心观点', type: 'accent' },
      { label: '三层模型', type: 'info' },
      { label: '本质', type: 'purple' },
    ],
  },
  {
    id: 'industry-impact',
    name: '对行业与程序员的影响',
    group: '💡 认知篇',
    type: 'warning',
    icon: '🌊',
    tags: [
      { label: '行业趋势', type: 'warning' },
      { label: '职业影响', type: 'info' },
      { label: '机遇与风险', type: 'danger' },
    ],
  },
  {
    id: 'tool-comparison',
    name: '主流工具横评',
    group: '🛠 工具篇',
    type: 'info',
    icon: '🛠',
    tags: [
      { label: 'Cursor', type: 'info' },
      { label: 'Claude Code', type: 'accent' },
      { label: 'Copilot', type: 'success' },
      { label: '横评', type: 'warning' },
    ],
  },
  {
    id: 'mindset',
    name: '使用心法',
    group: '🧠 方法篇',
    type: 'purple',
    icon: '🧠',
    tags: [
      { label: '原则', type: 'purple' },
      { label: '思维方式', type: 'info' },
      { label: '协作模式', type: 'accent' },
    ],
  },
  {
    id: 'prompt-skills',
    name: '提示词技巧',
    group: '🧠 方法篇',
    type: 'success',
    icon: '✍️',
    tags: [
      { label: 'Prompt', type: 'success' },
      { label: '上下文', type: 'info' },
      { label: '最佳实践', type: 'accent' },
    ],
  },
  {
    id: 'workflow',
    name: '工作流实践',
    group: '🧠 方法篇',
    type: 'accent',
    icon: '⚙️',
    tags: [
      { label: '工作流', type: 'accent' },
      { label: '新功能开发', type: 'success' },
      { label: 'Bug 调试', type: 'warning' },
      { label: '重构', type: 'info' },
    ],
  },
  {
    id: 'vibe-coding',
    name: 'Vibe Coding 实用技巧',
    group: '🧠 方法篇',
    type: 'success',
    icon: '🎯',
    tags: [
      { label: 'Vibe Coding', type: 'success' },
      { label: '实战技巧', type: 'accent' },
      { label: '流程', type: 'info' },
      { label: 'Anti-patterns', type: 'danger' },
    ],
  },
  {
    id: 'spec-coding',
    name: 'Spec Coding 落地实践',
    group: '🧠 方法篇',
    type: 'purple',
    icon: '📋',
    tags: [
      { label: 'Spec Coding', type: 'purple' },
      { label: 'vs Vibe Coding', type: 'info' },
      { label: '四步落地', type: 'accent' },
      { label: '大项目管理', type: 'warning' },
    ],
  },
  {
    id: 'skill-recommendations',
    name: 'AI Coding Skill 推荐',
    group: '🧠 方法篇',
    type: 'success',
    icon: '⚡',
    tags: [
      { label: 'Superpower', type: 'accent' },
      { label: 'UI UX Pro Max', type: 'purple' },
      { label: 'Web Access', type: 'info' },
      { label: 'Skill 推荐', type: 'success' },
    ],
  },
  {
    id: 'claude-md-best-practices',
    name: 'CLAUDE.md 最佳实践',
    group: '🧠 方法篇',
    type: 'info',
    icon: '📄',
    tags: [
      { label: 'CLAUDE.md', type: 'info' },
      { label: '该写什么', type: 'accent' },
      { label: '分层管理', type: 'success' },
      { label: '踩坑总结', type: 'warning' },
    ],
  },
  {
    id: 'claude-md-examples',
    name: 'CLAUDE.md 编写示例（前端 & 后端）',
    group: '🧠 方法篇',
    type: 'accent',
    icon: '📝',
    tags: [
      { label: '后端示例', type: 'info' },
      { label: '前端示例', type: 'success' },
      { label: '批注解析', type: 'accent' },
      { label: 'Spring Boot', type: 'warning' },
    ],
  },
  {
    id: 'limits-risks',
    name: '边界与风险',
    group: '⚠️ 风险篇',
    type: 'danger',
    icon: '⚠️',
    tags: [
      { label: '能力边界', type: 'warning' },
      { label: 'Hallucination', type: 'danger' },
      { label: '数据安全', type: 'danger' },
      { label: '能力退化', type: 'warning' },
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

function kvList(rows) {
  const rowsHtml = rows.map(([key, val]) => `
    <div class="kv-row">
      <div class="kv-key">${escHtml(key)}</div>
      <div class="kv-val">${val}</div>
    </div>`).join('');
  return `<div class="kv-list">${rowsHtml}</div>`;
}

function stepList(steps) {
  const stepsHtml = steps.map((s, i) => `
    <div class="step-item">
      <div class="step-num">${i + 1}</div>
      <div class="step-body">
        <div class="step-title">${escHtml(s.title)}</div>
        <div class="step-desc">${s.desc}</div>
      </div>
    </div>`).join('');
  return `<div class="step-list">${stepsHtml}</div>`;
}

function cardGrid(cards) {
  const cardsHtml = cards.map(c => `
    <div class="card-item">
      <div class="card-item-icon">${c.icon}</div>
      <div class="card-item-title">${escHtml(c.title)}</div>
      <div class="card-item-body">${c.body}</div>
    </div>`).join('');
  return `<div class="card-grid">${cardsHtml}</div>`;
}

function compareCard(rows, headers) {
  const [h1, h2, h3] = headers || ['工具', '定位', '说明'];
  const headerHtml = `
    <div class="compare-card-header">
      <div class="compare-card-header-cell" style="color:var(--accent-light)">${escHtml(h1)}</div>
      <div class="compare-card-header-cell" style="color:var(--blue)">${escHtml(h2)}</div>
      ${h3 ? `<div class="compare-card-header-cell" style="color:var(--gray-dark)">${escHtml(h3)}</div>` : ''}
    </div>`;
  const rowsHtml = rows.map(([c1, c2, c3]) => `
    <div class="compare-card-row">
      <div class="compare-card-cell" style="color:var(--accent-light)">${escHtml(c1)}</div>
      <div class="compare-card-cell" style="color:var(--blue)">${escHtml(c2)}</div>
      ${c3 ? ` <div class="compare-card-cell desc">${escHtml(c3)}</div>` : ''} 
    </div>`).join('');
  return `<div class="compare-card">${headerHtml}${rowsHtml}</div>`;
}
