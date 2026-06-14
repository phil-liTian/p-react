function renderPromiseInternals(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>Promise 是一个拥有三种状态的状态机：<strong>pending → fulfilled 或 pending → rejected</strong>，状态一旦转换不可逆。
    其核心机制是：<code>.then</code> 注册的回调被存储在 Promise 内部的回调列表中，当状态转换时，这些回调被推入微任务队列异步执行。
    理解 Promise 原理，就能解释为什么链式调用不会"嵌套回调"、为什么 Promise 一旦 resolve 就无法撤销。`);

  const principle = `
    <p><strong>三种状态与转换规则：</strong></p>
    <ul>
      <li><strong>pending（等待）：</strong>初始状态，既未 fulfilled 也未 rejected</li>
      <li><strong>fulfilled（已完成）：</strong><code>resolve(value)</code> 被调用后进入此状态，<code>value</code> 固定不变</li>
      <li><strong>rejected（已拒绝）：</strong><code>reject(reason)</code> 被调用后进入此状态，<code>reason</code> 固定不变</li>
    </ul>
    <p>状态转换是<strong>单向不可逆</strong>的：一旦从 pending 变为 fulfilled 或 rejected，后续再调用 resolve/reject 没有任何效果。</p>
    <p><strong>then 的返回值规则（链式调用的基础）：</strong></p>
    <ol style="padding-left:20px;line-height:2.2;">
      <li>如果 <code>onFulfilled</code> 返回一个普通值 <code>x</code>，新 Promise 以 <code>x</code> fulfill</li>
      <li>如果 <code>onFulfilled</code> 返回一个 Promise <code>p</code>，新 Promise 的状态跟随 <code>p</code>（称为"同化"）</li>
      <li>如果 <code>onFulfilled</code> 抛出异常 <code>e</code>，新 Promise 以 <code>e</code> reject</li>
      <li>如果没有提供 <code>onFulfilled</code>（如 <code>.then(null, onRejected)</code>），fulfilled 状态穿透到下一个 then</li>
    </ol>
    <p>正是规则 2（Promise 同化）消除了"回调地狱"——返回一个新 Promise 会自动展平，而不是嵌套。</p>`;

  const implCode = `// 手写简化版 Promise（遵循 Promises/A+ 核心规范）

const STATE = { PENDING: 'pending', FULFILLED: 'fulfilled', REJECTED: 'rejected' };

class MyPromise {
  #state = STATE.PENDING;
  #value = undefined;
  // 存储 then 注册的回调（pending 期间可能注册多个）
  #fulfilledCallbacks = [];
  #rejectedCallbacks = [];

  constructor(executor) {
    // resolve / reject 只有第一次调用有效（状态不可逆）
    const resolve = (value) => {
      if (this.#state !== STATE.PENDING) return;
      // 如果 resolve 的值本身是 Promise，需要等待它完成（同化）
      if (value instanceof MyPromise) {
        value.then(resolve, reject);
        return;
      }
      this.#state = STATE.FULFILLED;
      this.#value = value;
      // 通知所有等待中的 onFulfilled 回调（异步执行 = 微任务）
      this.#fulfilledCallbacks.forEach(cb => queueMicrotask(() => cb(value)));
    };

    const reject = (reason) => {
      if (this.#state !== STATE.PENDING) return;
      this.#state = STATE.REJECTED;
      this.#value = reason;
      this.#rejectedCallbacks.forEach(cb => queueMicrotask(() => cb(reason)));
    };

    try {
      executor(resolve, reject); // executor 同步执行
    } catch (e) {
      reject(e); // executor 内部抛出异常 → 自动 reject
    }
  }

  then(onFulfilled, onRejected) {
    // 值穿透：如果没有提供回调，保持原始值/原因传递到下一个 then
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : v => v;
    onRejected  = typeof onRejected  === 'function' ? onRejected  : r => { throw r; };

    // then 返回一个新 Promise（链式调用的关键）
    return new MyPromise((resolve, reject) => {
      const handle = (fn, settledValue) => {
        queueMicrotask(() => { // 回调必须异步（微任务）执行
          try {
            const result = fn(settledValue);
            resolve(result); // 回调返回值作为新 Promise 的 resolve 值
          } catch (e) {
            reject(e);        // 回调抛出异常 → 新 Promise reject
          }
        });
      };

      if (this.#state === STATE.FULFILLED) {
        handle(onFulfilled, this.#value);
      } else if (this.#state === STATE.REJECTED) {
        handle(onRejected, this.#value);
      } else {
        // 仍在 pending：把回调存起来，等 resolve/reject 时再调用
        this.#fulfilledCallbacks.push(v => handle(onFulfilled, v));
        this.#rejectedCallbacks.push(r => handle(onRejected, r));
      }
    });
  }

  catch(onRejected) {
    return this.then(null, onRejected);
  }

  finally(onFinally) {
    return this.then(
      value  => MyPromise.resolve(onFinally()).then(() => value),
      reason => MyPromise.resolve(onFinally()).then(() => { throw reason; }),
    );
  }

  static resolve(value) {
    if (value instanceof MyPromise) return value;
    return new MyPromise(resolve => resolve(value));
  }

  static reject(reason) {
    return new MyPromise((_, reject) => reject(reason));
  }
}`;

  const pitfallCode = `// ✗ 常见误用：Promise 构造函数内异步抛出无法被 .catch 捕获

// ✗ 错误：setTimeout 中的错误无法被 Promise.catch 捕获
const p1 = new Promise((resolve, reject) => {
  setTimeout(() => {
    throw new Error('这个错误不会被捕获'); // 变成未处理的全局异常
  }, 100);
});
p1.catch(e => console.log('catch:', e)); // 永远不会执行

// ✓ 正确：异步错误必须显式调用 reject
const p2 = new Promise((resolve, reject) => {
  setTimeout(() => {
    try {
      // 业务逻辑
      reject(new Error('正确传递给 .catch'));
    } catch (e) {
      reject(e);
    }
  }, 100);
});
p2.catch(e => console.log('catch:', e.message)); // "正确传递给 .catch"

// ✓ 更简洁：用 async/await 替代 Promise 构造函数
async function fetchData() {
  const res = await fetch('/api/data'); // 失败会自动转为 rejected Promise
  return res.json();
}
fetchData().catch(console.error);`;

  const staticCode = `// Promise 静态方法的行为差异（工程中常用）

const p1 = Promise.resolve(1);
const p2 = Promise.reject(new Error('失败'));
const p3 = Promise.resolve(3);

// all：全部成功才 resolve，一个失败立即 reject（短路）
Promise.all([p1, p3]).then(([a, b]) => console.log(a, b)); // 1 3
Promise.all([p1, p2, p3]).catch(e => console.log('all 失败:', e.message)); // "失败"

// allSettled：等待全部完成，不管成功失败（不短路）
Promise.allSettled([p1, p2, p3]).then(results => {
  results.forEach(r => {
    if (r.status === 'fulfilled') console.log('✓', r.value);
    else console.log('✗', r.reason.message);
  });
  // ✓ 1 / ✗ 失败 / ✓ 3
});

// race：第一个完成的（成功或失败）决定结果
Promise.race([
  new Promise(r => setTimeout(() => r('慢'), 200)),
  new Promise(r => setTimeout(() => r('快'), 50)),
]).then(v => console.log(v)); // "快"

// any：第一个成功的决定结果，全部失败才 reject（AggregateError）
Promise.any([p2, p1, p3]).then(v => console.log(v)); // 1（p1 是第一个 fulfill 的）`;

  const notes = [
    ruleBox('warning', `<strong>Promise.resolve 的同化陷阱：</strong><code>Promise.resolve(thenable)</code> 会"同化"任何带 <code>.then</code> 方法的对象（thenable），而不仅限于原生 Promise。这意味着 <code>Promise.resolve({ then: (r) => r(42) })</code> 会产生一个 fulfilled 值为 42 的 Promise。自定义对象如果带 <code>.then</code> 属性，传入 <code>Promise.resolve</code> 时会有意外行为——这是 Promises/A+ 规范的设计，兼容早期 jQuery 的 Deferred 对象。`),
    ruleBox('info', `<strong>未处理的 Promise rejection（unhandledrejection）：</strong>如果一个 rejected Promise 没有任何 <code>.catch</code> 或 rejection handler，浏览器会在下一个任务队列循环中触发 <code>window.unhandledrejection</code> 事件。注意：不是"立即"报错，而是有一个 microtask 的宽限期——如果在该 Promise 被创建后的同步代码中立即 <code>.catch</code>，不会触发该事件。`),
    ruleBox('success', `<strong>Promise 与取消：</strong>原生 Promise 不支持取消（一旦创建就会运行到 resolve/reject）。需要取消异步操作时使用 <code>AbortController</code>，并通过 <code>signal.aborted</code> 或 <code>signal.addEventListener('abort', ...)</code> 在 Promise executor 内部检查取消信号，手动调用 <code>reject</code>。React 18 的 Suspense 数据获取场景中，这是标准模式。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle)}
    ${section('代码示例', codeBlock('手写简化版 Promise（含链式调用核心）', 'dot-blue', 'javascript', implCode) + codeBlock('✗ 常见误用：构造函数内异步错误', 'dot-red', 'javascript', pitfallCode) + codeBlock('Promise 静态方法行为对比', 'dot-green', 'javascript', staticCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
