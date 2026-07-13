# P-React - React 源码学习与实现

本项目参考 React 19.2.1 实现 React 核心功能，旨在深入理解 React 源码设计思路和实现原理。

## 📚 项目简介

P-React 是一个 React 源码学习项目，通过逐步实现 React 核心功能来深入理解 React 的工作原理。项目遵循 React 官方源码的架构设计，同时保持代码简洁易懂，适合学习和研究。

除核心 React 实现外，项目还包含一套**多页面知识库 demo**（Java 后端、前端架构、AI 编码、部署、踩坑等），用于系统化沉淀前端工程师视角的技术栈。

## 📦 项目结构

```
p-react/
├── packages/                 # 简化版 React 实现（TypeScript）
│   ├── react/                #   React 核心 API：createElement、Hooks 转发
│   ├── react-dom/            #   DOM 渲染器：hostConfig + 事件
│   ├── react-reconciler/     #   协调器：Fiber、Diff、Hooks、调度
│   └── shared/               #   跨包共享：WorkTags、Flags、Lane
├── source/packages/          # React 官方源码，作为参考和对照
├── demo/                     # Vite 多入口 demo
│   ├── *.html                #   各知识页面（hub、java、knowledge、tools …）
│   ├── 0X_*.ts               #   React 原理递进测试脚本
│   └── public/               #   各页面的模块化 JS 数据
├── react-guide.md            # 前端架构师必备 React 原理体系
├── react19-features.md       # React 核心功能全览
├── react19-core-interview.md # React 19 核心原理 & 面试高频考点
├── react-source-learning-guide.md # React 源码学习路线
├── react-source-interview.md # React 源码深度面试题
├── react-interview-questions.md # React 面试题（初中高级）
└── workLoop.md               # workLoop.ts 工作循环机制详解
```

### 包职责说明

- **react**: 实现 React 核心 API，包括 `createElement`、`Component`、Hooks 转发
- **react-dom**: 处理 DOM 相关的渲染操作，将 React 渲染结果挂载到真实 DOM
- **react-reconciler**: 实现 Fiber 架构和调和算法，是 React 的核心调度协调器
- **shared**: 共享的工具函数、类型定义和常量（`WorkTags`、`Flags`、`Lane`、`HookEffectTags`）

### 关键文件映射

| p-react 文件 | 对应 React 源码 |
|---|---|
| `react-reconciler/src/workLoop.ts` | `ReactFiberWorkLoop.js` |
| `react-reconciler/src/rootScheduler.ts` | `ReactFiberRootScheduler.js` |
| `react-reconciler/src/beginWork.ts` | `ReactFiberBeginWork.js` |
| `react-reconciler/src/completeWork.ts` | `ReactFiberCompleteWork.js` |
| `react-reconciler/src/commitWork.ts` | `ReactFiberCommitWork.js` |
| `react-reconciler/src/fiberHooks.ts` | `ReactFiberHooks.js` |
| `react-reconciler/src/fiber.ts` | `ReactFiber.js` |
| `shared/Lane.ts` | `ReactFiberLane.js` |

## 🎯 开发进度

按照 React 源码开发规则，逐步实现核心功能：

- [✅] Fiber 数据结构
- [✅] 渲染阶段（Render Phase）：beginWork + completeWork
- [✅] 提交阶段（Commit Phase）
- [✅] Diff 算法 - 贪心算法
- [✅] 双缓冲机制（current / workInProgress）
- [✅] Lane 优先级模型（位掩码 + `getNextLanes`）
- [✅] 根调度器（`ensureRootIsScheduled` + microtask 批处理）
- [~] Hooks 实现
  - [✅] `useState`、`useReducer`、`useContext`
  - [✅] `useEffect`、`useLayoutEffect`、`useInsertionEffect`
  - [✅] `useRef`、`useImperativeHandle`
  - [✅] `useMemo`、`useCallback`
  - [✅] `useId`、`useTransition`
  - [ ] `useDeferredValue`、`useSyncExternalStore`（React 18）
  - [ ] `useActionState`、`useFormStatus`、`useOptimistic`（React 19）
