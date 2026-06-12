# 前端知识库 — 性能优化批次设计文档

## 概览

新建 `demo/knowledge.html`，单文件自包含，采用与 `demo/tools.html` 完全相同的视觉系统（深色主题、Inter + JetBrains Mono、highlight.js 11.9.0）。

本批次仅实现「性能优化」分组的 10 个知识点，侧边栏不显示其他 group（方案 A）。后续批次直接往 `topics` 数组追加条目 + 新增 render 函数即可扩展。

同步在 `demo/hub.html` 新增一张入口卡片。

---

## 文件改动

| 文件 | 操作 |
|---|---|
| `demo/knowledge.html` | 新建 |
| `demo/hub.html` | 新增知识库入口卡片 |
| `demo/tools.html` | 不动 |

---

## 布局

与 `tools.html` 完全一致：

- 左侧固定侧边栏（260px）
- 右侧滚动内容区（`.article-wrapper`）
- 移动端折叠侧边栏 + 顶部 topbar
- Logo badge 文字改为 `knowledge`，颜色用蓝色（同 tools badge 的 `var(--blue)`）
- Footer「← 返回 Hub」链接到 `hub.html`
- Content header badge 显示当前所属大主题名称

---

## 侧边栏

- 仅渲染一个 nav-group：**性能优化**
- 10 个 nav-item，无折叠箭头
- 无其他 group（不显示、不占位）

---

## 每篇文章的四段式结构

1. **核心问题** — 以一个经典面试/实战问题引入，`rule-box-info` 给出一句话结论
2. **原理剖析** — 文字说明 + 关键代码片段（`section` + `code-block-wrap`）
3. **代码示例** — ✗ 错误用法（`dot-red`）/ ✓ 正确用法（`dot-green`）对比
4. **延伸与注意事项** — 边界情况、关联知识点（`rule-box-warning` 或 `rule-box-success`）

所有 10 条均有完整内容，无占位符。

---

## 知识点列表

| id | 标题 | icon | type |
|---|---|---|---|
| reflow-repaint | 重绘（Repaint）与回流（Reflow） | 🎨 | warning |
| composite-layer | 合成层与 GPU 加速 | 🖥️ | info |
| web-vitals | Web Vitals（LCP / CLS / FID / INP） | 📊 | success |
| first-screen | 首屏加载优化策略 | 🚀 | warning |
| virtual-list | 虚拟列表原理与实现 | 📜 | info |
| lazy-load | 图片懒加载（IntersectionObserver） | 🖼️ | success |
| debounce-throttle | 防抖与节流 | ⏱️ | info |
| memory-leak | 内存泄漏排查与常见场景 | 🧠 | danger |
| raf-ric | requestAnimationFrame 与 requestIdleCallback | 🎞️ | info |
| long-task | 长任务拆分（任务调度） | ⚡ | warning |

---

## 数据结构

```js
const topics = [
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
  // ... 9 more entries
];
```

渲染函数命名：`renderReflowRepaint`、`renderCompositeLayer` 等，注册到 `renderers` map，与 `tools.html` 模式一致。

---

## 实现约束

- 纯 HTML + 原生 JS，无构建步骤，可直接用浏览器打开
- highlight.js CDN 版本与 `tools.html` 保持一致（11.9.0）
- 所有 10 条知识点均实现完整内容（非占位符）
- 移动端响应式与 `tools.html` 保持一致
- CSS 直接复制 `tools.html` 全套样式（复用 design token，不抽离）

---

## hub.html 卡片

在 Hub 页面新增一张入口卡片，标题「前端知识库」，副标题「性能优化 · 10 个核心知识点」，链接到 `knowledge.html`。卡片风格与其他 Hub 卡片保持一致。
