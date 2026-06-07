# P-React - React 源码学习与实现

本项目参考 React 19.2.1 实现 React 核心功能，旨在深入理解 React 源码设计思路和实现原理。

## 📚 项目简介

P-React 是一个 React 源码学习项目，通过逐步实现 React 核心功能来深入理解 React 的工作原理。项目遵循 React 官方源码的架构设计，同时保持代码简洁易懂，适合学习和研究。

## 📦 项目结构

```
packages/
├── react/              # React 核心 API 实现
├── react-dom/          # DOM 渲染相关实现
├── react-reconciler/   # 协调器核心实现（Fiber, 调和算法等）
└── shared/             # 共享工具类型和常量
```

### 包职责说明

- **react**: 实现 React 核心 API，包括 `createElement`、`Component`、Hooks 等
- **react-dom**: 处理 DOM 相关的渲染操作，将 React 渲染结果挂载到真实 DOM
- **react-reconciler**: 实现 Fiber 架构和调和算法，是 React 的核心调度协调器
- **shared**: 共享的工具函数、类型定义和常量

## 🎯 开发进度

按照 React 源码开发规则，逐步实现核心功能：

- [✅] Fiber 数据结构
- [✅] 渲染阶段（Render Phase）：beginWork + completeWork
- [✅] 提交阶段（Commit Phase）
- [✅] Diff 算法 - 贪心算法
- [ ] Hooks 实现
  - [✅] `useState`
  - [✅] `useEffect`
  - [✅] `useReducer`、`useContext`
  - [✅] `useLayoutEffect`、`useInsertionEffect`
  - [✅] `useRef`、`useImperativeHandle`
  - [✅] `useMemo`、`useCallback`
  - [ ] `useId`、`useTransition`、`useDeferredValue`、`useSyncExternalStore`（React 18）
  - [ ] `useActionState`、`useFormStatus`、`useOptimistic`（React 19）
- [ ] Lane 模型  任务的优先级（车道）
- [ ] 调度器（Scheduler）
- [ ] 并发模式

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
npm install
```

### 开发构建

```bash
npm run dev
```

### 运行示例

打开 `demo/index.html` 可以查看运行示例。目前提供了以下示例：

- `demo/01_main.ts` - 基础 ReactElement 渲染
- `demo/02_functionComponent.ts` - 函数组件渲染
- `demo/03_update.ts` - 组件更新（Diff）
- `demo/04_useState.ts` - useState 基础使用
- `demo/05_useEffect.ts` - useEffect 使用示例

## 📖 学习指南

项目遵循循序渐进的开发原则：

1. **从基础开始**：先理解 JSX 转换为 ReactElement 的过程
2. **Fiber 架构**：理解 Fiber 数据结构如何改造 React 15 的栈调和
3. **双缓冲技术**：理解 render 阶段和 commit 阶段的分离
4. **调和算法**：理解 Diff 算法如何高效更新 DOM
5. **Hooks 实现**：理解 Hooks 的调用栈和状态保存机制
6. **调度器**：理解 React 如何实现时间切片和可中断渲染

## 🛠 开发规范

本项目遵循以下开发规范：

- 使用 TypeScript 编写，保持类型安全
- 命名风格与 React 官方源码保持一致
- 复杂算法和数据结构添加中文注释说明设计思路
- 每个核心功能点独立提交，提交信息格式：`feat(module): 功能描述`

## 📝 相关文档

- [React 源码开发规则](./.joycode/rules/react-source-development.md) - 项目开发规则
- [React 源码学习指南](./react-source-learning-guide.md) - 更详细的学习指南
- [工作循环流程](./workLoop.md) - React 工作循环说明

## 🤝 贡献

欢迎提 Issue 和 PR，一起完善这个 React 源码学习项目！

## 📄 许可证

MIT