// ── 渲染器: React 并发模式 ─────────────────────────────────────────────────────
(function (global) {
  const { renderArticle } = global.PrincipleUtils;

  const blocks = [
    { kind: 'text', title: '一句话结论',
      body: '<strong>React 并发模式（Concurrent Mode）是一组让渲染"可中断、可恢复、可抢占"的特性集合</strong>，核心是 <code>workLoopConcurrent</code> + Lane 优先级 + Suspense 边界 + <code>useTransition</code> / <code>useDeferredValue</code> API。它<strong>不改变组件语义</strong>，只改变 React 调度渲染的"节奏" —— 同一棵 Fiber 树可以被拆成多次 render、用不同优先级交错执行，<strong>让用户始终看到最高优先级的更新</strong>。' },

    { kind: 'compare', title: '同步模式 vs 并发模式',
      left: { label: '同步模式（React 17）', dot: 'accent', lines: [
        '<strong>入口</strong>：<code>ReactDOM.render / setState</code>',
        '<strong>workLoop</strong>：<code>workLoopSync</code>，循环内无 yield 条件',
        '<strong>中断</strong>：<strong>不可中断</strong>，从 beginWork 一路跑到 commitRoot',
        '<strong>优先级</strong>：<strong>不支持</strong>，所有 setState 走 SyncLane',
        '<strong>Suspense</strong>：<strong>不支持</strong>，Suspense 组件会降级为 fallback',
        '<strong>批量更新</strong>：只在 React 事件处理器中自动批',
        '<strong>用户感知</strong>：长任务会<strong>卡住主线程</strong>（输入延迟、动画掉帧）',
        '<strong>回退兼容</strong>：默认所有应用都是同步模式',
      ]},
      right: { label: '并发模式（React 18）', dot: 'green', lines: [
        '<strong>入口</strong>：<code>createRoot / useTransition</code>',
        '<strong>workLoop</strong>：<code>workLoopConcurrent</code>，循环内 <code>shouldYield()</code> 让出',
        '<strong>中断</strong>：<strong>可中断、可恢复</strong>，每 5ms 让出一次主线程',
        '<strong>优先级</strong>：<strong>31 条 Lane 自由组合</strong>，支持高优先级抢占低优先级',
        '<strong>Suspense</strong>：<strong>原生支持</strong>，throw Promise 实现异步加载',
        '<strong>批量更新</strong>：<strong>所有更新自动批</strong>（setTimeout / Promise / native event）',
        '<strong>用户感知</strong>：高优先级更新<strong>立即响应</strong>，长任务被切片',
        '<strong>回退兼容</strong>：通过 <code>createRoot</code> 显式启用，老 API 仍走同步模式',
      ]}
    },

    { kind: 'code', title: '两种 workLoop 对比',
      code: `// 同步模式：workLoopSync（React 17）
function workLoopSync() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);   // 不让出，一口气跑完
  }
}

// 并发模式：workLoopConcurrent（React 18）
function workLoopConcurrent() {
  while (workInProgress !== null && !shouldYield()) {
    // shouldYield() 返回 true → 时间片用完，让出主线程
    // 下一帧从 workInProgress 指针继续 render
    performUnitOfWork(workInProgress);
  }
  // 如果 workInProgress === null → 全部跑完，进入 commitRoot
  // 如果 shouldYield() === true → 中断，等下次调度恢复
}` },

    { kind: 'text', title: '中断与恢复：workInProgress 指针',
      body: '并发渲染的"中断恢复"靠 <strong><code>workInProgress</code> 单向链表</strong>实现：每渲染一个 fiber 就前进到 <code>child</code> 或 <code>sibling</code>，中断时<strong>只保留 <code>workInProgress</code> 指针</strong>，下次从同一位置继续。这与浏览器解析 HTML 时遇到 <code>&lt;script&gt;</code> 的"暂停解析"机制异曲同工 —— 状态保存在"当前位置"上，不需要额外的"现场保护"栈。' },

    { kind: 'code', title: '优先级抢占：丢弃 wip 树',
      code: `// 并发模式下，ensureRootIsScheduled 是抢占逻辑的核心
function ensureRootIsScheduled(root, currentTime) {
  const existingCallback = root.callbackNode;
  const nextLanes = getNextLanes(root, root.wipLanes, root.pendingLanes);

  if (nextLanes === NoLanes) return;   // 没有待处理任务

  const newCallback = scheduleCallback(
    lanesToSchedulerPriority(nextLanes),
    performConcurrentWorkOnRoot.bind(null, root)
  );

  root.callbackNode = newCallback;

  // ⚡ 关键：如果优先级变了，cancelCallback 旧的，<strong>新优先级抢占</strong>
  if (existingCallback !== null) {
    cancelCallback(existingCallback);
  }
}

// 抢占发生时的处理：丢弃当前的 wip 树，从 current 树重新开始
function performConcurrentWorkOnRoot(root) {
  const didTimeout = ...;
  const lanes = getNextLanes(root, root.wipLanes, root.pendingLanes);

  // 1. 准备 wip 树：如果没有或优先级变了，从 current 复制一份
  if (root.wip === null || root.wipLanes !== lanes) {
    prepareFreshStack(root, lanes);   // 丢弃旧 wip，用 current 创建新 wip
  }

  // 2. 执行 workLoop（可中断）
  workLoopConcurrent();

  // 3. 判断是完成还是中断
  if (workInProgress !== null) {
    // 还在跑（被 shouldYield 中断）→ wip 树保留，等下次继续
    return performConcurrentWorkOnRoot.bind(null, root);
  } else {
    // 全部跑完 → 进入 commit 阶段
    const finishedWork = root.current.alternate;
    root.finishedWork = finishedWork;
    root.finishedLanes = lanes;
    commitRoot(root, finishedWork, lanes);
  }
}` },

    { kind: 'rule', ruleType: 'warning',
      text: '<strong>为什么抢占时要丢弃 wip 树？</strong>因为 wip 树上的节点是基于"上一帧的 Lane"计算的，新优先级来了之后，<strong>旧 wip 树上的工作可能已经过时</strong>（比如 state 已经变了）。React 选择"从 current 复制新 wip + 重新跑"，<strong>而不是基于旧 wip 继续 diff</strong>。代价是丢弃的部分工作会重做，但能保证 render 结果的<strong>幂等性</strong>和优先级一致性。这是并发模式"优先正确，再优化性能"的设计取舍。' },

    { kind: 'text', title: 'useTransition：标记非紧急更新',
      body: '<code>useTransition</code> 是并发模式的<strong>用户层入口</strong>之一，让开发者<strong>把"不影响当前交互"的更新标记为低优先级</strong>，避免阻塞紧急输入。' },

    { kind: 'code', title: 'useTransition 实战',
      code: `import { useTransition, useState } from 'react';

function SearchPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(e) {
    // 紧急：受控输入立即更新（SyncLane）
    setQuery(e.target.value);

    // 非紧急：搜索结果用 startTransition 包起来 → TransitionLane
    // 输入响应不会被搜索结果的 re-render 阻塞
    startTransition(() => {
      setResult(expensiveFilter(e.target.value));
    });
  }

  return (
    <div>
      <input value={query} onChange={handleChange} />
      {isPending && <Spinner />}
      <ResultList data={result} />
    </div>
  );
}` },

    { kind: 'rule', ruleType: 'info',
      text: '<strong><code>isPending</code> 的作用</strong>：在 <code>startTransition</code> 内的更新未完成时返回 <code>true</code>，开发者可用来显示"加载中"提示。这里有个<strong>关键差异</strong>：pending 状态本身是 SyncLane 渲染的，<strong>不会和 startTransition 内的更新互相阻塞</strong> —— 用户始终能看到"在跑"的反馈，但内容渲染是低优先级的。' },

    { kind: 'text', title: 'Suspense 边界与 throw Promise',
      body: '并发模式让 <code>Suspense</code> 从"占位符"升级为<strong>完整的异步加载编排器</strong>，核心机制是"<strong>throw 一个 Promise</strong>"：' },

    { kind: 'code', title: 'Suspense 异步加载实现',
      code: `// React 18 + Relay / Next.js 14+ 的异步加载模型

// 1. 资源加载器：未就绪时 throw Promise
const resource = fetchData();   // 返回 { read() }
function throwIfNotReady(promise) {
  if (status === 'fulfilled') return value;
  if (status === 'rejected') throw error;
  if (status === 'pending') throw promise;   // ⭐ 关键：throw 一个 Promise
  promise.then(success, error);
  throw promise;
}

// 2. 组件消费资源
function UserProfile({ resource }) {
  const data = resource.read();   // 未就绪时 throw，触发 Suspense
  return <div>{data.name}</div>;
}

// 3. Suspense 边界捕获 throw
function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <UserProfile resource={userResource} />
    </Suspense>
  );
}

// 4. React 18 的处理流程：
//    - beginWork 走到 UserProfile，调用 resource.read() → throw Promise
//    - React 捕获 throw，建立 retry 队列（记录 Suspense 边界和 throw 的 Promise）
//    - 渲染 Suspense 的 fallback（占位符）
//    - Promise 完成后，触发 retry 重新 beginWork（走 RetryLanes）` },

    { kind: 'text', title: 'useDeferredValue：值的延迟版本',
      body: '<code>useDeferredValue</code> 和 <code>useTransition</code> 是<strong>同一机制的两种入口</strong>：前者包裹"值"，后者包裹"更新"。' },

    { kind: 'compare', title: 'useTransition vs useDeferredValue',
      left: { label: 'useTransition', dot: 'accent', lines: [
        '<strong>包裹对象</strong>：setState 调用（更新）',
        '<strong>返回</strong>：<code>[isPending, startTransition]</code>',
        '<strong>使用场景</strong>：开发者<strong>主动发起</strong>非紧急更新',
        '<strong>控制粒度</strong>：<strong>事件回调 / Effect 内部</strong>，细粒度',
        '<strong>依赖</strong>：<strong>可访问 setState</strong> 的地方（事件处理器、Effect）',
      ]},
      right: { label: 'useDeferredValue', dot: 'green', lines: [
        '<strong>包裹对象</strong>：一个值（state / prop）',
        '<strong>返回</strong>：<code>deferredValue</code>（延迟版本）',
        '<strong>使用场景</strong>：<strong>被动接收</strong>的高开销渲染（如大列表）',
        '<strong>控制粒度</strong>：<strong>组件 render 阶段</strong>，粗粒度',
        '<strong>依赖</strong>：<strong>无依赖</strong>，可在任何组件用（包括子组件、第三方组件）',
      ]}
    },

    { kind: 'rule', ruleType: 'accent',
      text: '<strong>render 必须纯净（Pure）</strong>。并发模式能安全中断 + 恢复 render，<strong>前提是 render 函数是幂等的</strong>：同样的输入产生同样的输出，不发起网络请求、不修改全局变量、不修改 <code>useState</code> 之外的外部状态。React 18 的 <code>&lt;StrictMode&gt;</code> 会在开发环境<strong>故意双调用 render</strong>，让违反纯净性的代码立即暴露（如写副作用、setTimeout 污染全局）。这是<strong>用开发摩擦换生产安全</strong>的经典工程权衡。' },

    { kind: 'code', title: 'p-react 并发实现：模拟延迟让出',
      code: `// p-react 的并发实现：用 setTimeout 模拟"可中断"语义
function workLoopConcurrent() {
  return new Promise((resolve) => {
    const tick = () => {
      // 一次只跑一个 work unit
      if (workInProgress !== null) {
        performUnitOfWork(workInProgress);
        // setTimeout 0 让出主线程，模拟"5ms 时间片"
        setTimeout(tick, 0);
      } else {
        // 没有 work 了 → 进入 commit 阶段
        commitRoot();
        resolve();
      }
    };
    tick();
  });
}

// 使用：配合 useTransition 包装的低优先级更新
// startTransition 包起来的 setState 会进入 workLoopConcurrent
// 而非 workLoopSync，从而实现"非紧急更新不阻塞输入"` },
  ];

  global.renderConcurrentMode = function (p) {
    return renderArticle(Object.assign({}, p, { blocks }));
  };
})(window);