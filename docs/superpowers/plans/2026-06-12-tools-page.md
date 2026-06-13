# Tools Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `demo/tools.html` — a dev-tools reference page matching pitfalls.html's layout, with two nav groups (日常工具 / AI 工具) and three tool articles (whistle, cc-switch, Superpowers).

**Architecture:** Single self-contained HTML file using the same CSS variable system and sidebar+content layout as pitfalls.html. Tool data stored as a JS array; each tool renders its own article HTML via a per-tool render function. hub.html footer gets a new link.

**Tech Stack:** Vanilla HTML/CSS/JS · highlight.js 11.9.0 (CDNJS) · Google Fonts (Inter + JetBrains Mono)

---

## Files

| Path | Action | Responsibility |
|---|---|---|
| `demo/tools.html` | Create | Full page: CSS, HTML skeleton, tool data, render logic, nav/selection JS |
| `demo/hub.html` | Modify (line ~489) | Add footer link to tools.html alongside existing pitfalls link |

---

### Task 1: Create demo/tools.html — full CSS + HTML skeleton

**Files:**
- Create: `demo/tools.html`

- [ ] **Step 1: Create the file with DOCTYPE, head, and CSS**

Copy the entire `<style>` block from `demo/pitfalls.html` (lines 10–465) verbatim into `demo/tools.html`. The CSS is identical — same design tokens, sidebar, content, code-block, rule-box, step-list, mobile styles.

Change only:
- `<title>` → `p-react · 开发小工具`
- Add one extra CSS rule for the accent badge type (purple):

```html
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>p-react · 开发小工具</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
  <style>
    /* === paste entire <style> from pitfalls.html here === */

    /* Extra: accent badge type for AI tools nav icons */
    .tag-accent { color: var(--accent-light); background: var(--accent-glow); border: 1px solid rgba(124,58,237,0.3); }
  </style>
</head>
```

- [ ] **Step 2: Add HTML body skeleton**

```html
<body>
<div class="sidebar-overlay" id="sidebar-overlay"></div>

<div class="app">
  <!-- Mobile Topbar -->
  <div class="mobile-topbar" id="mobile-topbar" style="display:none">
    <button class="menu-toggle" id="menu-toggle-top" aria-label="打开菜单">☰</button>
    <span class="mobile-topbar-title" id="mobile-topbar-title">开发小工具</span>
  </div>

  <!-- Sidebar -->
  <aside class="sidebar" id="sidebar-el">
    <div class="sidebar-logo">
      <div class="logo-hexagon">p</div>
      <span class="logo-text">p-react</span>
      <span class="logo-badge" style="color:var(--blue);background:rgba(88,166,255,0.1);border-color:rgba(88,166,255,0.3)">tools</span>
      <div style="flex:1"></div>
      <button class="menu-toggle" id="sidebar-close" aria-label="关闭菜单" style="display:none">✕</button>
    </div>
    <nav class="sidebar-nav" id="sidebar-nav"></nav>
    <div class="sidebar-footer">
      <a class="back-link" href="hub.html">← 返回 Hub</a>
    </div>
  </aside>

  <!-- Main Content -->
  <main class="content">
    <div class="content-header">
      <span class="content-header-icon">🛠</span>
      <span class="content-header-label">开发小工具</span>
      <span class="content-header-dot">·</span>
      <span class="content-header-name" id="content-header-name">选择左侧条目</span>
      <div class="content-header-spacer"></div>
      <span class="content-header-badge" id="content-header-badge"></span>
    </div>
    <div class="article-wrapper" id="article-wrapper"></div>
  </main>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
<script>
// tool data and logic goes here (Tasks 2–4)
</script>
</body>
</html>
```

- [ ] **Step 3: Open in browser and verify skeleton**

