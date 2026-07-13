// ── 渲染器: 什么是 Fiber 架构 ───────────────────────────────────────────────
(function (global) {
  const { renderArticle } = global.PrincipleUtils;

  const blocks = [
    { kind: 'rule', ruleType: 'accent',
      text: '<strong>总结</strong>：Fiber 架构是 React 为实现<strong>可中断、可恢复的并发渲染</strong>，将渲染任务拆分为一个个 Fiber 最小工作单元，通过单链表串联、Lane 优先级调度，分 <code>beginWork</code> 向下构建调和、<code>completeWork</code> 向上收集副作用，最后统一 <code>commit</code> 操作 DOM 的<strong>异步分时渲染模型</strong>。' },

    { kind: 'text', title: '一句话结论',
      body: '<strong>Fiber 既是数据结构，也是执行模型。</strong>作为数据结构，它是一个带链式指针的节点对象；作为执行模型，它把"渲染整棵树"这件大任务切成"处理一个 fiber"这样的小任务，每个小任务完成后都能交还主线程 —— 这是 React 16 之后所有并发特性的物理基础。' },

    { kind: 'text', title: '为什么需要 Fiber：旧 reconciler 的痛点',
      body: 'React 15 的 Stack Reconciler 用<strong>递归调用栈</strong>遍历组件树，一旦开始就无法暂停：遇到一棵上万节点的树，主线程会被同步占用几十甚至上百毫秒，期间动画卡顿、输入无响应。<strong>递归栈的本质问题是"工作进度"全部藏在 JS 调用栈里，无法保存和恢复</strong>。Fiber 的解决思路就是把递归改成<strong>迭代 + 显式栈</strong>：每个节点处理完都把进度存到 fiber 节点本身（child/sibling/return 指针），随时可以中断、随时可以从指针处恢复。' },

    { kind: 'text', title: 'Fiber 节点的结构：链式而非树形',
      body: '传统树形结构靠"父节点持有 children 数组"组织，遍历要靠数组下标。Fiber 改成<strong>三条链式指针</strong>：<code>child</code>（第一个子节点）、<code>sibling</code>（下一个兄弟节点）、<code>return</code>（父节点）。这样任意一个 fiber 节点都能 O(1) 找到下一个要处理的节点，不需要数组、不需要回溯、不需要保留调用栈 —— 这就是"可暂停可恢复"的物理基础。' },

    { kind: 'code', label: 'p-react 简化实现 · packages/react-reconciler/src/fiber.ts', dot: 'blue', lang: 'typescript',
      code: `export class FiberNode {
  tag: WorkTag;              // 节点类型：HostRoot / FunctionComponent / HostComponent / HostText...
  key: Key;                  // diff 时识别同级节点
  type: any;                 // 'div' | 函数组件 | 类组件 | 特殊对象
  stateNode: any;            // 真实 DOM / FiberRootNode / 类实例

  // ---- Fiber 树结构（链式指针） ----
  return: FiberNode | null;  // 父 fiber
  child:   FiberNode | null; // 第一个子 fiber
  sibling: FiberNode | null; // 下一个兄弟 fiber
  index:   number;           // 在兄弟中的索引，用于 diff

  // ---- 数据 ----
  pendingProps: Props;       // 本次待处理的新 props
  memoizedProps: Props | null;  // 上次已生效的 props
  memoizedState: any;        // FC: hooks 链表头；HostRoot: ReactElement 子树
  updateQueue: any;          // effect 环形链表 / 状态更新队列

  // ---- 副作用 ----
  flags: Flags;              // Placement / Update / Deletion
  subtreeFlags: Flags;       // 子树副作用聚合
  deletions: FiberNode[] | null;  // 待删除子节点

  // ---- 优先级 ----
  lanes: Lane;               // 自身待处理 Lane
  childLanes: Lanes;         // 子树待处理 Lane 聚合

  // ---- 双缓冲 ----
  alternate: FiberNode | null;  // 指向另一棵树中对应节点
}` },

    { kind: 'text', title: '工作单元（UnitOfWork）：beginWork 递 + completeWork 归',
      body: '遍历以 <code>performUnitOfWork</code> 为基本单元，行为是"<strong>递</strong> + <strong>归</strong>"的分叉点：<strong>递</strong>阶段调用 <code>beginWork</code>，根据 type 进入不同分支（函数组件调用 render、原生组件收集 props），产出第一个子 fiber；<strong>归</strong>阶段在没有子节点时调用 <code>completeUnitOfWork</code> → <code>completeWork</code>，自底向上收集副作用（flags 冒泡到父节点）。整棵树遍历完毕后进入 commit 阶段把副作用真正写到 DOM。' },

    { kind: 'code', label: 'performUnitOfWork 简化 · workLoop.ts', dot: 'yellow', lang: 'typescript',
      code: `function performUnitOfWork(unitOfWork: FiberNode) {
  const current = unitOfWork.alternate;   // 双缓存：取对应 current 节点
  const next = beginWork(current, unitOfWork);  // "递"：处理当前 → 返回第一个子节点

  unitOfWork.memoizedProps = unitOfWork.pendingProps;
  if (next) {                             // 有子节点 → 继续向下
    workInProgress = next;
  } else {                                // 无子节点 → 开始"归"
    completeUnitOfWork(unitOfWork);
  }
}

function workLoopSync() {
  while (workInProgress !== null) {       // 不停消耗 wip 指针
    performUnitOfWork(workInProgress);
  }
  // workInProgress === null → 整棵树遍历完成，进入 commit
}` },

    { kind: 'rule', ruleType: 'accent',
      text: '<strong>可中断的关键：workLoopSync vs workLoopConcurrent</strong>：差异只有一行 —— 并发模式下循环内多一个 <code>shouldYield()</code> 判断。当 Scheduler 发现时间片耗尽（默认 5ms），<code>shouldYield()</code> 返回 true，循环退出但<strong>不丢进度</strong>：workInProgress 指针停在当前 fiber，下次回来从这个节点继续。<br><br><code>workLoopSync</code>：while(wip !== null) performUnitOfWork(wip)；<br><code>workLoopConcurrent</code>：while(wip !== null && !shouldYield()) performUnitOfWork(wip)。' },

    { kind: 'text', title: 'Fiber 三阶段：reconcile → complete → commit',
      body: '一次完整的更新被分成三个阶段：<strong>① reconcile（render 阶段）</strong>从根 fiber 开始遍历 wip 树，beginWork 比对新旧 props 计算变更，completeWork 创建/更新真实 DOM 引用 —— 这一阶段可被打断、可重入，<strong>不产生用户可见副作用</strong>；<strong>② commit 阶段</strong>按 flags 分三步 mutation / layout / passive 把副作用同步写到 DOM，<strong>不可打断</strong>；<strong>③ 后续</strong>由 Scheduler 调度 passive effect。把"算变更"和"写 DOM"拆开，是 Fiber 可中断的前提 —— 因为写 DOM 是不可逆的，必须一气呵成。' },

    { kind: 'rule', ruleType: 'info',
      text: '<strong>Fiber ≠ VDom</strong>：Virtual DOM 是 React 早期对"声明式 UI 描述"的抽象，本质是 ReactElement 树；Fiber 是 React 16 之后 reconciler 的内部数据结构，承载的是<strong>渲染进度与副作用</strong>。关系是：JSX → ReactElement 树 → reconciler 遍历时为每个 ReactElement 创建/复用对应 Fiber 节点 → 最终 commit 阶段把 fiber.stateNode（真实 DOM）写到屏幕上。一棵 Fiber 树的生命周期里可能挂过多棵 ReactElement 树（每次更新都重新生成 element）。' },

    { kind: 'text', title: 'beginWork 做了什么：递阶段的入口',
      body: '<strong>beginWork 是"递"阶段的核心，输入一对 current/wip fiber，输出第一个子 fiber。</strong>它按 <code>workInProgress.tag</code> 分发到不同处理函数：HostRoot 取 <code>memoizedState</code> 作为子节点；HostComponent 取 <code>pendingProps.children</code>；FunctionComponent 调用 <code>renderWithHooks</code> 执行组件函数、激活 hooks、拿到返回的 ReactElement；ContextProvider 把 <code>props.value</code> 写入 <code>context._currentValue</code>。所有分支最终都汇入 <code>reconcileChildren</code> 做 diff，产出 <code>workInProgress.child</code>。' },

    { kind: 'code', label: 'beginWork 分发结构 · packages/react-reconciler/src/beginWork.ts', dot: 'blue', lang: 'typescript',
      code: `export function beginWork(
  current: FiberNode | null,    // 双缓存：旧 fiber（mount 时为 null）
  workInProgress: FiberNode     // 正在构建的新 fiber
): FiberNode | null {
  switch (workInProgress.tag) {
    case HostRoot:        return updateHostRoot(current, workInProgress);
    case HostComponent:   return updateHostComponent(current, workInProgress);
    case FunctionComponent: return updateFunctionComponent(current, workInProgress);
    case ContextProvider: return updateContextProvider(current, workInProgress);
    case HostText:        return null;   // 文本节点无子节点
    default:              return null;
  }
}

// 函数组件：执行组件函数（renderWithHooks 会切换 dispatcher、跑 hooks）
function updateFunctionComponent(current, workInProgress) {
  const Component = workInProgress.type;
  const nextChildren = renderWithHooks(
    current, workInProgress, Component, workInProgress.pendingProps
  );
  reconcileChildren(current, workInProgress, nextChildren);
  return workInProgress.child;
}` },

    { kind: 'text', title: 'beginWork 内部的 diff：mount vs update 两条路',
      body: '<code>reconcileChildren</code> 根据 current 是否存在分两条路：<strong>mount</strong>（current === null）走 <code>mountChildFibers</code>，<strong>不打 Placement flag</strong> —— 因为首次挂载的 DOM 由 completeWork 的 <code>appendAllChildren</code> 一次性组装，commit 阶段只需把整棵子树挂到容器；<strong>update</strong>（current 存在）走 <code>reconcileChildFibers</code>，按新 element 在旧 fiber 链上做 diff，匹配则复用（<code>useFiber</code> clone 一份打 Update），不匹配则新建 fiber 打 Placement，被淘汰的旧 fiber 挂到 <code>returnFiber.deletions</code> 并打 ChildDeletion。' },

    { kind: 'code', label: 'diff 分发与单节点匹配 · beginWork.ts', dot: 'yellow', lang: 'typescript',
      code: `function reconcileChildren(current, workInProgress, children) {
  if (current === null) {
    // mount：不追踪副作用（不打 Placement），DOM 组装交给 completeWork
    workInProgress.child = mountChildFibers(workInProgress, null, children);
  } else {
    // update：diff 新旧子节点，打 Placement / Update / ChildDeletion
    workInProgress.child = reconcileChildFibers(workInProgress, current.child, children);
  }
}

// 单 ReactElement 的 diff：先按 key 定位，再看 type 决定复用还是重建
function reconcileSingleElement(returnFiber, currentFirstChild, element, shouldTrackEffects) {
  const key = element.key;
  let child = currentFirstChild;
  while (child !== null) {
    if (child.key === key) {
      if (child.type === element.type) {
        // key + type 都匹配 → 复用旧 fiber，删掉多余兄弟
        deleteRemainingChildren(returnFiber, child.sibling);
        const existing = useFiber(child, element.props);  // clone
        if (shouldTrackEffects) existing.flags |= Update;
        return existing;
      }
      // key 匹配但 type 不同 → 删旧重建
      deleteRemainingChildren(returnFiber, child);
      break;
    } else {
      deleteChild(returnFiber, child);   // key 不匹配 → 删除并继续找兄弟
    }
    child = child.sibling;
  }
  const fiber = createFiberFromElement(element);  // 全新创建
  fiber.return = returnFiber;
  return fiber;
}` },

    { kind: 'text', title: 'completeWork 做了什么：归阶段的入口',
      body: '<strong>completeWork 是"归"阶段的核心，自底向上执行，负责创建 DOM 实例并把子树 flags 冒泡到父节点。</strong>mount 时调用 hostConfig 的 <code>createInstance</code> / <code>createTextInstance</code> 创建真实 DOM，用 <code>appendAllChildren</code> 把所有宿主子孙 DOM 一次性挂到当前节点的 <code>stateNode</code> 上（穿透 FunctionComponent 等无 DOM 节点）；update 时复用旧 <code>stateNode</code>，对比 <code>oldProps !== newProps</code> 就打 Update flag，真正改 DOM 的动作推迟到 commit 阶段。最后必做 <code>bubbleProperties</code>：把所有子节点的 flags + subtreeFlags 合并到当前节点的 <code>subtreeFlags</code>，让 commit 阶段只需看父节点就能判断子树是否有副作用。' },

    { kind: 'code', label: 'completeWork 分发与冒泡 · packages/react-reconciler/src/completeWork.ts', dot: 'green', lang: 'typescript',
      code: `function completeWork(workInProgress: FiberNode): void {
  const newProps = workInProgress.pendingProps;
  const current = workInProgress.alternate;

  switch (workInProgress.tag) {
    case HostComponent: {
      if (current !== null && workInProgress.stateNode != null) {
        // update：复用 DOM，props 有变化打 Update flag
        workInProgress.stateNode = current.stateNode;
        if (current.memoizedProps !== newProps) {
          workInProgress.flags |= Update;
        }
      } else {
        // mount：创建 DOM，把宿主子孙 DOM 挂进来
        const instance = createInstance(workInProgress.type, newProps);
        appendAllChildren(instance, workInProgress);
        workInProgress.stateNode = instance;
      }
      break;
    }
    case HostText: {
      // mount：createTextInstance；update：内容变了打 Update
      // ...
    }
    case HostRoot:
    case FunctionComponent:
      break;   // 这些节点没有自身 DOM，仅做冒泡
  }

  // 关键：把所有子节点的副作用冒泡到当前节点
  bubbleProperties(workInProgress);
}

// 遍历子节点，合并 flags + subtreeFlags 到当前 fiber.subtreeFlags
function bubbleProperties(fiber: FiberNode) {
  let subtreeFlags = NoFlags;
  let child = fiber.child;
  while (child !== null) {
    subtreeFlags |= child.subtreeFlags;
    subtreeFlags |= child.flags;
    child.return = fiber;       // 顺手修正 return 指针
    child = child.sibling;
  }
  fiber.subtreeFlags |= subtreeFlags;
}` },

    { kind: 'rule', ruleType: 'accent',
      text: '<strong>mount 为什么不打 Placement？</strong>首次挂载时，completeWork 通过 <code>appendAllChildren</code> 已经把整棵子树的 DOM 在内存里组装完毕，commit 阶段只需把<strong>根</strong>挂到容器一次即可。如果每个子节点都打 Placement 再到 commit 里逐个 appendChild，会产生大量无意义的 DOM 操作。这就是 <code>mountChildFibers</code> 与 <code>reconcileChildFibers</code> 唯一的差别：<code>shouldTrackEffects</code> 标志。' },

    { kind: 'text', title: 'commitRoot 做了什么：把副作用真正写到屏幕',
      body: '<strong>commitRoot 是把 wip 树上累计的 flags 一次性同步写到 DOM 的入口，不可中断。</strong>它按固定顺序执行五个步骤：① <code>commitInsertionEffects</code> 同步执行 <code>useInsertionEffect</code>（CSS-in-JS 注入样式，DOM mutation 前）；② <code>commitMutationEffects</code> 深度优先遍历 fiber 树，按 <code>ChildDeletion → Placement → Update</code> 顺序真正写 DOM（删除、插入、更新）；③ <code>commitLayoutEffects</code> 同步执行 <code>useLayoutEffect</code>（DOM 已变更、paint 前）；④ <code>commitAttachRefs</code> 把 <code>stateNode</code> 赋给 <code>ref.current</code>；⑤ <code>schedulePassiveEffects</code> 异步调度 <code>useEffect</code>。五步走完后，workLoop 才执行 <code>root.current = finishedWork</code> 完成双缓冲切换。' },

    { kind: 'code', label: 'commitRoot 五步顺序 · packages/react-reconciler/src/commitWork.ts', dot: 'blue', lang: 'typescript',
      code: `function commitRoot(finishedWork: FiberNode, container: any) {
  // 1. insertion effects：mutation 前，DOM 未改、refs 未赋值
  commitInsertionEffects(finishedWork);
  // 2. mutation：真正写 DOM（删除/插入/更新）
  commitMutationEffects(finishedWork, container);
  // 3. layout effects：DOM 已变更、paint 前，同步执行 useLayoutEffect
  commitLayoutEffects(finishedWork);
  // 4. ref 绑定：DOM 已是最终状态，ref.current = stateNode
  commitAttachRefs(finishedWork);
  // 5. passive effects：异步调度 useEffect（不阻塞 paint）
  schedulePassiveEffects(finishedWork);
}

// mutation 内部按 flags 顺序处理
function commitMutationEffects(fiber, container) {
  // 先删：处理 deletions 数组
  if (fiber.deletions !== null) {
    for (const child of fiber.deletions) commitDeletion(child, container);
    fiber.deletions = null;
  }
  // 再递归子树
  if (fiber.child)   commitMutationEffects(fiber.child, container);
  if (fiber.sibling) commitMutationEffects(fiber.sibling, container);
  // 最后处理当前节点
  if (fiber.flags & Placement) { commitPlacement(fiber, container); fiber.flags &= ~Placement; }
  if (fiber.flags & Update)    { commitUpdateEffects(fiber);         fiber.flags &= ~Update; }
}` },

    { kind: 'rule', ruleType: 'warning',
      text: '<strong>commitRoot 为什么不可中断？</strong>它直接操作真实 DOM，<strong>每个 mutation 都是可见且不可逆的</strong>：删除一个节点、改一段文本、插入一个元素 —— 用户瞬间就能看到。如果中途被打断，屏幕上就会出现"删了一半 + 插了一半"的中间态。所以 React 把"算变更"（reconcile，可中断）和"写变更"（commit，不可中断）严格分离：reconcile 阶段在 wip 树上做无害计算，commit 阶段一气呵成把所有 flags 落地。这也意味着 commit 阶段如果有大量 DOM 操作（比如同时插入上千节点），仍会阻塞主线程 —— React 用 VirtualList / 分批渲染等上层方案规避，而不是在 commit 内做切片。' },

    { kind: 'rule', ruleType: 'success',
      text: '<strong>三阶段一句话总结</strong>：<br>① <strong>beginWork（递）</strong>—— 按 tag 分发、跑组件函数、对子节点做 diff、产出 child fiber，过程中<strong>只算 flag 不碰 DOM</strong>；<br>② <strong>completeWork（归）</strong>—— 自底向上创建/复用 DOM 实例、mount 时组装子树 DOM、update 时打 Update flag，最后冒泡 <code>subtreeFlags</code>；<br>③ <strong>commitRoot</strong>—— 严格按 insertion → mutation → layout → ref → passive 顺序同步写 DOM 与执行 effect，<strong>不可中断</strong>，完成后 flip 双缓冲。' },
  ];

  global.renderFiberArchitectureWhatIsIt = function (p) {
    return renderArticle(Object.assign({}, p, { blocks }));
  };
})(window);