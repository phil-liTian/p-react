# React 19.2 核心原理 & 面试高频考点

> 基于 React 19.2.1 源码整理，结合 p-react 简化实现对照学习

---

## 目录

1. [Fiber 架构](#1-fiber-架构)
2. [渲染流程（Render / Commit）](#2-渲染流程render--commit)
3. [Diff 算法](#3-diff-算法)
4. [Hooks 原理](#4-hooks-原理)
5. [Lane 优先级模型](#5-lane-优先级模型)
6. [并发特性（Concurrent Features）](#6-并发特性concurrent-features)
7. [React 19 新特性](#7-react-19-新特性)
8. [事件系统](#8-事件系统)
9. [Context 原理](#9-context-原理)
10. [性能优化](#10-性能优化)

---

## 1. Fiber 架构

### 核心问题：为什么需要 Fiber？

**React 15 Stack Reconciler 的问题**：递归遍历 VDOM 树，无法中断。当组件树很深时，JS 占用主线程时间过长，导致掉帧（<16ms/帧 = 60fps）。

**Fiber 的本质**：将递归不可中断的渲染，改造为**可中断、可恢复的链表遍历**。

### Fiber 节点结构

```ts
// source/packages/react-reconciler/src/ReactFiber.js
interface FiberNode {
  // 节点类型
  tag: WorkTag;           // FunctionComponent=0, HostRoot=3, HostComponent=5...
  type: any;              // 'div' | MyComponent | null
  key: null | string;

  // 链表指针（三叉树）
  return: Fiber | null;   // 父节点
  child: Fiber | null;    // 第一个子节点
  sibling: Fiber | null;  // 下一个兄弟节点
  index: number;

  // 状态
  pendingProps: any;
  memoizedProps: any;
  memoizedState: any;     // Hooks 链表 / 类组件 state

  // 双缓冲
  alternate: Fiber | null; // current <-> workInProgress 互指

  // 副作用
  flags: Flags;           // 标记 Placement / Update / Deletion
  subtreeFlags: Flags;    // 子树副作用冒泡
  deletions: Fiber[] | null;

  // 调度
  lanes: Lanes;
  childLanes: Lanes;
}
```

### 双缓冲树（Double Buffering）

```
current 树（屏幕上）     workInProgress 树（内存中构建）
      root ─────────── alternate ─────────── root
       │                                      │
      App                                    App
       │                                      │
      div                                    div
```

- 每个 Fiber 节点通过 `alternate` 指向另一棵树的对应节点
- `root.current` 始终指向屏幕上正在显示的树
- Commit 阶段结束后：`root.current = finishedWork`（双缓冲切换）

**源码位置**：`ReactFiberReconciler.js:createContainer` → `ReactFiber.js:createFiber`

---

## 2. 渲染流程（Render / Commit）

### 整体调用链

```
scheduleUpdateOnFiber
  └── ensureRootIsScheduled
        └── performSyncWorkOnRoot / performConcurrentWorkOnRoot
              ├── renderRootSync / renderRootConcurrent
              │     └── workLoopSync / workLoopConcurrent
              │           └── performUnitOfWork
              │                 ├── beginWork     (递：生成子 Fiber)
              │                 └── completeWork  (归：生成真实 DOM)
              └── commitRoot
                    ├── commitBeforeMutationEffects  (getSnapshotBeforeUpdate)
                    ├── commitMutationEffects        (DOM 增删改)
                    └── commitLayoutEffects          (useLayoutEffect / componentDidMount)
```

### Render 阶段（可中断）

**beginWork** — "递"阶段，自顶向下处理每个 Fiber 节点：
- 根据 `fiber.tag` 分发处理：`updateFunctionComponent` / `updateHostComponent`...
- 调用 `renderWithHooks` 执行函数组件，得到 JSX
- 调用 `reconcileChildren`，对比新旧子节点，打 `flags` 标记

**completeWork** — "归"阶段，自底向上处理：
- HostComponent：创建或复用真实 DOM 节点，设置属性
- 将 `flags` 冒泡到父节点 `subtreeFlags`（性能优化，跳过无副作用子树）

**源码**：
- `ReactFiberWorkLoop.js:performUnitOfWork`
- `ReactFiberBeginWork.js:beginWork`
- `ReactFiberCompleteWork.js:completeWork`

### Commit 阶段（不可中断）

三个子阶段同步执行：

| 子阶段 | 时机 | 做什么 |
|---|---|---|
| BeforeMutation | DOM 变更前 | `getSnapshotBeforeUpdate`，调度 `useEffect` |
| Mutation | DOM 变更 | 插入/更新/删除真实 DOM，调用 `useLayoutEffect` 清理 |
| Layout | DOM 变更后 | `useLayoutEffect` 回调，`componentDidMount/Update` |

`useEffect` 在 Layout 阶段结束后**异步调度**执行（不阻塞浏览器绘制）。

---

## 3. Diff 算法

### 核心策略（三个假设降低 O(n³) → O(n)）

1. **同层比较**：不跨层级移动节点
2. **key 相同 + type 相同** → 复用节点
3. **key 或 type 不同** → 销毁重建

### 单节点 Diff

```
新节点只有一个（对象）
  ├── 遍历旧子节点
  │     ├── key 相同 & type 相同 → useFiber 复用，删除其余旧节点
  │     ├── key 相同 & type 不同 → 删除该旧节点及后续所有，跳出循环
  │     └── key 不同 → 标记删除，继续遍历
  └── 没有可复用的 → 创建新 Fiber
```

### 多节点 Diff（两轮遍历）

**第一轮**（处理更新）：同时遍历新旧节点
- key 和 type 都相同 → `updateSlot` 复用，继续
- 不同 → 退出第一轮

**第二轮**：处理剩余节点
- 旧节点有剩余 → 放入 `existingChildren` Map
- 遍历剩余新节点：
  - 在 Map 中找到 key 匹配 → 复用，从 Map 删除
  - 找不到 → 创建新节点
- Map 中剩余节点全部标记删除

**lastPlacedIndex** 优化移动判断：
```
旧：A B C D
新：D A B C

D 的 oldIndex=3 > lastPlacedIndex=0 → 不需移动，lastPlacedIndex=3
A 的 oldIndex=0 < lastPlacedIndex=3 → 需要移动（Placement）
B 的 oldIndex=1 < lastPlacedIndex=3 → 需要移动
C 的 oldIndex=2 < lastPlacedIndex=3 → 需要移动
```

**源码**：`ReactChildFiber.js:reconcileChildFibers`

---

## 4. Hooks 原理

### Hooks 存储结构

```
FunctionComponent Fiber
  └── memoizedState: Hook链表
        ├── Hook { memoizedState, queue, next }  ← useState/useReducer
        ├── Hook { memoizedState, queue, next }  ← useEffect
        └── Hook { memoizedState, queue, next }  ← useRef
```

### 首次渲染 vs 更新的分发

```ts
// source/packages/react-reconciler/src/ReactFiberHooks.js
ReactCurrentDispatcher.current =
  current === null ? HooksDispatcherOnMount : HooksDispatcherOnUpdate;
```

这就是为什么 Hooks **不能在条件语句中使用**——链表顺序必须固定！

### useState / useReducer 原理

**mount 阶段**：
```
mountState(initialState)
  → mountWorkInProgressHook()  创建新 Hook 节点挂入链表
  → hook.memoizedState = initialState
  → hook.queue = { pending: null, dispatch: ... }
  → dispatch = dispatchSetState.bind(null, fiber, queue)
```

**update 阶段**：
```
updateState()
  → updateWorkInProgressHook()  取链表中对应位置的 Hook
  → 处理 queue.pending 环形链表中的所有 update
  → 计算新 state，存入 hook.memoizedState
```

**setState 触发更新**：
```
dispatchSetState → enqueueUpdate → scheduleUpdateOnFiber
```

### useEffect vs useLayoutEffect vs useInsertionEffect

| Hook | 执行时机 | 是否阻塞绘制 | 用途 |
|---|---|---|---|
| `useInsertionEffect` | DOM 变更前（Mutation 前） | 是 | CSS-in-JS 注入样式 |
| `useLayoutEffect` | DOM 变更后、浏览器绘制前 | 是 | 读取 DOM 尺寸、同步动画 |
| `useEffect` | 浏览器绘制后（异步） | 否 | 数据请求、事件订阅 |

### useRef 原理

```ts
// mount 阶段：创建一个 { current: initialValue } 对象存入 hook.memoizedState
function mountRef(initialValue) {
  const hook = mountWorkInProgressHook();
  const ref = { current: initialValue };
  hook.memoizedState = ref;
  return ref;
}
// update 阶段：直接返回同一个对象，不重新创建
```

### useMemo / useCallback 原理

```ts
// mountMemo: 执行 factory，存 [value, deps]
hook.memoizedState = [nextValue, nextDeps];

// updateMemo: areHookInputsEqual(nextDeps, prevDeps) 相同则返回缓存
```

### useContext 原理

- `createContext()` 创建 Context 对象，包含 `_currentValue` 属性
- `<Context.Provider value={v}>` 在 beginWork 时将 `v` 写入 `context._currentValue`
- `useContext(ctx)` 直接读取 `ctx._currentValue`（同步，无需链表）

---

## 5. Lane 优先级模型

### 为什么需要优先级？

并发模式下，不同来源的更新有不同紧迫程度：
- 用户输入（点击）> 数据请求响应 > 后台预渲染

### Lane 的本质：位掩码

```ts
// source/packages/react-reconciler/src/ReactFiberLane.js
export const SyncLane             = 0b0000000000000000000000000000001; // 1
export const InputContinuousLane  = 0b0000000000000000000000000000100; // 4
export const DefaultLane          = 0b0000000000000000000000000010000; // 16
export const IdleLane             = 0b0100000000000000000000000000000;
```

- **Lane**（单个）：一个优先级槽位
- **Lanes**（复数）：多个 Lane 的位或组合
- 位运算高效合并/分离：`lanes & lane`、`lanes | lane`、`lanes & ~lane`

### 优先级调度流程

```
setState 触发 → 计算当前 lane → fiber.lanes |= lane
                                  → 向上冒泡 → root.pendingLanes |= lane

ensureRootIsScheduled
  → getNextLanes(root)    取最高优先级 lane
  → 与 Scheduler 优先级映射
  → scheduleCallback      调度任务
```

### 高优先级插队

并发渲染中途来了更高优先级更新：
1. 中断当前 workInProgress 树（丢弃）
2. 以高优先级 lane 重新开始 render
3. 低优先级更新被跳过，其 lane 保留在 `root.pendingLanes`，等待后续处理

---

## 6. 并发特性（Concurrent Features）

### Concurrent Mode 工作原理

```
workLoopConcurrent:
  while (workInProgress !== null && !shouldYield()) {
    performUnitOfWork(workInProgress);
  }
```

`shouldYield()` 由 Scheduler 判断：当前时间片（5ms）是否用尽。

### Transitions（useTransition / startTransition）

```ts
const [isPending, startTransition] = useTransition();

startTransition(() => {
  setQuery(newQuery); // 标记为 TransitionLane（低优先级）
});
```

- 被包裹的 setState 使用 `TransitionLane`
- 浏览器空闲时才执行，不阻塞用户交互
- `isPending` 为 true 期间可展示 loading 状态

### Suspense 工作原理

```
render 中 throw Promise
  → React catch → 找最近的 Suspense 边界
  → 展示 fallback
  → Promise resolve → 重新触发 render
```

结合 `use(promise)` (React 19)：

```ts
function UserProfile({ id }) {
  const user = use(fetchUser(id)); // 直接 use Promise
  return <div>{user.name}</div>;
}
```

### useDeferredValue

```ts
const deferredQuery = useDeferredValue(query);
// query 变化时：
//   1. 立即用旧 deferredQuery 渲染（不阻塞）
//   2. 后台用新 query 渲染（Transition 优先级）
//   3. 新渲染完成才切换
```

---

## 7. React 19 新特性

### Server Components (RSC)

- 在服务端执行，不打包进客户端 bundle
- 不能使用 Hooks、浏览器 API
- 通过 RSC Payload（特殊序列化格式）传递给客户端

```tsx
// server component（默认）
async function Page() {
  const data = await fetchData(); // 直接 await，无需 useEffect
  return <ClientComponent data={data} />;
}
```

### Actions & useActionState

```ts
// React 19 新 Hook
const [state, action, isPending] = useActionState(
  async (prevState, formData) => {
    await submitForm(formData);
    return { success: true };
  },
  { success: false }
);
```

原生 `<form action={action}>` 支持，无需 `onSubmit`。

### use() Hook

```ts
// 可在条件语句中使用（唯一例外）
const data = use(promise);     // 读取 Promise
const value = use(Context);    // 读取 Context（替代 useContext）
```

### useOptimistic

```ts
const [optimisticLikes, addOptimisticLike] = useOptimistic(
  likes,
  (currentLikes, delta) => currentLikes + delta
);
// 乐观更新 UI，等真实响应后自动回退或确认
```

### ref 作为 prop（取消 forwardRef）

```tsx
// React 19：直接接收 ref prop，无需 forwardRef
function Input({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}
```

### 其他改进

- `<DocumentMetadata>`：在组件中直接写 `<title>` / `<meta>`，自动提升到 `<head>`
- `preload` / `preinit`：资源预加载 API
- 改进的错误报告（去重、更清晰的错误边界消息）

---

## 8. 事件系统

### 合成事件（SyntheticEvent）

React 将所有事件统一注册在**根容器**（`root` div）上，而非每个 DOM 节点。

```
用户点击 button
  → 冒泡到 root
  → React 事件委托处理器触发
  → 构造 SyntheticEvent 对象（复用池）
  → 模拟捕获/冒泡，遍历 Fiber 树收集事件回调
  → 按序执行
```

### 为什么要合成事件？

1. 统一跨浏览器行为
2. 事件对象池化复用（性能，React 17 后已废弃池化）
3. 支持自定义事件优先级（点击 = SyncLane，滚动 = InputContinuousLane）

### React 17 事件系统变化

- 事件从挂载在 `document` 改为挂载在**根容器 DOM 节点**
- 原因：多个 React 版本共存时不冲突

---

## 9. Context 原理

### 创建与传递

```ts
// createContext 存储 _currentValue
const ctx = createContext(defaultValue);

// beginWork 处理 ContextProvider 时
// ReactFiberNewContext.js:pushProvider
context._currentValue = newValue; // 写入新值，入栈
```

### 消费与优化

`useContext` 直接读 `context._currentValue`，无性能优化机制。

`React.memo` + `useMemo` 可手动拆分 Context 避免不必要重渲染：

```ts
// 拆分 Context：state 和 dispatch 分离
const StateContext = createContext(null);
const DispatchContext = createContext(null);
```

### bailout 优化

beginWork 中：若 `context` 值未变 + `props` 未变 + `state` 未变，命中 **bailout**，跳过整棵子树渲染。

---

## 10. 性能优化

### React.memo

```ts
const MemoComp = React.memo(Comp, (prevProps, nextProps) => {
  return prevProps.id === nextProps.id; // true 则跳过重渲染
});
```

原理：`updateSimpleMemoComponent` 中对比 props，命中则 bailout。

### useMemo / useCallback

```ts
const value = useMemo(() => compute(a, b), [a, b]);      // 缓存计算结果
const handler = useCallback(() => doSomething(x), [x]);  // 缓存函数引用
```

### 列表优化：key

- key 相同 + type 相同 → 复用 Fiber（跳过创建 DOM）
- 用稳定唯一 id，避免用 index（会导致大量 Placement 操作）

### 代码分割：lazy + Suspense

```ts
const LazyComp = React.lazy(() => import('./HeavyComponent'));

<Suspense fallback={<Spinner />}>
  <LazyComp />
</Suspense>
```

### 并发优化

| 场景 | 方案 |
|---|---|
| 低优先级更新不阻塞交互 | `startTransition` |
| 高频输入延迟渲染 | `useDeferredValue` |
| 避免主线程长时间阻塞 | Concurrent Mode 时间切片 |

---

## 面试高频问答

### Q1：React Fiber 是什么？解决了什么问题？

Fiber 是 React 16 引入的新协调引擎，本质是**链表结构的虚拟 DOM**。解决了 Stack Reconciler 递归渲染无法中断、长任务阻塞主线程导致卡顿的问题。通过将渲染拆分为可中断的工作单元（Fiber 节点），配合 Scheduler 实现时间切片，使得高优先级任务（用户输入）可以插队。

### Q2：useState 的原理？为什么不能在条件语句中使用 Hooks？

每个 Hook 对应 Fiber 的 `memoizedState` 链表上的一个节点，按**调用顺序**严格对应。条件语句会导致某次渲染跳过某个 Hook，链表顺序错乱，取到错误的 state。

### Q3：useEffect 和 useLayoutEffect 的区别？

`useLayoutEffect` 在 DOM 变更后、浏览器绘制前**同步**执行；`useEffect` 在浏览器绘制后**异步**执行。读写 DOM 尺寸用 `useLayoutEffect`（避免闪烁），副作用操作用 `useEffect`。

### Q4：React Diff 算法？

同层比较，key+type 双重判断。多节点两轮遍历：第一轮处理更新，第二轮用 Map 处理移动/新增/删除。通过 `lastPlacedIndex` 判断是否需要移动，尽量减少 DOM 操作。

### Q5：Context 为什么会导致性能问题？如何优化？

`Context.Provider` value 变化时，所有消费该 Context 的组件都会重渲染（即使组件本身用了 `memo`）。优化方案：①拆分 Context（state 和 dispatch 分离）；②`useMemo` 稳定 value 引用；③换用 Zustand/Jotai 等状态库（基于订阅，细粒度更新）。

### Q6：React 18 并发模式和 React 17 的区别？

React 18 默认开启并发特性：①`createRoot` 替代 `render`；②自动批处理（setTimeout/Promise 内的 setState 也会批量）；③`startTransition` / `useDeferredValue` 标记低优先级更新；④Suspense 支持并发渲染。

### Q7：React 19 最重要的变化？

①Server Components 正式稳定，组件在服务端渲染并流式传输；②Actions/`useActionState` 简化表单异步操作；③`use()` Hook 支持直接消费 Promise 和 Context；④`useOptimistic` 乐观更新；⑤`ref` 可直接作为 prop 传递，废弃 `forwardRef`。

### Q8：React 的批量更新（Batching）？

React 18 之前：只有 React 事件处理器内的 setState 会批量更新（合并为一次渲染）；setTimeout、Promise 内不会批量。  
React 18：引入**自动批处理（Automatic Batching）**，所有上下文中的多次 setState 都自动合并，可用 `flushSync` 退出批处理。

### Q9：reconciler 和 renderer 的关系？

Reconciler（react-reconciler）负责找出变化（Diff、打 flags），与平台无关；Renderer（react-dom / react-native / react-three-fiber）负责将变化应用到具体平台。这种设计使 React 可以跨平台。

### Q10：key 的作用，为什么不建议用 index 作 key？

key 帮助 Diff 算法识别可复用节点。用 index 作 key 时，列表顺序变化（头部插入/删除）会导致所有后续节点 key 改变，无法复用，引发大量 DOM 重建；且受控组件（input）会出现内容错乱 bug。

---

*源码参考路径：`source/packages/react-reconciler/src/`*
