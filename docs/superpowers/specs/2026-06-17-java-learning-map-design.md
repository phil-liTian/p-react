# Java 视角 · 学习路径思维导图 设计文档

**日期**：2026-06-17  
**状态**：待实现

---

## 背景与目标

在 `demo/java.html` 中新增一个 topic 条目 **"学习路径总览"**，点进去展示一张放射状思维导图，把现有全部 22 个 topics 按分组可视化。节点可点击，点击后切换到对应 topic 文章。

---

## 架构

### 新增文件

| 文件 | 说明 |
|------|------|
| `demo/public/java/learning-map.js` | 渲染器，导出 `renderLearningMap(t)` |

### 修改文件

| 文件 | 变更 |
|------|------|
| `demo/public/java/data.js` | 在 `topics` 数组**最前面**插入新 topic 条目 |

### 不修改

`java.html` 和 `app.js` 无需改动——`app.js` 已通过动态 `<script>` 加载机制自动处理新的渲染器。

---

## data.js 变更

在 `topics` 数组最前面插入：

```js
{
  id: 'learning-map',
  name: '学习路径总览',
  group: '🗺️ 学习路径',
  type: 'accent',
  icon: '🗺️',
  tags: [
    { label: '思维导图', type: 'accent' },
    { label: '总览', type: 'info' },
    { label: '路径', type: 'success' },
  ],
},
```

插到数组最前面，使侧边栏第一条就是总览图。

---

## learning-map.js 设计

### 渲染器签名

```js
function renderLearningMap(t) {
  // 返回 HTML 字符串，包含内嵌 SVG
}
```

### SVG 规格

| 属性 | 值 |
|------|-----|
| viewBox | `0 0 900 900` |
| 响应式 | `width="100%" style="max-width:900px"` |
| 中心节点 | 圆形 r=46，渐变橙 `#e8590c→#f59e42`，标签"Java 视角" |
| 分组节点 | 圆角矩形 120×36，6 个，距中心 230px |
| Topic 叶节点 | 圆角矩形 140×28，按各组 topic 数量沿分支外侧均匀排布 |
| 连线 | 贝塞尔曲线，`stroke: #30363d`，`stroke-width: 1.5` |
| hover | SVG `<style>` 内 `.topic-node:hover rect { stroke: var(--accent-light); fill-opacity: 0.15 }` |
| 点击 | `onclick="selectTopic('topic-id')"` |

### 6 个分组的基准角度（从 12 点顺时针）

| 分组 | 基准角度 | Topics 数 |
|------|---------|-----------|
| 🌱 Spring 通识 | 0° (正上) | 5 |
| 📦 工具链 | 60° | 1 |
| 🏗️ 项目结构 | 120° | 1 |
| 🗄️ 数据库 | 180° (正下) | 8 |
| 🧵 并发 | 240° | 1 |
| ☕ Java 基础 | 300° | 3 |

分组节点颜色与现有 tag 色系对齐：
- Spring 通识 → `--green` (#3fb950)
- 工具链 → `--accent-light` (#f59e42)
- 项目结构 → `--blue` (#58a6ff)
- 数据库 → `--red` (#f85149)
- 并发 → `--yellow` (#d29922)
- Java 基础 → `--accent` (#e8590c)

### 叶节点排布算法

对每个分组：
1. 以分组节点为圆心，沿分支方向（分组角度 + 90°扇形展开）排布 N 个叶节点
2. 叶节点与分组节点之间距离：140px
3. N 个叶节点按 ±(N-1)/2 * 间距 均匀散开，间距 34px（横向）或 34px（纵向）

### 与 app.js 集成

叶节点点击调用全局函数 `selectTopic(id)`，该函数已在 `app.js` 中定义为全局函数，无需额外绑定。

---

## 约束

- 不引入任何外部 JS 库
- 不修改 `java.html`、`app.js`
- 渲染器输出纯 HTML 字符串（与现有所有渲染器风格一致）
- 读取 `topics` 全局变量（已由 `data.js` 注入）获取分组和条目数据，不硬编码

---

## 成功标准

1. 侧边栏第一条显示 "🗺️ 学习路径总览"
2. 点击后加载并显示放射状 SVG 思维导图
3. 图中 22 个 topic 节点均可点击，点击后切换到对应文章
4. hover 时节点有高亮效果
5. 不修改现有任何渲染器行为
