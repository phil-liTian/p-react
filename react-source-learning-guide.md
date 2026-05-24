# React 源码由浅入深学习路线

面向有 1-2 年 React 使用经验的前端开发者。读完这份路线，你应该能回答"React 为什么这么快"、"Hooks 为什么不能写在条件语句里"、"并发模式到底解决了什么问题"。

---

## 前置知识检查

在进入源码之前，先确认这几项基础是否扎实。缺哪块就先补哪块，否则读源码会很痛苦。

**JavaScript 基础**
- 原型链、闭包、执行上下文、事件循环（宏任务/微任务）
- `MessageChannel`、`requestIdleCallback`、`requestAnimationFrame` 的工作原理
- `WeakMap`、`Symbol`、`Proxy` 的使用场景

**数据结构**
- 链表：React 中大量使用单向链表（Hook 链表、Update 链表、Effect 链表）
- 树的深度优先遍历（DFS）：Fiber 树的 beginWork/completeWork 遍历顺序就是 DFS
- 位运算：React 的 flags、Lane 全部用位掩码实现，需要熟悉 `|`、`&`、`~`、`<<`

**TypeScript**
- 泛型、联合类型、类型守卫
- 源码中大量类型标注，能看懂才不会被干扰

**React 使用经验**
- 能熟练使用 `useState`、`useEffect`、`useRef`、`useContext`、`useMemo`、`useCallback`
- 理解 key 在列表渲染中的作用（这直接影响你理解 Diff 算法的设计动机）
- 踩过几个 Hooks 陷阱（闭包问题、deps 遗漏等）

---

## 总览表格

| 阶段 | 核心内容 | 难度 | 建议用时 |
|------|---------|------|---------|
| 1. 热身：JSX 与 createElement | JSX 编译、ReactElement 数据结构 | ★☆☆☆☆ | 0.5 天 |
| 2. Fiber 架构基础 | FiberNode 结构、FiberRoot、双缓冲 | ★★☆☆☆ | 1 天 |
| 3. 渲染流程：render 阶段 | workLoop、beginWork、completeWork | ★★★☆☆ | 2 天 |
| 4. 提交阶段：commit phase | commitRoot、三个子阶段、DOM 操作 | ★★★☆☆ | 1 天 |
| 5. Diff 算法 | 单节点 diff、多节点 diff、key 复用 | ★★★☆☆ | 2 天 |
| 6. Hooks 实现机制 | mountState、updateState、useEffect | ★★★★☆ | 3 天 |
| 7. 调度器 Scheduler | 时间切片、任务优先级、MessageChannel | ★★★★☆ | 2 天 |
| 8. Lane 优先级模型 | Lane 位掩码、批处理、优先级合并 | ★★★★☆ | 2 天 |
| 9. 并发模式 | Concurrent Mode、useTransition、Suspense | ★★★★★ | 3 天 |
| 10. 事件系统 | 合成事件、事件委托、优先级绑定 | ★★★★☆ | 2 天 |

**总计约 18-20 天**（每天 3-4 小时有效学习时间）。这是保守估计，如果你在每个阶段都动手写 mini 版本，时间会翻倍，但理解深度也会翻倍。

---

## 第一阶段：JSX 与 createElement

**建议用时：0.5 天**

### 学习目标

搞清楚你写的 JSX 最终变成了什么，`<div className="foo">hello</div>` 和 `React.createElement('div', { className: 'foo' }, 'hello')` 之间是什么关系，以及 React 17+ 的新 JSX Transform 做了什么改变。

### 核心内容

JSX 是语法糖，由 Babel 或 esbuild 转译。React 17 之前转成 `React.createElement` 调用，React 17 之后转成 `_jsx` / `_jsxs` 调用（不再需要显式 `import React`）。

`createElement` 返回的是一个普通 JavaScript 对象，称为 ReactElement：

```typescript
// 最终结构
{
  $$typeof: Symbol(react.element),  // 防 XSS 注入
  type: 'div',                      // 字符串 | 函数 | 类
  key: null,
  ref: null,
  props: { className: 'foo', children: 'hello' }
}
```

`$$typeof` 用 Symbol 标记，是一个安全特性：从服务端注入的 JSON 对象里不可能有 Symbol，所以可以防止用户传入伪造的 ReactElement。

### 需要读的源码文件

- `packages/react/src/jsx/ReactJSXElement.js` — 重点看 `ReactElement` 函数的实现，只有不到 30 行
- `packages/react/src/jsx/ReactJSX.js` — `_jsx` 和 `_jsxs` 的入口

### p-react 对应文件

`packages/react/src/createElement.ts` — 当前 mini 实现，对比着看更容易理解哪些字段是必须的

### 动手练习

1. 打开浏览器 DevTools，写一个简单 JSX，`console.log` 出对应的 ReactElement，观察其结构
2. 在 p-react 的 `createElement.ts` 中添加对 `children` 规范化的处理（单个子节点直接存，多个子节点存数组）
3. 理解为什么 `$$typeof` 要用 Symbol 而不是普通字符串

