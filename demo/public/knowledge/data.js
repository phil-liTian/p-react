const topics = [
  {
    id: 'ai-coding-workflow',
    name: 'AI 辅助编程工作流',
    group: 'AI 前端',
    type: 'accent',
    icon: '🤖',
    tags: [
      { label: 'Copilot', type: 'accent' },
      { label: 'Claude', type: 'info' },
      { label: 'Cursor', type: 'success' },
      { label: '最佳实践', type: 'warning' },
    ],
  },
  {
    id: 'prompt-engineering',
    name: 'Prompt Engineering 基础',
    group: 'AI 前端',
    type: 'info',
    icon: '✍️',
    tags: [
      { label: 'Few-shot', type: 'info' },
      { label: '思维链 CoT', type: 'accent' },
      { label: '角色设定', type: 'success' },
      { label: '结构化输出', type: 'warning' },
    ],
  },
  {
    id: 'rag-vector',
    name: 'RAG 与向量检索',
    group: 'AI 前端',
    type: 'success',
    icon: '🔍',
    tags: [
      { label: 'RAG', type: 'success' },
      { label: '向量数据库', type: 'info' },
      { label: 'Embedding', type: 'accent' },
      { label: '语义搜索', type: 'warning' },
    ],
  },
  {
    id: 'ai-safety',
    name: 'AI 安全与幻觉',
    group: 'AI 前端',
    type: 'danger',
    icon: '🛡️',
    tags: [
      { label: 'Prompt 注入', type: 'danger' },
      { label: '幻觉', type: 'warning' },
      { label: '输出验证', type: 'success' },
      { label: '越狱防御', type: 'accent' },
    ],
  },
  {
    id: 'event-loop',
    name: 'Event Loop 运行机制',
    group: 'JS 异步编程',
    type: 'info',
    icon: '🔄',
    tags: [
      { label: 'Event Loop', type: 'info' },
      { label: '调用栈', type: 'accent' },
      { label: '任务队列', type: 'warning' },
    ],
  },
  {
    id: 'micro-macro',
    name: '微任务 vs 宏任务（执行顺序）',
    group: 'JS 异步编程',
    type: 'warning',
    icon: '⚡',
    tags: [
      { label: '微任务', type: 'info' },
      { label: '宏任务', type: 'warning' },
      { label: 'Promise.then', type: 'success' },
      { label: 'setTimeout', type: 'accent' },
    ],
  },
  {
    id: 'promise-internals',
    name: 'Promise 原理与状态机',
    group: 'JS 异步编程',
    type: 'success',
    icon: '🔮',
    tags: [
      { label: 'Promise', type: 'success' },
      { label: '状态机', type: 'info' },
      { label: 'Promises/A+', type: 'accent' },
      { label: '链式调用', type: 'warning' },
    ],
  },
  {
    id: 'promise-chain',
    name: 'Promise 链式调用与错误传播',
    group: 'JS 异步编程',
    type: 'warning',
    icon: '⛓️',
    tags: [
      { label: '链式调用', type: 'info' },
      { label: '错误传播', type: 'danger' },
      { label: '值穿透', type: 'accent' },
      { label: '.catch', type: 'warning' },
    ],
  },
  {
    id: 'async-await',
    name: 'async/await 原理与常见陷阱',
    group: 'JS 异步编程',
    type: 'accent',
    icon: '⏳',
    tags: [
      { label: 'async/await', type: 'accent' },
      { label: '串行 vs 并行', type: 'danger' },
      { label: '语法糖', type: 'info' },
      { label: '错误处理', type: 'warning' },
    ],
  },
  {
    id: 'promise-concurrency',
    name: '并发控制（all / race / allSettled / any）',
    group: 'JS 异步编程',
    type: 'info',
    icon: '🔀',
    tags: [
      { label: 'Promise.all', type: 'success' },
      { label: 'allSettled', type: 'info' },
      { label: 'race', type: 'warning' },
      { label: '并发限制', type: 'accent' },
    ],
  },
  {
    id: 'promise-implement',
    name: '手写 Promise（含 then/catch/finally）',
    group: 'JS 异步编程',
    type: 'accent',
    icon: '🛠️',
    tags: [
      { label: '手写实现', type: 'accent' },
      { label: 'Promises/A+', type: 'info' },
      { label: '状态机', type: 'success' },
      { label: '链式调用', type: 'warning' },
    ],
  },
  {
    id: 'generator',
    name: 'Generator 与协程',
    group: 'JS 异步编程',
    type: 'success',
    icon: '🔁',
    tags: [
      { label: 'Generator', type: 'success' },
      { label: '协程', type: 'info' },
      { label: 'yield', type: 'accent' },
      { label: '迭代器', type: 'warning' },
    ],
  },
  {
    id: 'abort-controller',
    name: '取消异步任务（AbortController）',
    group: 'JS 异步编程',
    type: 'warning',
    icon: '🛑',
    tags: [
      { label: 'AbortController', type: 'warning' },
      { label: 'AbortSignal', type: 'info' },
      { label: '竞态取消', type: 'danger' },
      { label: 'React 清理', type: 'success' },
    ],
  },
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
    id: 'perf-build',
    name: '构建优化落地方案',
    group: '性能优化',
    type: 'accent',
    icon: '📦',
    tags: [
      { label: '构建优化', type: 'accent' },
      { label: 'Code Splitting', type: 'info' },
      { label: 'Tree Shaking', type: 'success' },
      { label: '长效缓存', type: 'warning' },
    ],
  },
  {
    id: 'perf-network',
    name: '网络优化落地方案',
    group: '性能优化',
    type: 'info',
    icon: '🌐',
    tags: [
      { label: '网络优化', type: 'info' },
      { label: 'HTTP 缓存', type: 'success' },
      { label: 'Resource Hints', type: 'accent' },
      { label: 'Service Worker', type: 'warning' },
    ],
  },
  {
    id: 'perf-render',
    name: '渲染优化落地方案',
    group: '性能优化',
    type: 'warning',
    icon: '🖼️',
    tags: [
      { label: '渲染优化', type: 'warning' },
      { label: '关键渲染路径', type: 'danger' },
      { label: 'CLS / LCP', type: 'info' },
      { label: '合成层', type: 'accent' },
    ],
  },
  {
    id: 'perf-runtime',
    name: '运行时优化落地方案',
    group: '性能优化',
    type: 'danger',
    icon: '⚡',
    tags: [
      { label: '运行时优化', type: 'danger' },
      { label: 'INP', type: 'warning' },
      { label: 'Web Worker', type: 'info' },
      { label: '内存泄漏', type: 'accent' },
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
  {
    id: 'report-method',
    name: '数据上报方式（beacon / img / xhr 对比）',
    group: '埋点与监控',
    type: 'info',
    icon: '📡',
    tags: [
      { label: 'sendBeacon', type: 'success' },
      { label: 'img pixel', type: 'info' },
      { label: 'fetch', type: 'accent' },
      { label: '卸载可靠性', type: 'warning' },
    ],
  },
  {
    id: 'sampling',
    name: '采样率与上报策略',
    group: '埋点与监控',
    type: 'accent',
    icon: '🎲',
    tags: [
      { label: '用户级采样', type: 'success' },
      { label: '动态采样', type: 'accent' },
      { label: '批量上报', type: 'info' },
      { label: '离线重试', type: 'warning' },
    ],
  },
  {
    id: 'log-aggregation',
    name: '前端日志聚合与告警',
    group: '埋点与监控',
    type: 'warning',
    icon: '🔔',
    tags: [
      { label: '错误指纹', type: 'warning' },
      { label: '聚合去重', type: 'info' },
      { label: '告警规则', type: 'danger' },
      { label: 'Sentry', type: 'accent' },
    ],
  },

  {
    id: 'prod-only-bug',
    name: '线上问题排查思路',
    group: '埋点与监控',
    type: 'danger',
    icon: '🔬',
    tags: [
      { label: '线上复现', type: 'danger' },
      { label: '二分定位', type: 'warning' },
      { label: '监控日志', type: 'info' },
      { label: '工具链', type: 'accent' },
    ],
  },

  // ── 前端常见疑难问题 ──────────────────────────────────────────────────

  {
    id: 'large-tree-render',
    name: '大数据树形渲染不卡死',
    group: '前端常见疑难问题',
    type: 'danger',
    icon: '🌲',
    tags: [
      { label: '10 万条数据', type: 'danger' },
      { label: '虚拟树', type: 'warning' },
      { label: 'Web Worker', type: 'info' },
      { label: '性能', type: 'accent' },
    ],
  },

  {
    id: 'frontend-idempotency',
    name: '千万 QPS 下前端幂等性方案',
    group: '前端常见疑难问题',
    type: 'danger',
    icon: '🔐',
    tags: [
      { label: '幂等性', type: 'danger' },
      { label: 'Idempotency Key', type: 'warning' },
      { label: '防重提交', type: 'info' },
      { label: '高 QPS', type: 'accent' },
    ],
  },

  {
    id: 'concurrent-request-pool',
    name: '前端并发请求池',
    group: '前端常见疑难问题',
    type: 'danger',
    icon: '🌊',
    tags: [
      { label: '请求池', type: 'danger' },
      { label: '并发控制', type: 'warning' },
      { label: '批量上传', type: 'info' },
      { label: 'p-limit', type: 'success' },
    ],
  },

  {
    id: 'frontend-architecture',
    name: '前端架构设计（六大模块）',
    group: '前端架构',
    type: 'accent',
    icon: '🏛️',
    tags: [
      { label: '底层基建', type: 'info' },
      { label: '工程化', type: 'accent' },
      { label: '代码分层', type: 'success' },
      { label: '业务治理', type: 'warning' },
      { label: '性能稳定性', type: 'danger' },
      { label: '运维监控', type: 'info' },
    ],
  },

  {
    id: 'frontend-cicd',
    name: '前端 CI/CD 落地',
    group: '前端架构',
    type: 'success',
    icon: '🚀',
    tags: [
      { label: 'husky', type: 'info' },
      { label: 'GitHub Actions', type: 'accent' },
      { label: '灰度发布', type: 'warning' },
      { label: '回滚', type: 'danger' },
    ],
  },

  {
    id: 'frontend-devops',
    name: '从前端角度理解 DevOps',
    group: '前端架构',
    type: 'warning',
    icon: '🔧',
    tags: [
      { label: 'CALMS', type: 'info' },
      { label: 'IaC', type: 'accent' },
      { label: 'RUM', type: 'success' },
      { label: '可观测性', type: 'warning' },
      { label: '自动恢复', type: 'danger' },
    ],
  },

  {
    id: 'frontend-testing',
    name: '前端测试体系（七层金字塔）',
    group: '前端架构',
    type: 'success',
    icon: '🧪',
    tags: [
      { label: '静态检查', type: 'info' },
      { label: '单元测试', type: 'success' },
      { label: '组件测试', type: 'accent' },
      { label: '集成测试', type: 'warning' },
      { label: 'E2E', type: 'danger' },
      { label: '视觉回归', type: 'info' },
      { label: '性能 / a11y', type: 'warning' },
    ],
  },

  {
    id: 'mf-submodule',
    name: '微前端方案：MF + subModule',
    group: '前端架构',
    type: 'accent',
    icon: '🧩',
    tags: [
      { label: 'Module Federation', type: 'accent' },
      { label: 'subModule', type: 'info' },
      { label: '远程模块', type: 'success' },
      { label: '共享源码', type: 'warning' },
      { label: '多团队协作', type: 'danger' },
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

