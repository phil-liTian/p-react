const tools = [
  // ── 工具箱 ────────────────────────────────────────────────────────────
  {
    id: 'resize-image',
    name: '在线改变图片尺寸',
    group: '工具箱',
    type: 'info',
    icon: '🖼️',
    tags: [
      { label: '图片处理', type: 'info' },
      { label: '在线工具', type: 'success' },
    ],
    summary: '在线调整图片尺寸，支持自定义宽高、等比缩放，无需安装任何软件，直接在浏览器中完成图片尺寸修改并下载。',
    url: 'https://phoedit.com/zh/resize-image/',
  },

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

  {
    id: 'cookie-sync',
    name: 'Cookie Sync Assistant',
    group: '日常工具',
    type: 'info',
    icon: '🍪',
    tags: [
      { label: 'Cookie 同步', type: 'info' },
      { label: '本地开发', type: 'warning' },
      { label: 'Chrome 扩展', type: 'success' },
    ],
    summary: 'Cookie Sync Assistant 是 Chrome 扩展，自动把生产环境的 Cookie 同步到 localhost / 127.0.0.1，让本地开发服务器直接复用线上登录会话，免去手动从 DevTools 复制 Cookie 的繁琐流程。应用商店：https://chromewebstore.google.com/detail/cookie-sync-assistant/agpegklbpdijjppfejcbiklfihbjkcbp',
    url: 'https://chromewebstore.google.com/detail/cookie-sync-assistant/agpegklbpdijjppfejcbiklfihbjkcbp',
  },

  {
    id: 'jetbrains-toolbox',
    name: 'JetBrains Toolbox',
    group: '日常工具',
    type: 'info',
    icon: '🧰',
    tags: [
      { label: 'JetBrains', type: 'info' },
      { label: 'IDE 管理', type: 'success' },
      { label: '版本切换', type: 'warning' },
    ],
    summary: 'JetBrains Toolbox 是统一管理所有 JetBrains IDE 的桌面应用，支持一键安装/更新/回滚 IntelliJ IDEA、WebStorm、GoLand 等，并能为每个项目指定不同 IDE 版本。',
    url: 'https://www.jetbrains.com.cn/toolbox-app/',
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
  {
    id: 'web-access',
    name: 'web-access',
    group: 'AI 工具',
    type: 'accent',
    icon: '🌐',
    tags: [
      { label: 'Claude Code', type: 'accent' },
      { label: '联网', type: 'info' },
      { label: 'Anchor Browser', type: 'warning' },
    ],
    summary: 'web-access 是 Claude Code 的联网操作 skill，所有搜索、网页抓取、登录后操作、动态渲染页面（小红书、微博等）均通过此 skill 处理，底层自动选择 WebFetch 或 Anchor Browser MCP。',
  },
  {
    id: 'cc-gui',
    name: 'CC GUI',
    group: 'AI 工具',
    type: 'accent',
    icon: '🖥️',
    tags: [
      { label: 'JetBrains 插件', type: 'accent' },
      { label: 'Claude Code', type: 'accent' },
      { label: 'Codex', type: 'warning' },
    ],
    summary: 'CC GUI（原名 Claude Code GUI）是开源的 JetBrains 插件，为 Claude Code 和 OpenAI Codex 提供 GUI 界面，在 IDEA 内直接使用 AI 编程辅助，支持 @file 引用、图片输入、Agent、MCP、Diff 对比与会话管理。项目地址：https://github.com/zhukunpenglinyutong/jetbrains-cc-gui',
    url: 'https://github.com/zhukunpenglinyutong/desktop-cc-gui/releases',
  },
  {
    id: 'teamstudio',
    name: 'TeamStudio',
    group: 'AI 工具',
    type: 'accent',
    icon: '📚',
    tags: [
      { label: '上下文管理', type: 'accent' },
      { label: 'CLI 注入', type: 'info' },
      { label: 'AGENTS.md', type: 'success' },
      { label: '团队协同', type: 'warning' },
    ],
    summary: 'TeamStudio 管理公司的 AI 上下文（规范、文档、技能等），通过 CLI 注入到本地 Coding Agent（Claude Code / Cursor 等）。维护者把内容按目录约定放进 Git，平台注册为"包"后项目里勾选；开发者装一次客户端，启动助手时自动同步，AGENTS.md 始终注入、技能按需触发、文档按需阅读、资源搜索拉取。',
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