### 不要踩的坑

ReactElement 只是描述 UI 的不可变对象，它不是 Fiber。很多人把"虚拟 DOM"和 Fiber 混淆，实际上 Fiber 是工作单元，包含调度信息，是可变的。

---

## 第二阶段：Fiber 架构基础

**建议用时：1 天**

### 学习目标

理解 React 为什么要从 Stack Reconciler 迁移到 Fiber Reconciler，FiberNode 每个字段的含义，以及双缓冲机制的工作原理。

### 核心内容

**为什么需要 Fiber**

React 15 的 Stack Reconciler 是递归处理的，一旦开始就无法中断。如果组件树很深，JS 线程会被长时间占用，导致浏览器无法响应用户交互（掉帧）。

Fiber 的核心设计思路：把递归改成可中断的循环。每个 FiberNode 是一个工作单元，处理完一个可以暂停，下次从断点继续。

**FiberNode 的关键字段分组**

```
实例标识: tag, key, type, stateNode
树结构:   return(父), child(第一子), sibling(下一兄弟), index
状态:     pendingProps, memoizedProps, memoizedState, updateQueue
副作用:   flags, subtreeFlags, deletions
双缓冲:   alternate
调度:     lanes, childLanes
```

`return`、`child`、`sibling` 三个指针组成了一个"链化的树"，这是 Fiber 能中断恢复的关键。任何时候只要保存 `workInProgress` 指针，就知道下一步该处理哪个节点。

**双缓冲机制**

React 同时维护两棵 Fiber 树：
- `current tree`：当前显示在屏幕上的内容
- `workInProgress tree`：正在后台构建的新内容

两者通过 `alternate` 互相指向。渲染完成后，`workInProgress` 变成新的 `current`，原来的 `current` 在下次更新时被复用为新的 `workInProgress`。这样避免了频繁创建和销毁对象。

**FiberRootNode 和 HostRootFiber 的区别**

- `FiberRootNode` 是整个应用的根节点，只有一个，通过 `root.current` 指向当前树的根 Fiber
- `HostRootFiber` 是 Fiber 树的根节点（tag === HostRoot），通过 `stateNode` 指向 `FiberRootNode`

### 需要读的源码文件

- `packages/react-reconciler/src/ReactFiber.js` — `createFiber`、`createWorkInProgress`
- `packages/react-reconciler/src/ReactWorkTags.js` — WorkTag 常量定义（约 25 种）
- `packages/react-reconciler/src/ReactFiberFlags.js` — flags 位掩码定义

### p-react 对应文件

`packages/react-reconciler/src/fiber.ts` — `FiberNode` 和 `FiberRootNode` 类，注释很详细，适合对照 React 源码理解哪些字段被简化了

### 动手练习

1. 手画一棵简单组件树（3-4 层）的 Fiber 树结构，标出所有 `return`、`child`、`sibling` 指针
2. 在纸上模拟双缓冲切换过程：首次 render 完成后 `alternate` 是什么，第二次 setState 后又是什么
3. 列出 p-react 的 `FiberNode` 和 React 源码中缺少了哪些字段，理解为什么简化版能正常工作

---

## 第三阶段：渲染流程 —— render 阶段

**建议用时：2 天**

### 学习目标

搞清楚从 `ReactDOM.render()` 被调用，到整棵 Fiber 树构建完成，中间经历了哪些函数，顺序是什么，"递"和"归"分别做什么事情。

### 核心内容

**调用链**

```
render(element, container)
  -> createRoot() -> new FiberRootNode() + new FiberNode(HostRoot)
  -> scheduleUpdateOnFiber(hostRootFiber)
    -> markUpdateFromFiberToRoot()     // 向上找到 FiberRootNode
    -> performSyncWorkOnRoot(root)
      -> prepareFreshStack()           // 创建 wip 根节点
      -> workLoopSync()
        -> performUnitOfWork(wip)      // 循环处理每个节点
          -> beginWork()               // 递：创建子 fiber
          -> completeWork()            // 归：创建 DOM，收集 flags
```

**beginWork（递阶段）**

根据 `fiber.tag` 分发处理：
- `HostRoot` -> 从 `memoizedState` 取到根 ReactElement，调用 `reconcileChildren`
- `HostComponent` -> 从 `pendingProps.children` 取子元素，调用 `reconcileChildren`
- `FunctionComponent` -> 执行函数体得到 ReactElement，调用 `reconcileChildren`
- `HostText` -> 叶子节点，返回 null，触发"归"

`reconcileChildren` 是 Diff 算法的入口，首次渲染走 `mountChildFibers`，更新走 `reconcileChildFibers`。当前 p-react 的实现两者相同（都标记 Placement），完整 Diff 在第五阶段加入。

**completeWork（归阶段）**

