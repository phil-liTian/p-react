const topics = [
  {
    id: 'module-history',
    name: '模块化历史（IIFE → CJS → AMD → ESM）',
    group: '工程化',
    type: 'info',
    icon: '📦',
    tags: [
      { label: 'ESM', type: 'success' },
      { label: 'CommonJS', type: 'info' },
      { label: '模块化', type: 'accent' },
    ],
  },
  {
    id: 'webpack-internals',
    name: 'Webpack 构建流程（Tapable / Loader / Plugin）',
    group: '工程化',
    type: 'warning',
    icon: '🔧',
    tags: [
      { label: 'Webpack', type: 'warning' },
      { label: 'Tapable', type: 'accent' },
      { label: 'Loader', type: 'info' },
      { label: 'Plugin', type: 'success' },
    ],
  },
  {
    id: 'tree-shaking',
    name: 'Tree Shaking 原理与限制',
    group: '工程化',
    type: 'success',
    icon: '🌲',
    tags: [
      { label: 'Tree Shaking', type: 'success' },
      { label: 'Dead Code', type: 'danger' },
      { label: 'sideEffects', type: 'warning' },
    ],
  },
  {
    id: 'code-splitting',
    name: 'Code Splitting 与懒加载',
    group: '工程化',
    type: 'accent',
    icon: '✂️',
    tags: [
      { label: 'Code Splitting', type: 'accent' },
      { label: '懒加载', type: 'success' },
      { label: 'dynamic import', type: 'info' },
    ],
  },
  {
    id: 'vite-vs-webpack',
    name: 'Vite 原理（ESM Dev Server vs Bundle）',
    group: '工程化',
    type: 'info',
    icon: '⚡',
    tags: [
      { label: 'Vite', type: 'info' },
      { label: 'ESM', type: 'success' },
      { label: 'HMR', type: 'accent' },
      { label: 'Rollup', type: 'warning' },
    ],
  },
  {
    id: 'bundle-analysis',
    name: '构建产物分析与优化',
    group: '工程化',
    type: 'warning',
    icon: '🔍',
    tags: [
      { label: 'Bundle Size', type: 'warning' },
      { label: 'Analyzer', type: 'info' },
      { label: '产物优化', type: 'success' },
    ],
  },
  {
    id: 'babel',
    name: 'Babel 编译流程（AST → Transform → Generate）',
    group: '工程化',
    type: 'warning',
    icon: '🔄',
    tags: [
      { label: 'Babel', type: 'warning' },
      { label: 'AST', type: 'info' },
      { label: 'Plugin', type: 'accent' },
    ],
  },
  {
    id: 'sourcemap',
    name: 'Sourcemap 原理',
    group: '工程化',
    type: 'info',
    icon: '🗺️',
    tags: [
      { label: 'Sourcemap', type: 'info' },
      { label: 'VLQ', type: 'accent' },
      { label: '调试', type: 'success' },
    ],
  },
  {
    id: 'monorepo',
    name: 'Monorepo 方案对比（pnpm workspace / Turborepo）',
    group: '工程化',
    type: 'success',
    icon: '🏗️',
    tags: [
      { label: 'Monorepo', type: 'success' },
      { label: 'pnpm', type: 'info' },
      { label: 'Turborepo', type: 'accent' },
    ],
  },
  {
    id: 'cicd',
    name: 'CI/CD 流水线设计',
    group: '工程化',
    type: 'accent',
    icon: '🚀',
    tags: [
      { label: 'CI/CD', type: 'accent' },
      { label: 'GitHub Actions', type: 'info' },
      { label: '自动化', type: 'success' },
    ],
  },
  {
    id: 'reflow-repaint',
    name: '重绘与回流',
    group: '性能优化',
    type: 'warning',
    icon: '🎨',
    tags: [
      { label: 'Reflow', type: 'warning' },
      { label: 'Repaint', type: 'info' },
      { label: '渲染原理', type: 'info' },
    ],
  },
  {
    id: 'composite-layer',
    name: '合成层与 GPU 加速',
    group: '性能优化',
    type: 'info',
    icon: '🖥️',
    tags: [
      { label: 'GPU', type: 'info' },
      { label: 'will-change', type: 'accent' },
      { label: '合成层', type: 'info' },
    ],
  },
  {
    id: 'web-vitals',
    name: 'Web Vitals',
    group: '性能优化',
    type: 'success',
    icon: '📊',
    tags: [
      { label: 'LCP', type: 'warning' },
      { label: 'CLS', type: 'info' },
      { label: 'INP', type: 'success' },
      { label: 'Core Web Vitals', type: 'success' },
    ],
  },
  {
    id: 'first-screen',
    name: '首屏加载优化策略',
    group: '性能优化',
    type: 'warning',
    icon: '🚀',
    tags: [
      { label: '首屏', type: 'warning' },
      { label: 'Critical Path', type: 'danger' },
      { label: 'Preload', type: 'info' },
      { label: 'SSR', type: 'accent' },
    ],
  },
  {
    id: 'virtual-list',
    name: '虚拟列表原理与实现',
    group: '性能优化',
    type: 'info',
    icon: '📋',
    tags: [
      { label: '虚拟滚动', type: 'info' },
      { label: '长列表', type: 'warning' },
      { label: '性能优化', type: 'success' },
    ],
  },
  {
    id: 'lazy-load',
    name: '图片懒加载',
    group: '性能优化',
    type: 'success',
    icon: '🖼️',
    tags: [
      { label: 'IntersectionObserver', type: 'info' },
      { label: '懒加载', type: 'success' },
      { label: 'loading=lazy', type: 'accent' },
    ],
  },
  {
    id: 'debounce-throttle',
    name: '防抖与节流',
    group: '性能优化',
    type: 'accent',
    icon: '⏱️',
    tags: [
      { label: 'Debounce', type: 'warning' },
      { label: 'Throttle', type: 'info' },
      { label: '事件优化', type: 'accent' },
    ],
  },
  {
    id: 'memory-leak',
    name: '内存泄漏与垃圾回收',
    group: '性能优化',
    type: 'danger',
    icon: '🗑️',
    tags: [
      { label: 'GC', type: 'info' },
      { label: '内存泄漏', type: 'danger' },
      { label: 'WeakRef', type: 'accent' },
    ],
  },
  {
    id: 'animation-perf',
    name: '动画性能优化（rAF / FLIP / 合成层）',
    group: '性能优化',
    type: 'success',
    icon: '🎬',
    tags: [
      { label: 'rAF', type: 'success' },
      { label: 'FLIP', type: 'accent' },
      { label: 'will-change', type: 'info' },
      { label: 'Composite', type: 'warning' },
    ],
  },
  {
    id: 'long-tasks',
    name: 'Long Tasks 与任务调度优化',
    group: '性能优化',
    type: 'warning',
    icon: '⏳',
    tags: [
      { label: 'Long Task', type: 'warning' },
      { label: 'scheduler.yield', type: 'accent' },
      { label: 'rIC', type: 'info' },
      { label: 'INP', type: 'danger' },
    ],
  },
  {
    id: 'url-to-render',
    name: '从 URL 到页面渲染全流程',
    group: '浏览器原理',
    type: 'info',
    icon: '🌐',
    tags: [
      { label: '网络', type: 'info' },
      { label: '渲染流水线', type: 'accent' },
      { label: 'DNS', type: 'warning' },
    ],
  },
  {
    id: 'render-process',
    name: '渲染进程架构',
    group: '浏览器原理',
    type: 'accent',
    icon: '🏗️',
    tags: [
      { label: '主线程', type: 'info' },
      { label: '合成线程', type: 'success' },
      { label: '进程架构', type: 'accent' },
    ],
  },
  {
    id: 'cache-strategy',
    name: '缓存策略（强缓存 / 协商缓存）',
    group: '浏览器原理',
    type: 'success',
    icon: '📦',
    tags: [
      { label: '强缓存', type: 'success' },
      { label: '协商缓存', type: 'info' },
      { label: 'HTTP Headers', type: 'warning' },
    ],
  },
  {
    id: 'cors',
    name: '跨域原理与解决方案',
    group: '浏览器原理',
    type: 'warning',
    icon: '🔒',
    tags: [
      { label: 'CORS', type: 'warning' },
      { label: '同源策略', type: 'danger' },
      { label: 'Preflight', type: 'info' },
    ],
  },
  {
    id: 'auth-token',
    name: 'Cookie / Session / Token / JWT',
    group: '浏览器原理',
    type: 'accent',
    icon: '🔑',
    tags: [
      { label: 'Cookie', type: 'info' },
      { label: 'JWT', type: 'accent' },
      { label: '鉴权', type: 'warning' },
    ],
  },
  {
    id: 'xss-csrf',
    name: 'XSS 与 CSRF 防御',
    group: '浏览器原理',
    type: 'danger',
    icon: '🛡️',
    tags: [
      { label: 'XSS', type: 'danger' },
      { label: 'CSRF', type: 'danger' },
      { label: 'CSP', type: 'success' },
    ],
  },
  {
    id: 'web-worker',
    name: 'Web Worker 与 SharedArrayBuffer',
    group: '浏览器原理',
    type: 'info',
    icon: '⚙️',
    tags: [
      { label: 'Web Worker', type: 'info' },
      { label: 'SharedArrayBuffer', type: 'accent' },
      { label: '多线程', type: 'success' },
    ],
  },
  {
    id: 'track-types',
    name: '埋点类型（手动 / 自动 / 可视化）',
    group: '埋点与监控',
    type: 'info',
    icon: '📍',
    tags: [
      { label: '手动埋点', type: 'info' },
      { label: '自动埋点', type: 'accent' },
      { label: '可视化埋点', type: 'success' },
    ],
  },
  {
    id: 'pv-uv',
    name: 'PV / UV / 停留时长统计',
    group: '埋点与监控',
    type: 'success',
    icon: '📊',
    tags: [
      { label: 'PV', type: 'info' },
      { label: 'UV', type: 'success' },
      { label: '停留时长', type: 'accent' },
      { label: 'Session', type: 'warning' },
    ],
  },
  {
    id: 'click-stream',
    name: '点击流与用户行为序列',
    group: '埋点与监控',
    type: 'accent',
    icon: '🖱️',
    tags: [
      { label: '点击流', type: 'accent' },
      { label: '行为序列', type: 'info' },
      { label: '路径分析', type: 'success' },
    ],
  },
  {
    id: 'error-monitor',
    name: '错误监控（onerror / unhandledrejection / ErrorBoundary）',
    group: '埋点与监控',
    type: 'danger',
    icon: '🚨',
    tags: [
      { label: 'onerror', type: 'danger' },
      { label: 'unhandledrejection', type: 'warning' },
      { label: 'ErrorBoundary', type: 'accent' },
      { label: 'Sourcemap', type: 'info' },
    ],
  },
  {
    id: 'perf-observer',
    name: '性能埋点（PerformanceObserver / Navigation Timing）',
    group: '埋点与监控',
    type: 'info',
    icon: '⚡',
    tags: [
      { label: 'PerformanceObserver', type: 'info' },
      { label: 'Navigation Timing', type: 'accent' },
      { label: 'Web Vitals', type: 'success' },
      { label: 'LCP/CLS', type: 'warning' },
    ],
  },
  {
    id: 'white-screen',
    name: '白屏检测方案',
    group: '埋点与监控',
    type: 'warning',
    icon: '🔲',
    tags: [
      { label: '白屏检测', type: 'warning' },
      { label: '元素采样', type: 'info' },
      { label: 'MutationObserver', type: 'accent' },
      { label: '可用性', type: 'danger' },
    ],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function tagsHtml(tags) {
  return tags.map(t => `<span class="tag tag-${escHtml(t.type)}">${escHtml(t.label)}</span>`).join('');
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

