# workLoop.ts 工作循环机制详解

> 本文基于 p-react（mini-react 实现）中的 `workLoop.ts`，对照 React 18 源码（`ReactFiberWorkLoop.js`）逐步拆解工作循环的完整机制。

---

## 目录

1. [整体架构概览](#1-整体架构概览)
2. [工厂模式设计](#2-工厂模式设计)
3. [调度入口](#3-调度入口scheduleUpdateOnFiber)
4. [向上追溯根节点](#4-向上追溯根节点markUpdateFromFiberToRoot)
5. [同步渲染流程](#5-同步渲染流程performSyncWorkOnRoot)
6. [双缓冲机制](#6-双缓冲机制createWorkInProgress)
7. [工作循环核心](#7-工作循环核心workLoopSync)
8. ["递"阶段](#8-递阶段performUnitOfWork--beginWork)
9. ["归"阶段](#9-归阶段completeUnitOfWork--completeWork)
10. [提交阶段](#10-提交阶段commitRoot)
11. [与 React 源码对照](#11-与-react-源码对照)
12. [完整流程图](#12-完整流程图)

---

## 1. 整体架构概览

React 的渲染过程分成两个大阶段，`workLoop.ts` 是这两个阶段的总调度者。

```
触发更新
    │
    ▼
┌──────────────────────────────────────────────┐
│              Render Phase（渲染阶段）           │
│                                              │
│  在内存中构建 workInProgress Fiber 树          │
│  可以被打断（concurrent 模式下）               │
│                                              │
│  beginWork  → 递（从根到叶，创建子 Fiber）     │
│  completeWork → 归（从叶到根，创建 DOM 节点）  │
│                                              │
└──────────────────────┬───────────────────────┘
                       │  finishedWork
                       ▼
┌──────────────────────────────────────────────┐
│              Commit Phase（提交阶段）           │
│                                              │
│  将 Fiber 树的变更同步到真实 DOM              │
│  不可中断                                     │
│                                              │
│  commitMutationEffects → 执行 DOM 增删改      │
│                                              │
└──────────────────────────────────────────────┘
```

两个阶段的职责边界非常清晰：渲染阶段只做"计算"，不碰真实 DOM；提交阶段只做"执行"，不做计算。这是 React 架构能支持并发模式的基础。

---

## 2. 工厂模式设计

```typescript
export function createWorkLoop(hostConfig: HostConfig) {
  const completeWork = createCompleteWork(hostConfig);
  const commitRoot = createCommitWork(hostConfig);

  let workInProgress: FiberNode | null = null;

  // ...所有内部函数定义...

  return { scheduleUpdateOnFiber };
}
```

`createWorkLoop` 是一个工厂函数，而不是直接导出一堆函数。这个设计有两个核心原因。

**第一，依赖注入宿主环境能力。** `hostConfig` 包含了所有平台相关的操作，比如 `createInstance`（创建 DOM 元素）、`appendChild` 等。通过把 `hostConfig` 注入进来，同一套协调逻辑可以适配浏览器 DOM、React Native 甚至测试环境，不需要修改任何一行核心代码。

**第二，闭包隔离状态。** `workInProgress` 是渲染过程中的"当前工作指针"。用闭包把它封起来，每次调用 `createWorkLoop` 得到的实例都有自己独立的状态，互不干扰。

对应到 React 源码，`ReactFiberWorkLoop.js` 是一个模块级的文件，用模块级变量（`let workInProgress`）来保存状态。p-react 用工厂函数替代了这个模式，本质是一样的——都是把状态隔离在一个作用域里。

---

## 3. 调度入口：`scheduleUpdateOnFiber`

```typescript
function scheduleUpdateOnFiber(fiber: FiberNode) {
  const root = markUpdateFromFiberToRoot(fiber);
  if (root) {
    performSyncWorkOnRoot(root);
  }
}
```

这是整个更新流程的起点。无论是首次 `render`，还是 `setState` 触发的更新，都会调用这个函数。

它做两件事：找到 Fiber 树的根节点，然后启动同步渲染。流程非常简洁，因为 p-react 目前只实现了同步模式。React 的完整版本在这里会判断优先级（Lane），决定是走同步渲染还是走调度器（Scheduler）异步调度，但核心逻辑与这里是一致的。

---

## 4. 向上追溯根节点：`markUpdateFromFiberToRoot`

```typescript
function markUpdateFromFiberToRoot(fiber: FiberNode): FiberRootNode | null {
  let node = fiber;
  while (node.return) {
    node = node.return;
  }
  if (node.tag === HostRoot) {
    return node.stateNode as FiberRootNode;
  }
  return null;
}
```

更新可以从树中任意一个 Fiber 节点发起（比如某个组件调用了 `setState`），但渲染必须从根节点开始。这个函数就是"找根"的逻辑。

遍历原理：每个 Fiber 节点都有 `return` 指针指向父节点，一路向上直到 `return` 为 `null`，就到了 `HostRoot`（根 Fiber 节点）。根 Fiber 节点的 `stateNode` 存的是 `FiberRootNode`，它持有容器（`container`）和当前树（`current`）的引用。

```
某个子组件 fiber
       │ .return
       ▼
    父组件 fiber
       │ .return
       ▼
    ...
       │ .return
       ▼
  HostRoot fiber  (tag === HostRoot, return === null)
       │ .stateNode
       ▼
  FiberRootNode   ← 这就是我们要找的根
```

在 React 源码中，`markUpdateFromFiberToRoot` 做的事更多，它会在往上遍历的同时更新每个父节点的 `childLanes`，标记"我的某个子孙有更新待处理"。p-react 省略了 Lane 模型，所以这里只做纯粹的向上查找。

---

## 5. 同步渲染流程：`performSyncWorkOnRoot`

```typescript
function performSyncWorkOnRoot(root: FiberRootNode) {
  prepareFreshStack(root);   // 初始化 workInProgress
  workLoopSync();            // 执行工作循环

  // 渲染阶段结束，拿到构建好的 wip 树
  const finishedWork = root.current.alternate;
  if (finishedWork) {
    root.finishedWork = finishedWork;
    commitRoot(finishedWork, root.container);  // 进入提交阶段
  }
}
```

这个函数是渲染阶段和提交阶段之间的"胶水"。它串联了三个步骤：

1. `prepareFreshStack`：初始化 `workInProgress`，准备好双缓冲树的"草稿"
2. `workLoopSync`：循环处理每一个 Fiber 节点，建完整个 wip 树
3. 把 `finishedWork` 挂到 `root` 上，交给 `commitRoot` 执行 DOM 操作

`root.current.alternate` 就是刚刚构建好的 workInProgress 树的根节点。渲染阶段结束后它已经被填充完毕，可以直接用于提交。

---

## 6. 双缓冲机制：`createWorkInProgress`

这是理解 React 渲染的关键概念之一。

React 同时维护两棵 Fiber 树：

- **current 树**：当前屏幕上显示的内容对应的 Fiber 树
- **workInProgress 树（wip 树）**：正在构建中的"草稿"树，对应下一次渲染的结果

```
current 树                    wip 树
                              （正在构建）
   ┌──────────┐               ┌──────────┐
   │HostRoot  │ ◄──alternate──► HostRoot  │
   │  fiber   │               │  fiber   │
   └────┬─────┘               └────┬─────┘
        │                          │
   ┌────▼─────┐               ┌────▼─────┐
   │   App    │ ◄──alternate──►   App    │
   │  fiber   │               │  fiber   │
   └──────────┘               └──────────┘
```

两棵树通过 `alternate` 指针互相指向。提交完成后，wip 树变成新的 current 树，旧的 current 树变成下一次更新时的"草稿"基础，实现复用。

```typescript
function createWorkInProgress(current: FiberNode): FiberNode {
  let wip = current.alternate;

  if (wip === null) {
    // 首次渲染：alternate 不存在，新建一个 wip fiber
    wip = new FiberNode(current.tag, current.pendingProps, current.key);
    wip.type = current.type;
    wip.stateNode = current.stateNode;
    wip.alternate = current;
    current.alternate = wip;
  } else {
    // 后续更新：复用已有的 alternate fiber，只更新属性
    wip.pendingProps = current.pendingProps;
  }

  // 同步 current 的状态到 wip
  wip.memoizedProps = current.memoizedProps;
  wip.memoizedState = current.memoizedState;
  wip.child = current.child;

  return wip;
}
```

这里有个微妙之处：`wip.child = current.child`。在 `createWorkInProgress` 创建 wip 时，子节点先"借用"了 current 的子节点。后续 `beginWork` 会根据新的 props 重新协调子节点，决定哪些可以复用，哪些需要新建或删除。

---

## 7. 工作循环核心：`workLoopSync`

```typescript
function workLoopSync() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}
```

这就是 React 的"工作循环"，简单到只有三行，却是整个渲染阶段的驱动力。

循环条件是 `workInProgress !== null`。`workInProgress` 这个指针在遍历过程中不断移动，指向当前要处理的 Fiber 节点。当它变为 `null` 时，说明整棵树已经遍历完毕，循环结束。

React 并发模式下的 `workLoopConcurrent` 长这样：

```javascript
// React 源码：ReactFiberWorkLoop.js
function workLoopConcurrent() {
  while (workInProgress !== null && !shouldYield()) {
    performUnitOfWork(workInProgress);
  }
}
```

多了一个 `!shouldYield()` 的判断。`shouldYield` 来自 Scheduler，当当前帧剩余时间不足时返回 `true`，循环暂停，把控制权还给浏览器，下一帧继续。p-react 只做同步版本，省略了这个判断。

---

## 8. "递"阶段：`performUnitOfWork` + `beginWork`

```typescript
function performUnitOfWork(unitOfWork: FiberNode) {
  const current = unitOfWork.alternate;  // 对应的 current fiber（可能为 null）
  const next = beginWork(current, unitOfWork);  // 处理当前节点，返回第一个子节点
  unitOfWork.memoizedProps = unitOfWork.pendingProps;  // 记录已处理的 props

  if (next === null) {
    // 没有子节点，进入"归"阶段
    completeUnitOfWork(unitOfWork);
  } else {
    // 有子节点，继续向下"递"
    workInProgress = next;
  }
}
```

`performUnitOfWork` 是"递"和"归"的分叉点。

`beginWork` 的任务是处理当前 Fiber 节点，根据节点类型做不同的事：

```typescript
export function beginWork(
  current: FiberNode | null,
  workInProgress: FiberNode
): FiberNode | null {
  switch (workInProgress.tag) {
    case HostRoot:
      return updateHostRoot(current, workInProgress);     // 处理根节点
    case HostComponent:
      return updateHostComponent(current, workInProgress); // 处理 div/span 等
    case FunctionComponent:
      return updateFunctionComponent(current, workInProgress); // 处理函数组件
    case HostText:
      return null;  // 文本节点没有子节点，直接返回 null
    default:
      return null;
  }
}
```

`beginWork` 返回的是**第一个子 Fiber 节点**。如果返回 `null`，说明当前节点没有子节点（叶子节点），此时转入"归"阶段。

遍历方式是深度优先：拿到子节点后，`workInProgress` 移动到子节点，下一轮循环继续向下"递"，直到遇到叶子节点为止。

---

## 9. "归"阶段：`completeUnitOfWork` + `completeWork`

```typescript
function completeUnitOfWork(unitOfWork: FiberNode) {
  let completedWork: FiberNode | null = unitOfWork;

  while (completedWork !== null) {
    completeWork(completedWork);  // 处理当前节点（创建 DOM、收集 flags）

    const siblingFiber = completedWork.sibling;
    if (siblingFiber !== null) {
      // 有兄弟节点，切换到兄弟节点，回到"递"阶段
      workInProgress = siblingFiber;
      return;
    }

    // 没有兄弟节点，向上回到父节点，继续"归"
    completedWork = completedWork.return;
  }

  // completedWork === null，说明回到了根节点，整棵树处理完毕
  workInProgress = null;
}
```

"归"阶段做的事：

1. 调用 `completeWork` 处理当前节点：为 `HostComponent` 创建真实 DOM 实例，为 `HostText` 创建文本节点，并把子节点的 DOM 追加到父节点，同时把子树的 `subtreeFlags` 冒泡到当前节点。
2. 检查是否有兄弟节点。如果有，切换到兄弟节点，让 `workLoopSync` 的下一轮循环对兄弟节点进行"递"。
3. 如果没有兄弟节点，向上回到父节点，继续"归"。

整个"递归"遍历的轨迹如下：

```
         A
        / \
       B   C
      / \
     D   E

遍历顺序：
递：A → B → D
归：D → E（D 有兄弟 E，切到 E 再递）
递：E
归：E → B → C（B 无兄弟，归到 A；A 有兄弟 C，切到 C 再递）
递：C
归：C → A
A 无兄弟，归到 null → workInProgress = null，循环结束
```

这种遍历方式保证每个节点都被"递"一次（`beginWork`）和"归"一次（`completeWork`），且子节点的 `completeWork` 一定先于父节点执行，确保 DOM 从叶子往根正确组装。

---

## 10. 提交阶段：`commitRoot`

渲染阶段结束后，`finishedWork`（wip 树的根 Fiber）被挂到 `root.finishedWork`，然后进入提交阶段：

```typescript
// performSyncWorkOnRoot 末尾
const finishedWork = root.current.alternate;
if (finishedWork) {
  root.finishedWork = finishedWork;
  commitRoot(finishedWork, root.container);
}
```

`commitRoot`（由 `createCommitWork(hostConfig)` 生成）会遍历 Fiber 树，根据节点上的 `flags` 执行真实的 DOM 操作：

- `Placement`（插入）：调用 `hostConfig.appendChild` 把 DOM 节点插入容器
- `Update`（更新）：调用 `hostConfig.commitUpdate` 更新 DOM 属性
- `Deletion`（删除）：调用 `hostConfig.removeChild` 移除 DOM 节点

提交阶段完成后，`root.current` 指向刚刚提交的 wip 树，它成为新的 current 树。旧的 current 树的节点成为下一次更新时的 alternate，等待被复用。

---

## 11. 与 React 源码对照

| p-react 函数 | React 源码对应 | 主要简化点 |
|---|---|---|
| `createWorkLoop(hostConfig)` | `ReactFiberWorkLoop.js`（模块级） | React 用模块变量，p-react 用工厂函数+闭包 |
| `scheduleUpdateOnFiber` | `scheduleUpdateOnFiber` | React 增加 Lane 优先级判断和 Scheduler 调度 |
| `markUpdateFromFiberToRoot` | `markUpdateFromFiberToRoot` | React 同时更新沿途 `childLanes` |
| `performSyncWorkOnRoot` | `performSyncWorkOnRoot` | React 有 legacy/concurrent 两套入口 |
| `createWorkInProgress` | `createWorkInProgress` | 逻辑基本一致，React 多处理 `lanes` |
| `workLoopSync` | `workLoopSync` | React 并发版多 `shouldYield()` 判断 |
| `performUnitOfWork` | `performUnitOfWork` | 逻辑基本一致 |
| `completeUnitOfWork` | `completeUnitOfWork` | React 多处理错误边界和 Suspense |

最核心的简化是 **Lane 模型**。React 的每个 Fiber 节点有 `lanes`（自己的优先级）和 `childLanes`（子树的优先级）。调度器根据这些信息决定哪些节点需要重新渲染，哪些可以跳过（`bailout`）。p-react 省略了这套优先级系统，每次更新都重新渲染整棵树，但核心的 Fiber 遍历逻辑是完全一致的。

---

## 12. 完整流程图

```
用户调用 render(element, container)
           │
           ▼
  scheduleUpdateOnFiber(rootFiber)
           │
           ▼
  markUpdateFromFiberToRoot
  （沿 .return 向上遍历，找到 FiberRootNode）
           │
           ▼
  performSyncWorkOnRoot(root)
           │
           ├─── prepareFreshStack(root)
           │         │
           │         └─── createWorkInProgress(root.current)
           │               初始化 workInProgress = wip 根节点
           │
           ├─── workLoopSync()
           │         │
           │         │    ┌──────────────────────────────────┐
           │         │    │  while (workInProgress !== null)  │
           │         │    │                                  │
           │         │    │  performUnitOfWork(wip)          │
           │         │    │       │                          │
           │         │    │       ├── beginWork(current, wip)│  ←── "递"
           │         │    │       │   按 tag 分发处理：      │
           │         │    │       │   HostRoot / HostComponent│
           │         │    │       │   FunctionComponent 等   │
           │         │    │       │   返回第一个子 Fiber     │
           │         │    │       │                          │
           │         │    │       ├── 有子节点？             │
           │         │    │       │   是 → workInProgress = child│
           │         │    │       │   否 → completeUnitOfWork│
           │         │    │       │                          │
           │         │    │       └── completeUnitOfWork     │  ←── "归"
           │         │    │           │                      │
           │         │    │           ├── completeWork(node) │
           │         │    │           │   创建 DOM / 收集 flags│
           │         │    │           │   冒泡 subtreeFlags   │
           │         │    │           │                      │
           │         │    │           ├── 有兄弟？           │
           │         │    │           │   是 → workInProgress = sibling│
           │         │    │           │        return（回到 while）│
           │         │    │           │   否 → completedWork = return│
           │         │    │           │        继续向上归    │
           │         │    │           │                      │
           │         │    │           └── 归到根 → wip = null│
           │         │    │                循环结束          │
           │         │    └──────────────────────────────────┘
           │
           └─── commitRoot(finishedWork, container)
                     │
                     └── commitMutationEffects
                           │
                           └── 遍历 Fiber 树，执行 DOM 操作
                               Placement → appendChild
                               Update    → updateDOMProperties
                               Deletion  → removeChild
                                 │
                                 ▼
                           root.current = finishedWork
                           （wip 树成为新的 current 树）
```

---

## 小结

`workLoop.ts` 的设计思路可以用一句话概括：**用深度优先遍历 Fiber 树，"递"时创建子节点（beginWork），"归"时创建 DOM 并收集副作用（completeWork），最后在提交阶段统一执行 DOM 操作（commitRoot）**。

这套机制与 React 源码的核心逻辑完全对应，主要的简化在于省略了 Lane 优先级模型和 Scheduler 时间切片。理解了 p-react 的这套流程，再去读 `ReactFiberWorkLoop.js` 时，会发现大量熟悉的函数名和结构，只是多了优先级判断和错误边界处理的细节。