- [~] 调度器（Scheduler）
  - [✅] microtask 批处理 + setTimeout 延迟调度（教学版）
  - [ ] 最小堆 + MessageChannel 时间切片（与源码对齐）
- [ ] 并发模式（Concurrent Features）—— 可中断渲染、时间切片

### 内置组件待办

**已有类型（`WorkTags.ts` 中已定义）**

| 组件 | 状态 |
|---|---|
| `FunctionComponent` | ✅ |
| `HostRoot` / `HostComponent` / `HostText` | ✅ |

**待实现**

- [ ] **Fragment**：在 `beginWork` 中识别 `REACT_FRAGMENT_TYPE`，透传子节点列表，无需创建 DOM 节点
- [ ] **memo**：实现 `updateMemoComponent`，对比 props 浅相等时跳过子树渲染（`REACT_MEMO_TYPE`）
- [ ] **forwardRef**：实现 `updateForwardRef`，将 `ref` 作为第二个参数传入函数组件（`REACT_FORWARD_REF_TYPE`）
- [ ] **lazy**：实现 `lazyInitializer`，配合 Suspense 完成动态导入组件的首次加载与缓存（`REACT_LAZY_TYPE`）
- [ ] **Suspense**：实现 `updateSuspenseComponent`，处理 Promise throw 后的 fallback 切换逻辑（`REACT_SUSPENSE_TYPE`）
- [ ] **Profiler**：实现 `updateProfiler`，收集 `actualDuration` / `baseDuration` 并触发 `onRender` 回调（`REACT_PROFILER_TYPE`）
- [ ] **SuspenseList**：实现 `updateSuspenseListComponent`，协调多个 Suspense 子项的加载顺序（`forwards` / `backwards` / `together`）
- [ ] **Activity**：实现 `updateActivityComponent`，支持 `mode="hidden"` 时跳过提交、保留离屏 Fiber 树状态（React 19，原 Offscreen，`REACT_ACTIVITY_TYPE`）
- [ ] **ViewTransition**：实现 `updateViewTransitionComponent`，与浏览器 View Transitions API 集成，驱动跨路由动画（React 19，`REACT_VIEW_TRANSITION_TYPE`）
- [ ] **cache**：实现 `cache()` 包装器，为 React 19 Server Components 提供请求级别的函数结果缓存（`REACT_CACHE_TYPE`）
- [ ] **StrictMode**：实现 `updateMode`，开发环境下对子树执行双重调用以检测副作用（`REACT_STRICT_MODE_TYPE`）

## 🚀 快速开始

### 安装依赖

```bash
pnpm install        # 安装根目录 + workspace 子包依赖
```

### 开发与构建

```bash
pnpm dev            # 启动 Vite 开发服务器（根为 demo/）
pnpm build          # 构建所有 demo 页面
pnpm preview        # 预览构建产物
```

### React 原理示例

`demo/` 下的 `.ts` 文件按主题递进，对应 `demo/index.html` 的入口选择器：

| 脚本 | 主题 |
|---|---|
| `01_main.ts` | 基础 ReactElement 渲染 |
| `02_functionComponent.ts` | 函数组件渲染 |
| `03_update.ts` | 组件更新（Diff） |
| `04_useState.ts` | `useState` 基础使用 |
| `05_useEffect.ts` | `useEffect` 使用示例 |
| `06_useReducer.ts` | `useReducer` |
| `07_useContext.ts` | `useContext` 跨层传值 |
| `08_useLayoutEffect.ts` | `useLayoutEffect` 同步副作用 |
| `09_useInsertionEffect.ts` | `useInsertionEffect` 注入样式 |
| `10_useRef.ts` | `useRef` 引用 |
| `11_useImperativeHandle.ts` | `useImperativeHandle` 暴露方法 |
| `12_useMemo.ts` | `useMemo` 缓存值 |
| `13_useCallback.ts` | `useCallback` 缓存函数 |
| `14_useId.ts` | `useId` 唯一 ID |
| `15_useTransition.ts` | `useTransition` 低优先级更新 |
| `16_lane.ts` | Lane 模型基础 |
| `17_lane_schedule.ts` | Lane + 根调度器协同 |
| `18_lane_large_list.ts` | Lane 在大列表更新中的表现 |

