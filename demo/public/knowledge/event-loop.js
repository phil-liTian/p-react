function renderEventLoop(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>Event Loop 是 JS 单线程执行异步任务的核心机制。
    它的工作模型可以用一句话概括：<strong>执行当前同步代码 → 清空微任务队列 → 渲染（如果需要）→ 取出一个宏任务执行 → 重复</strong>。
    理解 Event Loop 就是理解"为什么 <code>setTimeout(fn, 0)</code> 不是立刻执行"、"为什么 <code>Promise.then</code> 比 <code>setTimeout</code> 先执行"的根本原因。`);

  const principle = `
    <p><strong>浏览器进程模型（事件循环所在的上下文）：</strong></p>
    <p>JS 运行在浏览器的<strong>渲染进程</strong>中，渲染进程只有<strong>一个主线程</strong>负责执行 JS、处理布局、绘制。主线程不能同时做两件事，所以所有"异步"操作（网络、定时器、I/O）都由其他线程（网络线程、定时器线程等）完成后，将回调<em>排入任务队列</em>，等主线程空闲时取出执行。</p>
    <p><strong>Event Loop 的完整循环（一次 tick）：</strong></p>
    <ol style="padding-left:20px;line-height:2;">
      <li>执行<strong>调用栈（Call Stack）</strong>中的所有同步代码，直到栈清空</li>
      <li>依次取出<strong>微任务队列（Microtask Queue）</strong>中的全部任务执行，直到队列清空（执行过程中产生的新微任务也在本轮处理）</li>
      <li>若有待渲染帧（frame budget 到期且 DOM 有变化）：执行 <code>requestAnimationFrame</code> 回调 → 执行渲染流水线（Style → Layout → Paint → Composite）</li>
      <li>从<strong>宏任务队列（Task Queue / Macrotask Queue）</strong>取出<strong>一个</strong>任务执行</li>
      <li>回到步骤 1，开始下一次循环</li>
    </ol>
    <p><strong>关键数据结构：</strong></p>
    <ul>
      <li><strong>Call Stack</strong>：同步执行栈，后进先出（LIFO）。函数调用时入栈，返回时出栈。</li>
      <li><strong>Microtask Queue</strong>：高优先级异步队列。Promise.then、queueMicrotask、MutationObserver 回调进入此队列。每次宏任务结束后<em>全部</em>清空。</li>
      <li><strong>Task Queue（Macrotask）</strong>：普通异步队列。setTimeout、setInterval、I/O、UI 事件回调进入此队列。每次 tick 只取<em>一个</em>。</li>
    </ul>`;

  const basicCode = `// Event Loop 执行顺序演示

console.log('1 - 同步');

setTimeout(() => console.log('4 - setTimeout（宏任务）'), 0);

Promise.resolve()
  .then(() => console.log('3 - Promise.then（微任务）'));

console.log('2 - 同步');

// 输出顺序: 1 → 2 → 3 → 4
//
// 执行过程：
// ① 调用栈：执行 console.log('1') → console.log('2')（同步）
// ② setTimeout 注册定时器（交给定时器线程），到期后回调进入宏任务队列
// ③ Promise.resolve().then 将回调放入微任务队列
// ④ 调用栈清空 → 清空微任务队列：执行 console.log('3')
// ⑤ 取出一个宏任务：执行 console.log('4')`;

  const stackOverflowCode = `// 调用栈溢出 vs 异步递归

// ✗ 同步递归：调用栈无限增长 → Stack Overflow
function syncRecursion(n) {
  return syncRecursion(n + 1); // RangeError: Maximum call stack size exceeded
}

// ✓ 异步递归：每次回调执行完毕后调用栈已清空，不会溢出
function asyncRecursion(n) {
  console.log(n);
  // 将下一次调用放入宏任务队列，当前调用栈返回后才执行
  setTimeout(() => asyncRecursion(n + 1), 0);
}
asyncRecursion(0); // 可以持续运行，不会溢出

// ✓ 更现代的方案：scheduler.yield()（Chrome 129+）
// 主动让出主线程，让浏览器有机会处理用户输入和渲染
async function yieldingLoop(items) {
  for (const item of items) {
    processItem(item);
    // 每处理一项后检查是否需要让出主线程
    if (shouldYield()) {
      await scheduler.yield(); // 等同于 await new Promise(r => setTimeout(r, 0))
    }
  }
}`;

  const rafCode = `// requestAnimationFrame 在 Event Loop 中的位置
// rAF 回调在微任务清空之后、渲染之前执行

let start = null;

function animate(timestamp) {
  if (!start) start = timestamp;
  const elapsed = timestamp - start;

  // 在这里更新 DOM，浏览器会在本帧渲染时应用变更
  element.style.transform = \`translateX(\${Math.min(elapsed / 10, 200)}px)\`;

  if (elapsed < 2000) {
    requestAnimationFrame(animate); // 注册下一帧
  }
}

requestAnimationFrame(animate);

// 对比 setTimeout(fn, 16)：
// rAF 由浏览器决定时机（通常与显示器刷新率同步，60Hz = 16.67ms）
// setTimeout 是固定延迟，但受 Event Loop 繁忙程度影响，实际延迟可能更长
// 动画务必用 rAF，不要用 setTimeout`;

  const notes = [
    ruleBox('warning', `<strong>Node.js 的 Event Loop 与浏览器不同：</strong>Node.js 中多了 <code>setImmediate</code>（I/O 阶段之后）和 <code>process.nextTick</code>（比 Promise.then 优先级更高的微任务）。面试中区分浏览器和 Node.js 环境非常重要——题目没说明时默认是浏览器行为。`),
    ruleBox('info', `<strong>微任务队列清空的"无限递归"陷阱：</strong>微任务执行过程中产生的新微任务会在<em>本轮</em>继续执行，直到队列彻底清空。如果微任务中无限产生新微任务（如 <code>function loop() { Promise.resolve().then(loop); } loop();</code>），页面将永远无法渲染，出现卡死现象。宏任务没有这个问题——每次 tick 只取一个宏任务。`),
    ruleBox('success', `<strong>Event Loop 与 React 调度的关系：</strong>React 18 的并发模式利用宏任务（<code>MessageChannel</code> 或 <code>setTimeout</code>）分割渲染工作，每个宏任务执行一小段 Fiber 协调，让出主线程以响应用户输入。这正是 Event Loop 单次 tick 只取<em>一个</em>宏任务的机制在发挥作用——React 通过把任务切成多个宏任务来实现"可中断渲染"。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle)}
    ${section('代码示例', codeBlock('基础执行顺序（宏任务 vs 微任务）', 'dot-blue', 'javascript', basicCode) + codeBlock('调用栈溢出与异步递归', 'dot-red', 'javascript', stackOverflowCode) + codeBlock('rAF 与 Event Loop 的关系', 'dot-green', 'javascript', rafCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