从叶子节点开始，自底向上：
- `HostComponent` -> 调用 `hostConfig.createInstance()` 创建真实 DOM 节点，调用 `appendAllChildren()` 把子节点的 DOM 挂进去，存入 `stateNode`
- `HostText` -> 调用 `hostConfig.createTextInstance()` 创建文本节点
- `HostRoot` / `FunctionComponent` -> 不需要创建 DOM，跳过
- 最后调用 `bubbleProperties()` 将子树的 flags 冒泡到当前节点的 `subtreeFlags`

`appendAllChildren` 的实现有个细节值得注意：它会穿透 FunctionComponent，只追加真正的 HostComponent/HostText，这保证了 DOM 结构不受组件层级影响。

**遍历顺序**

```
        A
       / \
      B   C
     / \
    D   E
```

顺序：A(begin) -> B(begin) -> D(begin) -> D(complete) -> E(begin) -> E(complete) -> B(complete) -> C(begin) -> C(complete) -> A(complete)

这是深度优先的"先序进入、后序离开"，也是为什么 completeWork 能在 HostComponent 创建时把子 DOM 都收集进来（因为子节点都已经 complete 了）。

### 需要读的源码文件

- `packages/react-reconciler/src/ReactFiberWorkLoop.js` — 重点读 `performSyncWorkOnRoot`、`workLoopSync`、`performUnitOfWork`、`completeUnitOfWork`
- `packages/react-reconciler/src/ReactFiberBeginWork.js` — 重点读 `beginWork` 函数和各个 `update*` 处理函数
- `packages/react-reconciler/src/ReactFiberCompleteWork.js` — 重点读 `completeWork`、`appendAllChildren`、`bubbleProperties`

### p-react 对应文件

- `packages/react-reconciler/src/workLoop.ts` — `createWorkLoop` 工厂函数，包含完整的递归-归并流程，注释非常详细
- `packages/react-reconciler/src/beginWork.ts` — beginWork 分发逻辑
- `packages/react-reconciler/src/completeWork.ts` — completeWork，包含 `appendAllChildren` 和 `bubbleProperties`

### 动手练习

1. 在 p-react 中用 `console.log` 在每个 beginWork/completeWork 调用处打印 `fiber.tag` 和节点类型，跑一个简单 demo，验证遍历顺序和你手画的一致
2. 手动在纸上跑一遍 `completeUnitOfWork` 的 while 循环，追踪 `workInProgress` 指针的移动路径
3. 读懂 `appendAllChildren` 里穿透 FunctionComponent 的逻辑，找一个嵌套了函数组件的 demo 验证 DOM 结构是否正确

---

## 第四阶段：提交阶段 —— commit phase

**建议用时：1 天**

### 学习目标

理解 commit 阶段为什么不能中断，三个子阶段（beforeMutation、mutation、layout）分别做什么，以及 DOM 操作是怎样被批量执行的。

### 核心内容

**commit 阶段不可中断**

render 阶段是可中断的，但 commit 阶段必须同步完成。原因是 commit 阶段要操作真实 DOM，如果中途暂停，用户会看到不一致的界面（有些节点更新了，有些还没有）。

**三个子阶段**

React 源码中 commitRoot 分成三个独立的遍历：

1. `commitBeforeMutationEffects` (beforeMutation)
   - 调用类组件的 `getSnapshotBeforeUpdate`
   - 读取 DOM 快照，供 componentDidUpdate 使用
   - 此时 DOM 还未变更

2. `commitMutationEffects` (mutation)
   - 根据 fiber.flags 执行真正的 DOM 操作
   - `Placement` -> `insertBefore` / `appendChild`
   - `Update` -> `commitUpdate`，更新 DOM 属性
   - `Deletion` -> `removeChild`，同时调用 `useEffect` cleanup 和 `componentWillUnmount`

3. `commitLayoutEffects` (layout)
   - DOM 变更已完成，但浏览器还未 paint
   - 调用 `componentDidMount` / `componentDidUpdate`
   - 调用 `useLayoutEffect` 的 callback
   - 调用 `ref` 赋值

**useEffect 在哪里调度**

`useEffect` 的 callback 不在这三个阶段里执行，而是在 commit 完成后，通过 Scheduler 异步调度，在浏览器 paint 之后执行。这就是 `useEffect` 和 `useLayoutEffect` 的本质区别。

**flags 的作用**

`subtreeFlags` 的设计让 commit 阶段可以快速跳过无变更的子树。如果一个节点的 `subtreeFlags === NoFlags`，就不用往下遍历了。

### 需要读的源码文件

- `packages/react-reconciler/src/ReactFiberCommitWork.js` — `commitMutationEffects`、`commitPlacement`、`commitUpdate`、`commitDeletion`
- `packages/react-reconciler/src/ReactFiberWorkLoop.js` — `commitRoot` 函数，看三个子阶段的调用顺序

### p-react 对应文件

`packages/react-reconciler/src/commitWork.ts` — 当前实现了 mutation 子阶段的 Placement 操作，还没有 beforeMutation 和 layout 子阶段

