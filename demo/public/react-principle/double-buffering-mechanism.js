// ── 渲染器: 双缓冲机制 ───────────────────────────────────────────────────────────
(function (global) {
  const { renderArticle } = global.PrincipleUtils;

  const blocks = [
    { kind: 'rule', ruleType: 'accent',
      text: '<strong>总结</strong>：双缓冲是 React 在内存中同时维护 <strong>current 树（屏幕上的）</strong>和 <strong>wip 树（正在构建的）</strong>，以 <code>alternate</code> 指针互指，commit 完成后<strong>原子切换</strong>根节点的 <code>current</code> 引用，避免渲染到一半被用户看到脏数据。' },

    { kind: 'text', title: '双缓冲是什么：内存里的两棵 Fiber 树',
      body: '双缓冲是图形渲染里的经典技法：屏幕对应 <strong>前缓冲</strong>，GPU 写到 <strong>后缓冲</strong>，画完一帧才一次性把后缓冲换到前缓冲。React 沿用了这个思想：reconciler 内部始终有两棵 Fiber 树，<code>root.current</code> 指向屏幕上正在显示的那棵（current tree），<code>workInProgress</code> 指向正在构建的那棵（wip tree）。两棵树的节点通过 <code>fiber.alternate</code> 互指。当 wip 树构建完成并 commit 后，<code>root.current = finishedWork</code>，原先的 current 树变成下一轮的 wip 树，<strong>角色互换</strong>。' },

    { kind: 'text', title: '为什么需要双缓冲？三个核心原因',
      body: '① <strong>避免脏数据展示</strong>：如果直接修改 current 树对应的真实 DOM，每改一个 fiber 就会触发一次浏览器 layout/paint，用户能看到"由旧到新逐渐变化"的中间态；② <strong>支持可中断</strong>：wip 树是独立的工作区，构建过程中 current 树保持不变，Scheduler 可以随时把 wip 丢掉或回退，屏幕始终稳定；③ <strong>复用节点减少 GC</strong>：reconcile 时直接从 <code>current.alternate</code> 拿到旧 fiber，<code>useFiber</code> clone 一份复用 props/state/hook 链表，不必每次重建。' },

    { kind: 'code', label: 'p-react 简化实现 · packages/react-reconciler/src/ReactFiberRoot.ts', dot: 'blue', lang: 'typescript',
      code: `// FiberRootNode 持有一对 Fiber 树：current 树 + wip 树
export class FiberRootNode {
  containerInfo: any;       // 挂载的真实 DOM 容器
  current: FiberNode;       // 屏幕上的树
  finishedWork: FiberNode;  // 本轮构建完成的 wip 树
  pendingLanes: Lanes;      // 待处理 Lane
  callbackNode: any;
}

export function createWorkInProgress(current: FiberNode, pendingProps: Props): FiberNode {
  let wip = current.alternate;
  if (wip === null) {
    // 首次 mount：新建 wip 节点
    wip = createFiber(current.tag, pendingProps, current.key, current.mode);
    wip.stateNode = current.stateNode;
    wip.alternate = current;          // 互相绑定 alternate
    current.alternate = wip;
  } else {
    // update：复用旧 wip 节点（角色即将互换），重置属性
    wip.pendingProps = pendingProps;
    wip.flags = NoFlags;
    wip.subtreeFlags = NoFlags;
    wip.deletions = null;
  }
  // 继承需要保留的状态
  wip.child = current.child;
  wip.memoizedProps = current.memoizedProps;
  wip.memoizedState = current.memoizedState;
  wip.updateQueue = current.updateQueue;
  return wip;
}

// commit 末尾完成切换
function commitRootImpl(root: FiberRootNode) {
  const finishedWork = root.finishedWork;
  // ... 五步副作用 ...
  root.current = finishedWork;          // 关键：原子切换
  root.finishedWork = null;
}` },

    { kind: 'rule', ruleType: 'info',
      text: '<strong>alternate 不是缓存，是关系指针</strong>：不要把 <code>alternate</code> 理解为"备份"或"快照"，它只是<strong>另一棵树中与之对应的节点</strong>。同样一个 React 节点，在 wip 树里和 current 树里都各有一个 fiber 实例，两者通过 alternate 互指。React 用 <code>createWorkInProgress</code> 保证这两份实例交替复用：每轮 update 都会让上一轮的 wip 变成下一轮的 current，上一轮的 current 变成下一轮的 wip。' },

    { kind: 'text', title: '切换是原子的：为什么用户看不到撕裂',
      body: '双缓冲的"原子性"并不是靠 JS 锁，而是靠 <strong>commit 阶段一气呵成</strong>：reconcile 阶段在 wip 树上算变更，<strong>屏幕对应的是 current 树，DOM 完全没动</strong>；commit 阶段一次性把 wip 树上的所有 mutation 写到真实 DOM，<strong>中间没有任何 DOM 状态会被 paint</strong>。所以用户在 commit 完之前看到的是"上一帧的完整画面"，commit 完成后瞬间看到"这一帧的完整画面"，<strong>永远不会出现"删了一半 + 插了一半"</strong>的中间态。' },

    { kind: 'text', title: 'alternate 的复用机制：节点的轮回',
      body: '在 update 时，<code>createWorkInProgress</code> 不是重新 <code>new FiberNode()</code>，而是直接<strong>复用</strong> <code>current.alternate</code> 指向的那份旧 wip 节点（若没有再新建）。这样 updateQueue、memoizedState、child/sibling 指针都能继承下来，<strong>Hooks 链表也不用重建</strong> —— 上一轮 update 时把 hooks 跑过的链表留在了 wip.alternate（也就是这一轮的 current）里，这轮 update 时直接 useFiber 拿出来继续 push 即可。这就是 React 18 中所谓"<strong>复用 state</strong>"的物理基础：state 不存 local 变量里，而是存在 hook 节点的 <code>memoizedState</code> 上，alternate 复用 = state 自动延续。' },

    { kind: 'code', label: 'alternate 复用 Hook 状态 · packages/react-reconciler/src/beginWork.ts', dot: 'yellow', lang: 'typescript',
      code: `// update 时 clone 旧 fiber，复用 alternate 链上的 hooks
function useFiber(old: FiberNode, pendingProps: Props): FiberNode {
  const clone = createWorkInProgress(old, pendingProps);
  clone.index = 0;
  clone.sibling = null;             // sibling 要重新串
  clone.return = workInProgress;
  return clone;
}

// update 时 workInProgress.memoizedState 就是旧 hook 链表
function updateFunctionComponent(current, workInProgress) {
  const Component = workInProgress.type;
  // renderWithHooks 内部：current.memoizedState 是上轮 hook 链表
  // 每个 useState 都会顺着 current.memoizedState 拿到 hook 对象，clone 后 append 到 wip
  const nextChildren = renderWithHooks(
    current, workInProgress, Component, workInProgress.pendingProps
  );
  reconcileChildren(current, workInProgress, nextChildren);
  return workInProgress.child;
}` },

    { kind: 'text', title: 'current 切换副作用：为什么 ref / useEffect 在 commit 后还能读到新值',
      body: '在 commit 阶段还没执行 <code>root.current = finishedWork</code> 时，所有 reconciler 内部的 <code>current</code> 引用都还是<strong>上一轮</strong>的。所以 commit 的 5 个步骤（insertion / mutation / layout / ref / passive）里，前 3 步读的 current 还是旧的；<strong>只有当 root.current 被翻转后，后续 effect 派发才基于新树</strong>。这意味着 useLayoutEffect / useEffect 闭包内捕获的 props/state 一定来自刚 commit 的树，<strong>不依赖根 current 的切换时机</strong> —— 因为 effect 回调执行时，组件对应的 fiber 节点已经被 commit 链上挂到的 DOM 引用替换完毕。' },

    { kind: 'rule', ruleType: 'warning',
      text: '<strong>双缓冲 ≠ 撤销/回滚</strong>：双缓冲解决的是"<strong>渲染期间不污染屏幕</strong>"，不是"<strong>出错时回滚</strong>"。React 的错误边界（Error Boundary）捕获的是<strong>render 抛出的错误</strong>，不会还原 DOM 到上一帧。concurrent 模式下被中断的 wip 树会<strong>整个被丢弃</strong>，下一轮从 current 重新 clone wip 重新构建 —— 也就是说"<strong>中断是丢弃</strong>"，不是"<strong>暂停保留</strong>"，这两个概念不要混淆。' },

    { kind: 'rule', ruleType: 'success',
      text: '<strong>一句话总结</strong>：双缓冲 = <code>current 树</code>(屏幕上) + <code>wip 树</code>(构建中) + <code>alternate</code> 互指 + commit 末尾 <code>root.current = finishedWork</code> 原子切换。它的三大价值是：① 避免渲染期间脏数据展示；② 支持可中断/可重入；③ 复用节点减少 GC 与 hook 重建。' },
  ];

  global.renderDoubleBufferingMechanism = function (p) {
    return renderArticle(Object.assign({}, p, { blocks }));
  };
})(window);