// ── 渲染器: Scheduler 时间切片原理 ─────────────────────────────────────────────
(function (global) {
  const { renderArticle } = global.PrincipleUtils;

  const blocks = [
    { kind: 'text', title: '一句话结论',
      body: '<strong>Scheduler 是 React 调度层的"时间管理者"，把渲染工作切成 5ms 一片，每片结束后让出主线程，配合 Lane 优先级实现"高优先级插队、低优先级延后"的可中断渲染。</strong>它本身<strong>不关心 Fiber</strong>，不关心 diff，只关心"在合适的时间、用合适的方式调用 callback"。React 通过把渲染任务封装成 callback 喂给 Scheduler，Scheduler 用 MessageChannel + 两个最小堆 + 5 级优先级 + yield 机制实现"让出-恢复-抢占"的并发语义。' },

    { kind: 'code', title: 'workLoopConcurrent 核心循环（简化）',
      code: `// React 工作循环：每一帧能执行多少 work 就执行多少，时间到了立刻让出
function workLoopConcurrent() {
  while (workInProgress !== null && !shouldYield()) {
    // shouldYield() 返回 true = 5ms 时间片用完，让出主线程
    performUnitOfWork(workInProgress);
  }
}

// shouldYield 由 Scheduler 提供，判断当前帧是否还剩足够时间
function shouldYield() {
  return performance.now() >= deadline;   // deadline = startTime + 5ms
}` },

    { kind: 'rule', ruleType: 'accent',
      text: '<strong>5ms 时间片是怎么来的？</strong>浏览器一帧 16.67ms（60fps），减去浏览器自身渲染、布局、绘制（≈ 5ms）、用户输入响应（priority input 100ms 预算）、其他任务后，<strong>留给 JS 的"安全时间"约 5ms</strong>。超过这个时间，下一帧的样式计算和绘制就会延迟，用户能感知到卡顿。React 把单次 workLoop 限制在 5ms 内，剩下 11.67ms 给浏览器绘制和用户输入，<strong>既不卡顿，又能持续推进工作</strong>。5ms 是个工程经验值，不是死规定 —— 在 120Hz 屏幕（8.33ms/帧）上可以放宽到 8ms。' },

    { kind: 'text', title: '为什么用 MessageChannel 而不是 setTimeout？',
      body: 'Scheduler 选择 <code>MessageChannel.postMessage</code> 作为"让出后恢复"的核心 API，<strong>不是为了异步，而是为了精确的"宏任务调度时机"</strong>。关键原因有三条：' },

    { kind: 'rule', ruleType: 'info',
      text: '<strong>① 最小延迟保证</strong>。<code>setTimeout(fn, 0)</code> 在浏览器中会被<strong>强制夹到 4ms</strong>（HTML5 规范，嵌套调用会夹到 10ms / 16ms），不能保证每帧只让出一次。<code>MessageChannel.postMessage</code> 没有这个夹值，<strong>延迟就是浏览器宏任务队列的实际调度延迟</strong>（通常 &lt; 1ms），更精准地实现"每帧让一次"。' },

    { kind: 'rule', ruleType: 'info',
      text: '<strong>② 不受页面失焦影响</strong>。<code>setTimeout</code> 在后台标签页会被<strong>节流到 1 秒一次</strong>，导致后台渲染完全停滞。<code>MessageChannel</code> 同样会被节流，但节流粒度更细（通常 1s vs 100ms 差异），且更可控。在用户切回前台时，MessageChannel 能更快恢复渲染队列。' },

    { kind: 'rule', ruleType: 'info',
      text: '<strong>③ 不和 requestAnimationFrame 冲突</strong>。<code>setTimeout(fn, 0)</code> 在 <code>requestAnimationFrame</code> 之后执行，可能错过当前帧的渲染窗口。<code>MessageChannel</code> 的回调被插入<strong>当前宏任务队列末尾</strong>，紧跟 rAF 之后，正好接上"渲染 → 绘制 → workLoop → 让出"的节奏。Scheduler 实际不直接用 rAF（避免和 rAF 回调重叠），而是用 MessageChannel 配合 shouldYield 实现"主动让出"。' },

    { kind: 'code', title: '两个最小堆：taskQueue vs timerQueue',
      code: `// Scheduler 内部维护两个最小堆，按任务的 startTime 升序排列
const taskQueue: Task[] = [];     // 已到期的任务，按优先级 + 序号排序
const timerQueue: Task[] = [];   // 未到期的任务（delay > 0），按 startTime 排序

function scheduleCallback(priorityLevel, callback, options) {
  const startTime = performance.now() + (options?.delay ?? 0);
  const timeout = timeoutForPriority(priorityLevel);

  const newTask = { id, callback, startTime, expirationTime, priorityLevel };
  if (startTime > currentTime) {
    // 还没到期：扔进 timerQueue
    push(timerQueue, newTask);
  } else {
    // 已到期：扔进 taskQueue
    push(taskQueue, newTask);
  }
  // 触发 MessageChannel 调度
  ensureScheduleIsHosted();
}

// 每帧 MessageChannel 回调
function channelCallback() {
  const currentTime = performance.now();
  // 1. 把 timerQueue 中到期的任务转移到 taskQueue
  advanceTimers(currentTime);
  // 2. 消费 taskQueue 中优先级最高的任务
  while (taskQueue.length > 0) {
    const task = peek(taskQueue);
    if (task.expirationTime < currentTime && currentTime - task.expirationTime > timeout) break;
    if (currentTime >= task.expirationTime && !shouldYieldToHost()) {
      // 时间够 → 执行 callback
      const callback = task.callback;
      task.callback = null;
      const continuation = callback(task.expirationTime <= currentTime);
      if (continuation !== null) {
        // 任务未完成 → 把 continuation 重新压回 taskQueue
        task.callback = continuation;
      } else {
        pop(taskQueue);
      }
    } else break;
  }
  // 3. 还有任务 → 再次调度
  if (taskQueue.length > 0 || timerQueue.length > 0) ensureScheduleIsHosted();
}` },

    { kind: 'compareTable', title: '五种优先级与对应超时',
      columns: ['优先级', 'expirationTime 偏移', '说明', '适用场景'],
      rows: [
        ['ImmediatePriority',  '−1（立即过期）',  '同步执行，永不中断',     '用户输入、flushSync、discreteEvent'],
        ['UserBlockingPriority', '250ms',          '250ms 内必须执行完',   '点击、键盘、悬停事件'],
        ['NormalPriority',     '5s',              '5s 内执行即可',         'setState、render、commit'],
        ['LowPriority',        '10s',             '10s 内执行即可',         '异步数据 fetch 完成后的 setState'],
        ['IdlePriority',       '∞（永不过期）',    '主线程空闲才执行',       '预加载、离屏组件、analytics'],
      ]
    },

    { kind: 'text', title: 'Lane 与 Scheduler 的分工',
      body: '<strong>Lane 负责"哪些更新要执行、谁的优先级高"</strong>，<strong>Scheduler 负责"什么时候把 callback 拉起来跑、跑多久让出一次"</strong>。两者通过"Lane → 优先级映射 + callback 包装"解耦：' },

    { kind: 'rule', ruleType: 'success',
      text: '<strong>分工边界</strong>：<br>• <strong>Lane 模型</strong>（在 React 内部）：<code>mergeLanes</code> / <code>getHighestPriorityLane</code> / <code>removeLanes</code> 等位运算，<strong>只关心优先级分类</strong>，<strong>不关心时间</strong>；<br>• <strong>Scheduler 模型</strong>（在 React 外部）：<code>MessageChannel</code> + 最小堆 + <code>shouldYield</code>，<strong>只关心时间调度</strong>，<strong>不关心业务</strong>；<br>• <strong>连接点</strong>：<code>ensureRootIsScheduled</code> 把根节点的 <code>eventTime / lanes / callback</code> 包装成 Scheduler 任务时，<code>lanesToSchedulerPriority(lanes)</code> 把 Lane 映射成 5 个优先级之一，再调 <code>unstable_scheduleCallback</code>。<br>这种解耦的好处是 Scheduler 可以独立升级（比如未来换成 OffscreenCanvas + Worker），React 内部只需改一处映射即可。' },

    { kind: 'code', title: 'p-react 简化版：rootScheduler',
      code: `// p-react 没有完整实现 Scheduler，只做最小可工作版本
function rootScheduler(performWork) {
  let scheduled = false;
  return function scheduleWork() {
    if (!scheduled) {
      scheduled = true;
      // 用 MessageChannel 模拟"让出"语义（生产环境应使用 Scheduler）
      channel.port1.onmessage = () => {
        scheduled = false;
        performWork();   // 一帧内同步跑完所有 work（无时间切片）
      };
      channel.port2.postMessage(null);
    }
  };
}` },
  ];

  global.renderSchedulerPrinciple = function (p) {
    return renderArticle(Object.assign({}, p, { blocks }));
  };
})(window);