### 动手练习

1. 在 p-react 的 `commitWork.ts` 中添加对 `Update` flags 的处理：当 `fiber.flags & Update` 时，调用 `hostConfig.updateInstance()` 更新 DOM 属性
2. 阅读 React 源码的 `commitDeletion`，理解删除时为什么要递归处理子树（因为要触发子组件的 cleanup 和 `componentWillUnmount`）
3. 回答这个问题：`useEffect` 的 cleanup 函数是在 beforeMutation、mutation 还是 layout 阶段运行的？（答案在 `commitMutationEffects` 中）

---

## 第五阶段：Diff 算法

**建议用时：2 天**

### 学习目标

理解 React Diff 算法的三条假设，单节点 diff 和多节点 diff 的具体流程，以及 `key` 在 diff 中的作用机制。

### 核心内容

**三条基本假设（降低复杂度的关键）**

1. 不同类型的元素会生成不同的树（type 变了直接删除重建，不做深度比较）
2. 开发者通过 `key` 标识跨渲染的稳定元素
3. 只比较同层节点，不跨层级比较

这三条假设把 O(n³) 的树 diff 降到了 O(n)。

**单节点 diff（新 children 是单个元素）**

```
遍历旧 children 链表:
  if key 相同:
    if type 相同 -> 复用 fiber，删除旧链表中其余节点
    if type 不同 -> 删除旧链表中包括当前在内的所有节点，创建新 fiber
  if key 不同 -> 标记当前旧节点删除，继续遍历下一个旧节点
```

**多节点 diff（新 children 是数组）**

两轮遍历：

第一轮：从左到右，逐个比较新旧节点
- `key` 不同 -> 跳出第一轮（可能发生了移动）
- `key` 相同但 `type` 不同 -> 标记旧节点删除，创建新 fiber，继续
- `key` 相同且 `type` 相同 -> 复用，继续

第一轮结束后，有四种情况：
1. 新旧都消耗完 -> 完成
2. 新消耗完，旧还有 -> 删除剩余旧节点
3. 旧消耗完，新还有 -> 创建剩余新节点（全部标记 Placement）
4. 两者都有剩余 -> 进入第二轮

第二轮：把剩余旧节点放入 `Map<key, fiber>` 或 `Map<index, fiber>`，遍历剩余新节点，从 Map 中查找可复用的。用 `lastPlacedIndex` 判断节点是否需要移动：

```
如果复用的旧 fiber 的 index >= lastPlacedIndex:
  不需要移动，更新 lastPlacedIndex = 旧 index
否则:
  需要移动，标记 Placement
```

**为什么不能用 index 做 key**

如果你在列表头部插入一项，所有 index 都会变，导致所有节点的 key 都变了，没有任何节点能被复用，全部重建。而如果用稳定 ID 做 key，只有新插入的节点会被创建，其余全部复用。

### 需要读的源码文件

- `packages/react-reconciler/src/ReactChildFiber.js` — 整个文件，重点读：
  - `reconcileSingleElement` — 单节点 diff
  - `reconcileChildrenArray` — 多节点 diff
  - `updateFromMap` / `updateSlot` — Map 查找和复用逻辑
  - `placeChild` — `lastPlacedIndex` 判断移动

### p-react 对应文件

`packages/react-reconciler/src/beginWork.ts` 中的 `reconcileChildFibers` 和 `reconcileChildrenArray` — 当前是简化版，没有 key 比较和复用逻辑，可以在这里添加完整 diff

### 动手练习

1. 在 p-react 中实现单节点 diff：当新旧 `key` 和 `type` 都相同时，复用旧 fiber 而不是创建新的
2. 实现多节点 diff 的第二轮：用 Map 存旧节点，遍历新节点查找复用，用 `lastPlacedIndex` 判断移动
3. 写一个测试用例，列表有 [A, B, C, D]，更新为 [D, A, B, C]（只有 D 移动到头部），观察哪些节点标记了 Placement

---

## 第六阶段：Hooks 实现机制

**建议用时：3 天**

### 学习目标

理解 Hooks 为什么必须保持调用顺序，mount 和 update 阶段的 Hook 链表是怎么创建和读取的，`useState` 和 `useEffect` 的内部实现。

### 核心内容

**核心数据结构：Hook 链表**

每个函数组件的 Fiber 节点上，`memoizedState` 存储的是 Hook 链表（不是组件 state）：

```
fiber.memoizedState -> Hook1 -> Hook2 -> Hook3 -> null
                       (useState)(useEffect)(useState)
```

每次组件重新执行，React 按顺序遍历这个链表，把已有的 Hook 对象"发"给对应的调用。这就是 Hooks 不能在条件语句里调用的根本原因：一旦某次渲染跳过了某个 Hook 调用，后续所有 Hook 的链表位置就全部错位了。

**ReactCurrentDispatcher 的切换**

