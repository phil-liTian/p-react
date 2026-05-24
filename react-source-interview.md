# React 源码深度面试题

> 面向高级/资深前端，每道题直指源码函数名、数据结构和设计动机。
> 配合 `react-source-learning-guide.md` 使用效果最佳。

---

## 目录

- [JSX 与 ReactElement](#一-jsx-与-reactelement)
- [Fiber 架构与双缓冲](#二-fiber-架构与双缓冲)
- [Render 阶段](#三-render-阶段)
- [Commit 阶段](#四-commit-阶段)
- [Diff 算法](#五-diff-算法)
- [Hooks 实现机制](#六-hooks-实现机制)
- [Scheduler 调度器](#七-scheduler-调度器)
- [Lane 模型](#八-lane-模型)
- [并发模式](#九-并发模式)
- [事件系统](#十-事件系统)
- [面试回答策略](#面试回答策略)

---

## 一、JSX 与 ReactElement 【✅】

### 题目 1：JSX 被编译后变成什么？React 17 前后有何不同？

**难度：★☆☆☆☆**

**考察点**

考察候选人是否真正理解 JSX 只是语法糖，以及 React 17 新 JSX Transform 的改动和动机。

**源码级答案**

JSX 不是 HTML，也不是什么神秘的东西。它由 Babel 或 esbuild 编译时处理，完全在构建阶段完成。

React 17 之前，所有 JSX 编译为 `React.createElement(type, props, ...children)` 调用，所以每个有 JSX 的文件顶部必须 `import React from 'react'`，否则 `React.createElement` 找不到。

React 17 之后引入新 JSX Transform，编译目标变成了 `jsx` 和 `jsxs`：

```javascript
// JSX 源码
const el = <div className="foo"><span>hello</span></div>;

// React 17+ 编译结果（自动注入 import，无需手写）
import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
const el = _jsxs('div', { className: 'foo', children: [_jsx('span', { children: 'hello' })] });
```

`jsx` 和 `jsxs` 的区别：`jsx` 处理单个 children，`jsxs` 处理多个 children 数组（编译器已知 children 数量）。

入口文件是 `packages/react/src/jsx/ReactJSXElement.js`，核心是 `ReactElement` 函数，约 30 行，返回一个带 `$$typeof` 标记的普通对象。

**关键源码片段**

React 19 中 `ReactElement` 的结构发生了重要变化：`ref` 不再是顶层字段，而是移入了 `props` 内部：

```javascript
// packages/react/src/jsx/ReactJSXElement.js（React 19）
function ReactElement(type, key, props, owner) {
  return {
    $$typeof: REACT_ELEMENT_TYPE,  // Symbol(react.element) —— 防 XSS 的安全标记
    type,                           // 'div' | MyComponent | React.Fragment
    key,
    props,                          // ref 现在在 props.ref 内部，不再是顶层字段
    _owner: owner,                  // 仅开发环境保留，生产环境已移除
  };
}
```

访问 `element.ref` 在 React 19 中已被废弃，正确方式是 `element.props.ref`。

另一个性能优化：React 19 的 JSX 运行时（PR #28768）不再克隆编译器生成的 props 对象，而是直接透传内联对象。之前 `jsx('div', { className: 'foo', ref })` 会在内部把 `ref` 从 props 里分离出来并克隆整个 props，现在不再需要这步处理，减少了每次 JSX 求值的内存分配。

`$$typeof` 用 Symbol 而非字符串，原因是：服务端返回的 JSON 数据无法携带 Symbol，即使攻击者注入了一个伪造的对象 `{ $$typeof: 'react.element', type: 'script', ... }`，React 检查 `$$typeof === REACT_ELEMENT_TYPE`（Symbol 比较）时也会失败，从而拒绝渲染。

**p-react 对应实现**

`packages/react/src/createElement.ts`，与源码逻辑相同，省略了 `_owner` 等调试字段。

**对应学习阶段**：第一阶段

---

### 题目 2：ReactElement 和 Fiber 节点有什么本质区别？为什么 React 要维护两套对象？

**难度：★★☆☆☆**

**考察点**

这是一个高频陷阱题。很多人把"虚拟 DOM"和 Fiber 混为一谈，面试官用这题区分。

**源码级答案**

两者在设计目标上截然不同：

ReactElement（虚拟 DOM）是**不可变的 UI 描述**：每次渲染都会通过 JSX 或 `createElement` 创建全新的 ReactElement 对象，描述"这次我想渲染什么"。它没有生命周期，没有状态，生命极短。

Fiber 节点是**可变的工作单元**：它持久存在于整个组件的生命周期，保存了组件的实际状态（`memoizedState`、`memoizedProps`）、调度信息（`lanes`、`flags`）、树结构指针（`return`、`child`、`sibling`）以及对应的真实 DOM 引用（`stateNode`）。

React 之所以需要两套对象，核心原因是 Fiber 架构的可中断性：Fiber 节点上的 `alternate` 指针实现了双缓冲，`workInProgress` 树在后台构建，不影响当前屏幕显示。如果直接在 ReactElement 上操作，就无法在中途暂停恢复。

**关键源码片段**

```typescript
// ReactElement（React 19）：纯描述，不可变，每次渲染重新创建
// ref 已移入 props 内部，不再作为顶层字段
const element = { $$typeof, type, key, props }; // props.ref 即为 ref

// FiberNode：持久存在，承载状态和调度信息（packages/react-reconciler/src/ReactFiber.js）
class FiberNode {
  memoizedState: any;   // useState 的 hook 链表 / 组件 state
  memoizedProps: any;   // 上次渲染已生效的 props
  flags: Flags;         // 副作用标记位（Placement | Update | Deletion）
  lanes: Lanes;         // 调度优先级位掩码
  alternate: FiberNode | null;  // 双缓冲指针
}
```

**p-react 对应实现**

`packages/react-reconciler/src/fiber.ts` 中 `FiberNode` 类的定义。注意 p-react 省略了 `lanes`、`childLanes` 等调度相关字段，因为 p-react 只实现同步模式。

**对应学习阶段**：第一、第二阶段

---

## 二、Fiber 架构与双缓冲

### 题目 3：React 为什么要用 Fiber 架构替换 Stack Reconciler？具体解决了什么问题？

**难度：★★☆☆☆**

**考察点**

考察候选人对架构演进动机的理解，以及对可中断渲染的底层原理认知。

**源码级答案**

React 15 的 Stack Reconciler 是纯递归实现。`reconcileChildren` 调用自身，一旦进入就必须把整棵树递归完，中间无法停下来。如果组件树有几百个节点，这段 JS 执行时间可能超过 16ms（一帧的预算），浏览器没机会响应用户输入或刷新画面，用户看到的就是卡顿。

Fiber 把递归改成了**可中断的循环**。每个 FiberNode 是一个工作单元，处理完一个可以暂停，把控制权还给浏览器，下次从 `workInProgress` 指针保存的断点继续。这就是 `packages/scheduler/src/forks/Scheduler.js` 中 `shouldYield()` 的作用：检查当前帧是否超时，超了就让渲染暂停。

Fiber 能做到这一点的关键是数据结构的改变：把隐式的调用栈（Stack Reconciler 的递归调用帧）换成了显式的链表（Fiber 的 `return`/`child`/`sibling` 三个指针）。随时能保存当前位置，随时能恢复。

**关键源码片段**

```javascript
// packages/react-reconciler/src/ReactFiberWorkLoop.js
// 并发模式的 workLoop，多了 shouldYield() 判断
function workLoopConcurrent() {
  while (workInProgress !== null && !shouldYield()) {
    performUnitOfWork(workInProgress);
    // 每处理完一个 Fiber，检查是否超时
    // 超时就退出循环，本帧剩余的工作留到下一帧
  }
}

// p-react 同步版本（workLoop.ts），无中断，适合理解基础结构
function workLoopSync() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}
```

**对应学习阶段**：第二阶段

---

### 题目 4：描述 FiberNode 的完整数据结构，每个字段分组说明其作用。

**难度：★★★☆☆**

**考察点**

这题没有捷径，考察候选人是否真的仔细读过 `ReactFiber.js`，能否把字段按语义分组，而不是背诵一个平铺清单。

**源码级答案**

FiberNode 的字段按功能分为六组：

**第一组：实例标识**
- `tag`：组件类型编号，定义在 `ReactWorkTags.js`，如 `FunctionComponent=0`、`HostRoot=3`、`HostComponent=5`、`HostText=6`
- `key`：diff 时识别同级节点的标识，来自 JSX key 属性
- `type`：函数组件是函数本身，原生元素是字符串（如 `'div'`），`elementType` 字段额外保留了未解析的原始类型（lazy 组件场景下两者不同）
- `stateNode`：HostComponent 指向真实 DOM，HostRoot 指向 FiberRootNode，类组件指向类实例

**第二组：树结构（链化的三叉树）**
- `return`：父节点
- `child`：第一个子节点
- `sibling`：下一个兄弟节点
- `index`：在兄弟中的位置，多节点 diff 的 `lastPlacedIndex` 算法依赖此字段

**第三组：工作状态**
- `pendingProps`：本次更新的新 props（beginWork 开始时设置）
- `memoizedProps`：上次渲染完成的 props（beginWork 结束后从 pendingProps 复制）
- `memoizedState`：函数组件存 Hook 链表头指针，类组件存 state，HostRoot 存 ReactElement
- `updateQueue`：待处理的更新队列（useState 的 Update 环形链表）

**第四组：副作用**
- `flags`：当前节点自身的副作用位掩码（`Placement | Update | Deletion | PassiveEffect`...）
- `subtreeFlags`：子树中所有 flags 的聚合，`bubbleProperties` 在 completeWork 时自底向上收集
- `deletions`：需要删除的子节点列表

**第五组：双缓冲**
- `alternate`：current 树和 wip 树互相指向，是双缓冲的核心实现

**第六组：调度优先级**
- `lanes`：当前节点上挂起的待处理更新的优先级集合（位掩码）
- `childLanes`：子树中所有节点的 lanes 聚合，用于快速判断是否有子孙需要处理

**关键源码片段**

```typescript
// packages/react-reconciler/src/ReactFiber.js（简化）
function FiberNode(tag, pendingProps, key) {
  // 实例标识
  this.tag = tag;
  this.key = key;
  this.elementType = null;
  this.type = null;
  this.stateNode = null;
  // 树结构
  this.return = null;
  this.child = null;
  this.sibling = null;
  this.index = 0;
  // 工作状态
  this.ref = null;
  this.pendingProps = pendingProps;
  this.memoizedProps = null;
  this.updateQueue = null;
  this.memoizedState = null;
  // 副作用
  this.flags = NoFlags;
  this.subtreeFlags = NoFlags;
  this.deletions = null;
  // 双缓冲
  this.alternate = null;
  // 调度
  this.lanes = NoLanes;
  this.childLanes = NoLanes;
}
```

**React 19 说明**

`FiberNode` 的字段结构在 React 19 中没有根本性变化，但 `ref` 的处理方式已改变：React 19 移除了 `enableRefAsProp` feature flag（该 flag 在 React 18 的实验版本中存在），ref 作为普通 prop 传递已成为唯一模式，不再有 flag 开关。`FiberNode` 中 `this.ref` 字段仍然存在，但它的值来自 `props.ref` 而不是 ReactElement 的顶层 `ref` 字段。

**p-react 简化点**

`packages/react-reconciler/src/fiber.ts` 省略了 `lanes`、`childLanes`、`deletions`、`elementType`，因为 p-react 不实现优先级调度和并发模式。

**对应学习阶段**：第二阶段

---

### 题目 5：双缓冲机制是怎么工作的？FiberRootNode、current 树、workInProgress 树三者的关系是什么？

**难度：★★★☆☆**

**考察点**

很多人只会背"React 有两棵树"，考察候选人能否说清楚切换时机和 alternate 指针的变化过程。

**源码级答案**

React 同时维护两棵 Fiber 树，通过 `FiberRootNode.current` 指针决定哪棵是"当前显示的"：

```
FiberRootNode
    └── current ─────► HostRootFiber (current 树根)
                             └── alternate ──► HostRootFiber (wip 树根)
                                                    └── alternate ──► (回到 current)
```

整个过程分三步：

**步骤一：render 阶段开始，创建 wip 树**

`prepareFreshStack` 调用 `createWorkInProgress(root.current)`。如果 `current.alternate` 为 null（首次渲染），新建一个 FiberNode；否则复用已有的 alternate，只更新 pendingProps。两个节点的 `alternate` 互相指向。

**步骤二：render 阶段，构建 wip 树**

`workLoopSync` 从 wip 根开始，深度优先遍历，在 wip 树上构建新的 Fiber 节点。此时 current 树仍然完整对应着屏幕上的内容，互不干扰。

**步骤三：commit 阶段结束，切换 current**

`commitRoot` 完成 DOM 操作后，执行 `root.current = finishedWork`，wip 树成为新的 current 树，原来的 current 树成为下次渲染的 wip 树基础（通过 alternate 复用）。

这个设计保证了：任何时刻屏幕上显示的始终是完整的 current 树，render 阶段的工作在 wip 树上进行，即使渲染中途被打断，屏幕也不会出现中间状态。

**关键源码片段**

```javascript
// packages/react-reconciler/src/ReactFiberWorkLoop.js
function commitRootImpl(root, recoverableErrors, renderPriorityLevel) {
  const finishedWork = root.finishedWork;
  // ...执行三个子阶段的 DOM 操作...

  // commit 完成，切换 current 指针
  root.current = finishedWork;  // 这一行是双缓冲切换的核心
}

// createWorkInProgress：复用或创建 wip
function createWorkInProgress(current, pendingProps) {
  let workInProgress = current.alternate;
  if (workInProgress === null) {
    // 首次渲染，新建
    workInProgress = createFiber(current.tag, pendingProps, current.key);
    workInProgress.alternate = current;
    current.alternate = workInProgress;
  } else {
    // 复用，重置状态
    workInProgress.pendingProps = pendingProps;
    workInProgress.flags = NoFlags;
    workInProgress.subtreeFlags = NoFlags;
    workInProgress.deletions = null;
  }
  // 从 current 同步不变的字段
  workInProgress.type = current.type;
  workInProgress.stateNode = current.stateNode;
  workInProgress.memoizedState = current.memoizedState;
  workInProgress.memoizedProps = current.memoizedProps;
  return workInProgress;
}
```

**p-react 对应实现**

`packages/react-reconciler/src/workLoop.ts` 中的 `createWorkInProgress` 函数，逻辑与 React 源码完全一致。

**对应学习阶段**：第二阶段

---

## 三、Render 阶段

### 题目 6：从 `ReactDOM.createRoot(container).render(<App />)` 到首屏渲染完成，完整调用链是什么？

**难度：★★★☆☆**

**考察点**

考察候选人是否掌握整条渲染主干，而不是只知道几个独立的函数。

**源码级答案**

完整调用链（同步模式）：

```
createRoot(container)
  └── createFiberRoot(container)
        ├── new FiberRootNode(container, hostRootFiber)  // 应用根节点
        └── new FiberNode(HostRoot)                      // Fiber 树根节点
              └── stateNode = FiberRootNode（互相指向）

root.render(<App />)
  └── updateContainer(element, root)
        └── scheduleUpdateOnFiber(hostRootFiber, lane)
              ├── markUpdateLaneFromFiberToRoot()          // 沿 return 向上找到 FiberRootNode
              │                                            // 顺路更新沿途节点的 childLanes
              └── performSyncWorkOnRoot(root)
                    ├── prepareFreshStack(root)             // 创建 wip 根 fiber
                    ├── workLoopSync()                      // render 阶段主循环
                    │     └── performUnitOfWork(wip)
                    │           ├── beginWork()             // 递：创建子 fiber
                    │           └── completeUnitOfWork()    // 归：创建 DOM，冒泡 flags
                    └── commitRoot(root)                    // commit 阶段
                          ├── commitBeforeMutationEffects() // 读快照
                          ├── commitMutationEffects()       // 操作 DOM
                          └── commitLayoutEffects()         // 触发 useLayoutEffect
```

**关键源码片段**

```javascript
// packages/react-reconciler/src/ReactFiberWorkLoop.js
function performUnitOfWork(unitOfWork) {
  const current = unitOfWork.alternate;
  // beginWork 返回第一个子 fiber，null 表示已到叶子节点
  let next = beginWork(current, unitOfWork, subtreeRenderLanes);
  unitOfWork.memoizedProps = unitOfWork.pendingProps;

  if (next === null) {
    // 没有子节点，进入归阶段
    completeUnitOfWork(unitOfWork);
  } else {
    // 有子节点，继续向下递
    workInProgress = next;
  }
}
```

**p-react 对应实现**

`packages/react-reconciler/src/workLoop.ts`，`performSyncWorkOnRoot` 和 `performUnitOfWork` 实现了这条主干，注释非常详细。

**对应学习阶段**：第三阶段

---

### 题目 7：`beginWork` 里 `reconcileChildren` 为什么要区分 `mountChildFibers` 和 `reconcileChildFibers`？两者有什么关键区别？

**难度：★★★☆☆**

**考察点**

考察候选人对首次渲染优化的理解，以及 `Placement` 标记的收集策略。

**源码级答案**

两者都是 `childReconciler` 这同一个工厂函数的产物，区别只有一个参数：`shouldTrackSideEffects`。

```javascript
// packages/react-reconciler/src/ReactChildFiber.js
export const reconcileChildFibers = createChildReconciler(true);   // 追踪副作用
export const mountChildFibers = createChildReconciler(false);      // 不追踪副作用
```

这个区别带来一个关键优化：

`mountChildFibers`（首次渲染子树）不给新建的 fiber 添加 `Placement` 标记。这样，整棵子树所有节点都没有 flags，到 commit 阶段不需要一个个节点地执行 `appendChild`。

那首次渲染怎么把 DOM 加到页面上？关键在 `HostRoot` 这一层。`HostRoot` 总是有 current fiber（初始化时就创建了），所以它走 `reconcileChildFibers`（追踪副作用），给 `App` 对应的 fiber 打上 `Placement`。

commit 阶段处理这个 `Placement` 时，会调用 `insertBefore`/`appendChild` 把 App 对应的 DOM 子树整体插入容器，整棵子树一次性挂载完成，而不是逐个节点 `appendChild`。

这是一个重要的批量插入优化，避免了首次渲染时 O(n) 次 DOM 操作。

**关键源码片段**

```javascript
// packages/react-reconciler/src/ReactChildFiber.js
function createChildReconciler(shouldTrackSideEffects) {
  function placeSingleChild(newFiber) {
    // shouldTrackSideEffects 为 false 时，直接返回，不打 Placement 标记
    if (shouldTrackSideEffects && newFiber.alternate === null) {
      newFiber.flags |= Placement;
    }
    return newFiber;
  }
  // ...
}

// packages/react-reconciler/src/ReactFiberBeginWork.js
function reconcileChildren(current, workInProgress, nextChildren) {
  if (current === null) {
    // 首次渲染（current 为 null），不追踪副作用
    workInProgress.child = mountChildFibers(workInProgress, null, nextChildren);
  } else {
    // 更新，追踪副作用
    workInProgress.child = reconcileChildFibers(workInProgress, current.child, nextChildren);
  }
}
```

**p-react 对应实现**

`packages/react-reconciler/src/beginWork.ts` 中的 `reconcileChildren`、`mountChildFibers`、`reconcileChildFibers`，当前 p-react 简化版两者都打了 `Placement`，完整实现需要按 `shouldTrackSideEffects` 区分。

**对应学习阶段**：第三阶段

---

### 题目 8：`completeWork` 中 `appendAllChildren` 为什么要"穿透"函数组件？它是怎么实现穿透的？

**难度：★★★☆☆**

**考察点**

这是 completeWork 中最精巧的逻辑之一，考察候选人是否仔细读过 `appendAllChildren` 的实现。

**源码级答案**

问题背景：当 `completeWork` 处理一个 `HostComponent`（如 `<div>`）时，需要把它的 DOM 子节点全部 `appendChild` 进来。但这个 div 的直接 Fiber 子节点可能是 FunctionComponent，而 FunctionComponent 没有 DOM 节点（没有 `stateNode`）。需要穿透 FunctionComponent，找到它最终渲染出的真实 DOM 节点。

穿透的实现是一个深度优先遍历：

```javascript
function appendAllChildren(parent, workInProgress) {
  let node = workInProgress.child;
  while (node !== null) {
    if (node.tag === HostComponent || node.tag === HostText) {
      // 找到宿主节点，直接追加
      appendInitialChild(parent, node.stateNode);
    } else if (node.child !== null) {
      // 不是宿主节点（如函数组件），往下穿透一层
      node.child.return = node;
      node = node.child;
      continue;
    }
    // 到达 workInProgress 本身，结束
    if (node === workInProgress) return;
    // 没有兄弟，往上回退
    while (node.sibling === null) {
      if (node.return === null || node.return === workInProgress) return;
      node = node.return;
    }
    node.sibling.return = node.return;
    node = node.sibling;
  }
}
```

这之所以能工作，是因为 `completeWork` 是自底向上执行的。当处理 `<div>` 时，它所有的 HostComponent/HostText 后代已经完成了 completeWork，`stateNode` 都已经是有效的 DOM 节点了。

**关键源码片段**

```javascript
// packages/react-reconciler/src/ReactFiberCompleteWork.js
// p-react 的实现与 React 源码逻辑完全一致（completeWork.ts 第55-75行）
function appendAllChildren(parent, workInProgress) {
  let node = workInProgress.child;
  while (node !== null) {
    if (node.tag === HostComponent || node.tag === HostText) {
      appendInitialChild(parent, node.stateNode);
    } else if (node.child !== null) {
      node.child.return = node;
      node = node.child;
      continue;  // 穿透：继续往下找宿主节点
    }
    if (node === workInProgress) return;
    while (node.sibling === null) {
      if (node.return === null || node.return === workInProgress) return;
      node = node.return;
    }
    node.sibling.return = node.return;
    node = node.sibling;
  }
}
```

**p-react 对应实现**

`packages/react-reconciler/src/completeWork.ts` 的 `appendAllChildren` 函数，实现与 React 源码完全一致。

**对应学习阶段**：第三阶段

---

### 题目 9：`subtreeFlags` 的设计动机是什么？`bubbleProperties` 是如何工作的？

**难度：★★★☆☆**

**考察点**

考察候选人对 commit 阶段性能优化的理解，以及 completeWork 与 commitWork 之间的协作方式。

**源码级答案**

没有 `subtreeFlags` 的情况下，commit 阶段必须遍历整棵 Fiber 树才能找到有副作用的节点，即使大部分节点什么都没变，也得走一遍，是 O(n) 的盲目遍历。

`subtreeFlags` 是一个聚合位掩码，在 completeWork 的 `bubbleProperties` 中从叶子向根冒泡：每个节点把所有子节点的 `flags` 和 `subtreeFlags` 都 OR 进自己的 `subtreeFlags`。

commit 阶段遍历时，先检查 `fiber.subtreeFlags === NoFlags`，如果是，说明整个子树都没有副作用，直接跳过，不往下走，大大减少了遍历节点数。

```javascript
// packages/react-reconciler/src/ReactFiberCommitWork.js
function commitMutationEffectsOnFiber(finishedWork, root) {
  const current = finishedWork.alternate;
  const flags = finishedWork.flags;

  // 先处理子树（子树有副作用才往下）
  recursivelyTraverseMutationEffects(root, finishedWork);
  // 再处理当前节点自己的副作用
  commitReconciliationEffects(finishedWork);
}

function recursivelyTraverseMutationEffects(root, parentFiber) {
  // subtreeFlags 为 NoFlags，整棵子树无副作用，直接跳过
  if (parentFiber.subtreeFlags & MutationMask) {
    let child = parentFiber.child;
    while (child !== null) {
      commitMutationEffectsOnFiber(child, root);
      child = child.sibling;
    }
  }
}
```

**关键源码片段**

```javascript
// packages/react-reconciler/src/ReactFiberCompleteWork.js
function bubbleProperties(completedWork) {
  const didBailout = completedWork.alternate !== null &&
    completedWork.alternate.child === completedWork.child;

  let subtreeFlags = NoFlags;
  let newChildLanes = NoLanes;
  let child = completedWork.child;

  while (child !== null) {
    newChildLanes = mergeLanes(newChildLanes, mergeLanes(child.lanes, child.childLanes));
    if (!didBailout) {
      // 正常更新：收集子节点的所有 flags
      subtreeFlags |= child.subtreeFlags;
      subtreeFlags |= child.flags;
    } else {
      // bailout 优化路径：只收集被动 flags
      subtreeFlags |= child.subtreeFlags & StaticMask;
    }
    child = child.sibling;
  }
  completedWork.subtreeFlags |= subtreeFlags;
  completedWork.childLanes = newChildLanes;
}
```

**p-react 对应实现**

`packages/react-reconciler/src/completeWork.ts` 的 `bubbleProperties`，p-react 版本省略了 `didBailout` 和 `childLanes` 的处理，只实现了核心的 flags 冒泡逻辑。

**对应学习阶段**：第三、第四阶段

---

## 四、Commit 阶段

### 题目 10：commit 阶段为什么不能中断？三个子阶段分别做什么，执行顺序是什么？

**难度：★★★☆☆**

**考察点**

考察候选人对 render 阶段可中断、commit 阶段不可中断这个核心约定的理解，以及三个子阶段的职责划分。

**源码级答案**

commit 阶段不能中断的根本原因：它操作真实 DOM。如果 commit 到一半暂停，用户看到的页面是不一致的状态，比如有些节点删了，有些还在，或者某些 ref 已经更新但关联的 DOM 还没有。这种中间状态对用户来说是个 bug，而不是渐进渲染。

render 阶段可以中断，是因为它全部操作的是 wip 树（内存中的 Fiber 对象），不影响屏幕上的内容，重做也不会有副作用。

三个子阶段由 `commitRootImpl` 按顺序调用：

**beforeMutation（`commitBeforeMutationEffects`）**

DOM 还没有任何变化。此阶段：
- 调用类组件的 `getSnapshotBeforeUpdate`，返回值会传给 `componentDidUpdate` 的第三个参数
- 调度 `useEffect` 的执行（通过 `scheduleCallback` 异步，在 paint 之后才真正执行）

**mutation（`commitMutationEffects`）**

真正执行 DOM 操作：
- `Placement` flag：调用 `commitPlacement`，执行 `insertBefore`/`appendChild`
- `Update` flag：调用 `commitWork`，更新 DOM 属性、文本内容
- `Deletion` flag：调用 `commitDeletion`，递归处理子树的 cleanup 和 `componentWillUnmount`，然后 `removeChild`

mutation 结束后，`root.current = finishedWork`，双缓冲切换完成。

**layout（`commitLayoutEffects`）**

DOM 变更已完成，但浏览器尚未 paint：
- 调用 `componentDidMount`（新挂载）或 `componentDidUpdate`（更新）
- 执行 `useLayoutEffect` 的 callback
- 处理 `ref` 赋值（`attachRef`）

**关键源码片段**

```javascript
// packages/react-reconciler/src/ReactFiberWorkLoop.js
function commitRootImpl(root) {
  // beforeMutation 阶段
  commitBeforeMutationEffects(root, finishedWork);
  // mutation 阶段（执行 DOM 操作）
  commitMutationEffects(root, finishedWork, lanes);
  // 双缓冲切换
  root.current = finishedWork;
  // layout 阶段（DOM 操作后，paint 前）
  commitLayoutEffects(finishedWork, root, lanes);
  // 调度 useEffect（在 paint 之后异步执行）
  scheduleCallback(NormalSchedulerPriority, () => {
    flushPassiveEffects();
  });
}
```

**p-react 对应实现**

`packages/react-reconciler/src/commitWork.ts` 当前只实现了 mutation 阶段中的 `Placement` 处理，还没有 beforeMutation 和 layout 子阶段。

**对应学习阶段**：第四阶段

---

### 题目 11：`useEffect` cleanup 函数是在 commit 的哪个阶段执行的？为什么这样设计？

**难度：★★★☆☆**

**考察点**

很多人说"cleanup 在下次 effect 执行前执行"，这只是使用层面的描述，考察候选人能不能说出是在 mutation 阶段的 `commitHookEffectListUnmount` 中执行的。

**源码级答案**

cleanup 在 mutation 阶段执行，具体是 `commitMutationEffects` 里处理 `PassiveEffect` 标记时。函数是 `commitHookEffectListUnmount`。

更精确地说，分两种情况：

**组件被删除时**：在 `commitDeletion` 中同步执行。`commitDeletion` 会递归遍历被删除的子树，对每个有 `PassiveEffect` 的 fiber 调用 `commitHookEffectListUnmount`，销毁 effect。这一步在 mutation 阶段，是同步的。

**deps 变化时的更新**：cleanup 不在 mutation 阶段同步执行，而是和新的 effect callback 一起，在 `flushPassiveEffects` 里异步执行（paint 之后）。顺序是先执行上一次的 cleanup，再执行新的 callback。

这个设计动机：React 团队认为 `useEffect` 应该是"同构的"，cleanup 和 callback 都不应该阻塞 DOM 渲染。所以两者都被推迟到 paint 之后，保证浏览器能及时刷新页面。

与之对比，`useLayoutEffect` 的 cleanup 在 mutation 阶段同步执行，新 callback 在 layout 阶段同步执行，因为 `useLayoutEffect` 本来就是为了需要在 paint 前读写 DOM 的场景设计的。

**关键源码片段**

```javascript
// packages/react-reconciler/src/ReactFiberCommitWork.js
// mutation 阶段，处理 PassiveEffect（用于 useEffect）
function commitHookEffectListUnmount(flags, finishedWork) {
  const updateQueue = finishedWork.updateQueue;
  const lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;
  if (lastEffect !== null) {
    const firstEffect = lastEffect.next;
    let effect = firstEffect;
    do {
      if ((effect.tag & flags) === flags) {
        const destroy = effect.destroy;
        effect.destroy = undefined;
        if (destroy !== undefined) {
          // 执行上一次 effect 返回的 cleanup 函数
          destroy();
        }
      }
      effect = effect.next;
    } while (effect !== firstEffect);
  }
}
```

**对应学习阶段**：第四阶段

---

### 题目 12：`commitDeletion` 为什么要递归处理被删除节点的子树，而不是直接 `removeChild`？

**难度：★★★★☆**

**考察点**

考察候选人对 React 删除语义的深度理解，涉及生命周期、ref 清理、effect cleanup 的触发时机。

**源码级答案**

直接 `removeChild` 只能删掉 DOM 节点，但 React 还需要：

1. 对被删除组件树中每一个有 `ref` 的节点执行 ref 清理（`safelyDetachRef`）
2. 对每个类组件调用 `componentWillUnmount`
3. 对每个有 `useLayoutEffect` 的函数组件执行其 cleanup（`commitHookEffectListUnmount(HookLayout, ...)`）
4. 对每个有 `useEffect` 的函数组件执行其 cleanup（`commitHookEffectListUnmount(HookPassive, ...)`）
5. 对 Portal 类型节点，还需要额外从 portal 容器中移除 DOM

**React 19 中 ref cleanup 的新行为**：

React 19 支持 ref 回调函数返回一个 cleanup 函数。卸载时，React 会先检查 ref 回调是否返回了 cleanup：如果有，调用 cleanup 函数；如果没有，才像之前一样用 `null` 调用原 ref 回调。这意味着 `safelyDetachRef` 的行为有所变化：

```javascript
// React 19 中 safelyDetachRef 的简化逻辑
function safelyDetachRef(current, nearestMountedAncestor) {
  const ref = current.ref;
  if (ref !== null) {
    if (typeof ref === 'function') {
      const cleanupOrUndefined = current.refCleanup;
      if (typeof cleanupOrUndefined === 'function') {
        // 有 cleanup 函数，调用它，不再用 null 调用 ref 回调
        cleanupOrUndefined();
      } else {
        // 没有 cleanup，用 null 调用（旧行为）
        ref(null);
      }
      current.refCleanup = null;
    } else {
      // ref 是 ref 对象（createRef / useRef）
      ref.current = null;
    }
  }
}
```

因为 React 组件树可以任意深，被删除的子树里可能有几十个组件，每个都可能有上述副作用，所以 `commitDeletion` 调用 `unmountHostComponents` 做深度优先遍历，逐一触发。

这也是为什么 React 中组件"卸载"这个词是有意义的：它不只是把 DOM 删掉，而是一整套清理流程。

**关键源码片段**

```javascript
// packages/react-reconciler/src/ReactFiberCommitWork.js
function commitDeletion(root, returnFiber, deletedFiber) {
  // 递归遍历被删除的子树
  unmountHostComponents(root, returnFiber, deletedFiber);
  detachFiberMutation(deletedFiber);  // 断开指针，帮助 GC
}

function commitUnmount(finishedRoot, current, renderPriorityLevel) {
  switch (current.tag) {
    case FunctionComponent: {
      // 触发 useLayoutEffect cleanup
      commitHookEffectListUnmount(HookLayout | HookHasEffect, current);
      // 注册 useEffect cleanup（异步执行）
      enqueuePendingPassiveHookEffectUnmount(current, current);
      return;
    }
    case ClassComponent: {
      safelyDetachRef(current, current.return);  // 清理 ref
      const instance = current.stateNode;
      if (instance.componentWillUnmount) {
        safelyCallComponentWillUnmount(current, current.return, instance);
      }
      return;
    }
    case HostComponent: {
      safelyDetachRef(current, current.return);  // 清理 DOM ref
      return;
    }
  }
}
```

**对应学习阶段**：第四阶段

---

## 五、Diff 算法

### 题目 13：React Diff 算法的三条核心假设是什么？为什么这三条假设能把时间复杂度从 O(n³) 降到 O(n)？

**难度：★★★☆☆**

**考察点**

Diff 算法面试必问，但考察的不是背结论，而是能否解释每条假设对应的源码行为。

**源码级答案**

**假设一：不同 `type` 的元素生成不同的树**

对应源码行为：在 `reconcileSingleElement` 和 `updateSlot` 中，发现 `type` 不同时，直接把旧 fiber 标记为 `Deletion`，创建全新 fiber，不做子树比较。这就省掉了对不同类型子树的递归对比，是最重的优化。

**假设二：开发者通过 `key` 标识稳定元素**

对应源码行为：`key` 是 diff 的第一过滤条件，优先于 `type`。在 `reconcileChildrenArray` 的第二轮遍历中，旧节点被放入 `Map<key, fiber>` 或 `Map<index, fiber>`，通过 key 做 O(1) 查找，无需逐一比较。

**假设三：只比较同层节点（不跨层级）**

对应源码行为：diff 发生在 `reconcileChildFibers` 中，这个函数只比较同一个父 fiber 下的 children，不会拿 A 的子孙去和 B 的子孙比较。跨层的移动（比如把某个节点剪切到另一个父节点下）在 diff 看来就是删除再插入，不被优化。

这三条假设组合起来，让 diff 变成了单层的线性遍历（O(n)），而不是跨层的树形对比（O(n³)）。

**关键源码片段**

```javascript
// packages/react-reconciler/src/ReactChildFiber.js
function reconcileSingleElement(returnFiber, currentFirstChild, element) {
  let child = currentFirstChild;
  while (child !== null) {
    if (child.key === element.key) {
      const elementType = element.type;
      if (child.elementType === elementType) {
        // key 相同 + type 相同 → 复用
        deleteRemainingChildren(returnFiber, child.sibling);
        const existing = useFiber(child, element.props);
        existing.return = returnFiber;
        return existing;
      } else {
        // key 相同 + type 不同 → 删除全部旧节点，创建新节点（假设一）
        deleteRemainingChildren(returnFiber, child);
        break;
      }
    } else {
      // key 不同 → 删除当前旧节点，继续找（假设二）
      deleteChild(returnFiber, child);
    }
    child = child.sibling;
  }
  // 走到这里说明没有可复用的，创建新 fiber
  const created = createFiberFromElement(element);
  created.return = returnFiber;
  return created;
}
```

**对应学习阶段**：第五阶段

---

### 题目 14：多节点 Diff 的两轮遍历分别解决什么问题？`lastPlacedIndex` 是如何判断节点需要移动的？

**难度：★★★★☆**

**考察点**

这是 Diff 算法中最复杂的部分，也是最容易讲错的地方。考察候选人能否用 `lastPlacedIndex` 机制做出精确推导，而不是泛泛说"旧节点放 Map，查找复用"。

**源码级答案**

`reconcileChildrenArray` 分两轮处理多节点 diff：

**第一轮：处理常见的顺序不变场景**

同时从新旧 children 数组的第 0 位开始，逐个比较 `key`：
- key 相同 + type 相同 → `updateSlot` 返回复用的 fiber，继续
- key 相同 + type 不同 → 标记旧节点 Deletion，创建新 fiber，继续
- key 不同 → 跳出第一轮（可能发生了移动）

第一轮覆盖了"仅在末尾增删"的常见场景，退出条件是：新数组遍历完、旧链表遍历完，或者 key 不匹配。

**第二轮：处理移动、插入、批量删除**

第一轮结束后：
- 旧节点剩余 → 放入 `existingChildren: Map<key|index, fiber>`
- 新节点剩余 → 继续遍历新数组

对每个剩余新节点，从 `existingChildren` Map 中查找是否有可复用的旧 fiber（O(1)）。找到后：

```javascript
function placeChild(newFiber, lastPlacedIndex, newIndex) {
  newFiber.index = newIndex;
  const current = newFiber.alternate;
  if (current !== null) {
    // 这是复用的旧 fiber，它在旧列表中的位置是 current.index
    const oldIndex = current.index;
    if (oldIndex < lastPlacedIndex) {
      // 旧位置 < 当前已经稳定的最右位置 → 说明这个节点需要向右移动
      newFiber.flags |= Placement;
      return lastPlacedIndex;
    } else {
      // 旧位置 >= lastPlacedIndex → 不需要移动，更新 lastPlacedIndex
      return oldIndex;
    }
  } else {
    // 没有旧 fiber，是新插入的节点
    newFiber.flags |= Placement;
    return lastPlacedIndex;
  }
}
```

`lastPlacedIndex` 的含义：当前处理到的新节点中，不需要移动的节点在旧列表中的最大 index。只要复用节点的 `oldIndex >= lastPlacedIndex`，就不需要移动。

**实例推导**：旧 `[A(0), B(1), C(2), D(3)]`，新 `[D, A, B, C]`：

第一轮：新 D vs 旧 A，key 不同，跳出。
第二轮：把旧 A(0), B(1), C(2), D(3) 放入 Map。
- 处理新 D：在 Map 找到旧 D(index=3)，3 >= lastPlacedIndex(0)，不移动，lastPlacedIndex=3
- 处理新 A：在 Map 找到旧 A(index=0)，0 < 3，需要移动，标记 Placement
- 处理新 B：在 Map 找到旧 B(index=1)，1 < 3，需要移动，标记 Placement
- 处理新 C：在 Map 找到旧 C(index=2)，2 < 3，需要移动，标记 Placement

结果：只有 D 不动，A、B、C 都被标记移动。这说明此场景"把尾部节点移到头部"的代价很高，三个节点都要移动，建议用更具体的 key 避免这种操作。

**对应学习阶段**：第五阶段

---

### 题目 15：为什么 React 官方不推荐用数组 index 作为 key？从 Diff 算法角度精确解释。

**难度：★★★☆☆**

**考察点**

这道题几乎每人都会背结论，考察候选人能否用 diff 算法的具体执行过程来解释，而不是泛泛说"会影响性能"。

**源码级答案**

diff 算法使用 `key` 来识别"这次渲染的节点 A 和上次渲染的节点 A 是同一个组件"。用 index 作 key，当列表顺序变化时，index 和内容的对应关系会错位。

**场景：头部插入**

旧列表：`[{key:0, data:'A'}, {key:1, data:'B'}, {key:2, data:'C'}]`
新列表（头部插入 X）：`[{key:0, data:'X'}, {key:1, data:'A'}, {key:2, data:'B'}, {key:3, data:'C'}]`

在 `reconcileChildrenArray` 第一轮：
- 新[0](key=0) vs 旧[0](key=0)：key 相同，type 相同 → 复用，但内容从 A 变成了 X，需要 Update
- 新[1](key=1) vs 旧[1](key=1)：复用，内容从 B 变成了 A，需要 Update
- 新[2](key=2) vs 旧[2](key=2)：复用，内容从 C 变成了 B，需要 Update
- 新[3] 没有旧对应 → 创建，标记 Placement（C 被创建了一次）

总结：4 个节点中，3 个需要 Update（DOM 属性/内容更新），1 个需要 Placement（DOM 插入）。实际上只插入了一个新节点，却导致了 4 次 DOM 操作。

如果用稳定 ID 作 key：
- 新 X 没有旧对应 → 创建，Placement
- 旧 A、B、C 都能被 key 匹配到 → 复用，只做位置调整（placeChild 中判断是否 Placement）

本质上，index 作 key 让 diff 算法"看不到"节点的真实身份，把"插入一个新节点"误解成"所有节点都变了内容"。

**对应学习阶段**：第五阶段

---

## 六、Hooks 实现机制

### 题目 16：Hooks 为什么不能写在条件语句或循环里？从链表数据结构角度解释。

**难度：★★★☆☆**

**考察点**

这道题很多人只能背规则，考察能否从 `memoizedState` Hook 链表的实现机制出发，精确解释原因。

**源码级答案**

每个函数组件对应的 Fiber 节点，其 `memoizedState` 字段指向一个单向 Hook 链表的头节点，链表中每个节点是一个 Hook 对象：

```
fiber.memoizedState -> Hook(useState) -> Hook(useEffect) -> Hook(useState) -> null
```

mount 阶段，每次调用一个 Hook 函数（如 `useState`），`mountWorkInProgressHook` 就创建一个 Hook 节点追加到链表尾部。

update 阶段，`updateWorkInProgressHook` 从 `currentHook`（current fiber 对应的 Hook 链表）按顺序依次取节点，把"第 n 次 Hook 调用"和"链表第 n 个节点"一一对应。

关键点在于：**这个对应关系依赖于调用顺序，而不是 Hook 的名字**。

如果第一次渲染调用顺序是 `useState - useEffect - useState`，链表就是 `Hook1 - Hook2 - Hook3`。

第二次渲染如果跳过了 `useEffect`（比如放在了 `if` 里），调用顺序变成 `useState - useState`，`updateWorkInProgressHook` 就会把 `Hook1` 给第一个 `useState`，把 `Hook2`（原本是 `useEffect` 的节点）给第二个 `useState`。两个 Hook 的状态就全部错位了，行为变得不可预测。

**关键源码片段**

```javascript
// packages/react-reconciler/src/ReactFiberHooks.js
function updateWorkInProgressHook() {
  // 按顺序从 currentHook 链表取下一个节点
  let nextCurrentHook;
  if (currentHook === null) {
    const current = currentlyRenderingFiber.alternate;
    nextCurrentHook = current !== null ? current.memoizedState : null;
  } else {
    nextCurrentHook = currentHook.next;
  }
  // 将 current hook 克隆到 wip hook
  currentHook = nextCurrentHook;
  const newHook = {
    memoizedState: currentHook.memoizedState,
    baseState: currentHook.baseState,
    baseQueue: currentHook.baseQueue,
    queue: currentHook.queue,
    next: null,
  };
  // 追加到 wip 链表
  workInProgressHook.next = newHook;
  workInProgressHook = newHook;
  return workInProgressHook;
}
```

**对应学习阶段**：第六阶段

---

### 题目 17：`useState` 的 `dispatch` 函数为什么在多次渲染中保持同一个引用？`dispatchSetState` 内部做了什么？

**难度：★★★★☆**

**考察点**

考察候选人对闭包捕获和 Hook 更新队列的深度理解。

**源码级答案**

`dispatch` 函数在 mount 阶段通过 `bind` 创建，把 `fiber` 和 `queue` 两个参数固定住：

```javascript
// packages/react-reconciler/src/ReactFiberHooks.js
function mountState(initialState) {
  const hook = mountWorkInProgressHook();
  hook.memoizedState = hook.baseState = initialState;
  const queue = {
    pending: null,
    dispatch: null,
    lastRenderedReducer: basicStateReducer,
    lastRenderedState: initialState,
  };
  hook.queue = queue;
  // dispatch 通过 bind 绑定了 fiber 和 queue
  const dispatch = (queue.dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue));
  return [hook.memoizedState, dispatch];
}
```

为什么后续渲染同一个引用？因为 `updateState` 阶段不会重新创建 `dispatch`，而是直接从 `hook.queue.dispatch` 取已有的：

```javascript
function updateState() {
  return updateReducer(basicStateReducer);
}

function updateReducer(reducer) {
  const hook = updateWorkInProgressHook();
  const queue = hook.queue;
  // dispatch 直接复用已有的，不重新 bind
  return [hook.memoizedState, queue.dispatch];
}
```

`dispatchSetState` 内部做了以下几步：

1. 创建 Update 对象，`{ lane, action, next: null }`
2. 将 Update 插入 `queue.pending` 环形链表（`pending.next = update; pending = update`）
3. 调用 `scheduleUpdateOnFiber`，触发调度

**为什么用环形链表**

`queue.pending` 始终指向链表的最后一个 Update，而最后一个 Update 的 `next` 指向第一个 Update。这样，通过 `pending` 既能 O(1) 访问最新的 Update（`pending`），也能 O(1) 访问最早的 Update（`pending.next`），无需遍历整个链表就能找到起点。

**关键源码片段**

```javascript
function dispatchSetState(fiber, queue, action) {
  const lane = requestUpdateLane(fiber);
  const update = { lane, action, hasEagerState: false, eagerState: null, next: null };

  // 尝试 eager 计算优化（只有 queue 中没有其他 pending 更新时才做）
  if (fiber.lanes === NoLanes && fiber.alternate?.lanes === NoLanes) {
    const lastRenderedReducer = queue.lastRenderedReducer;
    const currentState = queue.lastRenderedState;
    const eagerState = lastRenderedReducer(currentState, action);
    update.hasEagerState = true;
    update.eagerState = eagerState;
    // 如果计算出来的新 state 和当前 state 相同，跳过调度（bailout）
    if (Object.is(eagerState, currentState)) {
      enqueueConcurrentHookUpdateAndEagerlyBailout(fiber, queue, update);
      return;
    }
  }

  // 插入更新队列，触发调度
  const root = enqueueConcurrentHookUpdate(fiber, queue, update, lane);
  scheduleUpdateOnFiber(root, fiber, lane, eventTime);
}
```

**对应学习阶段**：第六阶段

---

### 题目 18：`useEffect` 和 `useLayoutEffect` 在源码实现上有什么区别？为什么 `useLayoutEffect` 能读到最新的 DOM？

**难度：★★★★☆**

**考察点**

考察候选人对两种 effect 在 commit 阶段调度时机的精确理解，而不是只知道"一个异步一个同步"。

**源码级答案**

两者的本质区别在 Effect 对象的 `tag` 字段：

```javascript
// packages/react-reconciler/src/ReactFiberHooks.js
// useEffect mount
function mountEffect(create, deps) {
  mountEffectImpl(
    PassiveEffect | PassiveStaticEffect,  // fiber.flags
    HookPassive,                          // effect.tag  ← 关键区别
    create,
    deps
  );
}

// useLayoutEffect mount
function mountLayoutEffect(create, deps) {
  mountEffectImpl(
    UpdateEffect,   // fiber.flags
    HookLayout,     // effect.tag  ← 关键区别
    create,
    deps
  );
}
```

commit 阶段根据这个 `tag` 在不同时机执行：

**`HookLayout`（useLayoutEffect）**：在 `commitLayoutEffects` 中同步执行，DOM 变更已完成（mutation 阶段结束），但浏览器尚未 paint。此时 `document.querySelector` 等 DOM 查询能拿到最新 DOM，这就是为什么 `useLayoutEffect` 能读到最新 DOM。

**`HookPassive`（useEffect）**：在 commit 完成后，通过 `scheduleCallback(NormalSchedulerPriority, flushPassiveEffects)` 异步调度，在浏览器 paint 之后才执行。

两者的 cleanup 时机也不同：
- `useLayoutEffect` cleanup：mutation 阶段同步执行（`commitHookEffectListUnmount(HookLayout | HookHasEffect, ...)`）
- `useEffect` cleanup：下次 `flushPassiveEffects` 时执行（比新 callback 早，但都在 paint 之后）

**关键源码片段**

```javascript
// packages/react-reconciler/src/ReactFiberCommitWork.js
export function commitHookEffectListMount(flags, finishedWork) {
  const updateQueue = finishedWork.updateQueue;
  const lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;
  if (lastEffect !== null) {
    const firstEffect = lastEffect.next;
    let effect = firstEffect;
    do {
      if ((effect.tag & flags) === flags) {
        // 执行 effect callback
        const create = effect.create;
        effect.destroy = create();  // 保存返回值（cleanup 函数）
      }
      effect = effect.next;
    } while (effect !== firstEffect);
  }
}

// layout 阶段（同步，DOM 变更后 paint 前）调用：
commitHookEffectListMount(HookLayout | HookHasEffect, finishedWork);

// useEffect 异步阶段调用：
commitHookEffectListMount(HookPassive | HookHasEffect, finishedWork);
```

**对应学习阶段**：第六阶段

---

### 题目 19：`ReactCurrentDispatcher.current` 是什么？React 为什么用这个全局变量来区分 mount 和 update 阶段的 Hook 实现？

**难度：★★★★☆**

**考察点**

考察候选人对 React Hooks 分发机制的深度理解，这是 Hooks 实现的一个精巧设计点。

**源码级答案**

`ReactCurrentDispatcher` 是 `packages/react/src/ReactCurrentDispatcher.js` 中定义的一个全局对象，只有一个 `current` 属性：

```javascript
const ReactCurrentDispatcher = { current: null };
```

它是 React 用来在运行时切换 Hook 实现的"开关"。React 定义了多套 Dispatcher：

```javascript
// packages/react-reconciler/src/ReactFiberHooks.js
const HooksDispatcherOnMount = {
  useState: mountState,
  useEffect: mountEffect,
  useRef: mountRef,
  // ...
};

const HooksDispatcherOnUpdate = {
  useState: updateState,
  useEffect: updateEffect,
  useRef: updateRef,
  // ...
};

const HooksDispatcherOnRerender = {
  // 同一次 render 中触发的更新（如 useEffect 里 setState）
  useState: rerenderState,
  // ...
};
```

在 `renderWithHooks`（函数组件执行前）中切换：

```javascript
function renderWithHooks(current, workInProgress, Component, props) {
  currentlyRenderingFiber = workInProgress;
  // 根据是否有 current fiber 决定使用哪套 dispatcher
  ReactCurrentDispatcher.current =
    current === null || current.memoizedState === null
      ? HooksDispatcherOnMount    // 首次渲染
      : HooksDispatcherOnUpdate;  // 更新
  
  // 执行函数组件
  const children = Component(props);
  
  // 执行后恢复为"禁止调用 Hook"的 dispatcher，防止在非组件上下文中调用
  ReactCurrentDispatcher.current = ContextOnlyDispatcher;
  currentlyRenderingFiber = null;
  return children;
}
```

用户代码里的 `useState` 来自 `packages/react/src/ReactHooks.js`：

```javascript
export function useState(initialState) {
  const dispatcher = resolveDispatcher();  // 读取 ReactCurrentDispatcher.current
  return dispatcher.useState(initialState);  // 转发给当前 dispatcher
}
```

这个设计的好处：同一个 `useState` API，不需要在内部判断是 mount 还是 update，由外部切换 dispatcher 来分发。额外的 `ContextOnlyDispatcher` 保证了 React 能在运行时报出"不能在非组件上下文中调用 Hook"的错误。

**React 19 补充：`use()` 不走 dispatcher**

React 19 新增的 `use()` API 是一个特殊存在：它不在 Dispatcher 对象上，不受 mount/update 阶段切换的限制。`use()` 直接在 React 的渲染循环中被识别和处理，可以在条件分支中调用（这是它和所有其他 Hook 的本质区别）。在 `packages/react/src/ReactHooks.js` 中，`use` 的导出方式和其他 Hook 不同，它不通过 `resolveDispatcher()` 转发，而是走专门的 runtime 路径处理 Promise 挂起和 Context 读取。

**对应学习阶段**：第六阶段

---

## 七、Scheduler 调度器

### 题目 20：React Scheduler 为什么选择 `MessageChannel` 而不是 `setTimeout(fn, 0)` 来实现时间切片？

**难度：★★★★☆**

**考察点**

考察候选人对浏览器事件循环和定时器精度的深度理解。

**源码级答案**

时间切片需要把工作切成小片，每片执行完后把控制权还给浏览器，让浏览器处理用户输入和渲染，然后再继续工作。"把控制权还给浏览器"的实现方式是：把剩余工作安排到下一个宏任务中。

`setTimeout(fn, 0)` 不行的原因：根据 HTML 规范，当 `setTimeout` 嵌套调用超过 5 层，或 delay 为 0 时，浏览器会强制将 delay 设为至少 4ms。React 的 frameInterval 是 5ms，如果每次切片都浪费 4ms 等待，吞吐量会减半。

`requestIdleCallback` 也不行：它有大约 20ms 的延迟，且浏览器决定何时调用，React 无法控制优先级排序，也不支持 `isInputPending` 类的动态调整。

`MessageChannel` 的延迟接近 0ms（通常 < 1ms），因为 `postMessage` 产生的是"任务"（task），浏览器调度它的时机和 `setTimeout(fn, 0)` 相似，但没有 4ms 最小延迟限制。

**关键源码片段**

```javascript
// packages/scheduler/src/forks/Scheduler.js
const channel = new MessageChannel();
const port = channel.port2;
// 每次需要让出控制权时，通过 postMessage 把剩余工作推到下一个宏任务
channel.port1.onmessage = performWorkUntilDeadline;

function schedulePerformWorkUntilDeadline() {
  port.postMessage(null);
}

function performWorkUntilDeadline() {
  if (scheduledHostCallback !== null) {
    const currentTime = getCurrentTime();
    // 设置本次宏任务的截止时间（startTime + frameInterval，默认 5ms）
    deadline = currentTime + frameInterval;
    const hasMoreWork = scheduledHostCallback(true, currentTime);
    if (!hasMoreWork) {
      isMessageLoopRunning = false;
      scheduledHostCallback = null;
    } else {
      // 还有工作，再 postMessage 一次，下一个宏任务继续
      port.postMessage(null);
    }
  }
}
```

**对应学习阶段**：第七阶段

---

### 题目 21：Scheduler 内部维护了哪两个队列？数据结构是什么？任务是如何入队和出队的？

**难度：★★★★☆**

**考察点**

考察候选人对 Scheduler 任务管理机制的理解，包括小顶堆的实现和两个队列的设计动机。

**源码级答案**

Scheduler 维护两个小顶堆：

**`taskQueue`**：已经到达开始时间的任务，按 `expirationTime`（到期时间）排序，到期时间越小的任务优先级越高（越紧急）。

**`timerQueue`**：尚未到达开始时间的延迟任务（`scheduleCallback` 传了 `delay` 参数），按 `startTime` 排序。

两个队列都实现在 `packages/scheduler/src/SchedulerMinHeap.js`，使用二叉堆，`push` 是 O(log n)，`peek`（取堆顶）是 O(1)，`pop` 是 O(log n)。

任务调度流程：

```javascript
function scheduleCallback(priorityLevel, callback, options) {
  const currentTime = getCurrentTime();
  let startTime = options?.delay ? currentTime + options.delay : currentTime;

  // 根据优先级计算超时时间
  let timeout;
  switch (priorityLevel) {
    case ImmediatePriority: timeout = -1; break;
    case UserBlockingPriority: timeout = 250; break;
    case NormalPriority: timeout = 5000; break;
    // ...
  }
  const expirationTime = startTime + timeout;
  const newTask = { id, callback, priorityLevel, startTime, expirationTime, sortIndex: -1 };

  if (startTime > currentTime) {
    // 还没到开始时间，进 timerQueue
    newTask.sortIndex = startTime;
    push(timerQueue, newTask);
  } else {
    // 可以立即执行，进 taskQueue
    newTask.sortIndex = expirationTime;
    push(taskQueue, newTask);
    requestHostCallback(flushWork);  // 触发调度循环
  }
  return newTask;
}
```

每次 `workLoop` 开始时，先调用 `advanceTimers` 把 `timerQueue` 中已到期的任务移到 `taskQueue`。

**关键源码片段**

```javascript
// packages/scheduler/src/forks/Scheduler.js
function workLoop(hasTimeRemaining, initialTime) {
  let currentTime = initialTime;
  advanceTimers(currentTime);  // 把到期的延迟任务移到 taskQueue
  currentTask = peek(taskQueue);

  while (currentTask !== null && !enableSchedulerDebugging) {
    if (currentTask.expirationTime > currentTime && (!hasTimeRemaining || shouldYieldToHost())) {
      // 当前任务还没过期，且时间片用完了，暂停
      break;
    }
    const callback = currentTask.callback;
    currentTask.callback = null;
    const continuationCallback = callback(didUserCallbackTimeout);
    if (typeof continuationCallback === 'function') {
      // 任务还没完成，返回了延续函数，下次继续执行这个任务
      currentTask.callback = continuationCallback;
    } else {
      // 任务完成，从堆中移除
      if (currentTask === peek(taskQueue)) pop(taskQueue);
    }
    advanceTimers(getCurrentTime());
    currentTask = peek(taskQueue);
  }
  return currentTask !== null;
}
```

**对应学习阶段**：第七阶段

---

## 八、Lane 模型

### 题目 22：React 为什么从 ExpirationTime 模型切换到 Lane 模型？Lane 是如何用位掩码表达优先级的？

**难度：★★★★☆**

**考察点**

考察候选人是否理解 Lane 模型的设计动机，以及位运算在 Lane 中的实际应用。

**源码级答案**

`ExpirationTime` 的问题：用单个数字表示优先级，高优先级 = 数字大。这个模型在描述两个更新"能否被合并处理"时有缺陷。比如，同属于 `UserBlocking` 的两个更新，expirationTime 可能不同（因为时间戳不同），就无法简单判断"它们属于同一批"。

Lane 用**位掩码**解决这个问题。每个优先级"车道"是一组 bit，同优先级的更新共享同一组 bit，可以精确地合并、检查、拆分：

```javascript
// packages/react-reconciler/src/ReactFiberLane.js
const SyncLane                 = 0b0000000000000000000000000000001;
const InputContinuousHydrationLane = 0b0000000000000000000000000000010;
const InputContinuousLane      = 0b0000000000000000000000000000100;
const DefaultHydrationLane     = 0b0000000000000000000000000001000;
const DefaultLane              = 0b0000000000000000000000000010000;
const TransitionLanes          = 0b0000000001111111111111111000000;  // 一组 lane，支持多个并发 transition
const RetryLanes               = 0b0000011110000000000000000000000;  // Suspense retry
const IdleLane                 = 0b0010000000000000000000000000000;
```

位运算操作：

```javascript
// 检查 lanes 中是否包含某个 lane
function includesSomeLane(a, b) { return (a & b) !== NoLanes; }

// 合并两个更新的 lanes
function mergeLanes(a, b) { return a | b; }

// 移除已处理的 lane
function removeLanes(set, subset) { return set & ~subset; }

// 取最高优先级（最低 bit）
function getHighestPriorityLane(lanes) { return lanes & -lanes; }
// -lanes 是补码运算：取反 +1，结果是保留最低位的 1，其余位清零
```

Lane 还有一个额外能力：支持 **Transition 的并发**。`TransitionLanes` 是一组 16 个 bit，每个新的 `useTransition` 调用会分配其中一个 lane，多个 transition 可以并发进行，互不干扰。ExpirationTime 模型做不到这点（因为 transition 的 expirationTime 一样就会被合并为同一个批次）。

**关键源码片段**

```javascript
// packages/react-reconciler/src/ReactFiberLane.js
// 批处理的核心：把 fiber 上所有待处理的 lanes 合并到 root.pendingLanes
function markUpdateLaneFromFiberToRoot(sourceFiber, lane) {
  sourceFiber.lanes = mergeLanes(sourceFiber.lanes, lane);
  let alternate = sourceFiber.alternate;
  if (alternate !== null) {
    alternate.lanes = mergeLanes(alternate.lanes, lane);
  }
  let node = sourceFiber.return;
  while (node !== null) {
    // 沿途更新 childLanes，让祖先节点知道子树有更新
    node.childLanes = mergeLanes(node.childLanes, lane);
    if (node.alternate !== null) {
      node.alternate.childLanes = mergeLanes(node.alternate.childLanes, lane);
    }
    node = node.return;
  }
}
```

**对应学习阶段**：第八阶段

---

### 题目 23：React 的自动批处理（Automatic Batching）是怎么实现的？旧版 `ReactDOM.render` 和现在的 `createRoot` 有什么区别？

**难度：★★★★☆**

**考察点**

考察候选人是否理解批处理的实现机制，以及并发模式如何让批处理成为默认行为。

**源码级答案**

**旧版 `ReactDOM.render`（React 19 已完全移除）的批处理**：

旧版 legacy 模式在执行事件处理函数前设置 `executionContext |= BatchedContext`，在这段上下文中调用 `setState`，每次都只把 Update 入队，不立即调用 `scheduleUpdateOnFiber`。事件处理结束后，清除 `BatchedContext`，然后统一触发一次渲染。

但如果在 `setTimeout` 或 `Promise.then` 中调用 `setState`，此时 `executionContext` 已不包含 `BatchedContext`，每次 `setState` 都会触发一次完整的同步渲染，无法合批。这是 legacy 模式的历史局限。

**React 19 `createRoot` 的自动批处理**：

React 19 只有 `createRoot`（和 `hydrateRoot`），不再有 legacy 模式（`ReactDOM.render` 在 React 19 中已完全移除）。`createRoot` 开启并发模式，所有更新都是异步调度的。当事件处理函数中有多个 `setState`，每个 `setState` 触发的 `scheduleUpdateOnFiber` 只会把 lane 合并到 `root.pendingLanes`，不会立即 `flush`。

真正的渲染在调度宏任务中执行（`performConcurrentWorkOnRoot`），这时会处理 `pendingLanes` 中所有积累的更新，天然形成批处理。

无论是事件处理函数内，还是 `setTimeout`、`Promise.then` 中，`setState` 都只是把 Update 入队并发起调度，渲染始终在下一个宏任务中执行，所以自然地合批了。

**关键源码片段**

```javascript
// packages/react-reconciler/src/ReactFiberWorkLoop.js
function ensureRootIsScheduled(root, currentTime) {
  const existingCallbackNode = root.callbackNode;
  // 如果已经有调度任务了，检查优先级是否需要更新
  if (existingCallbackNode !== null) {
    const existingCallbackPriority = root.callbackPriority;
    const newCallbackPriority = getHighestPriorityLane(nextLanes);
    if (newCallbackPriority === existingCallbackPriority) {
      // 优先级没变，复用现有的调度任务（合批的关键：不再发起新的调度）
      return;
    }
    cancelCallback(existingCallbackNode);
  }
  // 发起新的调度任务
  const schedulerPriorityLevel = lanesToSchedulerPriority(newCallbackPriority);
  const newCallbackNode = scheduleCallback(schedulerPriorityLevel, performConcurrentWorkOnRoot.bind(null, root));
  root.callbackPriority = newCallbackPriority;
  root.callbackNode = newCallbackNode;
}
```

**对应学习阶段**：第八阶段

---

## 九、并发模式

### 题目 24：`useTransition` 的实现原理是什么？`startTransition` 内部怎么把更新标记为低优先级的？

**难度：★★★★★**

**考察点**

考察候选人对并发模式和 Lane 优先级分配机制的深度理解。

**源码级答案**

`useTransition` 返回 `[isPending, startTransition]`。

`isPending` 是一个 `useState` 状态，`startTransition` 内部会分别触发两次更新：

1. **同步更新**（`SyncLane`）：把 `isPending` 设为 `true`，让用户立即看到"加载中"状态
2. **Transition 更新**（`TransitionLane`）：执行 `callback`（用户传入的低优先级更新），同时把 `isPending` 设回 `false`

关键是如何标记 Transition 优先级。`startTransition` 内部：

```javascript
// packages/react-reconciler/src/ReactFiberHooks.js
function startTransition(setPending, callback, options) {
  const previousPriority = getCurrentUpdatePriority();
  // 降低后续更新的优先级：设为 TransitionLane 的优先级
  setCurrentUpdatePriority(
    higherEventPriority(previousPriority, ContinuousEventPriority)
  );

  setPending(true);  // 高优先级：立即更新 isPending

  // 切换全局变量，标记"当前在 transition 上下文中"
  const prevTransition = ReactCurrentBatchConfig.transition;
  ReactCurrentBatchConfig.transition = {};

  try {
    setPending(false);  // 这次 setPending 在 transition 上下文中，会拿到 TransitionLane
    callback();         // 用户的低优先级更新，也在 transition 上下文中
  } finally {
    setCurrentUpdatePriority(previousPriority);
    ReactCurrentBatchConfig.transition = prevTransition;
  }
}
```

在 `requestUpdateLane` 中，如果检测到 `ReactCurrentBatchConfig.transition !== null`，就给这次更新分配一个 `TransitionLane`（从 `TransitionLanes` 中取一个未用的 bit），而不是默认的 `DefaultLane`。

`TransitionLane` 优先级低于 `SyncLane` 和 `InputContinuousLane`，所以 React 的并发调度器会优先处理高优先级任务，低优先级的 transition 在后台等待，被高优先级任务"插队"时会被丢弃并重新开始。

**关键源码片段**

```javascript
// packages/react-reconciler/src/ReactFiberLane.js
// TransitionLanes 有 16 个 bit，支持多个并发 transition
export const TransitionLane1  = 0b0000000000000000000000001000000;
export const TransitionLane2  = 0b0000000000000000000000010000000;
// ...到 TransitionLane16

// 每次 transition 分配一个未被占用的 lane
function claimNextTransitionLane() {
  const lane = nextTransitionLane;
  nextTransitionLane <<= 1;  // 移到下一个 bit
  if ((nextTransitionLane & TransitionLanes) === 0) {
    nextTransitionLane = TransitionLane1;  // 轮回
  }
  return lane;
}
```

**对应学习阶段**：第九阶段

---

### 题目 25：Suspense 捕获 Promise 的机制是什么？`throwException` 函数做了什么？

**难度：★★★★★**

**考察点**

这是 React 并发特性中最"魔法"的部分，考察候选人能否说清楚 throw/catch 的具体函数链路。

**源码级答案**

Suspense 的工作原理建立在一个约定上：**如果组件需要等待异步数据，就 throw 一个 Promise**。

整个机制的调用链：

**1. 组件 throw Promise**

在渲染过程中（`beginWork -> updateFunctionComponent -> renderWithHooks` 执行组件函数），如果组件 throw 了一个非 Error 的值（通常是 Promise），`performUnitOfWork` 会捕获异常（通过 try/catch 包裹）。

**2. `throwException` 处理异常**

```javascript
// packages/react-reconciler/src/ReactFiberThrow.js
function throwException(root, returnFiber, sourceFiber, value, rootRenderLanes) {
  // value 是 throw 出来的 Promise（或具有 $$typeof = REACT_POSTPONE_TYPE 的对象）
  sourceFiber.flags |= Incomplete;  // 标记这个 fiber 未完成

  if (value !== null && typeof value === 'object' && typeof value.then === 'function') {
    // 这是一个 Promise（即"thenable"），是 Suspense 场景
    const wakeable = value;

    // 向上找到最近的 Suspense 边界 fiber
    let workInProgress = returnFiber;
    do {
      if (workInProgress.tag === SuspenseComponent &&
          shouldCaptureSuspense(workInProgress, hasInvisibleParentBoundary)) {
        // 找到了 Suspense 边界
        const wakeables = workInProgress.updateQueue;
        if (wakeables === null) {
          workInProgress.updateQueue = new Set([wakeable]);
        } else {
          wakeables.add(wakeable);
        }
        // 标记 Suspense 需要重新渲染
        workInProgress.flags |= ShouldCapture;

        // 给 Promise 注册 .then，resolve 时触发重试
        attachPingListener(root, wakeable, rootRenderLanes);
        return;
      }
      workInProgress = workInProgress.return;
    } while (workInProgress !== null);
  }
}
```

**3. `attachPingListener` 注册 ping**

```javascript
function attachPingListener(root, wakeable, lanes) {
  wakeable.then(
    () => pingSuspendedRoot(root, wakeable, lanes),  // resolve 时触发
    () => pingSuspendedRoot(root, wakeable, lanes)   // reject 时也触发（错误边界处理）
  );
}
```

**4. `pingSuspendedRoot` 重新触发渲染**

Promise resolve 后，`pingSuspendedRoot` 调用 `ensureRootIsScheduled`，触发对被挂起子树的重新渲染，这次组件能拿到数据，正常渲染。

`React.lazy` 就是这个机制的典型应用：`lazy(importFn)` 返回的组件在首次渲染时检查模块是否加载，没加载就 throw 一个 import() 返回的 Promise，等加载完成后重新渲染。

**对应学习阶段**：第九阶段

---

### 题目 26：并发模式下，渲染被中断后是从断点继续还是从头重新开始？什么情况下会回退重做？

**难度：★★★★★**

**考察点**

考察候选人对 `shouldYield` 中断恢复和高优先级插队两种场景的精确区分。

**源码级答案**

两种情况，行为不同：

**情况一：时间切片让出（shouldYield）**

`workLoopConcurrent` 因为 `shouldYield() === true` 而退出循环，此时 `workInProgress` 指针仍然保存在闭包中，下次调度时直接从 `workInProgress` 继续，是真正的"断点续传"。wip 树不会被丢弃。

**情况二：高优先级更新插队**

比如用户正在进行一个低优先级的 `TransitionLane` 渲染，中途用户点击了一个按钮产生了 `SyncLane` 的更新：

1. `ensureRootIsScheduled` 发现有更高优先级的更新需要处理
2. 调用 `prepareFreshStack(root, lanes)`，**丢弃当前 wip 树**，从头基于 current 树重新创建 wip 树
3. 先完整执行高优先级的 `SyncLane` 渲染和 commit
4. 再重新调度低优先级的 Transition 渲染

这是 wip 树可以被安全丢弃的原因：render 阶段不产生任何外部副作用（纯内存操作），即使重做，对用户无感知。这也是 React 强调"render 函数应该是纯的"的原因，有副作用的组件函数在并发模式下可能被调用多次。

**关键源码片段**

```javascript
// packages/react-reconciler/src/ReactFiberWorkLoop.js
function renderRootConcurrent(root, lanes) {
  // 如果 lanes 变了（有新的更高优先级更新），重新开始
  if (workInProgressRoot !== root || workInProgressRootRenderLanes !== lanes) {
    prepareFreshStack(root, lanes);  // 丢弃旧 wip 树，从头开始
  }

  outer: do {
    try {
      workLoopConcurrent();
      break outer;
    } catch (thrownValue) {
      handleThrow(root, thrownValue);  // 处理 Suspense throw
    }
  } while (true);
}
```

**对应学习阶段**：第九阶段

---

## 十、事件系统

### 题目 27：React 的事件委托是如何实现的？React 17 为什么把事件绑定位置从 `document` 改到根容器？

**难度：★★★★☆**

**考察点**

考察候选人对 React 事件系统架构的理解，以及 React 17 这个 breaking change 的动机。

**源码级答案**

React 不在每个 DOM 元素上绑定监听器，而是在**根容器**上使用事件委托，统一处理所有事件。

初始化在 `createRoot` 调用时，`listenToAllSupportedEvents(rootContainerElement)` 把所有 React 支持的事件都绑定到根容器：

```javascript
// packages/react-dom-bindings/src/events/ReactDOMEventListener.js
function listenToAllSupportedEvents(rootContainerElement) {
  allNativeEvents.forEach(domEventName => {
    if (!nonDelegatedEvents.has(domEventName)) {
      // 大多数事件：同时监听冒泡和捕获阶段
      listenToNativeEvent(domEventName, false, rootContainerElement);  // 冒泡
      listenToNativeEvent(domEventName, true, rootContainerElement);   // 捕获
    } else {
      // 不能委托的事件（如 scroll、focus）：直接绑定到目标 DOM
      listenToNativeEvent(domEventName, true, rootContainerElement);
    }
  });
}
```

事件触发时，`dispatchEvent` 从事件的目标 DOM 开始，向上遍历 Fiber 树，收集对应的事件处理函数，模拟冒泡和捕获顺序执行，这个过程不依赖真实的 DOM 事件冒泡。

**为什么 React 17 把绑定位置从 `document` 改到根容器**：

React 16 的一个常见问题：当一个页面挂载了多个 React 应用（或者 React 和其他框架混用），它们都把事件监听器绑定到 `document` 上，事件处理之间会相互干扰。比如在一个组件的原生事件监听里调用 `e.stopPropagation()`，会阻止事件冒泡到 `document`，导致 React 的合成事件无法触发。

绑定到根容器后，每个 React 应用只在自己的根容器上监听事件，`stopPropagation` 在同一个 React 应用内部正常工作，不同应用（不同根容器）之间也不会互相干扰。

**关键源码片段**

```javascript
// packages/react-dom-bindings/src/events/ReactDOMEventListener.js
function dispatchEvent(domEventName, eventSystemFlags, targetContainer, nativeEvent) {
  // 找到触发事件的真实 DOM 对应的 Fiber
  const targetInst = getClosestInstanceFromNode(nativeEvent.target);

  // 根据事件类型获取优先级（click → InputContinuousLane，默认 → DefaultLane）
  const eventPriority = getEventPriority(domEventName);

  // 根据优先级选择调度方式
  switch (eventPriority) {
    case DiscreteEventPriority:
      // click、keydown 等离散事件：同步执行
      dispatchDiscreteEvent(domEventName, eventSystemFlags, targetContainer, nativeEvent);
      break;
    case ContinuousEventPriority:
      // mousemove、scroll 等连续事件：通过 InputContinuousLane 调度
      dispatchContinuousEvent(domEventName, eventSystemFlags, targetContainer, nativeEvent);
      break;
    default:
      dispatchEvent(domEventName, eventSystemFlags, targetContainer, nativeEvent);
  }
}
```

**对应学习阶段**：第十阶段

---

### 题目 28：React 合成事件和原生事件在同一个元素上的触发顺序是什么？为什么？

**难度：★★★★☆**

**考察点**

这道题能区分"用过 React 事件"和"理解 React 事件系统实现"的候选人。

**源码级答案**

触发顺序：**原生事件的捕获 → React 捕获阶段合成事件 → 原生事件的冒泡 → React 冒泡阶段合成事件**。

具体来说（假设在 div 上同时绑定了 React onClick 和原生 addEventListener）：

1. 原生事件沿 DOM 树捕获向下，到达目标元素
2. 到达根容器时，React 绑定在根容器的**捕获阶段**监听器触发，React 遍历 Fiber 树收集捕获阶段的事件处理函数并执行（React 的 `onClickCapture`）
3. 原生事件在目标元素的 `addEventListener('click', fn)` 触发（如果在目标元素上直接绑定的）
4. 原生事件冒泡向上
5. 到达根容器时，React 绑定在根容器的**冒泡阶段**监听器触发，React 执行冒泡阶段的处理函数（React 的 `onClick`）

这个顺序说明：React 的冒泡事件（`onClick`）实际上在 DOM 原生冒泡完成后才执行，因为两者都是在根容器上触发的，但 React 的监听器是后绑定的，根据先绑先触发的规则，如果原生监听器也绑在根容器上，顺序取决于绑定时机。

`e.stopPropagation()` 在 React 合成事件中调用，只会阻止 React 自己收集的监听函数的执行，不影响已经发生的原生事件冒泡（因为 DOM 事件在 React 处理前就已经到达了根容器）。

**关键源码片段**

```javascript
// packages/react-dom-bindings/src/events/DOMPluginEventSystem.js
// React 遍历 Fiber 树收集事件处理函数
function traverseTwoPhase(inst, fn, arg) {
  const path = [];
  // 从触发节点向上收集 Fiber 路径
  while (inst !== null) {
    path.push(inst);
    inst = getParent(inst);
  }
  // 捕获阶段：从根向下
  for (let i = path.length; i-- > 0; ) {
    fn(path[i], 'captured', arg);
  }
  // 冒泡阶段：从下向上
  for (let i = 0; i < path.length; i++) {
    fn(path[i], 'bubbled', arg);
  }
}
```

**对应学习阶段**：第十阶段

---

### 题目 29：React 事件系统和 Lane 优先级是如何绑定的？不同类型的事件为什么对应不同的 Lane？

**难度：★★★★☆**

**考察点**

考察候选人是否理解事件系统和调度系统的集成点，这是 React 并发特性的重要组成部分。

**源码级答案**

不同事件类型对应不同的 `EventPriority`，在 `getEventPriority` 中维护一张映射表：

```javascript
// packages/react-dom-bindings/src/events/ReactDOMEventListener.js
function getEventPriority(domEventName) {
  switch (domEventName) {
    // 离散事件（每次点击是独立的）：最高用户交互优先级
    case 'click':
    case 'mousedown':
    case 'touchstart':
    case 'keydown':
    case 'keyup':
      return DiscreteEventPriority;  // → SyncLane

    // 连续事件（持续触发）：稍低优先级
    case 'mousemove':
    case 'mouseenter':
    case 'scroll':
    case 'drag':
      return ContinuousEventPriority;  // → InputContinuousLane

    // 其他：默认优先级
    default:
      return DefaultEventPriority;  // → DefaultLane
  }
}
```

`EventPriority` 到 `Lane` 的映射在 `lanesToEventPriority` 和 `eventPriorityToLane` 中转换。

这个设计的动机：让 React 根据事件来源自动决定渲染优先级。用户点击按钮触发的更新（`DiscreteEventPriority`）比 `setTimeout` 里触发的更新（`DefaultLane`）优先级高，React 会先完成点击响应，再处理后台更新，保证用户交互的流畅。

在 `dispatchEvent` 中，根据事件优先级设置当前渲染的 Lane：

```javascript
// packages/react-dom-bindings/src/events/ReactDOMEventListener.js
function dispatchEventForPluginEventSystem(domEventName, ...) {
  // 把当前事件的优先级转换为 Lane，设置到全局变量
  const eventLane = getEventPriority(domEventName);
  setCurrentUpdatePriority(eventLane);
  // 执行事件处理函数，其中的 setState 会调用 requestUpdateLane()
  // requestUpdateLane 读取 currentUpdatePriority，得到正确的 Lane
  batchedUpdates(dispatchEventForPlugins, ...);
  setCurrentUpdatePriority(NoLane);
}
```

**对应学习阶段**：第十阶段

---

## 附加题

### 题目 30：`React.memo` 和 `useMemo` 在 Fiber 架构中如何实现 bailout（跳过渲染）？

**难度：★★★★☆**

**考察点**

考察候选人对 React 性能优化机制的底层理解，bailout 是 React 渲染优化的核心概念。

**源码级答案**

**React.memo 的 bailout**

`React.memo` 包裹的组件，其 Fiber tag 是 `MemoComponent`（14）。在 `beginWork` 的 `updateMemoComponent` 分支中：

```javascript
function updateMemoComponent(current, workInProgress, Component, nextProps, renderLanes) {
  if (current !== null) {
    const prevProps = current.memoizedProps;
    // 使用 compare 函数（默认是 shallowEqual）比较 props
    if (!includesSomeLane(renderLanes, updateLanes) &&
        compare(prevProps, nextProps) && current.ref === workInProgress.ref) {
      // props 没有变化，直接 bailout
      return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
    }
  }
  // props 变了，正常渲染
  return updateSimpleMemoComponent(current, workInProgress, Component, nextProps, renderLanes);
}
```

`bailoutOnAlreadyFinishedWork` 会检查 `workInProgress.childLanes`，如果子树中没有待处理的更新（`!includesSomeLane(renderLanes, workInProgress.childLanes)`），整棵子树都跳过，直接返回 null，这就是为什么 `React.memo` 能跳过整个子树的重新渲染。

**useMemo 的实现**

`useMemo` 不做 bailout，它只缓存计算结果：

```javascript
function mountMemo(nextCreate, deps) {
  const hook = mountWorkInProgressHook();
  const nextValue = nextCreate();  // 初次执行
  hook.memoizedState = [nextValue, deps];
  return nextValue;
}

function updateMemo(nextCreate, deps) {
  const hook = updateWorkInProgressHook();
  const prevState = hook.memoizedState;
  const prevDeps = prevState[1];
  // areHookInputsEqual 逐一比较 deps 数组（Object.is）
  if (areHookInputsEqual(nextDeps, prevDeps)) {
    return prevState[0];  // deps 未变，返回缓存值，不重新计算
  }
  const nextValue = nextCreate();  // deps 变了，重新计算
  hook.memoizedState = [nextValue, nextDeps];
  return nextValue;
}
```

**对应学习阶段**：第三、第六阶段

---

### 题目 31：`StrictMode` 在开发模式下为什么会把函数组件执行两次？它实际上检测了什么问题？

**难度：★★★☆☆**

**考察点**

考察候选人对 React StrictMode 实现机制的理解，以及它背后的设计哲学。

**源码级答案**

`StrictMode` 在开发模式下（`__DEV__`）把函数组件的 render 函数执行两次，通过 `renderWithHooksAgain` 重新执行一次，然后对比两次的结果。

```javascript
// packages/react-reconciler/src/ReactFiberHooks.js
if (debugRenderPhaseSideEffectsForStrictMode) {
  // 开发环境，StrictMode 下二次执行
  invokeComponentDidMountInDEV(workInProgress, instance);
  // 对函数组件是 renderWithHooksAgain
}
```

执行两次是为了**检测副作用**。React 并发模式下，render 函数可能在任意时机被中断、重做，执行多次。如果 render 函数有副作用（比如修改外部变量、发起请求、写 DOM），重复执行就会出 bug。

StrictMode 在开发阶段提前暴露这个问题：两次执行的 UI 结果应该完全一致，Hook 的调用次数也应该相同。如果你在 render 中写了有副作用的代码，两次执行后状态会不一致，React 会给出警告。

第二次执行时 Hook 状态会被重置（用第一次执行的结果），只有 render 输出（ReactElement）会被使用两次对比。

**对应学习阶段**：第九阶段

---

### 题目 32：`Context` 的更新是如何传播到消费者的？为什么 `Context` 更新会跳过 `React.memo` 的优化？

**难度：★★★★★**

**考察点**

考察候选人对 Context 传播机制的深度理解，这是一个经典的性能问题来源。

**源码级答案**

Context 的传播发生在 `beginWork` 处理 `ContextProvider` 类型的 fiber 时：

```javascript
// packages/react-reconciler/src/ReactFiberBeginWork.js
function updateContextProvider(current, workInProgress, renderLanes) {
  const newValue = workInProgress.pendingProps.value;
  const oldValue = current?.memoizedProps?.value;

  pushProvider(workInProgress, context, newValue);

  // 比较 context value 是否变化（Object.is）
  if (oldValue !== newValue) {
    // context 值变化，向下搜索所有消费者，强制它们更新
    propagateContextChange(workInProgress, context, renderLanes);
  }
  // ...
}
```

**React 19 的 Context 语法变化**

React 19 支持直接把 Context 对象本身作为 Provider 使用：

```jsx
// React 19：直接使用 <ThemeContext value="dark">
const ThemeContext = createContext('light');
function App() {
  return (
    <ThemeContext value="dark">
      <Child />
    </ThemeContext>
  );
}

// 旧写法（<Context.Provider> 在未来版本将被废弃）
<ThemeContext.Provider value="dark">
  <Child />
</ThemeContext.Provider>
```

在 `beginWork` 中，`ContextProvider` 类型的 fiber 现在同时对应 `<Context.Provider>` 和 `<Context>`（两者内部路由到相同的处理逻辑），所以传播机制没有变化，只是语法层面简化了。

`propagateContextChange` 遍历整个 Provider 子树的 Fiber，找到所有消费了这个 context 的 Fiber（通过检查 `fiber.dependencies` 链表），给它们的 `lanes` 加上当前 `renderLanes`：

```javascript
function propagateContextChange_eager(workInProgress, context, renderLanes) {
  let fiber = workInProgress.child;
  while (fiber !== null) {
    let nextFiber;
    let list = fiber.dependencies;
    if (list !== null) {
      // 检查 fiber 是否消费了这个 context
      let dependency = list.firstContext;
      while (dependency !== null) {
        if (dependency.context === context) {
          // 是消费者，强制标记更新
          fiber.lanes = mergeLanes(fiber.lanes, renderLanes);
          const alternate = fiber.alternate;
          if (alternate !== null) {
            alternate.lanes = mergeLanes(alternate.lanes, renderLanes);
          }
          // 向上标记祖先节点的 childLanes
          scheduleContextWorkOnParentPath(fiber.return, renderLanes, workInProgress);
          break;
        }
        dependency = dependency.next;
      }
    }
    // ...继续遍历子树
  }
}
```

**为什么跳过 React.memo**：

`React.memo` 的 bailout 依据是"props 没有变化"，但对于 Context 消费者，即使 props 没变，Context 值变了也需要重新渲染。React 在 `bailoutOnAlreadyFinishedWork` 中会额外检查 `fiber.lanes`，如果包含当前 `renderLanes`（被 `propagateContextChange` 标记过），就不会 bailout，而是继续向下处理。

这就是为什么 Context 更新能"穿透" `React.memo`，也是 Context 频繁更新导致性能问题的根本原因。

**对应学习阶段**：第九阶段（进阶）

---

### 题目 33：React 19 中 `ref` 可以直接作为 prop 传给函数组件，`forwardRef` 的命运是什么？底层发生了什么？

**难度：★★★☆☆**

**考察点**

React 19 对 ref 的处理是一个显眼的破坏性变化（在使用体验层面），考察候选人能否说清楚这个变化的底层原因和迁移路径。

**源码级答案**

**背景：旧版 ref 为什么需要 `forwardRef`**

在 React 18 及之前，`ref` 是 ReactElement 的顶层字段，不在 `props` 里。函数组件接收的参数只有 `props`，无法直接拿到 `ref`。`forwardRef` 的作用是把 `ref` 从顶层字段"转发"进来，作为组件函数的第二个参数：

```javascript
// React 18 及之前
const Input = forwardRef((props, ref) => {
  return <input ref={ref} {...props} />;
});
```

**React 19 的变化**

React 19 把 `ref` 移入了 `props`（即 `props.ref`），函数组件可以直接从 props 中解构 `ref`：

```javascript
// React 19：不需要 forwardRef
function Input({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}

// 调用方不变
<Input ref={myRef} value="hello" />
```

底层机制：JSX 编译器把 `<Input ref={myRef} />` 编译成 `jsx(Input, { ref: myRef, ... })`，`ref` 就是普通 prop，函数组件可以直接读取。Fiber 层面，`fiber.ref` 的值从 `props.ref` 中取出，ref 的挂载/卸载逻辑（`attachRef`/`safelyDetachRef`）不变。

**`forwardRef` 的命运**

React 19 中 `forwardRef` 仍然可用，但已被标记为将在未来版本中废弃。迁移路径是直接从 props 读取 `ref`，移除 `forwardRef` 包装。对于同时兼容 React 18 和 React 19 的库，需要在两种写法之间做条件处理或等待 React 19 成为最低支持版本。

**ref 回调的 cleanup 支持**

React 19 还扩展了 ref 回调的能力：ref 函数现在可以返回一个 cleanup 函数，组件卸载时 React 会调用 cleanup 而不是用 `null` 重新调用 ref：

```javascript
function Component() {
  return (
    <input
      ref={(node) => {
        // 挂载时：node 是 DOM 元素
        node.focus();
        // 返回 cleanup 函数
        return () => {
          node.blur();  // 卸载时调用，而不是 ref(null)
        };
      }}
    />
  );
}
```

**对应学习阶段**：第四阶段（进阶）

---

### 题目 34：React 19 新增的 `use()` API 和现有的 Hooks 有什么本质区别？它是如何在 render 中读取 Promise 的？

**难度：★★★★★**

**考察点**

`use()` 是 React 19 最重要的新 API，考察候选人能否解释它和 Suspense 的关系，以及它"可条件调用"这个特性的底层实现原理。

**源码级答案**

**`use()` 的能力**

`use()` 接受两种参数：Promise 和 Context。

```javascript
// 读取 Promise（配合 Suspense）
function UserProfile({ userPromise }) {
  const user = use(userPromise);  // suspend 直到 promise resolve
  return <div>{user.name}</div>;
}

// 读取 Context（可以在条件分支后调用，这是 useContext 做不到的）
function Component({ show }) {
  if (!show) return null;  // early return 后...
  const theme = use(ThemeContext);  // 仍然可以在这里调用 use
  return <div style={{ color: theme.color }} />;
}
```

**和普通 Hooks 的本质区别**

普通 Hooks（useState、useEffect 等）依赖 Hook 链表的顺序，必须在每次渲染中以完全相同的顺序调用，不能放在条件分支里。

`use()` 不在 Hook 链表上存状态，也不走 `ReactCurrentDispatcher` 的分发机制。它在 render 时被直接处理：

- 如果参数是 Promise，React 在内部检查这个 Promise 是否已经 resolve。已 resolve 则同步返回值；未 resolve 则抛出这个 Promise（和 Suspense 的 throw 机制相同），React 会找到最近的 `<Suspense>` 边界展示 fallback。
- 如果参数是 Context，它走 Context 读取路径，效果等同于 `useContext`，但不受 Hook 顺序规则限制。

**源码位置**

`packages/react/src/ReactHooks.js` 中导出了 `use`，但它的实现不在 Dispatcher 里，而是在 reconciler 的渲染循环中通过 `readContext` 和 Promise thenable 检查来处理：

```javascript
// packages/react/src/ReactHooks.js（简化）
export function use(usable) {
  // 不调用 resolveDispatcher()，直接交给 reconciler runtime 处理
  return ReactCurrentOwner.current.use(usable);
}
```

reconciler 在执行组件函数时，遇到 `use(promise)` 且 promise 未完成，会 throw 这个 promise，触发 Suspense 的 `throwException` 流程（参见题目 25 的 `attachPingListener` 机制）。Promise resolve 后，`pingSuspendedRoot` 重新触发该组件的渲染，这次 `use(promise)` 能拿到 resolve 的值，正常返回。

**为什么 `use()` 可以条件调用**

因为它不在 Hook 链表上存状态。普通 Hook 的状态靠链表位置来识别"是哪个 useState"，而 `use()` 的"状态"就是 Promise 本身（Promise 对象的 resolve 值由 React runtime 缓存），不依赖调用顺序。

**对应学习阶段**：第九阶段（进阶）

---

## 面试回答策略

### 如何组织一个源码级回答

**黄金结构**：问题背景 → 源码定位 → 核心数据结构 → 执行流程 → 设计动机 → 延伸

以"useState 为什么不能写在条件语句里"为例：

1. **问题背景**（10 秒）：简述问题表象，让面试官知道你理解了题意
   > "这涉及 Hook 链表的工作方式，本质是顺序依赖的问题。"

2. **源码定位**（5 秒）：说出具体文件
   > "实现在 `packages/react-reconciler/src/ReactFiberHooks.js` 的 `mountWorkInProgressHook` 和 `updateWorkInProgressHook`。"

3. **核心数据结构**（30 秒）：解释相关数据结构
   > "每个函数组件的 Fiber 节点上，`memoizedState` 存的是 Hook 对象的单向链表，每次调用一个 Hook 就追加一个节点。mount 时建链，update 时按顺序读取。"

4. **执行流程**（60 秒）：说清楚具体发生了什么
   > "update 阶段 `updateWorkInProgressHook` 从 `currentHook`（current fiber 的 Hook 链表）按顺序取节点，用 `nextCurrentHook = currentHook.next` 移动指针。这个对应关系完全依赖调用顺序，如果某次渲染跳过了一个 Hook，链表指针就错位，后续所有 Hook 拿到的都是错误的状态。"

5. **设计动机**（20 秒）：说出为什么这样设计
   > "这不是设计缺陷，是有意的简化方案。用链表而不是 Map（按名字存储），是为了省掉 key 的开销，React 每次渲染都要处理大量 Hook，链表的 O(1) 顺序访问比 Map 更高效。"

6. **延伸**（可选）：主动展示更深的理解
   > "这也是 `ReactCurrentDispatcher.current` 这个设计的意义，函数组件执行前切换 dispatcher，执行后恢复，保证 Hook 只在组件渲染上下文中有效。"

---

### 常见陷阱与加分点

**不要只背结论**

面试官问"Fiber 是什么"时，不要只说"Fiber 是一种数据结构，让 React 渲染可以中断"。这是结论，不是理解。加分的回答会说："Fiber 把递归的调用栈改成了显式的链表，`return`/`child`/`sibling` 三个指针组成了一个链化的树，任何时候保存 `workInProgress` 指针就能恢复状态，这就是可中断的实现方式。"

**主动说简化点**

如果在 p-react 中实现过某个模块，可以说："p-react 里简化了 lanes，只做同步模式，所以 `FiberNode` 没有 `lanes` 和 `childLanes` 字段。完整的 React 源码里 Lane 是位掩码，`getHighestPriorityLane` 用 `lanes & -lanes` 的补码技巧取最低位……"这会让面试官知道你不只是背知识点，而是真正实现过。

**用具体例子推导**

Diff 算法这类题，直接推导一个具体例子（`[A,B,C,D]` 更新为 `[D,A,B,C]`）比抽象描述更有说服力，也更难被追问到卡壳。

**说出设计演进**

提到某个设计时，如果知道它的演进历史（比如 ExpirationTime 到 Lane 的切换，事件委托从 document 到根容器的切换），主动带出来，说明候选人不只是看了代码，还理解了背后的权衡。

**诚实面对不确定的细节**

遇到不确定的细节，不要编造，可以说"我记得大概是这个逻辑，但具体实现细节我需要确认一下"。面试官通常更欣赏诚实，而不是被追问三遍之后才承认不确定。

---

### 按阶段推荐练习顺序

不同面试场景侧重不同：

**高级前端岗（3-5 年）**：重点准备第一到第六模块，确保 Fiber 结构、渲染流程、Diff 算法、Hooks 实现都能流畅回答，Lane 和并发模式能说清楚基本概念即可。

**资深/专家岗（5 年以上）**：全部模块都要准备，重点是并发模式（useTransition、Suspense）和性能优化（bailout、subtreeFlags、Context 传播）。面试官会追问细节，要能精确到函数名和数据结构字段。

**架构岗**：除了技术深度，还要能说清楚设计演进（为什么从 Stack Reconciler 到 Fiber，为什么从 ExpirationTime 到 Lane），以及不同设计方案的权衡。

---

*文档对应 React 19.2.1 源码，基于 `packages/` 目录的实现。部分并发模式细节在不同 minor 版本间有变化，以实际源码为准。*
