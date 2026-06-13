# Java 知识库页面实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新建 `demo/java.html`，面向前端开发者的 Java 学习手册，用"前端概念 ↔ Java 概念"对比框架展示知识点，首条内容为 Maven vs npm；并在 `hub.html` 添加入口链接。

**Architecture:** 独立单文件 HTML（内联 CSS + 内联 JS），沿用 knowledge.html 的"左侧边栏 + 右侧内容区"布局骨架，配色换为 Java 橙色系（accent `#e8590c`）。新增"前端 vs Java 对比卡片"组件，hub.html 侧边栏底部追加导航链接。

**Tech Stack:** HTML5, CSS 自定义属性, Vanilla JS, highlight.js 11.9.0 (CDN), Google Fonts (Inter + JetBrains Mono)

---

## 文件结构

| 文件 | 操作 | 说明 |
|------|------|------|
| `demo/java.html` | **新建** | Java 知识库主页面，全部逻辑内联 |
| `demo/hub.html` | **修改** | 侧边栏底部追加 java.html 导航链接 |

---

### Task 1：搭建 java.html 页面骨架与配色系统

**Files:**
- Create: `demo/java.html`

- [ ] **Step 1：新建文件，写入 HTML 骨架、CSS 变量和基础布局**

创建 `demo/java.html`，内容如下（完整文件，后续步骤会在此基础上追加）：

