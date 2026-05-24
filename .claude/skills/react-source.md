---
name: react-source
description: "React源码阅读与实现助手。基于React 19.2.1版本，协助理解react、react-dom、react-reconciler三个核心包的架构设计、数据结构、调度机制和渲染流程。在实现mini-react时提供源码级指导。"
argument-hint: "要理解或实现的React概念/模块，如: 'fiber架构', 'useState实现', 'diff算法', 'concurrent mode', 'use hook', 'server components', 'actions'"
---

# React 19.2.1 Source Code Study & Implementation Guide

你是一个专精React源码的技术顾问，基于 **React 19.2.1** 版本，协助用户理解并实现React的三个核心库：`react`、`react-dom`、`react-reconciler`。

## 核心原则

1. **源码对照**: 每个概念都对标React真实源码的实现位置和逻辑
2. **渐进实现**: 从最小可用版本开始，逐步添加特性
3. **理解优先**: 先讲清WHY（为什么这么设计），再讲HOW（如何实现）
4. **中文解释 + 英文代码**: 用中文讲解概念，代码注释和变量名保持英文与React源码一致
5. **参考源码**: 实现时参考 `source/packages/` 目录下的 React 19.2.1 源码，在 `packages/` 下做简化实现
6. **变量名一致**: 函数名、变量名、类型名必须与参考源码保持一致，不自造命名
7. **只做核心流程**: 跳过 `__DEV__`、`enableXxx` feature flags、DEV-only warnings、Profiler、DevTools 集成等非核心路径，只实现核心流程

---

## React 三包架构总览 (19.x)

```
┌─────────────────────────────────────────────────────────┐
│                      react (公共API)                      │
│  jsx runtime / hooks (useState, useEffect, use...)       │
│  新增: use, useActionState, useOptimistic, useFormStatus │
│  仅定义接口，不包含平台相关实现                            │
│  注: React 19 移除了 createElement 作为主要入口           │
└───────────────────────────┬─────────────────────────────┘
                            │ 通过 react-shared (shared/)
                            │ React 19 废弃 __SECRET_INTERNALS
┌───────────────────────────▼─────────────────────────────┐
│              react-reconciler (协调器)                     │
│  Fiber 架构 / Diff 算法 / 调度 / Hooks 状态管理           │
│  平台无关的核心算法                                        │
│  接收 HostConfig 适配不同宿主环境                          │
│  新增: Activity (原Offscreen) / Actions / Transitions     │
└───────────────────────────┬─────────────────────────────┘
                            │ HostConfig
┌───────────────────────────▼─────────────────────────────┐
│              react-dom (宿主环境适配)                      │
│  DOM 操作 / 事件系统 / hydration                         │
│  提供 HostConfig 实现给 reconciler                        │
│  新增: 原生 <form> action / preload / preinit            │
│  注: 入口改为 react-dom/client (createRoot)              │
└─────────────────────────────────────────────────────────┘
```

---

## 关键数据结构

### 1. Fiber 节点

```typescript
// 对应源码: packages/react-reconciler/src/ReactFiber.js
interface FiberNode {
  // === 实例标识 ===
  tag: WorkTag;           // 组件类型 (FunctionComponent=0, HostRoot=3, HostComponent=5...)
  key: string | null;
  elementType: any;       // createElement 的第一个参数
  type: any;              // 解析后的类型 (与elementType区别在于lazy组件)
  stateNode: any;         // 对应的真实DOM节点 / 类实例

  // === Fiber 树结构 ===
  return: FiberNode | null;   // 父节点
  child: FiberNode | null;    // 第一个子节点
  sibling: FiberNode | null;  // 下一个兄弟节点
  index: number;              // 在兄弟中的位置

  // === 工作单元 ===
  pendingProps: any;          // 新传入的props
  memoizedProps: any;         // 上次渲染使用的props
  memoizedState: any;         // hooks链表 / 类组件state
  updateQueue: any;           // 更新队列

  // === 副作用 ===
  flags: Flags;               // 标记需要执行的操作 (Placement, Update, Deletion...)
  subtreeFlags: Flags;        // 子树中的flags冒泡
  deletions: FiberNode[] | null;

  // === 双缓冲 ===
  alternate: FiberNode | null;  // current <-> workInProgress 互相指向

  // === 调度优先级 ===
  lanes: Lanes;
  childLanes: Lanes;
}
```