React 用一个全局变量 `ReactCurrentDispatcher.current` 来控制当前使用的是 mount 版本还是 update 版本的 Hook 实现。函数组件执行前切换，执行后恢复。这是个简单但精巧的设计。

**useState 的实现**

mount 阶段：
```typescript
function mountState(initialState) {
  const hook = mountWorkInProgressHook();  // 创建新 Hook 节点，追加到链表
  hook.memoizedState = initialState;
  const queue = { pending: null, dispatch: null, lastRenderedState: initialState };
  hook.queue = queue;
  const dispatch = queue.dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue);
  return [hook.memoizedState, dispatch];
}
```

update 阶段：
```typescript
function updateState() {
  return updateReducer(basicStateReducer);  // useState 本质上是 useReducer
}
```

**Update 队列与环形链表**

`dispatchSetState` 创建 Update 对象，以环形链表的形式存到 `queue.pending`。环形链表的好处是：通过 `pending` 能同时访问到最新的 update（`pending`）和最旧的 update（`pending.next`）。

`processUpdateQueue` 在 update 阶段遍历环形链表，把所有 pending update 依次应用到 baseState 上，得到最新 state。

**useEffect 的实现**

mount 阶段：
```typescript
function mountEffect(create, deps) {
  const hook = mountWorkInProgressHook();
  hook.memoizedState = pushEffect(HookHasEffect | HookPassive, create, undefined, deps);
}
```

Effect 对象以链表形式挂在 `fiber.updateQueue` 上（注意，这里的 updateQueue 和 useState 的 updateQueue 是不同的结构）。

update 阶段：比较 deps 数组，如果有变化就给 Effect 加上 `HookHasEffect` 标记，commit 阶段会检查这个标记决定是否重新执行。

cleanup 在 mutation 阶段执行（删除旧 effect），新 callback 在 commit 之后异步调度执行。

### 需要读的源码文件

- `packages/react-reconciler/src/ReactFiberHooks.js` — 整个文件，按顺序读：
  - `mountWorkInProgressHook` / `updateWorkInProgressHook`
  - `mountState` / `updateState` / `updateReducer`
  - `dispatchSetState`
  - `processUpdateQueue`
  - `mountEffect` / `updateEffect`
  - `commitHookEffectListMount` / `commitHookEffectListUnmount`

### 动手练习

1. 在 p-react 中实现 `useState` 的 mount 阶段：在 `updateFunctionComponent` 执行前设置 `ReactCurrentDispatcher`，执行后恢复；mountState 创建 Hook 节点和 dispatch 函数
2. 实现 `useState` 的 update 阶段：updateState 从当前 Hook 链表中读取对应节点，处理 pending 更新队列
3. 写一个计数器 demo（有 `useState` 的组件），让它能正常触发更新
4. 理解并能解释：如果一个组件有两个 `useState`，第一次渲染和第二次渲染时链表是怎么对应起来的

---

## 第七阶段：调度器 Scheduler

**建议用时：2 天**

### 学习目标

理解 React 如何实现时间切片，Scheduler 的任务队列是怎么工作的，为什么选择 `MessageChannel` 而不是 `setTimeout(fn, 0)`。

### 核心内容

**为什么需要 Scheduler**

React 并发模式需要把长任务切割成小片，每执行一段时间就把控制权还给浏览器，让浏览器处理用户输入和渲染。但 JS 是单线程的，没有 `yield` 机制，怎么办？

答案是：主动让出。执行一小段时间后，通过宏任务把剩余工作安排到下一次事件循环，让浏览器在这两次宏任务之间有机会处理其他事情。

**时间切片的实现**

Scheduler 用 `MessageChannel` 创建宏任务（而不是 `setTimeout`，原因是 `setTimeout` 在嵌套调用时最小延迟是 4ms，而 `MessageChannel` 接近 0ms）。

每次宏任务开始时记录 `startTime`，每处理完一个工作单元就检查 `performance.now() - startTime > frameInterval`（默认 5ms），如果超了就返回 `true`（shouldYield），当前帧停止工作，下一帧继续。

**小顶堆任务队列**

Scheduler 内部维护两个小顶堆：
- `taskQueue` — 已过期任务，按 `expirationTime` 排序
- `timerQueue` — 未过期任务，按 `startTime` 排序

`scheduleCallback(priority, callback)` 根据优先级计算 `expirationTime`，插入对应队列。每次执行时先把 `timerQueue` 中已到期的任务移到 `taskQueue`，然后取堆顶任务执行。

**五种任务优先级**

```
ImmediatePriority   expirationDelay = -1        // 立即
UserBlockingPriority expirationDelay = 250ms    // 用户交互（点击、输入）
NormalPriority       expirationDelay = 5000ms   // 普通更新
LowPriority          expirationDelay = 10000ms  // 低优先级
IdlePriority         expirationDelay = maxInt   // 空闲
```

### 需要读的源码文件