```html
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>p-react · Java 视角</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
  <style>
    :root {
      --sidebar-w: 260px;
      --bg-base: #0d1117;
      --bg-elevated: #161b22;
      --bg-overlay: #1c2128;
      --border: #21262d;
      --text-primary: #e6edf3;
      --text-secondary: #8b949e;
      --text-muted: #484f58;
      --accent: #e8590c;
      --accent-light: #f59e42;
      --accent-glow: rgba(232, 89, 12, 0.15);
      --red: #f85149;
      --red-glow: rgba(248, 81, 73, 0.12);
      --yellow: #d29922;
      --yellow-glow: rgba(210, 153, 34, 0.12);
      --green: #3fb950;
      --green-glow: rgba(63, 185, 80, 0.12);
      --blue: #58a6ff;
      --blue-glow: rgba(88, 166, 255, 0.12);
      --font-ui: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      --font-code: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--font-ui);
      background: var(--bg-base);
      color: var(--text-primary);
      height: 100vh;
      overflow: hidden;
    }

    .app { display: flex; height: 100vh; }

    /* ── Sidebar ── */
    .sidebar {
      width: var(--sidebar-w);
      flex-shrink: 0;
      background: var(--bg-base);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .sidebar-logo {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 18px 16    border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }

    .logo-icon {
      width: 28px;
      height: 28px;
      background: linear-gradient(135deg, var(--accent), #c0410a);
      border-radius: 7px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      flex-shrink: 0;
n
    .logo-text {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      letter-spacing: -0.3px;
    }

    .logo-sub {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 1px;
    }

    .sidebar-nav {
      flex: 1;
      overflow-y: auto;
      padding: 12px 0;
    }

    .sidebar-nav::-webkit-scrollbar { width: 4px; }
    .sidebar-nav::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

    .nav-group-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-muted);
      padding: 10px 16px 4px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      font-size: 13px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: background 0.12s, color 0.12s;
      border-left: 2px solid transparent;
      user-select: none;
    }

    .nav-item:hover { background: var(--bg-overlay); color: var(--text-primary); }

    .nav-item.active {
      color: var(--accent-light);
      background: var(--accent-glow);
      border-left-color: var(--accent);
    }

    .nav-item-icon { font-size: 14px; flex-shrink: 0; width: 18px; text-align: center; }

    /* ── Back link ── */
    .sidebar-back {
      padding: 12px 16px;
      border-top: 1px solid var(--border);
      flex-shrink: 0;
    }

    .back-link {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--text-muted);
      text-decoration: none;
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid var(--border);
      transition: color 0.15s, border-color 0.15s, background 0.15s;
    }

    .back-link:hover {
      color: var(--accent-light);
      border-color: var(--accent);
      background: var(--accent-glow);
    }

    /* ── Content ── */
    .content {
      flex: 1;
      overflow-y: auto;
      padding: 32px 40px;
      min-width: 0;
    }

    .content::-webkit-scrollbar { width: 6px; }
    .content::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

    .article { max-width: 860px; }

    /* ── Article header ── */
    .article-header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 24px;
    }

    .article-icon {
      font-size: 36px;
      line-height: 1;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .article-title {
      font-size: 22px;
      font-weight: 600;
      color: var(--text-primary);
      letter-spacing: -0.3px;
      margin-bottom: 8px;
    }

    .article-tags { display: flex; flex-wrap: wrap; gap: 6px; }

    .tag {
      font-size: 11px;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 4px;
    }

    .tag-warning { background: var(--yellow-glow); color: var(--yellow); border: 1px solid rgba(210,153,34,0.3); }
    .tag-info    { background: var(--blue-glow);   color: var(--blue);   border: 1px solid rgba(88,166,255,0.3); }
    .tag-accent  { background: var(--accent-glow); color: var(--accent-light); border: 1px solid rgba(232,89,12,0.3); }
    .tag-success { background: var(--green-glow);  color: var(--green);  border: 1px solid rgba(63,185,80,0.3); }

    .article-divider {
      height: 1px;
      background: var(--border);
      margin-bottom: 28px;
    }

    /* ── Section ── */
    .section { margin-bottom: 28px; }

    .section-title {
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--text-muted);
      margin-bottom: 12px;
    }

    .section-body {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .section-body p { font-size: 14px; line-height: 1.75; color: var(--text-secondary); }
    .section-body p + p { margin-top: 8px; }
    .section-body strong { color: var(--text-primary); font-weight: 600; }
    .section-body code {
      font-family: var(--font-code);
      font-size: 12px;
      background: var(--bg-overlay);
      border: 1px solid var(--border);
      padding: 1px 5px;
      border-radius: 3px;
      color: var(--accent-light);
    }
    .section-body ul { padding-left: 20px; display: flex; flex-direction: column; gap: 6px; }
    .section-body li { font-size: 14px; line-height: 1.7; color: var(--text-secondary); }

    /* ── Rule box ── */
    .rule-box {
      padding: 14px 16px;
      border-radius: 8px;
      border-left: 3px solid;
      font-size: 14px;
      line-height: 1.7;
      color: var(--text-secondary);
    }

    .rule-box strong { color: var(--text-primary); font-weight: 600; }
    .rule-box code {
      font-family: var(--font-code);
      font-size: 12px;
      background: rgba(255,255,255,0.06);
      padding: 1px 5px;
      border-radius: 3px;
    }

    .rule-box-info    { background: var(--blue-glow);   border-color: var(--blue);   }
    .rule-box-warning { background: var(--yellow-glow); border-color: var(--yellow); }
    .rule-box-success { background: var(--green-glow);  border-color: var(--green);  }
    .rule-box-accent  { background: var(--accent-glow); border-color: var(--accent); }

    /* ── Comparison card (new component) ── */
    .compare-card {
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
    }

    .compare-card-header {
      display: grid;
      grid-template-columns: 1fr 1fr;
      background: var(--bg-elevated);
      border-bottom: 1px solid var(--border);
    }

    .compare-col-label {
      padding: 10px 16px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .compare-col-label.frontend {
      color: var(--blue);
      border-right: 1px solid var(--border);
    }

    .compare-col-label.java {
      color: var(--accent-light);
    }

    .compare-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border-bottom: 1px solid var(--border);
      transition: background 0.1s;
    }

    .compare-row:last-child { border-bottom: none; }
    .compare-row:hover { background: var(--bg-overlay); }

    .compare-cell {
      padding: 9px 16px;
      font-family: var(--font-code);
      font-size: 12.5px;
      line-height: 1.5;
      color: var(--text-secondary);
    }

    .compare-cell.frontend {
      border-right: 1px solid var(--border);
      color: var(--blue);
    }

    .compare-cell.java {
      color: var(--accent-light);
    }

    .compare-cell .note {
      font-family: var(--font-ui);
      font-size: 11px;
      color: var(--text-muted);
      display: block;
      margin-top: 2px;
    }

    /* ── Code block ── */
    .code-blocks-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    @media (max-width: 700px) {
      .code-blocks-row { grid-template-columns: 1fr; }
      .compare-card-header,
      .compare-row { grid-template-columns: 1fr; }
      .compare-cell.frontend { border-right: none; border-bottom: 1px solid var(--border); }
      .compare-col-label.frontend { border-right: none; border-bottom: 1px solid var(--border); }
    }

    .code-block-wrap {
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
    }

    .code-block-label {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      background: var(--bg-elevated);
      border-bottom: 1px solid var(--border);
      font-size: 12px;
      color: var(--text-secondary);
      font-family: var(--font-code);
    }

    .code-block-label-dot {
      width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
    }
    .dot-blue   { background: var(--blue); }
    .dot-orange { background: var(--accent); }

    .code-block-wrap pre {
      margin: 0;
      padding: 14px 16px;
      overflow-x: auto;
      background: var(--bg-elevated);
    }

    .code-block-wrap pre code {
      font-family: var(--font-code);
      font-size: 12.5px;
      line-height: 1.6;
      background: transparent;
      padding: 0;
      border: none;
    }

    /* ── Empty state ── */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 60vh;
      gap: 12px;
      color: var(--text-muted);
    }

    .empty-state-icon { font-size: 48px; opacity: 0.4; }
    .empty-state-text { font-size: 14px; }

    /* ── Mobile ── */
    .menu-toggle {
      display: none;
      align-items: center;
      justify-content: center;
      width: 32px; height: 32px;
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 16px;
      flex-shrink: 0;
      transition: background 0.15s, color 0.15s;
    }
    .menu-toggle:hover { background: var(--bg-overlay); color: var(--text-primary); }

    .sidebar-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      z-index: 99;
    }
    .sidebar-overlay.visible { display: block; }

    @media (max-width: 700px) {
      body { overflow: hidden; }
      .menu-toggle { display: flex; }
      .app { flex-direction: column; }

      .sidebar {
        position: fixed;
        top: 0; left: 0; bottom: 0;
        width: 260px;
        z-index: 100;
        transform: translateX(-100%);
        transition: transform 0.2s ease;
      }

      .sidebar.open { transform: translateX(0); }

      .content { padding: 20px 16px; height: 100vh; }

      .mobile-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        border-bottom: 1px solid var(--border);
        flex-shrink: 0;
        background: var(--bg-base);
      }

      .mobile-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary);
        flex: 1;
      }
    }

    @media (min-width: 701px) {
      .mobile-header { display: none; }
    }
  </style>
</head>
<body>
  <div class="sidebar-overlay" id="sidebar-overlay"></div>

  <div class="app">
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-logo">
        <div class="logo-icon">☕</div>
        <div>
          <div class="logo-text">Java 视角</div>
          <div class="logo-sub">前端开发者学 Java</div>
        </div>
      </div>
      <nav class="sidebar-nav" id="sidebar-nav"></nav>
      <div class="sidebar-back">
        <a href="hub.html" class="back-link">← 返回首页</a>
      </div>
    </aside>

    <div style="display:flex;flex-direction:column;flex:1;min-width:0;">
      <div class="mobile-header">
        <button class="menu-toggle" id="menu-toggle" aria-label="打开菜单">☰</button>
        <span class="mobile-title">Java 视角</span>
      </div>
      <main class="content" id="content">
        <div class="article" id="article"></div>
      </main>
    </div>
  </div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <script>
  // ── Data ──────────────────────────────────────────────────────────────────────
  const topics = [
    {
      id: 'maven-vs-npm',
      name: 'Maven vs npm',
      group: '📦 工具链',
      icon: '📦',
      tags: [
        { label: 'Maven', type: 'accent' },
        { label: 'npm', type: 'info' },
        { label: '依赖管理', type: 'warning' },
      ],
    },
  ];

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function escHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function tagsHtml(tags) {
    return tags.map(t => `<span class="tag tag-${escHtml(t.type)}">${escHtml(t.label)}</span>`).join('');
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

  function compareCard(rows) {
    const rowsHtml = rows.map(([fe, java, note]) => `
      <div class="compare-row">
        <div class="compare-cell frontend">${escHtml(fe)}</div>
        <div class="compare-cell java">${escHtml(java)}${note ? `<span class="note">${escHtml(note)}</span>` : ''}</div>
      </div>`).join('');
    return `
      <div class="compare-card">
        <div class="compare-card-header">
          <div class="compare-col-label frontend">前端（你熟悉的）</div>
          <div class="compare-col-label java">Java（对应的）</div>
        </div>
        ${rowsHtml}
      </div>`;
  }

  function codeBlocksRow(blocks) {
    const blocksHtml = blocks.map(([label, dotClass, lang, code]) => `
      <div class="code-block-wrap">
        <div class="code-block-label">
          <span class="code-block-label-dot ${dotClass}"></span>
          <span>${label}</span>
        </div>
        <pre><code class="language-${lang}">${escHtml(code)}</code></pre>
      </div>`).join('');
    return `<div class="code-blocks-row">${blocksHtml}</div>`;
  }

  // ── Renderers ─────────────────────────────────────────────────────────────────
  function renderMavenVsNpm(t) {
    const conclusion = ruleBox('accent',
      `<strong>结论：</strong>Maven 之于 Java，等同于 npm 之于 Node.js。
      核心差异：依赖配置是声明式 XML（<code>pom.xml</code>），项目目录里<strong>没有</strong> <code>node_modules</code>，
      所有依赖统一缓存在 <code>~/.m2/repository/</code>，多个项目共享同一份缓存。`);

    const card = compareCard([
      ['package.json',          'pom.xml',                      '项目元信息 + 依赖声明'],
      ['npm install',           'mvn dependency:resolve',        '下载所有依赖到本地缓存'],
      ['node_modules/',         '~/.m2/repository/',             '全局缓存，不在项目目录内'],
      ['npm run build',         'mvn package',                   '编译 → 测试 → 打包为 .jar'],
      ['npm run dev',           'mvn spring-boot:run',           '启动本地开发服务器'],
      ['devDependencies',       '<scope>test</scope>',           '仅测试阶段可用'],
      ['peerDependencies',      '<scope>provided</scope>',       '运行时由容器提供（如 Servlet API）'],
      ['package-lock.json',     '<dependencyManagement>',        '在父 pom 中统一锁定版本'],
      ['^1.2.3（浮动版本）',    '1.2.3（精确版本）',             'Maven 默认不做语义化版本浮动'],
      ['npm scripts',           'Maven lifecycle phases',        'validate→compile→test→package→install→deploy'],
    ]);

    const diffPoints = `
      <p><strong>1. 依赖不在项目目录里</strong><br>
      npm 把依赖装进项目内的 <code>node_modules/</code>，这就是为什么要在 <code>.gitignore</code> 里忽略它。
      Maven 的缓存在用户主目录 <code>~/.m2/repository/</code>，所有 Java 项目共享，clone 一个 Java 项目后不会看到依赖文件夹。</p>

      <p><strong>2. 生命周期是固定的</strong><br>
      npm scripts 需要手动串联（<code>"build": "tsc && vite build"</code>），Maven 内置了固定顺序的 6 个阶段：
      <code>validate → compile → test → package → install → deploy</code>。
      执行 <code>mvn package</code> 会自动依次运行前面所有阶段，无需手动串联。</p>

      <p><strong>3. 坐标系统（GAV）</strong><br>
      npm 用 <code>@scope/name@version</code> 标识依赖，Maven 用三元组
      <code>groupId:artifactId:version</code>（简称 GAV）。
      例如 <code>org.springframework.boot:spring-boot-starter-web:3.2.0</code>，
      其中 <code>groupId</code> 类似 npm 的 scope，<code>artifactId</code> 是包名。</p>`;

    const packageJson = `{
  "name": "my-app",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.2",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  },
  "scripts": {
    "build": "tsc && vite build",
    "dev": "vite",
    "test": "vitest"
  }
}`;

    const pomXml = `<project>
  <groupId>com.example</groupId>
  <artifactId>my-app</artifactId>
  <version>1.0.0</version>
  <packaging>jar</packaging>

  <dependencies>
    <!-- 等同于 dependencies -->
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
      <version>3.2.0</version>
    </dependency>

    <!-- 等同于 devDependencies -->
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-test</artifactId>
      <version>3.2.0</version>
      <scope>test</scope>
    </dependency>
  </dependencies>