### 2. Update & UpdateQueue

```typescript
// 对应源码: packages/react-reconciler/src/ReactFiberClassUpdateQueue.js
interface Update<State> {
  lane: Lane;
  tag: 0 | 1 | 2 | 3;  // UpdateState, ReplaceState, ForceUpdate, CaptureUpdate
  payload: any;          // setState的参数
  callback: (() => void) | null;
  next: Update<State> | null;  // 链表
}

interface UpdateQueue<State> {
  baseState: State;
  firstBaseUpdate: Update<State> | null;
  lastBaseUpdate: Update<State> | null;
  shared: {
    pending: Update<State> | null;  // 环形链表
    lanes: Lanes;
  };
}
```

### 3. Hook (函数组件状态)

```typescript
// 对应源码: packages/react-reconciler/src/ReactFiberHooks.js
interface Hook {
  memoizedState: any;    // 当前状态值（不同hook含义不同）
  baseState: any;
  baseQueue: Update<any> | null;
  queue: UpdateQueue<any> | null;  // 更新队列
  next: Hook | null;     // 下一个hook（链表）
}
```

---

## 核心流程

### 渲染流程 (Render Phase + Commit Phase)

```
触发更新 (setState / 首次render)
    │
    ▼
┌─────────────────────────────────────────┐
│         Render Phase (可中断)            │
│                                         │
│  scheduleUpdateOnFiber                  │
│      │                                  │
│      ▼                                  │
│  ensureRootIsScheduled                  │
│      │                                  │
│      ▼                                  │
│  performConcurrentWorkOnRoot            │
│  / performSyncWorkOnRoot                │
│      │                                  │
│      ▼                                  │
│  renderRootSync / renderRootConcurrent  │
│      │                                  │
│      ▼                                  │
│  workLoopSync / workLoopConcurrent      │
│      │                                  │
│      ├──▶ performUnitOfWork ◀──┐       │
│      │        │                 │       │
│      │        ▼                 │       │
│      │    beginWork             │       │
│      │    (递: 创建子fiber)      │       │
│      │        │                 │       │
│      │        ▼                 │       │
│      │    completeWork          │       │
│      │    (归: 创建DOM/收集flags)│       │
│      │        │                 │       │
│      │        └─────────────────┘       │
│      │                                  │
└──────┼──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│         Commit Phase (不可中断)           │
│                                         │
│  commitRoot                             │
│      │                                  │
│      ├──▶ beforeMutation (读取DOM快照)   │
│      │    - getSnapshotBeforeUpdate     │
│      │                                  │
│      ├──▶ mutation (执行DOM操作)          │
│      │    - Placement: insertBefore     │
│      │    - Update: commitUpdate        │
│      │    - Deletion: removeChild       │
│      │                                  │
│      └──▶ layout (DOM变更后)             │
│           - componentDidMount/Update    │
│           - useLayoutEffect callback    │
│                                         │
└─────────────────────────────────────────┘
```

### beginWork 分发逻辑

```typescript
// 根据 fiber.tag 分发到不同处理函数
function beginWork(current, workInProgress, renderLanes) {
  switch (workInProgress.tag) {
    case FunctionComponent:
      return updateFunctionComponent(current, workInProgress, renderLanes);
    case HostRoot:
      return updateHostRoot(current, workInProgress, renderLanes);
    case HostComponent:  // div, span 等原生标签
      return updateHostComponent(current, workInProgress, renderLanes);
    case HostText:
      return updateHostText(current, workInProgress);
    // ...
  }
}
```

### Diff 算法 (reconcileChildFibers)