- `packages/scheduler/src/forks/Scheduler.js` — 重点读：
  - `scheduleCallback` — 任务入队
  - `workLoop` — 调度循环（注意这个 workLoop 和 React reconciler 的 workLoop 不同）
  - `performWorkUntilDeadline` — MessageChannel 的 callback，包含时间切片判断
  - `push` / `pop` / `peek` — 小顶堆操作（在 `SchedulerMinHeap.js`）

### 动手练习

1. 独立实现一个最小 Scheduler：只有 `scheduleCallback` 和基于 `MessageChannel` 的时间切片，不需要优先级，能跑通就行
2. 在你的实现中，用 `console.time` 测量每个时间片的实际执行时间，观察是否接近 5ms
3. 理解 `taskQueue` 和 `timerQueue` 的设计：延迟任务（`delay > 0`）为什么不能直接放 `taskQueue`？

---

## 第八阶段：Lane 优先级模型

**建议用时：2 天**

### 学习目标

理解 React 为什么从 ExpirationTime 切换到 Lane 模型，Lane 位掩码如何表达优先级和批处理，`batchedUpdates` 是怎么工作的。

### 核心内容

**为什么 ExpirationTime 不够用**

React 16 用 `expirationTime` 表示优先级，数字越大优先级越高。这个方案在描述单个任务时很清晰，但有个问题：无法优雅地表达"这两个更新优先级相同，可以一起处理"。

Lane 用位掩码解决这个问题。每种优先级对应一组 bit，相同优先级的更新用 `|` 合并，用 `&` 检查包含关系：

```typescript
const SyncLane = 0b0000000000000000000000000000001;  // 最高优先级
const InputContinuousLane = 0b0000000000000000000000000000100;
const DefaultLane = 0b0000000000000000000000000010000;
const TransitionLane1 = 0b0000000000000000000000001000000;
// ...

// 检查 lanes 中是否包含 SyncLane
if (lanes & SyncLane !== NoLanes) { ... }

// 合并两个更新的 lanes
const mergedLanes = laneA | laneB;

// 从 lanes 中移除已处理的 lane
const remainingLanes = lanes & ~renderLanes;
```

**批处理**

Lane 让批处理变得自然。在一次事件处理函数中，所有 `setState` 调用产生的更新都会累积到 fiber 的 `lanes` 上，React 在退出事件处理后统一调度一次渲染，而不是每次 setState 都触发一次渲染。

React 18 把批处理范围扩展到了所有异步场景（setTimeout、Promise、fetch 回调），而 React 17 只在合成事件和生命周期中批处理。

**Lane 和 Scheduler 的关系**

Lane 描述的是 React 内部的优先级（Update 属于哪个优先级），Scheduler 描述的是任务的调度时机（这个任务什么时候执行）。两者通过 `lanesToSchedulerPriority` 函数互相转换。

### 需要读的源码文件

- `packages/react-reconciler/src/ReactFiberLane.js` — 重点读：
  - Lane 常量定义（看位掩码的分布规律）
  - `getHighestPriorityLane` — 找最高优先级的 lane（取最低位，用 `lanes & -lanes`）
  - `mergeLanes` / `removeLanes` / `includesSomeLane`
  - `lanesToSchedulerPriority` — Lane 到 Scheduler 优先级的映射

### 动手练习

1. 在纸上写出 `SyncLane`、`InputContinuousLane`、`DefaultLane` 的二进制值，验证它们之间没有重叠的 bit
2. 理解 `getHighestPriorityLane` 的实现：`lanes & -lanes` 为什么能取到最低位？（补码运算）
3. 查阅 React 18 的 `createRoot` 和 React 17 的 `ReactDOM.render` 在批处理上的区别

---

## 第九阶段：并发模式

**建议用时：3 天**

### 学习目标

理解并发模式解决了什么问题，`useTransition` 和 `useDeferredValue` 的工作原理，`Suspense` 是如何暂停渲染的，以及并发模式下 Fiber 树的复用和回退机制。

### 核心内容

**并发模式解决的核心问题**

同步模式下，一旦渲染开始就无法中断，高优先级的用户输入也得等着。并发模式让 React 能在渲染过程中插入更高优先级的任务。

典型场景：搜索框实时过滤大列表。用户输入时，输入框的更新是高优先级（用户要立即看到自己输入的字），列表的过滤是低优先级（稍微延迟 ok）。用 `useTransition` 把列表更新标记为 transition，React 就会先渲染输入框，列表在后台慢慢更新。

**useTransition**

```typescript
const [isPending, startTransition] = useTransition();

// 这个更新标记为 TransitionLane，低优先级
startTransition(() => {
  setQuery(input);
});
```

`isPending` 为 true 时表示 transition 还未完成，可以用来显示 loading 状态。

**并发模式下的渲染中断与恢复**

`workLoopConcurrent` 里多了一个 `shouldYield()` 检查：

```typescript
function workLoopConcurrent() {
  while (workInProgress !== null && !shouldYield()) {
    performUnitOfWork(workInProgress);
  }
}
```