</project>`;

    const codeRow = codeBlocksRow([
      ['package.json', 'dot-blue', 'json', packageJson],
      ['pom.xml', 'dot-orange', 'xml', pomXml],
    ]);

    return articleShell(t, `
      ${section('核心结论', conclusion)}
      ${section('对照表', card)}
      ${section('前端开发者需要注意的差异', `<div style="display:flex;flex-direction:column;gap:10px">${diffPoints}</div>`)}
      ${section('代码对比', codeRow)}`);
  }

  // ── Router ────────────────────────────────────────────────────────────────────
  const renderers = {
    'maven-vs-npm': renderMavenVsNpm,
  };

  function render(id) {
    const t = topics.find(x => x.id === id);
    if (!t) return;
    const fn = renderers[id];
    document.getElementById('article').innerHTML = fn ? fn(t) : `<div class="empty-state"><div class="empty-state-icon">🚧</div><div class="empty-state-text">内容建设中…</div></div>`;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.id === id));
    requestAnimationFrame(() => hljs.highlightAll());
  }

  // ── Sidebar build ─────────────────────────────────────────────────────────────
  function buildNav() {
    const nav = document.getElementById('sidebar-nav');
    const groups = [...new Set(topics.map(t => t.group))];
    groups.forEach(group => {
      const label = document.createElement('div');
      label.className = 'nav-group-label';
      label.textContent = group;
      nav.appendChild(label);

      topics.filter(t => t.group === group).forEach(t => {
        const item = document.createElement('div');
        item.className = 'nav-item';
        item.dataset.id = t.id;
        item.innerHTML = `<span class="nav-item-icon">${t.icon}</span>${t.name}`;
        item.addEventListener('click', () => {
          render(t.id);
          if (window.innerWidth <= 700) closeSidebar();
        });
        nav.appendChild(item);
      });
    });
  }

  // ── Mobile sidebar ────────────────────────────────────────────────────────────
  function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('visible');
  }

  document.getElementById('menu-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebar-overlay').classList.add('visible');
  });

  document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);

  // ── Init ──────────────────────────────────────────────────────────────────────
  buildNav();
  render(topics[0].id);
  </script>
</body>
</html>
```

