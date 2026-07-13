// ── 渲染器: 基础 Hooks 执行规则 ─────────────────────────────────────────────
(function (global) {
  const { renderArticle } = global.PrincipleUtils;

  const blocks = [
    { kind: 'text', title: '一句话结论',
      body: '<strong>所有基础 Hook 共享同一条 hook 链表。</strong>fiber.memoizedState 指向第一个 hook 节点，每个节点的 next 指向下一个。React 不靠名字识别 hook，只靠调用顺序 —— 第 N 次调用就取第 N 个节点。所以条件分支/循环里调用 hook 会造成链表错位，update 阶段读到的就不再是自己上次写入的节点。' },

    { kind: 'code', label: 'hook 单链表结构 · fiber.memoizedState', dot: 'accent', lang: 'text',
      code: `fiber.memoizedState ──► [hook0] ──► [hook1] ──► [hook2] ──► null
                            │           │           │
                       useState     useEffect     useRef
                       memoizedState: 0   memoizedState: Effect   memoizedState: {current}
                       queue: {...}       (create/destroy/deps)    (ref 对象引用稳定)
                       next: ──────►      next: ──────►            next: ──────►

每次组件渲染，hooks 按代码顺序消费这条链表：
  mount 阶段：mountWorkInProgressHook() —— 创建新节点并尾插
  update 阶段：updateWorkInProgressHook() —— 从 current 链表按序 clone 到 wip 链表` },

    { kind: 'text', title: 'mount 与 update 如何协调',
      body: 'React 把"hook 节点"分成两份：current fiber 上的旧链表（上次渲染产出）和 wip fiber 上的新链表（本次渲染构建）。update 阶段，<code>updateWorkInProgressHook</code> 会从 current 链表按指针顺序取下一个节点，<strong>浅拷贝</strong>到 wip 链表上（memoizedState / queue 引用复用）。如果某次渲染调用的 hook 数量比上次多，<code>currentHook</code> 指针会撞到 null，React 抛出 <code>"Rendered more hooks than during the previous render."</code> —— 这是 hook 规则的最强约束。' },

    { kind: 'text', title: 'useState 与 useReducer：同根同源',
      body: '源码中 <code>useState</code> 内部直接调用 <code>mountReducer</code> / <code>updateReducer</code>，唯一区别是<strong>预置了一个 basicStateReducer</strong>：<code>(state, action) => typeof action === \'function\' ? action(state) : action</code>。也就是说 <code>setState(n)</code> 等价于 <code>dispatch(n)</code>，<code>setState(prev => prev + 1)</code> 等价于 <code>dispatch(prev => prev + 1)</code>。两者底层共用同一种 Update 环形队列结构。' },

    { kind: 'code', label: 'p-react 简化实现 · packages/react-reconciler/src/fiberHooks.ts', dot: 'blue', lang: 'typescript',
      code: `// useState 本质：useReducer 的 basicStateReducer 特例
function basicStateReducer<State>(state: State, action: ((s: State) => State) | State): State {
  if (typeof action === 'function') {
    return (action as (s: State) => State)(state);
  }
  return action;
}

function mountState<State>(initialState: (() => State) | State) {
  const hook = mountWorkInProgressHook();
  const memoizedState = typeof initialState === 'function'
    ? (initialState as () => State)()
    : initialState;
  hook.memoizedState = memoizedState;
  // queue.pending 是环形链表，承载本轮内多次 setState 的 Update
  hook.queue = { pending: null, lastRenderedState: memoizedState };
  // dispatch 通过 bind 固定 fiber + queue，对外暴露稳定引用
  const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber!, hook.queue);
  return [memoizedState, dispatch];
}

// dispatchSetState：构造 Update 并入队 pending 环形链表
function dispatchSetState<State>(fiber, queue, action) {
  const update: Update<State> = { action, next: null };
  const pending = queue.pending;
  if (pending === null) {
    update.next = update;            // 环形：第一个 update 自指
  } else {
    update.next = pending.next;      // 插在头部之前
    pending.next = update;
  }
  queue.pending = update;            // pending 始终指向最后入队的 update
  scheduleUpdateOnFiberFn!(fiber);   // 触发 reconciliation
}` },

    { kind: 'rule', ruleType: 'accent',
      text: '<strong>useState 环形队列的设计动机</strong>：同一次渲染内连续多次 <code>setState</code>，所有 Update 都入队到 <code>queue.pending</code>。下次 render 时 <code>updateState</code> 遍历整条环链，依次 fold 出最终 state —— 这保证批处理（batching）下多次更新的语义正确。环形而非数组：插入 O(1)，且只靠 <code>pending.next</code> 就能定位头节点。' },

    { kind: 'text', title: 'useEffect / useLayoutEffect：执行时机决定一切',
      body: '两者结构<strong>完全相同</strong>，都是把 effect 推入 <code>fiber.updateQueue</code> 的环形链表，差异只在 fiber 上打的 flag：<code>PassiveEffect</code>（异步）vs <code>LayoutEffect</code>（同步）。commit 阶段分三步：<strong>mutation</strong>（DOM 已变更但 refs 未挂）→ <strong>layout</strong>（同步执行 layout effect，此时可读 DOM 布局）→ <strong>passive</strong>（异步调度，执行 passive effect，不阻塞浏览器绘制）。' },

    { kind: 'code', label: 'effect 环形链表 · fiber.updateQueue.lastEffect', dot: 'yellow', lang: 'typescript',
      code: `// 每个 effect 挂在 fiber.updateQueue 上，而不是 hook 链表里
// hook.memoizedState 存的是 effect 对象本身（与 hook 链表一一对应）
interface Effect {
  tag: number;            // HookPassive | HookLayout | HookHasEffect
  create: () => (() => void) | void;
  destroy: (() => void) | void;
  deps: any[] | null;
  next: Effect | null;
}

// fiber.updateQueue.lastEffect 指向最后一个 effect，next 指向第一个
// 之所以也是环形：commit 阶段需要遍历两次（一次执行 destroy，一次执行 create），
// 环形结构 + lastEffect.next 可以 O(1) 同时访问头尾
updateQueue.lastEffect ──► [effect_N] ──► [effect_1] ──► ... ──► [effect_N] (环)` },

    { kind: 'rule', ruleType: 'info',
      text: '<strong>三种 effect 时机对比</strong>：<br>① <code>useInsertionEffect</code> —— mutation 阶段，refs 尚未赋值，专为 CSS-in-JS 注入样式设计；<br>② <code>useLayoutEffect</code> —— layout 阶段同步执行，<strong>DOM 已变更、paint 之前</strong>，可读取布局并同步触发重绘，阻塞浏览器渲染；<br>③ <code>useEffect</code> —— passive 阶段异步执行，<strong>paint 之后</strong>，不阻塞 UI，绝大多数副作用都应该用它。' },

    { kind: 'text', title: 'effect 如何被推入 fiber.updateQueue',
      body: '组件函数执行期间，每调用一次 <code>useEffect</code>/<code>useLayoutEffect</code>，内部就走 <code>pushEffectImpl</code>：构造一个 <code>Effect</code> 对象（含 <code>tag / create / destroy / deps / next</code>），尾插到 <code>fiber.updateQueue.lastEffect</code> 环形链表。这里有一个容易被忽略的设计：<strong>同一个 effect 对象被两套数据结构同时持有</strong> —— <code>hook.memoizedState</code> 指向它（让下次 update 能读到上次的 <code>destroy</code> 和 <code>deps</code>），<code>fiber.updateQueue</code> 也通过环形链表持有它（让 commit 阶段能遍历执行）。两条视图共用同一对象，<code>effect.destroy</code> 在 commit 阶段被赋值后，下一轮 update 直接从 <code>hook.memoizedState.destroy</code> 读到，无需额外传递。' },

    { kind: 'code', label: 'p-react 简化实现 · fiberHooks.ts → pushEffectImpl', dot: 'blue', lang: 'typescript',
      code: `// renderWithHooks 入口先清空 updateQueue，确保本轮 effect 全部由本次 reconcile 产出
workInProgress.updateQueue = null;

// 组件函数中每调用一次 useEffect/useLayoutEffect → 走 pushEffectImpl 一次
function pushEffectImpl(tag, create, destroy, deps): Effect {
  const effect: Effect = { tag, create, destroy, deps, next: null };
  const fiber = currentlyRenderingFiber!;

  let updateQueue = fiber.updateQueue as FCUpdateQueue | null;
  if (updateQueue === null) {
    // 首个 effect：自指成环
    updateQueue = { lastEffect: null };
    fiber.updateQueue = updateQueue;
    effect.next = effect;
    updateQueue.lastEffect = effect;
  } else {
    // 尾插：lastEffect.next 是首节点，新节点插在 last 与 first 之间
    const lastEffect = updateQueue.lastEffect!;
    const firstEffect = lastEffect.next!;
    lastEffect.next = effect;
    effect.next = firstEffect;
    updateQueue.lastEffect = effect;
  }
  return effect;     // 同一对象也写入 hook.memoizedState，形成"双视图"
}

// mount：fiber 打 PassiveEffect flag，effect 打 HookPassive | HookHasEffect
// update·deps 不变：effect 仅打 HookPassive（无 HookHasEffect）—— commit 时跳过执行
// update·deps 变化：同 mount，打 HookPassive | HookHasEffect
fiber.flags |= PassiveEffect;
hook.memoizedState = pushEffectImpl(HookPassive | HookHasEffect, create, prevEffect.destroy, nextDeps);` },

    { kind: 'text', title: 'commit 阶段如何消费 fiber.updateQueue',
      body: 'commit 阶段按 <code>insertion → mutation → layout → ref → passive</code> 顺序遍历 fiber 树。<strong>对每个 FunctionComponent fiber</strong>，先检查 <code>fiber.flags</code> 是否含对应 effect flag（PassiveEffect / LayoutEffect / InsertionEffect），是则进入 <code>updateQueue.lastEffect</code> 环形链表，从 <code>lastEffect.next</code>（首节点）开始转一圈。遍历中做<strong>双层过滤</strong>：第一层 <code>effect.tag & HookLayout/HookPassive/HookInsertion</code> 选出当前阶段要处理的 effect；第二层 <code>effect.tag & HookHasEffect</code> 决定是否真正执行 create/destroy —— 后者是关键，deps 未变的 effect 虽在链表中但会被跳过，只占位不执行。' },

    { kind: 'code', label: 'commit 阶段消费 updateQueue · commitWork.ts', dot: 'yellow', lang: 'typescript',
      code: `// layout 阶段同步执行：DOM 已变更、paint 前
// insertion 阶段逻辑相同，只是过滤 HookInsertion 且时机更早（mutation 前）
function commitLayoutEffects(fiber: FiberNode) {
  if (fiber.tag === FunctionComponent && fiber.flags & LayoutEffect) {
    const updateQueue = fiber.updateQueue as { lastEffect: Effect | null } | null;
    if (updateQueue && updateQueue.lastEffect) {
      const lastEffect = updateQueue.lastEffect;
      let effect = lastEffect.next!;          // 从首节点开始
      do {
        // 双层过滤：HookLayout 选阶段，HookHasEffect 选"deps 变了"
        if ((effect.tag & HookLayout) && (effect.tag & HookHasEffect)) {
          if (effect.destroy) effect.destroy();   // 先 destroy 上一次的 cleanup
          const destroy = effect.create();         // 再 create 新的
          effect.destroy = destroy === undefined ? undefined : destroy;
        }
        effect = effect.next!;
      } while (effect !== lastEffect.next);       // 转一圈回到首节点
    }
    fiber.flags &= ~LayoutEffect;
  }
  if (fiber.child)   commitLayoutEffects(fiber.child);
  if (fiber.sibling) commitLayoutEffects(fiber.sibling);
}

// passive 阶段异步入队：paint 之后由 Scheduler 调度（p-react 用 setTimeout 模拟）
// 源码严格遵循"先收集 → 先全部 destroy 上一次 → 再全部 create 新的"，
// 保证多个 effect 间的副作用顺序一致，避免新 effect 的 create 依赖旧 effect 未销毁的状态` },

    { kind: 'rule', ruleType: 'accent',
      text: '<strong>fiber.flags 与 effect.tag 的双重标记机制</strong>：<br>① <code>fiber.flags</code> 上的 <code>PassiveEffect</code>/<code>LayoutEffect</code>/<code>InsertionEffect</code> —— <strong>fiber 级别</strong>的"我有这类 effect 需要处理"，让 commit 阶段快速跳过没 effect 的 fiber，无需进入 updateQueue；<br>② <code>effect.tag</code> 上的 <code>HookHasEffect</code> —— <strong>effect 级别</strong>的"我的 deps 变了，需要执行 create/destroy"，让 deps 未变的 effect 被跳过；<br>③ <strong>update 阶段 deps 不变时</strong>，effect 仍被推入 updateQueue（保持链表完整 + 复用上次的 <code>destroy</code>），但 tag 不带 <code>HookHasEffect</code>，commit 时只做"占位"不执行 —— 这就是 deps 数组能跳过 effect 执行的底层实现，也是 <code>fiber.flags</code> 不被清零时仍可能不执行 effect 的原因。' },

    { kind: 'rule', ruleType: 'warning',
      text: '<strong>destroy 与 create 的执行顺序</strong>：<br>① <strong>layout / insertion effect</strong>：每个 effect 内部<strong>先 destroy 上一次的 cleanup，再 create 新的</strong>，逐个串行；<br>② <strong>passive effect（useEffect）</strong>：源码严格遵循"<strong>先 destroy 全部 → 再 create 全部</strong>"，这是为了保证多个 effect 之间的副作用顺序一致（避免新 effect 的 create 依赖旧 effect 还未销毁的状态）。p-react 出于教学简化用 <code>setTimeout</code> 异步触发，语义上等价但未严格分离两轮；<br>③ <strong>destroy 永远早于同 effect 的下一次 create</strong>：上一轮 create 返回的 cleanup 会在本轮 create 之前被调用 —— 这是 effect 的"事务语义"，确保副作用不会累积。' },

    { kind: 'text', title: 'deps 浅比较：HookHasEffect 决定是否执行',
      body: 'useEffect / useLayoutEffect / useMemo / useCallback 都依赖 <code>areHookInputsEqual</code>：用 <code>Object.is</code> 逐项比较新旧 deps。注意三件事：① <strong>deps 不传（undefined）等价于 null，每次都执行</strong>；② deps 数组<strong>长度不等</strong>直接判为不等（开发环境还会警告）；③ deps 是<strong>浅比较</strong>，对象/数组引用变化即视为变化，深层数据变更不会触发。' },

    { kind: 'code', label: 'useMemo 与 useCallback 的对称实现', dot: 'green', lang: 'typescript',
      code: `// useMemo：memoizedState = [value, deps]，mount 时调用 create()
function mountMemo<T>(create: () => T, deps?: any[]): T {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const nextValue = create();
  hook.memoizedState = [nextValue, nextDeps];
  return nextValue;
}

function updateMemo<T>(create: () => T, deps?: any[]): T {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const [prevValue, prevDeps] = hook.memoizedState;
  if (nextDeps !== null && areHookInputsEqual(nextDeps, prevDeps)) {
    return prevValue;              // deps 不变 → 返回缓存值
  }
  const nextValue = create();
  hook.memoizedState = [nextValue, nextDeps];
  return nextValue;
}

// useCallback：唯一区别是 memoizedState = [callback, deps]，不调用 callback
function mountCallback<T extends Function>(callback: T, deps?: any[]): T {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  hook.memoizedState = [callback, nextDeps];
  return callback;
}` },

    { kind: 'rule', ruleType: 'success',
      text: '<strong>useCallback 是 useMemo 的语法糖</strong>：<code>useCallback(fn, deps)</code> 完全等价于 <code>useMemo(() => fn, deps)</code>。源码中两者实现并行而非嵌套，是出于性能考虑（避免一层额外闭包），但语义上等价。需要给子组件传稳定函数引用时用 useCallback，需要缓存任意计算结果时用 useMemo。' },

    { kind: 'text', title: 'useRef：唯一不参与渲染输出的 Hook',
      body: 'useRef 是所有基础 Hook 中最朴素的：mount 时创建 <code>{ current: initialValue }</code> 存入 <code>hook.memoizedState</code>，update 时<strong>直接返回同一对象</strong>，连 deps 比较都没有。修改 <code>ref.current</code> 不会触发重渲染 —— 这正是它和 useState 的本质区别：<strong>useState 的 state 变化会触发渲染，ref 的变化只是"被记住"</strong>。所以 ref 适合存"渲染不需要的数据"：定时器 ID、DOM 节点、上一次的值等。' },

    { kind: 'code', label: 'useRef 简化实现', dot: 'blue', lang: 'typescript',
      code: `function mountRef<T>(initialValue: T): { current: T } {
  const hook = mountWorkInProgressHook();
  const ref = { current: initialValue };
  hook.memoizedState = ref;          // 直接存对象，没有 queue、没有 deps
  return ref;
}

function updateRef<T>(): { current: T } {
  const hook = updateWorkInProgressHook();
  return hook.memoizedState;         // 直接返回同一引用，永不重建
}` },

    { kind: 'rule', ruleType: 'warning',
      text: '<strong>useRef vs useState 选择标准</strong>：<br>✅ 用 <code>useState</code>：值会变化，且变化需要反映到 UI（count、text、open 状态）；<br>✅ 用 <code>useRef</code>：值会变化，但变化<strong>不应触发渲染</strong>（定时器、缓存、上一次的值、第三方实例）；<br>⚠️ 错误用法：用 ref 替代 state 驱动 UI —— 渲染不会刷新，UI 与数据脱节。' },

    { kind: 'rule', ruleType: 'accent',
      text: '<strong>Hooks 三大铁律</strong>：<br>① <strong>只在顶层调用</strong>，不要在循环、条件、嵌套函数中调用 —— 否则 hook 链表顺序错位，update 阶段读到错误的节点；<br>② <strong>只在函数组件或自定义 Hook 中调用</strong>（自定义 Hook 必须以 <code>use</code> 开头，这是 ESLint 规则 <code>react-hooks/rules-of-hooks</code> 的判据）；<br>③ <strong>deps 数组要诚实</strong>：用了什么外部变量就写什么，漏写会导致闭包陷阱（读到旧值），多写会导致不必要的重算。<code>react-hooks/exhaustive-deps</code> 规则会自动提示。' },

    { kind: 'text', title: 'mount/update Dispatcher 切换',
      body: '源码中 React 通过 <code>ReactCurrentDispatcher</code> 在 <code>renderWithHooks</code> 入口处切换：mount 时挂 <code>HooksDispatcherOnMount</code>（<code>useState → mountState</code>），update 时挂 <code>HooksDispatcherOnUpdate</code>（<code>useState → updateState</code>）。p-react 简化为一个布尔标记 <code>isMount</code>，每个 hook 内部 <code>if (isMount) return mountXxx(...); return updateXxx(...);</code>。这就是为什么 hook 函数名固定但行为会随阶段切换。' },
  ];

  global.renderBasicHooksRules = function (p) {
    return renderArticle(Object.assign({}, p, { blocks }));
  };
})(window);