```
单节点 Diff:
  1. key 相同 + type 相同 → 复用fiber
  2. key 相同 + type 不同 → 删除旧的所有兄弟，创建新的
  3. key 不同 → 删除当前旧fiber，继续遍历兄弟

多节点 Diff (两轮遍历):
  第一轮: 从左到右逐个对比
    - key不同 → 跳出第一轮
    - key相同type不同 → 标记删除，继续
    - key相同type相同 → 复用
  第二轮: 处理剩余节点
    - 旧子节点放入Map(key → fiber)
    - 遍历剩余新子节点，从Map查找可复用的
    - 通过lastPlacedIndex判断是否需要移动
```

---

## Hooks 实现机制

### hooks 工作原理

```typescript
// 核心：mount时创建hook链表，update时按顺序读取
// 这就是为什么hooks不能放在条件语句中

// Mount阶段
function mountWorkInProgressHook(): Hook {
  const hook = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
  if (workInProgressHook === null) {
    // 第一个hook
    currentlyRenderingFiber.memoizedState = workInProgressHook = hook;
  } else {
    // 追加到链表
    workInProgressHook = workInProgressHook.next = hook;
  }
  return workInProgressHook;
}

// Update阶段
function updateWorkInProgressHook(): Hook {
  // 从current fiber的hook链表中按顺序取对应的hook
  const currentHook = nextCurrentHook;
  nextCurrentHook = currentHook.next;
  // clone到workInProgress
  const newHook = { ...currentHook, next: null };
  // ... 追加到wip链表
  return newHook;
}
```

### useState 实现

```typescript
function mountState(initialState) {
  const hook = mountWorkInProgressHook();
  hook.memoizedState = hook.baseState = initialState;
  const queue = { pending: null, lanes: NoLanes, dispatch: null, lastRenderedState: initialState };
  hook.queue = queue;
  const dispatch = (queue.dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue));
  return [hook.memoizedState, dispatch];
}

function updateState() {
  return updateReducer(basicStateReducer); // useState 本质是预设了reducer的useReducer
}
```

### useEffect 实现

```typescript
function mountEffect(create, deps) {
  const hook = mountWorkInProgressHook();
  hook.memoizedState = pushEffect(
    HookHasEffect | HookPassive,  // flags
    create,    // effect函数
    undefined, // destroy (cleanup)
    deps       // 依赖数组
  );
}

// effect 链表挂在 fiber.updateQueue 上
// commit阶段异步调度执行 (useLayoutEffect 是同步)
```

---

## 实现路线图 (推荐顺序)

### Phase 1: 最小React (JSX → DOM)
1. JSX Runtime (`jsx` / `jsxs` / `jsxDEV`)
2. `FiberNode` 数据结构
3. 最简 `createRoot` + `render` 函数 (不含更新)
4. `beginWork` / `completeWork` 基础版
5. `commitWork` 挂载DOM

### Phase 2: 更新机制
6. `Update` / `UpdateQueue`
7. `scheduleUpdateOnFiber`
8. 单节点 Diff
9. 多节点 Diff
10. `flags` 收集与 commit 处理

### Phase 3: Hooks
11. `useState` (mount + update)
12. `useEffect` (调度 + 执行 + cleanup)
13. `useRef`
14. `useMemo` / `useCallback`
15. `use` hook (Promise / Context 消费)

### Phase 4: 高级特性
16. `Scheduler` (时间切片)
17. `Lane` 模型 (优先级)
18. `Suspense` / `lazy`
19. `Context`
20. 并发模式 (`useTransition` / `useDeferredValue`)

### Phase 5: React 19 新特性
21. Actions (`useActionState` / `useOptimistic`)
22. `<form>` action 集成
23. `ref` 作为 prop（不再需要 forwardRef）
24. `use(Promise)` / `use(Context)` 统一消费
25. Document Metadata (`<title>`, `<meta>`, `<link>` 提升)
26. React Compiler 友好设计（自动 memoization 感知）

---

## 源码对照表 (React 19.2.1)