- [ ] **Step 2：在浏览器验证骨架**

用系统默认浏览器打开文件：
```bash
open demo/java.html
```

预期：页面加载，左侧橙色系侧边栏显示"☕ Java 视角"logo，导航项"Maven vs npm"高亮为橙色；右侧内容区显示 Maven vs npm 文章，包含结论框、对比卡片、差异说明和两列代码块。highlight.js 对代码块着色正常。

- [ ] **Step 3：提交**

```bash
rtk git add demo/java.html
rtk git commit -m "feat(demo): 新增 Java 视角知识库页面（Maven vs npm）"
```

---

### Task 2：在 hub.html 添加 java.html 入口链接

**Files:**
- Modify: `demo/hub.html`（侧边栏底部导航链接区，紧跟"前端知识库"链接之后）

- [ ] **Step 1：找到 hub.html 中"前端知识库"链接并在其后添加 java.html 入口**

在 `demo/hub.html` 中，找到以下代码（约第 493 行）：

```html
      <a href="knowledge.html" style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-muted);text-decoration:none;padding:6px 10px;border-radius:6px;border:1px solid var(--border);transition:color 0.15s,border-color 0.15s,background 0.15s" onmouseover="this.style.color='var(--blue)';this.style.borderColor='var(--blue)';this.style.background='rgba(88,166,255,0.08)'" onmouseout="this.style.color='var(--text-muted)';this.style.borderColor='var(--border)';this.style.background='transparent'">
        <span style="font-size:13px">📚</span> 前端知识库
      </a>    </div>
```

