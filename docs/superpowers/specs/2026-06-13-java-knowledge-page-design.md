# Java 知识库页面设计文档

**日期**：2026-06-13  
**目标受众**：前端开发者，通过"前端已知概念类比"学习 Java / 后端知识

---

## 背景与目标

新建 `demo/java.html`，作为面向前端开发者的 Java 学习手册。定位是**用前端视角解释 Java 概念**，每条知识点都以"你熟悉的前端概念 ↔ 对应的 Java 概念"为框架展开。页面风格与 `knowledge.html` 同属一个手册系列，但配色独立（Java 橙色系），形成明显区分。

---

## 架构

### 文件结构

- `demo/java.html` — 独立单文件（HTML + 内联 CSS + 内联 JS）
- `demo/hub.html` — 新增入口导航卡片

### 布局

- 左侧固定侧边栏（260px）+ 右侧可滚动内容区
- 与 `knowledge.html` 相同的整体骨架

### 外部依赖（CDN）

- 字体：Inter + JetBrains Mono（Google Fonts）
- 代码高亮：highlight.js 11.9.0（github-dark 主题）

---

## 配色系统

| 变量 | 值 | 说明 |
|------|-----|------|
| `--accent` | `#e8590c` | Java 橙，主 accent |
| `--accent-light` | `#f59e42` | 浅橙，hover / tag |
| `--accent-glow` | `rgba(232,89,12,0.15)` | 发光效果 |
| `--bg-base` | `#0d1117` | 页面背景（同系列） |
| `--bg-elevated` | `#161b22` | 侧边栏 / 卡片背景 |
| `--bg-overlay` | `#1c2128` | hover 背景 |
| `--border` | `#21262d` | 边框 |
| `--text-primary` | `#e6edf3` | 主文字 |
| `--text-secondary` | `#8b949e` | 次要文字 |

---

## 内容组件

### 1. 结论框（rule-box）

复用 `knowledge.html` 的 `rule-box` 组件，橙色 border-left，一句话核心结论。

### 2. 前端 vs Java 对比卡片（新组件）

本页面专属。左右两列等宽，逐行对比前端和 Java 概念。

```
┌─────────────────────────────────────────────┐
│  前端（你熟悉的）    │   Java（对应的）        │
├─────────────────────┼───────────────────────┤
│  package.json       │   pom.xml             │
│  npm install        │   mvn dependency:...  │
│  node_modules/      │   ~/.m2/repository/   │
│  npm run build      │   mvn package         │
│  devDependencies    │   scope=test/provided │
└─────────────────────────────────────────────┘
```

### 3. 概念说明段落

纯文字段落，只解释 Java 侧与前端不同的地方，不做 Java 深讲。

### 4. 代码块（并排）

`pom.xml` 片段 与 `package.json` 片段并排展示，使用 highlight.js 高亮（xml / json）。

---

## 侧边栏导航结构（初始 + 扩展预留）

```
📦 工具链
  └── Maven vs npm          ← 当前实现

☕ 语言对比                  ← 后续扩展
  └── （待定）

🌱 框架对比                  ← 后续扩展
  └── （待定）
```

---

## 首个知识点：Maven vs npm

### 结论
Maven 之于 Java，等同于 npm 之于 Node.js。核心差异：依赖配置是声明式 XML（`pom.xml`），无 `node_modules`，所有依赖统一缓存在 `~/.m2/repository/`，跨项目共享。

### 对比卡片内容

| 前端 | Java |
|------|------|
| `package.json` | `pom.xml` |
| `npm install` | `mvn dependency:resolve` |
| `node_modules/` | `~/.m2/repository/` |
| `npm run build` | `mvn package` |
| `npm run dev` | `mvn spring-boot:run` |
| `devDependencies` | `<scope>test</scope>` |
| `peerDependencies` | `<scope>provided</scope>` |
| `package-lock.json` | `pom.xml`（版本锁定在 `<dependencyManagement>`）|
| 语义化版本 `^1.2.3` | 精确版本 `1.2.3`（Maven 默认不浮动）|
| npm scripts | Maven lifecycle phases（validate → compile → test → package → install → deploy）|

### 概念说明要点

1. **依赖不在项目目录里**：Maven 全局缓存 `~/.m2`，不像 `node_modules` 在项目内，所以 Java 项目 clone 后不需要 `.gitignore` 屏蔽依赖文件夹
2. **生命周期固定**：Maven 有内置的 6 个阶段，`mvn package` 会自动依次执行 compile → test → package，不需要像 npm scripts 手动串联
3. **坐标系统**：依赖用 `groupId:artifactId:version` 三元组唯一标识，类似 npm 的 `scope/name@version`

---

## hub.html 改动

在导航卡片区新增：

```html
<a href="java.html">
  ☕ Java 视角
  <span>前端视角理解 Java</span>
</a>
```

---

## 不在本次范围内

- 搜索功能
- 深色/浅色主题切换
- 第二个知识点（语言对比、框架对比分组）