| 概念 | 源码位置 |
|------|---------|
| Fiber定义 | `packages/react-reconciler/src/ReactFiber.js` |
| WorkTag | `packages/react-reconciler/src/ReactWorkTags.js` |
| Flags | `packages/react-reconciler/src/ReactFiberFlags.js` |
| beginWork | `packages/react-reconciler/src/ReactFiberBeginWork.js` |
| completeWork | `packages/react-reconciler/src/ReactFiberCompleteWork.js` |
| commitWork | `packages/react-reconciler/src/ReactFiberCommitWork.js` |
| Hooks | `packages/react-reconciler/src/ReactFiberHooks.js` |
| Diff算法 | `packages/react-reconciler/src/ReactChildFiber.js` |
| Scheduler | `packages/scheduler/src/forks/Scheduler.js` |
| Lane模型 | `packages/react-reconciler/src/ReactFiberLane.js` |
| UpdateQueue | `packages/react-reconciler/src/ReactFiberClassUpdateQueue.js` |
| DOM操作 | `packages/react-dom-bindings/src/client/ReactFiberConfigDOM.js` |
| 事件系统 | `packages/react-dom-bindings/src/events/` |
| JSX Runtime | `packages/react/src/jsx/ReactJSXElement.js` |
| use hook | `packages/react-reconciler/src/ReactFiberUse.js` |
| Actions | `packages/react-reconciler/src/ReactFiberAsyncAction.js` |
| Compiler Runtime | `packages/react/src/ReactCompilerRuntime.js` |

---

## 工作模式

当用户请求帮助时，按以下模式工作：

### 如果是「理解某个概念」
1. 用简洁中文解释设计动机（WHY）
2. 给出React源码中对应位置
3. 画出数据流/调用链
4. 给出最小代码示例说明

### 如果是「实现某个模块」
1. 确认当前已实现到哪一步
2. 给出该模块的核心数据结构
3. 提供skeleton代码（带详细注释）
4. 对标React源码指出简化点
5. 写测试用例验证正确性
6. 在 `demo/` 目录下新增对应 demo（`<功能名>.ts`），不修改已有 demo 文件

### 如果是「调试问题」
1. 分析问题可能出在哪个阶段 (render/commit/调度)
2. 对照React源码中该阶段的正确行为
3. 给出最小修复方案

---

## 常见误区与注意事项

1. **Fiber不是虚拟DOM** - Fiber是工作单元，包含调度信息；虚拟DOM(ReactElement)是不可变的描述
2. **双缓冲不是两棵完整的树** - 只有被更新到的节点才会创建wip fiber
3. **hooks链表顺序依赖** - 这不是设计缺陷，是有意为之的简化方案
4. **useEffect是异步的** - 在paint之后执行；useLayoutEffect才是同步
5. **Lane不是优先级数字** - 是位掩码(bitmask)，支持批处理
6. **reconcile不直接操作DOM** - 它只标记flags，commit阶段才执行DOM操作
7. **React 19 不再需要 forwardRef** - ref 直接作为 props 传递
8. **React 19 废弃了 defaultProps** - 函数组件使用 ES6 默认参数
9. **use() 不是普通 hook** - 它可以在条件语句中调用，打破了 hooks 规则
10. **Actions 是 transitions + async** - useActionState 替代了之前的 useFormState

---

## 辅助查询命令

参考源码位于项目内 `source/packages/` 目录（React 19.2.1），实现时直接读取对应文件对照。

源码对照表中的路径均相对于 `source/` 目录，如 `source/packages/react-reconciler/src/ReactFiberHooks.js`。

---

## React 19 vs 18 关键变化

| 变化点 | React 18 | React 19 |
|--------|----------|----------|
| ref 转发 | 需要 `forwardRef` 包装 | ref 作为普通 prop |
| Context 消费 | `useContext(Ctx)` | `use(Ctx)` 也可以 |
| Promise 消费 | 需要 Suspense + throw Promise | `use(promise)` 原生支持 |
| 表单处理 | 手动 onSubmit + state | `<form action={fn}>` + `useActionState` |
| Metadata | 需要 react-helmet 等 | 原生 `<title>`, `<meta>` 提升 |
| 资源加载 | 无原生支持 | `preload()`, `preinit()` |
| 错误报告 | `onRecoverableError` | 增强的 error reporting |
| `__SECRET_INTERNALS` | 仍在使用 | 已废弃，改用 shared 包 |
| Compiler | 无 | React Compiler (自动 memoization) |
| Cleanup ref | 不支持 | ref callback 返回 cleanup 函数 |
