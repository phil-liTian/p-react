(function (global) {
  const { renderArticle } = global.PrincipleUtils;

  const blocks = [
    { kind: 'text', title: '一句话结论',
      body: '<strong>React 事件系统 = 事件委托（根容器统一监听） + 合成事件（包装原生 Event） + 优先级绑定（事件类型 → Lane）。</strong>不在每个元素上 addEventListener，而是在 createRoot 的容器上批量监听，事件触发时沿 fiber 链收集 listener 再按序执行。这样省内存、方便批处理、天然支持优先级。' },

    { kind: 'compare', title: '直接绑定 vs 事件委托',
      left: { label: '直接绑定（每元素 addEventListener）', dot: 'yellow', lines: [
        '<strong>内存</strong>：每个元素一个监听器，1000 个 li 就 1000 个',
        '<strong>增删</strong>：mount/unmount 都要 add/removeEventListener',
        '<strong>批量处理</strong>：事件回调里多次 setState 各自触发渲染',
        '<strong>优先级</strong>：所有事件同等优先级，无法区分 click vs scroll',
        '<strong>多应用并存</strong>：互不干扰，但与 React 调度割裂',
      ]},
      right: { label: '事件委托（根容器统一监听）', dot: 'accent', lines: [
        '<strong>内存</strong>：整个应用只 N 个监听器（按事件类型）',
        '<strong>增删</strong>：listener 存在 fiber.props，DOM 不变',
        '<strong>批量处理</strong>：所有事件统一入口，天然批处理',
        '<strong>优先级</strong>：事件类型 → Lane 映射，click 立即响应',
        '<strong>多应用并存</strong>：每个 root 独立监听，互不干扰',
      ]}
    },

    { kind: 'text', title: 'React 17 之前的 document 委托 vs 17+ 根容器委托',
      body: '<strong>React 16 及以前</strong>：所有事件统一委托到 <code>document</code>。问题：一个页面有多个 React 应用（微前端、嵌入式组件）时，document 上的监听器会互相干扰——A 应用的 click 触发后 stopPropagation，B 应用就收不到。<strong>React 17 起</strong>：把委托从 document 收回到 <code>createRoot(container)</code> 的容器，每个 root 各自监听，互不干扰。这是 17 最大的隐性变化之一。' },

    { kind: 'rule', ruleType: 'warning',
      text: '<strong>为什么从 document 收回到根容器？</strong><br>① <strong>多 React 应用并存</strong>：iframe 嵌入、微前端、第三方组件库可能各自跑 React，document 单点委托会互相覆盖；<br>② <strong>stopPropagation 语义混乱</strong>：document 上的监听器在事件冒泡到顶层后才触发，<code>e.stopPropagation()</code> 阻止的是 document 之后的监听，但原生 DOM 树上其他元素的 listener 已经触发完了，与直觉不符；<br>③ <strong>与 createRoot 一致</strong>：React 18 的 createRoot 模型天然支持多 root，根容器委托与之一致。' },

    { kind: 'text', title: '合成事件 SyntheticEvent',
      body: 'React 把原生 Event 包装成 SyntheticEvent，目的是：<br>① <strong>抹平浏览器差异</strong>：IE 和 Chrome 的事件对象字段不同，SyntheticEvent 统一接口；<br>② <strong>事件池（React 16 及以前）</strong>：SyntheticEvent 对象复用，回调结束后字段被清空，需要 <code>e.persist()</code> 才能异步访问；<br>③ <strong>统一批处理</strong>：React 在 dispatchEvent 入口/出口自动 <code>batchedUpdates</code>，回调里多次 setState 自动批处理。<strong>React 17 移除了事件池</strong>（不再复用对象），解决了"异步访问 e.target 拿到 null"的经典坑。' },

    { kind: 'code', label: 'SyntheticEvent 结构 · source/react-dom-bindings/src/events/SyntheticEventType.js', dot: 'blue', lang: 'typescript',
      code: `// SyntheticEvent 是对原生 Event 的薄包装
interface SyntheticEvent {
  // 与原生 Event 相同的字段
  type: string;            // 'click' / 'input' / 'keydown'
  target: EventTarget;     // 真实 DOM target
  currentTarget: EventTarget;
  bubbles: boolean;
  cancelable: boolean;
  // React 提供的统一 API
  preventDefault(): void;  // 转发到 nativeEvent.preventDefault
  stopPropagation(): void; // 阻止 React 事件传播（不是原生传播）
  isDefaultPrevented(): boolean;
  isPropagationStopped(): boolean;
  // 持有原生事件引用
  nativeEvent: Event;
}` },

    { kind: 'text', title: '事件传播：捕获 → 目标 → 冒泡（在 fiber 树上收集）',
      body: 'React 的合成事件<strong>并不真正利用 DOM 事件冒泡</strong>，而是：<br>① 事件在根容器触发后，<code>dispatchEvent</code> 找到 target 对应的 fiber；<br>② 沿 return 链向上<strong>收集所有 onClick / onClickCapture</strong> listener；<br>③ 先按从顶到 target 的顺序执行捕获阶段（Capture 后缀）；<br>④ 再按从 target 到顶的顺序执行冒泡阶段；<br>⑤ <code>e.stopPropagation()</code> 只是设置一个标记，React 在循环里检查后停止收集后续 listener。这等价于原生事件传播，但完全在 fiber 树上模拟。' },

    { kind: 'code', label: 'dispatchEvent 简化 · source/react-dom-bindings/src/events/ReactDOMEventListener.js', dot: 'yellow', lang: 'typescript',
      code: `function dispatchEvent(nativeEvent, container) {
  // 1. 找到 target 对应的 fiber
  const targetInst = getClosestInstanceFromNode(target);

  // 2. 沿 return 链收集所有 listener（捕获 + 冒泡）
  const listeners = [];
  let instance = targetInst;
  while (instance !== null) {
    const capture = instance.memoizedProps.onClickCapture;
    const bubble  = instance.memoizedProps.onClick;
    if (capture) listeners.push({ node: instance, listener: capture, capture: true });
    if (bubble)  listeners.push({ node: instance, listener: bubble,  capture: false });
    instance = instance.return;
  }

  // 3. 执行捕获阶段（从顶到 target）
  for (const l of listeners.filter(l => l.capture)) {
    runListener(l, syntheticEvent);
    if (syntheticEvent.isPropagationStopped()) break;
  }
  // 4. 执行冒泡阶段（从 target 到顶）
  for (const l of [...listeners].reverse().filter(l => !l.capture)) {
    runListener(l, syntheticEvent);
    if (syntheticEvent.isPropagationStopped()) break;
  }
}` },

    { kind: 'text', title: 'React 19 的变化：react-dom-bindings 拆分',
      body: 'React 19 把事件系统从 <code>react-dom</code> 进一步拆到独立的 <code>react-dom-bindings</code> 包，原因是<strong>解耦渲染器与平台特定逻辑</strong>。事件委托、合成事件创建、事件优先级映射都属于"DOM 平台特定"的逻辑，而 react-dom 应该只关心"DOM 操作如何对接 reconciler"。这样未来 ReactNative / ReactThree 等非 DOM 渲染器可以复用 reconciler 而不依赖 DOM 事件机制。<code>createRoot</code> 时由 react-dom-bindings 注入事件监听器到根容器。' },

    { kind: 'rule', ruleType: 'info',
      text: '<strong>React 17 移除事件池的影响</strong>：React 16 及之前，SyntheticEvent 对象会被复用——回调执行完毕后 <code>event.target</code> 等字段被置 null，异步访问会拿到 null。必须 <code>e.persist()</code> 或在回调里同步取出需要的字段。<strong>React 17 移除事件池</strong>后，event 对象不再复用，可以直接在 setTimeout / Promise 回调里访问，<code>e.persist()</code> 变成 no-op。这是 17 一个静默但重要的简化。' },

    { kind: 'text', title: '事件优先级 → Lane 映射',
      body: '不同事件类型对应不同 Lane，React 在事件触发时就知道这次更新的优先级：<br>① <strong>discrete events</strong>（click、keydown、input）→ <code>DiscreteEventLane</code> = SyncLane 级别，立即响应；<br>② <strong>continuous events</strong>（mousemove、scroll、drag）→ <code>ContinuousEventLane</code> = InputContinuousLane，可合并；<br>③ <strong>其他默认</strong>（如 resize）→ <code>DefaultLane</code>。<br>这样用户输入触发的更新会被标记为高优先级，立即渲染；非用户交互的更新走默认优先级，可以延迟。' },

    { kind: 'code', label: 'getEventPriority · source/react-dom-bindings/src/events/getEventPriority.js', dot: 'green', lang: 'typescript',
      code: `const discreteEventPairs = [
  ['click', 'click'],
  ['input', 'input'],
  ['keydown', 'keydown'],
  ['keyup', 'keyup'],
  ['mousedown', 'mousedown'],
  // ...
];

const continuousEventPairs = [
  ['mousemove', 'mousemove'],
  ['scroll', 'scroll'],
  ['drag', 'drag'],
  ['wheel', 'wheel'],
];

export function getEventPriority(eventType: string): Lane {
  if (discreteEventPairs.has(eventType))   return DiscreteEventLane;     // SyncLane 级
  if (continuousEventPairs.has(eventType)) return ContinuousEventLane;
  return DefaultLane;
}` },

    { kind: 'rule', ruleType: 'warning',
      text: '<strong>e.stopPropagation() 在 React 中的语义</strong>：它阻止的是<strong>合成事件在 fiber 树上的传播</strong>，<strong>不是</strong>原生 DOM 事件的传播。因为 React 用委托模式，原生事件已经冒泡到根容器才触发 dispatchEvent——此时原生事件传播已结束。<code>e.nativeEvent.stopPropagation()</code> 才能阻止原生传播，但通常没必要。同理 <code>e.preventDefault()</code> 是转发到 nativeEvent，行为一致。' },

    { kind: 'text', title: 'p-react 简化版：直接 addEventListener',
      body: 'p-react 没有实现合成事件系统，<code>packages/react-dom/src/hostConfig.ts</code> 直接在 createInstance / commitUpdate 时为每个 <code>onXxx</code> prop 调用 <code>element.addEventListener(eventName, props[key])</code>。这就是为什么 p-react 的事件回调里多次 setState 也<strong>能批处理</strong>——rootScheduler 的 microtask 机制兜底，但<strong>没有合成事件层</strong>，也没有事件优先级映射，所有事件同等优先级（走 SyncLane）。这是 p-react 与 React 真源码最大的简化点之一。' },

    { kind: 'code', label: 'p-react 事件绑定 · packages/react-dom/src/hostConfig.ts', dot: 'blue', lang: 'typescript',
      code: `createInstance(type, props) {
  const element = document.createElement(type);
  for (const key of Object.keys(props)) {
    if (key === 'children') continue;
    if (key === 'style') {
      Object.assign(element.style, props[key]);
    } else if (key.startsWith('on')) {
      // 直接在元素上 addEventListener，无委托、无合成事件
      const eventName = key.slice(2).toLowerCase();
      element.addEventListener(eventName, props[key]);
    } else if (key === 'className') {
      element.setAttribute('class', props[key]);
    } else {
      element.setAttribute(key, props[key]);
    }
  }
  return element;
}` },

    { kind: 'rule', ruleType: 'success',
      text: '<strong>一句话总结</strong>：React 事件系统 = <strong>根容器委托</strong>（17 起从 document 收回）+ <strong>合成事件</strong>（抹平浏览器差异，17 起移除事件池）+ <strong>fiber 链收集 listener</strong>（模拟捕获/冒泡）+ <strong>事件类型 → Lane 映射</strong>（click=SyncLane，scroll=InputContinuousLane）。React 19 把事件系统拆到 react-dom-bindings 包，进一步解耦渲染器与平台特定逻辑。p-react 简化为直接 addEventListener，没有合成事件层。' },
  ];

  global.renderReact19EventSystem = function (p) {
    return renderArticle(Object.assign({}, p, { blocks }));
  };
})(window);