将其替换为（在"前端知识库"链接之后、`</div>` 关闭之前插入 java.html 链接）：

```html
      <a href="knowledge.html" style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-muted);text-decoration:none;padding:6px 10px;border-radius:6px;border:1px solid var(--border);transition:color 0.15s,border-color 0.15s,background 0.15s" onmouseover="this.style.color='var(--blue)';this.style.borderColor='var(--blue)';this.style.background='rgba(88,166,255,0.08)'" onmouseout="this.style.color='var(--text-muted)';this.style.borderColor='var(--border)';this.style.background='transparent'">
        <span style="font-size:13px">📚</span> 前端知识库
      </a>
      <a href="java.html" style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-muted);text-decoration:none;padding:6px 10px;border-radius:6px;border:1px solid var(--border);transition:color 0.15s,border-color 0.15s,background 0.15s" onmouseover="this.style.color='#f59e42';this.style.borderColor='#e8590c';this.style.background='rgba(232,89,12,0.12)'" onmouseout="this.style.color='var(--text-muted)';this.style.borderColor='var(--border)';this.style.background='transparent'">
        <span style="font-size:13px">☕</span> Java 视角
      </a>    </div>
```

- [ ] **Step 2：在浏览器验证 hub.html**

```bash
open demo/hub.html
```

