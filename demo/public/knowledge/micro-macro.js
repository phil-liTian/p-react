function renderMicroMacro(t) {
  const question = ruleBox('warning',
    `<strong>结论：</strong>微任务（Microtask）和宏任务（Macrotask）的核心区别在于<em>清空时机</em>：
    微任务在<strong>每次宏任务结束后立即全部清空</strong>，优先级高于下一个宏任务；
    宏任务每次 tick 只取<strong>一个</strong>执行。
    记忆口诀：<strong>宏任务 → 清空全部微任务 → 宏任务 → 清空全部微任务 → ……</strong>`);

  const principle = `
    <p><strong>常见 API 分类：</strong></p>
    <table style="border-collapse:collapse;width:100%;font-size:13px;margin-top:8px;">
      <thead>
        <tr style="background:var(--bg-overlay);">
          <th style="padding:8px 12px;text-align:left;border:1px solid var(--border);">类别</th>
          <th style="padding:8px 12px;text-align:left;border:1px solid var(--border);">API</th>
          <th style="padding:8px 12px;text-align:left;border:1px solid var(--border);">执行时机</th>
          <th style="padding:8px 12px;text-align:left;border:1px solid var(--border);">典型用途</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:8px 12px;border:1px solid var(--border);color:var(--blue);" rowspan="3">微任务</td>
          <td style="padding:8px 12px;border:1px solid var(--border);font-family:var(--font-code);font-size:11.5px;">Promise.then / catch / finally</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">当前宏任务结束后立即</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">异步链式操作</td>
        </tr>
        <tr style="background:var(--bg-overlay);">
          <td style="padding:8px 12px;border:1px solid var(--border);font-family:var(--font-code);font-size:11.5px;">queueMicrotask(fn)</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">当前宏任务结束后立即</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">低延迟异步调度</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border:1px solid var(--border);font-family:var(--font-code);font-size:11.5px;">MutationObserver</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">当前宏任务结束后立即</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">DOM 变化监听</td>
        </tr>
        <tr style="background:var(--bg-overlay);">
          <td style="padding:8px 12px;border:1px solid var(--border);color:var(--yellow);" rowspan="4">宏任务</td>
          <td style="padding:8px 12px;border:1px solid var(--border);font-family:var(--font-code);font-size:11.5px;">setTimeout / setInterval</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">定时器到期后，下一次 tick</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">延迟/周期执行</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border:1px solid var(--border);font-family:var(--font-code);font-size:11.5px;">MessageChannel</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">下一次 tick（比 setTimeout 更精确）</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">React Scheduler 使用</td>
        </tr>
        <tr style="background:var(--bg-overlay);">
          <td style="padding:8px 12px;border:1px solid var(--border);font-family:var(--font-code);font-size:11.5px;">UI 事件（click / input）</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">事件触发时入队，下次 tick 执行</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">用户交互</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border:1px solid var(--border);font-family:var(--font-code);font-size:11.5px;">requestAnimationFrame</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">渲染前（微任务之后）</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">动画更新</td>
        </tr>
      </tbody>
    </table>
    <p style="margin-top:14px;"><strong>async/await 的本质：</strong><code>await expr</code> 等同于 <code>Promise.resolve(expr).then(continuation)</code>，<code>await</code> 之后的代码是微任务回调。async 函数在遇到 <code>await</code> 时同步返回一个 Promise，执行权回到调用方，<code>await</code> 右侧的 Promise 完成后把后续代码推入微任务队列。</p>`;

  const orderCode = `// 经典执行顺序题：预测输出

async function asyncFn() {
  console.log('B'); // 同步（async 函数体在 await 之前同步执行）
  await Promise.resolve();
  console.log('D'); // 微任务（await 之后 = Promise.then 回调）
}

console.log('A');   // 同步
asyncFn();          // 调用：同步执行到 await
console.log('C');   // 同步（asyncFn 在 await 处挂起后，控制权回到这里）

// 输出: A → B → C → D
//
// 分析：
// ① A（同步） → asyncFn() 开始执行
// ② B（async 函数体同步部分）
// ③ await Promise.resolve() → 将 "D 之后的代码" 包装成微任务，asyncFn 挂起
// ④ C（同步，asyncFn 挂起后控制权回到主调）
// ⑤ 同步代码全部执行完 → 清空微任务队列
// ⑥ D（微任务）`;

  const nestedCode = `// 嵌套 Promise 的执行顺序（易错题）

Promise.resolve()
  .then(() => {
    console.log(1);
    // 在微任务中再创建一个 Promise.then → 追加到微任务队列尾部
    Promise.resolve().then(() => console.log(2));
  })
  .then(() => console.log(3));

// 输出: 1 → 2 → 3
//
// 分析（微任务队列变化）：
// 初始：[then(→log1)]
// 执行 log1 → 产生新微任务 then(→log2)，同时外层链的 then(→log3) 也进队
// 队列：[then(→log2), then(→log3)]
// 执行 log2
// 执行 log3

// ⚠️ 注意：Promise 链的 .then 是按链式顺序注册的，
// 内层嵌套的 then 在注册时机上晚于外层链的下一个 then，
// 所以 2 在 3 之前还是之后取决于它们进队的相对顺序`;

  const mixCode = `// 综合题：setTimeout + Promise + async/await 混合

console.log('start');

setTimeout(() => console.log('timeout'), 0);

new Promise(resolve => {
  console.log('promise executor'); // Promise executor 是同步的！
  resolve();
}).then(() => {
  console.log('then 1');
}).then(() => {
  console.log('then 2');
});

async function foo() {
  await null; // await null 等价于 await Promise.resolve(null)
  console.log('async after await');
}

foo();
console.log('end');

// 输出: start → promise executor → end → then 1 → async after await → then 2 → timeout
//
// 关键点：
// - Promise executor 同步执行（不是微任务！）
// - await null 产生一个微任务（await 之后 = then 回调）
// - "async after await" 和 "then 1" 都是第一批微任务，
//   但 "then 1" 先注册，所以先执行
// - "then 2" 是 "then 1" 执行后才能注册，所以是第二批微任务
// - "timeout" 是宏任务，最后执行`;

  const notes = [
    ruleBox('danger', `<strong>Promise executor 是同步的，这是最常见的误解：</strong><code>new Promise(executor)</code> 中的 executor 函数<em>立即同步执行</em>，只有 <code>.then / .catch</code> 回调才是异步微任务。面试题 <code>new Promise(r => { console.log(1); r(); }).then(() => console.log(2)); console.log(3);</code> 的输出是 1 → 3 → 2，而非 3 → 1 → 2。`),
    ruleBox('info', `<strong>async/await 与原生 Promise.then 的微任务数量差异：</strong>在 V8 早期实现中，<code>async/await</code> 需要额外的 Promise 包装，会比同等的 <code>Promise.then</code> 多产生 1-2 个微任务（导致执行顺序与预期不符）。这个问题在 V8 7.2+ (Node.js 12+) 中已修复，现在 <code>await</code> 与 <code>Promise.then</code> 的微任务数量完全一致。`),
    ruleBox('success', `<strong>queueMicrotask 的实用场景：</strong>需要"在当前同步代码完成后、但在任何宏任务（包括 setTimeout 0）之前"执行某操作时，用 <code>queueMicrotask</code> 比 <code>Promise.resolve().then</code> 更语义清晰，且性能略好（不创建 Promise 对象）。例如：批量 DOM 更新去重（收集本轮所有变更，统一在微任务中刷新一次）。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle)}
    ${section('代码示例', codeBlock('async/await 执行顺序基础', 'dot-blue', 'javascript', orderCode) + codeBlock('嵌套 Promise 的微任务队列变化', 'dot-yellow', 'javascript', nestedCode) + codeBlock('综合混合顺序题（setTimeout + Promise + async）', 'dot-red', 'javascript', mixCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