被 yield 的 wip 树不会被丢弃，下次调度时从 `workInProgress` 继续。但如果来了更高优先级的更新，React 会丢弃当前 wip 树，从 current 树重新开始构建新的 wip。

**Suspense 的实现机制**

当组件 throw 了一个 Promise（这是 Suspense 的约定），React 会：
1. 捕获这个 Promise，找到最近的 Suspense 边界
2. 把 Suspense 的 fallback 渲染出来
3. 给 Promise 注册 `.then`，等 Promise resolve 后重新触发这个子树的渲染

`lazy` 组件就是利用这个机制：`React.lazy(import('./Component'))` 返回的组件在首次渲染时 throw 一个 Promise，等模块加载完成后 resolve，React 重新渲染，这次能正常执行了。

### 需要读的源码文件

- `packages/react-reconciler/src/ReactFiberWorkLoop.js` — `workLoopConcurrent`、`performConcurrentWorkOnRoot`、`renderDidSuspend`
- `packages/react-reconciler/src/ReactFiberThrow.js` — `throwException`，处理 Promise throw 的核心逻辑
- `packages/react-reconciler/src/ReactFiberSuspenseComponent.js` — Suspense 边界处理
- `packages/react/src/ReactLazy.js` — `lazy` 的实现（很短，先读这个）

### 动手练习

1. 读 `throwException` 函数，理解 React 是怎么找到最近的 Suspense 边界的
2. 自己写一个 `createResource` 函数，能让组件"挂起"直到数据加载完成（模拟 Relay/React Query 的 Suspense 支持）
3. 理解为什么并发模式下同一个组件可能被渲染多次（render 是"纯"的，所以重复执行没有副作用）

---

## 第十阶段：事件系统

**建议用时：2 天**

### 学习目标

理解 React 的合成事件和原生事件的关系，事件委托是如何实现的，以及事件系统和 Lane 优先级是如何绑定的。

### 核心内容

**事件委托**

React 不在每个 DOM 元素上直接绑定事件监听器，而是在根容器（`createRoot` 传入的 DOM 节点）上统一监听所有事件。这样：
- 减少内存占用（不需要大量监听器）
- 方便批量处理（所有事件统一在一个地方处理）
- 方便和优先级系统集成

React 17 之前绑定到 `document`，React 17 之后改为绑定到根容器，这样多个 React 应用并存时不会互相干扰。

**合成事件（SyntheticEvent）**

React 把原生事件封装成合成事件，目的是：
- 抹平浏览器兼容性差异
- 支持事件池（React 17 之前复用 event 对象，React 17 之后移除了事件池）
- 在触发前后做一些 React 特有的处理（如批处理 state 更新）

**事件优先级与 Lane 的绑定**

不同事件类型对应不同的 Lane：
- `click`、`keydown`、`input` -> `InputContinuousLane`（用户交互，高优先级）
- `scroll` -> `InputContinuousLane`
- 其他默认 -> `DefaultLane`

这样 React 知道这次更新是由用户交互触发的，应该尽快完成。

**事件传播**

React 的合成事件也支持捕获和冒泡，通过在 fiber 树上向上/向下遍历收集处理函数，然后按顺序执行，并不是真正利用 DOM 事件冒泡。

### 需要读的源码文件

- `packages/react-dom-bindings/src/events/ReactDOMEventListener.js` — 事件注册和分发的入口
- `packages/react-dom-bindings/src/events/DOMEventProperties.js` — 原生事件到 React 事件名的映射
- `packages/react-dom-bindings/src/events/ReactDOMEventPlugin.js` — 合成事件的创建
- `packages/react-dom-bindings/src/events/getEventPriority.js` — 事件类型到 Lane 的映射

### 动手练习

1. 在浏览器 DevTools 的 Event Listeners 面板，查看一个 React 应用的根容器上注册了哪些事件，数一数有多少个
2. 理解 React 17 为什么把事件委托从 document 改到根容器，查阅 React 17 的 changelog
3. 写一个实验：在 React 的 `onClick` 和原生 `addEventListener('click')` 同时注册，观察两者的触发顺序和 `e.stopPropagation()` 的行为差异

---

## 学习方法建议

**"三读法"**

每个模块读三遍：
1. 第一遍：快速通读，看大概做什么，不纠结细节
2. 第二遍：逐函数精读，画调用链图，写注释
3. 第三遍：读完后合上代码，自己默写骨架，看能写出多少

**先读 p-react，再读 React 源码**

p-react 的代码量是 React 对应模块的 1/10 不到，注释清晰，没有历史包袱。先在 p-react 里建立直觉，再去 React 源码找对应实现，会快很多。

**配合断点调试**

在 p-react 的 demo 里，给 `beginWork`、`completeWork`、`commitMutationEffects` 打断点，单步执行，观察 `workInProgress` 指针的每一步移动。理论看懂了，不如跑一遍记得牢。

**建立 mini 版本**

