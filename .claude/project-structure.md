# p-react 项目结构参考

> 生成日期：2026-06-11

## 项目概览

`p-react` 是一个 React 19 源码学习项目，包含：
- `packages/` — 简化版 React 实现（TypeScript，对标 React 19.2.1 核心逻辑）
- `source/packages/` — React 官方源码（只读参考，不修改）
- `demo/` — 各 Hook 的运行示例 + 几个独立 HTML 页面
- `.claude/` — AI 会话配置与本文档

---

## packages/ — 简化实现

### 包结构（pnpm workspace）

| 包名 | 路径 | 对应官方包 |
|------|------|-----------|
| `@p-react/react` | `packages/react/` | `react` |
| `@p-react/react-reconciler` | `packages/react-reconciler/` | `react-reconciler` |
| `@p-react/shared` | `packages/shared/` | `shared` |
| `@p-react/react-dom` | `packages/react-dom/`（demo 内） | `react-dom` |

### packages/react/src/

```
createContext.ts       — createContext 实现
createElement.ts       — JSX createElement 实现
index.ts               — 公共 API 导出（useState/useEffect/useReducer/useContext/...）
```

### packages/react-reconciler/src/

```
fiber.ts               — FiberNode / FiberRootNode 数据结构
fiberHooks.ts          — 所有 Hooks 实现（renderWithHooks, mount/update 阶段）
workLoop.ts            — 渲染主循环（scheduleUpdateOnFiber → performSyncWorkOnRoot → workLoopSync）
beginWork.ts           — Fiber 协调阶段（beginWork 及各类型分支）
completeWork.ts        — Fiber 完成阶段（completeWork，创建 DOM）
commitWork.ts          — 提交阶段（commitMutationEffects，操作真实 DOM）
hostConfig.ts          — 平台适配层（DOM 操作抽象）
index.ts               — createRoot / updateContainer 导出
```

### packages/shared/src/

```
Flags.ts               — 副作用标记位（Placement / Update / ChildDeletion 等）
HookEffectTags.ts      — useEffect/useLayoutEffect/useInsertionEffect 标记
Lane.ts                — Lane 优先级模型（位运算，对应 ReactFiberLane.js）
ReactTypes.ts          — 公共类型定义（ReactElement / Key / Ref 等）
WorkTags.ts            — Fiber 节点类型（FunctionComponent / HostRoot / HostComponent 等）
index.ts               — 统一重导出
```

---

## demo/ — 示例与页面

### index.html

入口页面，通过注释切换不同 demo 脚本：

```
01_main.ts             — 最基础渲染
02_functionComponent.ts
03_update.ts
04_useState.ts
05_useEffect.ts
06_useReducer.ts
07_useContext.ts
08_useLayoutEffect.ts
09_useInsertionEffect.ts
10_useRef.ts
11_useImperativeHandle.ts
12_useMemo.ts
13_useCallback.ts
14_useId.ts
15_useTransition.ts
16_lane.ts             — 当前激活（Lane 优先级演示）
```

> 切换方法：编辑 `demo/index.html`，取消注释目标脚本行，注释其余行。

### 独立 HTML 页面

| 文件 | 用途 |
|------|------|
| `hub.html` | p-react 实现原理 Hub（侧边栏布局，各模块详细解析） |
| `pitfalls.html` | React 踩坑指南（常见问题和解释） |
| `deployment.html` | 服务器部署指南（MySQL/Redis/Node.js PM2/Go/Nginx/HTTPS） |
| `runner.html` | demo 运行器 |

所有独立页面均为**纯 HTML + 内联 CSS/JS**，无框架依赖，可直接在浏览器打开。

---

## 构建配置

### vite.config.ts

```ts
root: './demo'          // dev server 根目录
build.rollupOptions.input:
  main       → demo/index.html
  hub        → demo/hub.html
  runner     → demo/runner.html
  pitfalls   → demo/pitfalls.html
  deployment → demo/deployment.html
```

### 开发命令

```bash
pnpm dev       # 启动 Vite dev server（root: ./demo）
pnpm build     # 多页面构建
pnpm preview   # 预览构建产物
```

---

## demo 页面 UI 规范（设计系统）

所有独立 HTML 页面共用同一套 CSS 变量和组件风格：

```css
--bg-base: #0d1117       /* 页面底色（GitHub dark） */
--bg-elevated: #161b22   /* 卡片背景 */
--bg-overlay: #1c2128    /* 悬浮/overlay */
--border: #21262d
--accent: #7c3aed        /* 主色调（紫色） */
--accent-light: #a78bfa
--green: #3fb950
--blue: #58a6ff
--orange: #f0883e
--font-ui: 'Inter', system-ui
--font-code: 'JetBrains Mono', monospace
```

**常用组件模式**：
- `.card` + `.card-header` + `.card-content` — 可折叠卡片（`toggleCard()` JS 函数）
- `.nav-tabs` + `.nav-tab` + `[data-section]` — Tab 切换面板
- `.code-block > pre` — 代码块，支持 `.comment` / `.keyword` / `.string` / `.command` span 语法高亮
- `.tip` / `.warning` — 提示框（自动前置 💡 / ⚠️）
- `.step-list` — 自动编号步骤列表（CSS counter）
- `.back-btn` — 左上角返回按钮（`javascript:history.back()`）

---

## 新增 demo 脚本的步骤

1. 在 `demo/` 下创建 `NN_hookName.ts`（序号递增）
2. 在 `demo/index.html` 中添加注释行：`<!-- <script type="module" src="./NN_hookName.ts"></script> -->`
3. 将当前激活的 `<script>` 注释掉，取消注释新脚本行

## 新增独立 HTML 页面的步骤

1. 在 `demo/` 下创建 `pageName.html`，复用上述 CSS 变量和组件
2. 在 `vite.config.ts` 的 `rollupOptions.input` 中添加入口

---

## 函数命名规则（关键）

`packages/` 中函数名必须与 `source/packages/` 官方源码保持一致，并带注释指向源文件和行号。详见 `CLAUDE.md`。
