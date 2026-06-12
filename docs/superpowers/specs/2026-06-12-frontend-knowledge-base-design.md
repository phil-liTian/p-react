# 前端通用知识库页面设计文档

## 概览

新增 `demo/knowledge.html`，采用与 `demo/tools.html` 完全相同的视觉系统（深色主题、Inter + JetBrains Mono、highlight.js）。页面是一个可离线使用的单文件 HTML，涵盖约 50 个前端核心知识点，以深度解析为主，用经典问题切入，原理与代码示例并重。

---

## 页面结构

### 布局

与 `tools.html` 一致：左侧固定侧边栏（260px） + 右侧滚动内容区，移动端折叠侧边栏。

### 侧边栏变化

- Logo badge 改为 `knowledge`（蓝色，同 tools.html 的 `tools` badge 风格）
- 大主题（5 个）作为 `nav-group`，带折叠/展开箭头，默认第一组展开
- 子知识点作为 `nav-item`，点击显示对应文章
- 顶部内容栏 badge 显示当前所属大主题名称

### 每篇文章固定四段结构

1. **核心问题** — 以一个经典问题引入，给出一句话结论（`rule-box-info`）
2. **原理剖析** — 文字说明 + 关键代码片段（`section` + `code-block-wrap`）
3. **代码示例** — ✗ 错误用法 / ✓ 正确用法对比（两个 `code-block-wrap`，dot-red / dot-green）
4. **延伸与注意事项** — 边界情况、相关知识点提示（`rule-box-warning` 或 `rule-box-success`）

---

## 知识点目录（树形）

### JS 异步编程（9 条）

| id | 标题 |
|---|---|
| event-loop | Event Loop 运行机制 |
| micro-macro | 微任务 vs 宏任务（执行顺序） |
| promise-internals | Promise 原理与状态机 |
| promise-chain | Promise 链式调用与错误传播 |
| async-await | async/await 原理与常见陷阱 |
| promise-concurrency | 并发控制（all / race / allSettled / any） |
| promise-implement | 手写 Promise（含 then/catch/finally） |
| generator | Generator 与协程 |
| abort-controller | 取消异步任务（AbortController） |

### 性能优化（10 条）

| id | 标题 |
|---|---|
| reflow-repaint | 重绘（Repaint）与回流（Reflow） |
| composite-layer | 合成层与 GPU 加速 |
| web-vitals | Web Vitals（LCP / CLS / FID / INP） |
| first-screen | 首屏加载优化策略 |
| virtual-list | 虚拟列表原理与实现 |
| lazy-load | 图片懒加载（IntersectionObserver） |
| debounce-throttle | 防抖与节流 |
| memory-leak | 内存泄漏排查与常见场景 |
| raf-ric | requestAnimationFrame 与 requestIdleCallback |
| long-task | 长任务拆分（任务调度） |

### 工程化（10 条）

| id | 标题 |
|---|---|
| module-history | 模块化历史（IIFE → CJS → AMD → ESM） |
| webpack-internals | Webpack 构建流程（Tapable / Loader / Plugin） |
| tree-shaking | Tree Shaking 原理与限制 |
| code-splitting | Code Splitting 与懒加载 |
| vite-vs-webpack | Vite 原理（ESM Dev Server vs Bundle） |
| bundle-analysis | 构建产物分析与优化 |
| babel | Babel 编译流程（AST → Transform → Generate） |
| sourcemap | Sourcemap 原理 |
| monorepo | Monorepo 方案对比（pnpm workspace / Turborepo） |
| cicd | CI/CD 流水线设计 |

### 埋点与监控（9 条）

| id | 标题 |
|---|---|
| track-types | 埋点类型（手动 / 自动 / 可视化） |
| pv-uv | PV / UV / 停留时长统计 |
| click-stream | 点击流与用户行为序列 |
| error-monitor | 错误监控（onerror / unhandledrejection / ErrorBoundary） |
| perf-observer | 性能埋点（PerformanceObserver / Navigation Timing） |
| white-screen | 白屏检测方案 |
| report-method | 数据上报方式（beacon / img / xhr 对比） |
| sampling | 采样率与上报策略 |
| log-aggregation | 前端日志聚合与告警 |

### 浏览器原理（7 条）

| id | 标题 |
|---|---|
| url-to-render | 从输入 URL 到页面渲染全流程 |
| render-process | 渲染进程架构（主线程 / 合成线程） |
| cache-strategy | 缓存策略（强缓存 / 协商缓存） |
| cors | 跨域原理与解决方案 |
| auth-token | Cookie / Session / Token / JWT |
| xss-csrf | XSS 与 CSRF 防御 |
| web-worker | Web Worker 与 SharedArrayBuffer |

---

## 数据结构

```js
{
  id: 'event-loop',          // 唯一 ID，对应 HTML 元素 id
  name: 'Event Loop 运行机制', // 侧边栏显示名
  group: 'JS 异步编程',        // 大主题，用于分组
  type: 'info',               // 决定 badge 颜色：info/warning/success/accent
  icon: '🔄',
  tags: [{ label: 'Event Loop', type: 'info' }, ...],
  // 无 summary 字段，内容通过专属 render 函数生成
}
```

---

## 文件组织

- 新建 `demo/knowledge.html`（单文件，自包含）
- Hub 页面（`demo/hub.html`）新增入口卡片链接至 `knowledge.html`
- 不修改 `tools.html`，共享同一套 CSS 变量语义但各自独立

---

## 实现约束

- 纯 HTML + 原生 JS，无构建步骤，可直接用浏览器打开
- highlight.js CDN 与 tools.html 版本保持一致（11.9.0）
- 首批实现所有 45 个知识点的完整内容（非占位符）
- 移动端响应式与 tools.html 保持一致