### 知识库页面

通过 `vite.config.ts` 的 `rollupOptions.input` 多入口构建，每个页面独立加载 `demo/public/<page>/` 下的数据模块：

| 页面 | 内容 |
|---|---|
| `hub.html` | 知识库总入口导航 |
| `index.html` | React 原理 demo 运行器 |
| `react-principle.html` | React 原理系列文章 |
| `java.html` | Java / Spring / 中间件知识图谱 |
| `knowledge.html` | 通用前端知识库 |
| `tools.html` | 工具链速查 |
| `ai-coding.html` | AI 编码方法论 |
| `ai-app.html` | AI 应用开发（RAG / Agent） |
| `python.html` | Python 基础 |
| `deployment.html` | 部署指南 |
| `pitfalls.html` | 踩坑实录 |

## 📖 学习指南

项目遵循循序渐进的开发原则：

1. **从基础开始**：先理解 JSX 转换为 ReactElement 的过程
2. **Fiber 架构**：理解 Fiber 数据结构如何改造 React 15 的栈调和
3. **双缓冲技术**：理解 render 阶段和 commit 阶段的分离
4. **调和算法**：理解 Diff 算法如何高效更新 DOM
5. **Hooks 实现**：理解 Hooks 的调用栈和状态保存机制
6. **Lane 模型**：理解位掩码如何表达优先级与批处理
7. **调度器**：理解 React 如何实现时间切片和可中断渲染

推荐学习路径：

```
第一阶段：同步渲染骨架
  workLoop.ts → scheduleUpdateOnFiber → performWorkOnRoot
  beginWork.ts → beginWork
  completeWork.ts → completeWork
  commitWork.ts → commitMutationEffects

第二阶段：Hooks 实现
  fiberHooks.ts → renderWithHooks → mountState → updateState

第三阶段：Lane 优先级模型
  shared/Lane.ts → Lane / Lanes 位运算设计

第四阶段：根调度与并发
  rootScheduler.ts → ensureRootIsScheduled → flushPendingWork
  （源码对应 scheduler/ 包：最小堆、MessageChannel 时间切片）
```

## 🛠 开发规范

本项目遵循以下开发规范（详见 `CLAUDE.md`）：

- 使用 TypeScript 编写，保持类型安全
- **函数命名与 React 源码一致**：`packages/` 中的函数名必须对应 `source/packages/` 中的同名函数（如 `scheduleUpdateOnFiber`、`performUnitOfWork`、`renderWithHooks`）
- **注释规范**：
  - 文件顶部注明对应源码文件与主要差异
  - 公开函数（`export`）必须有 JSDoc，标明对应源码函数名
  - 私有函数至少一行注释指向源码位置
  - 行内注释仅用于非显而易见的逻辑（如双缓冲切换、Lane 合并）
- 每个核心功能点独立提交，提交信息格式：`feat(module): 功能描述`

## 📝 相关文档

- [React 源码学习指南](./react-source-learning-guide.md) - 由浅入深的学习路线
- [前端架构师必备 React 原理体系](./react-guide.md) - 五层原理体系
- [React 核心功能全览](./react19-features.md) - 含 React 18/19 新增功能
- [React 19 核心原理 & 面试高频考点](./react19-core-interview.md)
- [React 源码深度面试题](./react-source-interview.md)
- [React 面试题（初中高级）](./react-interview-questions.md)
- [workLoop.ts 工作循环机制详解](./workLoop.md)
- [CLAUDE.md](./CLAUDE.md) - 项目开发规范与 AI 导师角色定义

## 🤝 贡献

欢迎提 Issue 和 PR，一起完善这个 React 源码学习项目！

## 📄 许可证

MIT