Open `demo/tools.html` directly in a browser (file:// or via dev server). Expect: dark sidebar on left, empty content area on right, "选择左侧条目" in header. No JS errors in console.

---

### Task 2: Add tools data array

**Files:**
- Modify: `demo/tools.html` (inside `<script>`)

- [ ] **Step 1: Write the tools data array**

Replace the `// tool data and logic goes here` comment with:

```js
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

  // ── AI 工具 ───────────────────────────────────────────────────────────
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
    summary: 'cc-switch 是用于在多个 Claude Code 配置文件（profile）之间快速切换的命令行工具，适合需要在个人账号和公司账号之间频繁切换的场景。',
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
```

- [ ] **Step 2: No browser check needed** — data only, no rendering yet.

---

### Task 3: Implement renderTool and sidebar nav

**Files:**
- Modify: `demo/tools.html` (inside `<script>`, after tools array)

- [ ] **Step 1: Add shared HTML helpers**

```js
function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function tagsHtml(tags) {
  return tags.map(t => `<span class="tag tag-${t.type}">${t.label}</span>`).join('');
}

function codeBlock(label, dotClass, lang, code) {
  return `
    <div class="code-block-wrap">
      <div class="code-block-label">
        <span class="code-block-label-dot ${dotClass}"></span>
        <span class="code-block-label-text">${label}</span>
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
```

- [ ] **Step 2: Add renderWhistle()**

```js
function renderWhistle(t) {
  const quickStart = `
    <ol class="step-list">
      <li><span class="step-num">01</span><span># 全局安装<br><code>npm i -g whistle</code></span></li>
      <li><span class="step-num">02</span><span>启动代理服务<br><code>w2 start</code><br><small style="color:var(--text-muted)">默认监听 127.0.0.1:8899</small></span></li>
      <li><span class="step-num">03</span><span>浏览器 / 系统代理设置为 <code>127.0.0.1:8899</code></span></li>
      <li><span class="step-num">04</span><span>访问 <code>http://127.0.0.1:8899</code> 打开 Whistle UI</span></li>
      <li><span class="step-num">05</span><span>HTTPS 抓包：UI 顶部 → HTTPS → 下载根证书 → 系统信任</span></li>
    </ol>`;

  const rulesCode = `# mock 响应（Values 标签页新建 user.json，填入 JSON 数据）
example.com/api/user mock://{user.json}

# 重定向请求
example.com/old-path redirect://https://example.com/new-path

# 修改响应头（Values 中新建 res-headers.txt）
example.com/api resHeaders://{res-headers.txt}

# 映射到本地文件（调试本地构建产物）
example.com/bundle.js file:///Users/me/project/dist/bundle.js

# 打印请求/响应到 log（调试时常用）
example.com log://

# 模拟慢网络，delay 2 秒
example.com/api/heavy reqDelay://2000

# 注入自定义 JS 到页面
example.com/page jsAppend://{inject.js}`;

  const tips = [
    ruleBox('info', '<strong>规则生效顺序：</strong>Rules 面板中，靠上的规则优先级更高。同一域名多条规则同时生效时注意顺序。'),
    ruleBox('warning', '移动端抓包：手机与电脑连同一 WiFi → 手机 WiFi 设置手动代理 → IP 填电脑局域网 IP → 端口 8899 → 手机浏览器访问 http://电脑IP:8899/cgi-bin/rootca 安装证书。'),
    ruleBox('success', '开启 <strong>intercept HTTPS</strong> 后，whistle 充当中间人解密 HTTPS 流量。证书不受信任时浏览器会报 NET::ERR_CERT_AUTHORITY_INVALID，需手动信任根证书。'),
  ];

  return `
    <div class="pitfall-header">
      <div class="pitfall-icon">${t.icon}</div>
      <div class="pitfall-meta">
        <div class="pitfall-title">${t.name}</div>
        <div class="pitfall-tags">${tagsHtml(t.tags)}</div>
      </div>
    </div>
    <div class="pitfall-divider"></div>
    ${section('工具简介', `<p>${t.summary}</p>`)}
    ${section('快速上手', quickStart)}
    ${section('常用规则速查', codeBlock('whistle rules', 'dot-yellow', 'bash', rulesCode))}
    ${section('注意事项', tips.join(''))}`;
}
```

- [ ] **Step 3: Add renderCcSwitch()**

```js
function renderCcSwitch(t) {
  const installCode = `# 安装
npm i -g @anthropic-ai/claude-code-switch
# 或使用 npx（无需全局安装）
npx cc-switch`;

  const usageCode = `# 查看当前使用的 profile
cc-switch current

# 列出所有已配置的 profile
cc-switch list

# 切换到指定 profile
cc-switch use <profile-name>

# 新增一个 profile（交互式，按提示输入 API Key 等）
cc-switch add <profile-name>

# 删除 profile
cc-switch remove <profile-name>`;

  const steps = `
    <ol class="step-list">
      <li><span class="step-num">01</span><span>安装：<code>npm i -g cc-switch</code></span></li>
      <li><span class="step-num">02</span><span>添加第一个 profile：<code>cc-switch add personal</code>（按提示输入 API Key）</span></li>
      <li><span class="step-num">03</span><span>添加第二个 profile：<code>cc-switch add work</code></span></li>
      <li><span class="step-num">04</span><span>切换：<code>cc-switch use work</code> → 后续 Claude Code 会话使用 work profile</span></li>
      <li><span class="step-num">05</span><span>确认当前 profile：<code>cc-switch current</code></span></li>
    </ol>`;

  const scenarios = [
    ruleBox('info', '<strong>个人 vs 公司账号：</strong>个人开发用 <code>personal</code> profile（个人 API Key），公司项目切到 <code>work</code> profile（公司统一 Key 或 AWS Bedrock 配置）。一条命令完成切换，无需手动改 ~/.claude 文件。'),
    ruleBox('success', '<strong>团队共享配置：</strong>可将 profile 配置导出为环境变量，通过 CI/CD 或 dotenv 注入，让 CI 环境与本地保持一致的 Claude 配置。'),
  ];

  return `
    <div class="pitfall-header">
      <div class="pitfall-icon">${t.icon}</div>
      <div class="pitfall-meta">
        <div class="pitfall-title">${t.name}</div>
        <div class="pitfall-tags">${tagsHtml(t.tags)}</div>
      </div>
    </div>
    <div class="pitfall-divider"></div>
    ${section('工具简介', `<p>${t.summary}</p>`)}
    ${section('安装与使用步骤', steps)}
    ${section('命令速查', codeBlock('cc-switch CLI', 'dot-yellow', 'bash', usageCode))}
    ${section('典型场景', scenarios.join(''))}`;
}
```

- [ ] **Step 4: Add renderSuperpowers()**

```js
function renderSuperpowers(t) {
  const invocationCode = `# 方式一：用户在 prompt 中显式调用
/brainstorming
/superpowers:systematic-debugging

# 方式二：Claude 在工具调用链中自动触发（通过 Skill tool）
# 当 using-superpowers 技能检测到场景匹配时，Claude 会自动 invoke`;

  const skillsTable = `
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px">
      <thead>
        <tr style="border-bottom:1px solid var(--border)">
          <th style="text-align:left;padding:6px 10px;color:var(--text-muted);font-weight:600;font-size:11px;letter-spacing:0.5px">SKILL</th>
          <th style="text-align:left;padding:6px 10px;color:var(--text-muted);font-weight:600;font-size:11px;letter-spacing:0.5px">触发时机</th>
          <th style="text-align:left;padding:6px 10px;color:var(--text-muted);font-weight:600;font-size:11px;letter-spacing:0.5px">作用</th>
        </tr>
      </thead>
      <tbody>
        ${[
          ['brainstorming', '创建功能/组件前', '梳理需求、提出方案、等用户确认后再动手'],
          ['writing-plans', '有 spec 需要拆解实现时', '生成含完整代码的分步计划文档'],
          ['executing-plans', '执行已有 plan 时', '逐步推进、设 checkpoint、可暂停审查'],
          ['superpowers:test-driven-development', '实现任何 feature 或 bugfix 前', '先写失败测试，再写最小实现，循环迭代'],
          ['superpowers:systematic-debugging', '遇到 bug / 测试失败时', '系统化定位根因，不乱猜不乱改'],
          ['superpowers:verification-before-completion', '声称工作完成前', '强制跑验证命令、看输出后才能说"Done"'],
          ['superpowers:finishing-a-development-branch', '实现完成需要合并时', '给出 merge / PR / cleanup 的结构化选项'],
          ['superpowers:dispatching-parallel-agents', '有 2+ 个独立任务时', '并行派发 subagent，加速执行'],
          ['superpowers:receiving-code-review', '收到 code review 反馈时', '严格验证反馈正确性后再改，不盲目接受'],
        ].map(([name, when, desc]) => `
          <tr style="border-bottom:1px solid var(--border)">
            <td style="padding:8px 10px;font-family:var(--font-code);font-size:11.5px;color:var(--accent-light)">${name}</td>
            <td style="padding:8px 10px;color:var(--text-secondary)">${when}</td>
            <td style="padding:8px 10px;color:var(--text-muted)">${desc}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;

  const principles = [
    ruleBox('warning', '<strong>1% 原则：</strong>只要有 1% 的可能某个 skill 适用，就必须调用它。常见理由化（"这太简单了不需要 skill"、"我先做完这件小事"）都是失败信号。'),
    ruleBox('info', '<strong>优先级：</strong>Process skills 优先（brainstorming、debugging），再执行 implementation skills。"Let\'s build X" → 先 brainstorming，再写代码。'),
    ruleBox('success', '<strong>安装方式：</strong>将 superpowers 插件目录放入 <code>~/.claude/plugins/</code>，Claude Code 启动时自动加载。可通过 <code>/using-superpowers</code> 查看已加载的所有 skill 列表。'),
  ];

  return `
    <div class="pitfall-header">
      <div class="pitfall-icon">${t.icon}</div>
      <div class="pitfall-meta">
        <div class="pitfall-title">${t.name}</div>
        <div class="pitfall-tags">${tagsHtml(t.tags)}</div>
      </div>
    </div>
    <div class="pitfall-divider"></div>
    ${section('是什么', `<p>${t.summary}</p><p style="margin-top:8px">Skills 本质上是一份 Markdown 文档，描述了某类任务的最佳工作流。Claude 读取 skill 内容后，会按其中的步骤清单执行，而不是凭直觉随意发挥。</p>`)}
    ${section('如何触发 Skill', codeBlock('调用方式', 'dot-yellow', 'bash', invocationCode))}
    ${section('核心 Skill 速查', skillsTable)}
    ${section('使用原则', principles.join(''))}`;
}
```

- [ ] **Step 5: Add renderTool dispatcher + sidebar builder**

```js
function renderTool(t) {
  const el = document.createElement('div');
  el.className = 'pitfall';
  el.id = 'tool-' + t.id;

  const renderers = {
    whistle: renderWhistle,
    'cc-switch': renderCcSwitch,
    superpowers: renderSuperpowers,
  };
  el.innerHTML = renderers[t.id](t);
  document.getElementById('article-wrapper').appendChild(el);
}

// Build sidebar nav
const sidebarNav = document.getElementById('sidebar-nav');
const groups = [...new Set(tools.map(t => t.group))];

const typeIcon = { info: '🔵', accent: '🟣' };

groups.forEach(group => {
  const groupEl = document.createElement('div');
  groupEl.className = 'nav-group';

  const label = document.createElement('div');
  label.className = 'nav-group-label';
  label.textContent = group;
  groupEl.appendChild(label);

  tools.filter(t => t.group === group).forEach(t => {
    const item = document.createElement('div');
    item.className = 'nav-item';
    item.dataset.id = t.id;
    item.innerHTML = `<span class="nav-sev">${typeIcon[t.type] || ''}</span>${t.name}`;
    item.addEventListener('click', () => selectTool(t.id));
    groupEl.appendChild(item);
  });

  sidebarNav.appendChild(groupEl);
});

// Render all tool articles
tools.forEach(renderTool);
document.querySelectorAll('pre code').forEach(el => hljs.highlightElement(el));
```

- [ ] **Step 6: Add selectTool + mobile logic**

```js
function selectTool(id) {
  const t = tools.find(x => x.id === id);
  if (!t) return;

  document.querySelectorAll('.nav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.id === id));
  document.querySelectorAll('.pitfall').forEach(el =>
    el.classList.toggle('active', el.id === 'tool-' + id));

  document.getElementById('content-header-name').textContent = t.name;

  const badge = document.getElementById('content-header-badge');
  const badgeMap = { info: { text: '日常', color: 'var(--blue)' }, accent: { text: 'AI 工具', color: 'var(--accent-light)' } };
  const b = badgeMap[t.type] || {};
  badge.textContent = b.text || '';
  badge.style.color = b.color || '';
  badge.style.borderColor = b.color || '';

  document.getElementById('article-wrapper').scrollTop = 0;
  document.getElementById('mobile-topbar-title').textContent = t.name;
  closeSidebar();
}

// Mobile sidebar
const sidebarEl = document.getElementById('sidebar-el');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const mobileTopbar = document.getElementById('mobile-topbar');
const menuToggleTop = document.getElementById('menu-toggle-top');
const sidebarClose = document.getElementById('sidebar-close');
const mq = window.matchMedia('(max-width: 700px)');

function openSidebar()  { sidebarEl.classList.add('open');    sidebarOverlay.classList.add('visible'); }
function closeSidebar() { sidebarEl.classList.remove('open'); sidebarOverlay.classList.remove('visible'); }

menuToggleTop.addEventListener('click', openSidebar);
sidebarClose.addEventListener('click', closeSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

function applyMobileLayout(isMobile) {
  mobileTopbar.style.display = isMobile ? 'flex' : 'none';
  sidebarClose.style.display = isMobile ? 'flex' : 'none';
  if (!isMobile) closeSidebar();
}

mq.addEventListener('change', e => applyMobileLayout(e.matches));
applyMobileLayout(mq.matches);

// Init: select first tool
selectTool(tools[0].id);
```

- [ ] **Step 7: Open in browser and verify all three tools**

Open `demo/tools.html`. Verify:
- Sidebar shows two groups: 日常工具 (whistle 🔵) and AI 工具 (cc-switch 🟣, Superpowers 🟣)
- Clicking each nav item shows the correct article
- Code blocks have syntax highlighting
- Header breadcrumb shows tool name + badge
- No console errors

---

### Task 4: Update hub.html — add tools link in sidebar footer

**Files:**
- Modify: `demo/hub.html` (around line 487–489)

- [ ] **Step 1: Find the footer link block**

In `hub.html`, locate the sidebar footer (around line 483–490). It currently has two `<a>` links: deployment.html and pitfalls.html.

- [ ] **Step 2: Add tools.html link after pitfalls link**

Add this `<a>` immediately after the pitfalls link:

```html
<a href="tools.html" style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-muted);text-decoration:none;padding:6px 10px;border-radius:6px;border:1px solid var(--border);transition:color 0.15s,border-color 0.15s,background 0.15s" onmouseover="this.style.color='var(--blue)';this.style.borderColor='var(--blue)';this.style.background='rgba(88,166,255,0.08)'" onmouseout="this.style.color='var(--text-muted)';this.style.borderColor='var(--border)';this.style.background='transparent'">
  <span style="font-size:13px">🛠</span> 开发小工具
</a>
```

- [ ] **Step 3: Verify hub.html links**

Open `demo/hub.html`, scroll to sidebar footer. Expect three links: 服务器部署指南 / React 踩坑指南 / 开发小工具. Click "开发小工具" → should navigate to tools.html.

---

### Task 5: Commit

- [ ] **Step 1: Stage and commit**

```bash
rtk git add demo/tools.html demo/hub.html
rtk git commit -m "feat(demo): 新增开发小工具页面 (whistle / cc-switch / Superpowers)"
```

---

## Self-Review

**Spec coverage:**
- ✅ 整体布局与 pitfalls.html 一致
- ✅ 日常分类：whistle（Quick Start + 常用规则）
- ✅ AI 分类：cc-switch（简介 + 步骤 + 场景）、Superpowers（概念 + skill 速查）
- ✅ hub.html 集成

**Placeholder scan:** No TBD, TODO, or vague steps. All code blocks contain actual content.

**Type consistency:** `tools` array → `renderTool(t)` → `renderers[t.id](t)` → `selectTool(id)`. All reference `t.id`, `t.name`, `t.group`, `t.type`, `t.tags` — consistent throughout.
