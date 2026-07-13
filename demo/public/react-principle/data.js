// ── Principle 元数据 ──────────────────────────────────────────────────────────
// 与 java.html 的 topics 结构保持一致：只放元数据，不放 blocks 内容。
// blocks 由 public/react-principle/{id}.js 渲染器提供，按需加载。

const principles = [
  {
    id: 'jsx-createelement-reactelement',
    name: 'JSX 本质、createElement、ReactElement 结构',
    group: 'React 原理',
    icon: '🧬',
    tags: [
      { label: '基础', type: 'accent' },
      { label: 'JSX', type: 'info' },
      { label: 'createElement', type: 'info' },
      { label: 'ReactElement', type: 'info' },
    ],
    summary: 'JSX 既不是字符串也不是 HTML，它最终编译成对 createElement 的普通函数调用，返回一个描述 UI 的普通 JavaScript 对象 —— ReactElement。理解这一条链路是看懂 React 渲染流程的第一步。',
  },
  {
    id: 'basic-hooks-rules',
    name: '基础 Hooks 执行规则',
    group: 'React 原理',
    icon: '🪝',
    tags: [
      { label: 'Hooks', type: 'accent' },
      { label: '规则', type: 'warning' },
    ],
    summary: 'Hooks 之所以"只能在函数组件顶层调用"是因为它们依赖一个隐式的全局链表：当前 fiber + workInProgress + hook 槽位。任何破坏调用顺序的写法（条件、循环、提前 return）都会让槽位错位，导致状态错乱。',
  },
  {
    id: 'fiber-architecture-what-is-it',
    name: '什么是 Fiber 架构',
    group: 'React 原理',
    icon: '🌳',
    tags: [
      { label: 'Fiber', type: 'accent' },
      { label: '架构', type: 'info' },
    ],
    summary: 'Fiber 是 React 16 引入的协调引擎：把原本"一口气递归到底"的渲染拆成可中断、可恢复的"链表式"工作单元。Fiber 节点就是 vDOM 节点 + 调度信息 + effect 链表的总和。',
  },
  {
    id: 'double-buffering-mechanism',
    name: '什么是双缓存机制（Double Buffering）',
    group: 'React 原理',
    icon: '🪞',
    tags: [
      { label: 'Fiber', type: 'accent' },
      { label: '双缓存', type: 'info' },
    ],
    summary: 'React 在内存里维护两棵 fiber 树：current（屏幕上正在显示的）和 workInProgress（正在协调的）。render 阶段构建 workInProgress，commit 阶段一次性切换——避免用户在渲染过程中看到半成品。',
  },
  {
    id: 'diff-algorithm',
    name: 'React Diff 算法（对比 Vue）',
    group: 'React 原理',
    icon: '🔀',
    tags: [
      { label: 'Diff', type: 'accent' },
      { label: '对比', type: 'info' },
    ],
    summary: 'React 的 Diff 不是通用最优算法（O(n³) 不可达），而是基于三条启发式假设的 O(n) 近似：同层比较、type 不同则重建、key 稳定则复用。Vue 3 在此基础上引入了 block tree 进一步优化。',
  },
  {
    id: 'scheduler-principle',
    name: 'Scheduler 调度器：时间切片与优先级队列',
    group: 'React 原理',
    icon: '⏱️',
    tags: [
      { label: 'Scheduler', type: 'accent' },
      { label: '调度', type: 'info' },
    ],
    summary: 'Scheduler 是独立于 React 核心的包，本质是"在 5ms 时间片内能塞多少工作就塞多少"。它维护一个基于 MessageChannel 的小顶堆优先级队列，让高优先级任务打断低优先级任务。',
  },
  {
    id: 'lane-priority-model',
    name: 'Lane 优先级模型：位掩码与批处理',
    group: 'React 原理',
    icon: '🚦',
    tags: [
      { label: 'Lane', type: 'accent' },
      { label: '优先级', type: 'warning' },
    ],
    summary: 'React 17 起弃用 expirationTime 模型，改用 32 位 Lane 位掩码：每一位代表一种优先级，组合后代表"一批"工作。同 Lane 任务合并批处理，不同 Lane 任务保持各自批。',
  },
  {
    id: 'concurrent-mode',
    name: '并发模式：useTransition / Suspense / 中断恢复',
    group: 'React 原理',
    icon: '⚡',
    tags: [
      { label: '并发', type: 'accent' },
      { label: 'Transition', type: 'info' },
      { label: 'Suspense', type: 'info' },
    ],
    summary: '并发模式不是"并行渲染"，而是"可中断渲染"：render 阶段每完成一个 fiber 就检查一次是否还有更高优先级任务，有就让出。useTransition 用来标记"可打断的低优先级更新"，Suspense 用来"暂缓渲染等待数据"。',
  },
  {
    id: 'react19-event-system',
    name: 'React 19 事件系统：合成事件、委托、优先级绑定',
    group: 'React 原理',
    icon: '🎯',
    tags: [
      { label: '事件', type: 'accent' },
      { label: 'React 19', type: 'success' },
    ],
    summary: 'React 17 把事件委托从 document 收回根容器，移除事件池；React 19 把整个事件系统拆到 react-dom-bindings 包。事件触发时沿着 fiber 链收集 listener，并映射到对应 Lane（click=SyncLane, scroll=InputContinuousLane）。',
  },
];

// 全局暴露（避免与全局其他变量冲突，前缀 window）
window.PrincipleData = { principles };