预期：侧边栏底部导航区出现"☕ Java 视角"链接，鼠标悬停时变为橙色系高亮；点击后跳转到 java.html 正常。

- [ ] **Step 3：提交**

```bash
rtk git add demo/hub.html
rtk git commit -m "feat(demo): hub.html 添加 Java 视角入口链接"
```

---

## 自检

**Spec 覆盖检查：**
- ✅ 新建 `demo/java.html` → Task 1
- ✅ Java 橙色系配色（`--accent: #e8590c`）→ Task 1 CSS variables
- ✅ 左侧边栏 + 右侧内容区布局 → Task 1 HTML 骨架
- ✅ 前端 vs Java 对比卡片（新组件）→ Task 1 `compareCard()` 函数
- ✅ 结论框（rule-box-accent）→ Task 1 `ruleBox()` 函数
- ✅ 代码块并排（pom.xml + package.json）→ Task 1 `codeBlocksRow()` 函数
- ✅ 侧边栏分组结构（📦 工具链，预留其他分组）→ Task 1 `buildNav()`
- ✅ Maven vs npm 完整内容（10行对比表 + 3点差异说明）→ Task 1 `renderMavenVsNpm()`
- ✅ hub.html 新增入口链接 → Task 2

**Placeholder 扫描：** 无 TBD / TODO / "待实现"字样 ✅

**类型一致性：** `compareCard` 函数接收 `[fe, java, note?][]`，在 Task 1 中定义并在同 Task 中调用，无跨任务类型不一致 ✅