每学一个阶段，在 p-react 里把对应功能实现出来：
- 学完 Hooks 阶段 -> 实现 useState 的 update 阶段
- 学完 Diff 阶段 -> 实现多节点 diff
- 学完 Scheduler -> 给 workLoop 加上时间切片

做出来能跑通的代码，比读十遍都有效。

**用 git blame 追溯**

React 源码某个函数看不懂时，用 `git blame` 找到这一行是哪个 commit 引入的，读 commit message 和 PR 描述，往往能找到设计动机。

---

## 常见学习误区

**误区一：一上来就读 React 主仓库**

React 源码有大量历史兼容代码、`__DEV__` 分支、`enableXxx` feature flag，开头就读很容易迷失。推荐先读 mini-react 实现（p-react 或 tiny-react 等），建立基础模型后再对照 React 源码。

**误区二：Fiber 就是虚拟 DOM**

Fiber 是可中断的工作单元，包含调度信息（lanes、flags）、树结构指针和 Hook 链表。ReactElement（虚拟 DOM）是无状态的描述对象，不可变，每次渲染都会创建新的。两者完全不同，混淆后理解 Diff 算法会出错。

**误区三：双缓冲就是两棵完整的树**

React 不会一次性复制整棵树。`createWorkInProgress` 只在需要处理某个节点时才创建其 wip fiber，其他节点复用 current。所以 wip 树初始时是"稀疏"的，`alternate` 只存在于被处理过的节点上。

**误区四：useEffect 在 commit 阶段同步执行**

`useEffect` 的 callback 在浏览器 paint 之后才执行，是异步的。只有 `useLayoutEffect` 在 layout 阶段同步执行（DOM 变更后、paint 前）。混淆这两点会导致对 ref 操作时机的误解。

**误区五：看懂了就算学会了**

源码学习的终点是能独立实现。如果你看完一个阶段说"我看懂了"，但合上代码什么都写不出来，说明理解停留在浅层。真正的检验标准是：能手写出这个模块的核心函数吗？

**误区六：按文件顺序读**

不要从 `ReactFiber.js` 读到 `ReactFiberWorkLoop.js` 再读到 `ReactFiberBeginWork.js`，这样很割裂。应该按功能流程读：先把一个完整的渲染流程从头到尾串一遍，再回头深入每个模块的细节。

---

## 推荐学习资源

**Mini-React 实现参考**

- **当前项目 p-react** — 你已经有了，边学边补充实现
- `facebook/react` 的 `packages/` 目录 — 以 React 19.2.1 tag 为基准，不要读 main 分支（变化太快）
- 卡颂的 `big-react` — 国内最系统的 mini-react 实现，配合他的课程效果好

**技术文章**

- **卡颂的 React 技术揭秘**（`react.iamkasong.com`）— 目前最好的中文 React 源码解析，虽然基于 React 17，核心概念完全适用
- **Dan Abramov 的博客**（`overreacted.io`）— `useEffect` 完全指南、`Algebraic Effects` 等文章，能帮你理解设计动机
- **React RFC 文档**（`github.com/reactjs/rfcs`）— Hooks 的 RFC 特别值得读，解释了为什么这么设计

**视频**

- Andrew Clark 在 React Conf 2017 的 Fiber 演讲 — 看完你就明白为什么需要 Fiber，比任何文字解释都直观
- Sebastian Markbåge 在 JSConf 2014 的演讲 — React 最初的设计哲学

**工具**

- `github.com/facebook/react` 配合 VS Code 的 "Go to Definition" 跳转，比在 GitHub 网页上读快很多
- React DevTools 的 Profiler — 可视化渲染耗时，能直观感受 Fiber 渲染和 Scheduler 调度的效果
- `why-did-you-render` 库 — 帮你找到不必要的重渲染，读完源码后理解它的实现也很有价值

---

## 检验自己学会了没有

学完每个阶段，用这些问题检验自己：

**Fiber 基础**
- 不看代码，画出 `<App><Parent><Child /></Parent></App>` 对应的完整 Fiber 树，标出所有指针
- 解释 `FiberRootNode.current` 和 `HostRootFiber.stateNode` 指向什么，为什么是双向引用

**渲染流程**
- 列出从 `ReactDOM.createRoot(dom).render(<App />)` 到第一帧画面出现，调用了哪些函数，顺序是什么
- `completeWork` 里的 `appendAllChildren` 为什么需要"穿透"函数组件？画图说明

**Diff 算法**
- 列表从 `[A, B, C]` 更新为 `[C, A, B]`（key 稳定）。用 `lastPlacedIndex` 算法推导出哪些节点会标记 Placement，哪些不会

**Hooks**
- 解释为什么第一次渲染和第二次渲染时，`useState` 能返回同一个 `dispatch` 函数（不是新函数）
- `useEffect` 的 deps 是 `[]` 时，cleanup 什么时候执行？

**并发模式**
- 解释"Suspense 捕获 Promise"的机制：谁 throw，谁 catch，catch 之后做什么

如果这些问题都能流畅回答，React 源码这关就过了。
