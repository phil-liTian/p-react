const tools = [
  // ── 日常工具 ──────────────────────────────────────────────────────────
  {
    id: 'whistle',
    name: 'whistle 抓包',
    group: '日常工具',
    type: 'info',
    icon: '🔍',
    tags: [
      { label: '抓包', type: 'info' },
      { label: 'HTTP代理', type: 'info' },
      { label: 'mock', type: 'success' },
    ],
    summary: 'whistle 是基于 Node.js 的跨平台 HTTP/HTTPS 抓包调试代理工具，支持规则配置实现 mock、redirect、修改请求响应头等能力，是前端日常联调的核心利器。',
  },

  {
    id: 'switch-hosts',
    name: 'SwitchHosts',
    group: '日常工具',
    type: 'info',
    icon: '🌐',
    tags: [
      { label: 'hosts管理', type: 'info' },
      { label: '切换环境', type: 'success' },
      { label: '本地开发', type: 'warning' },
    ],
    summary: 'SwitchHosts 是一款跨平台的 hosts 文件管理工具，支持快速切换多套 hosts 方案，适合在本地开发、测试环境、生产联调等场景下快速切换域名解析配置。',
  },

  // ── AI 工具 ───────────────────────────────────────────────────────────
  {
    id: 'rtk',
    name: 'RTK (Rust Token Killer)',
    group: 'AI 工具',
    type: 'accent',
    icon: '🗜️',
    tags: [
      { label: 'Claude Code', type: 'accent' },
      { label: 'Token 压缩', type: 'warning' },
      { label: '60-90% 节省', type: 'success' },
    ],
    summary: 'RTK（Rust Token Killer）是 Claude Code 的命令行代理工具，通过过滤冗余输出将常用开发命令的 token 消耗压缩 60-90%，对用户完全透明，所有命令加 rtk 前缀即可生效。',
  },
  {
    id: 'cc-switch',
    name: 'cc-switch',
    group: 'AI 工具',
    type: 'accent',
    icon: '🔀',
    tags: [
      { label: 'Claude Code', type: 'accent' },
      { label: '配置切换', type: 'info' },
    ],
    summary: 'cc-switch 是用于在多个 Claude Code 配置文件（profile）之间快速切换的命令行工具，适合需要在个人账号和公司账号之间频繁切换的场景。官网地址：https://ccswitch.io/zh/',
  },
  {
    id: 'superpowers',
    name: 'Superpowers',
    group: 'AI 工具',
    type: 'accent',
    icon: '⚡',
    tags: [
      { label: 'Claude Code', type: 'accent' },
      { label: 'Skills', type: 'warning' },
      { label: '工作流', type: 'info' },
    ],
    summary: 'Superpowers 是 Claude Code 的插件系统，通过 Skills 机制为 AI 注入结构化工作流，让 Claude 在 brainstorming、TDD、debug 等场景中遵循最佳实践而非随意发挥。',
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
    <div class="pitfall-header">
      <div class="pitfall-icon">${t.icon}</div>
      <div class="pitfall-meta">
        <div class="pitfall-title">${t.name}</div>
        <div class="pitfall-tags">${tagsHtml(t.tags)}</div>
      </div>
    </div>
    <div class="pitfall-divider"></div>
    ${innerHtml}`;
}
