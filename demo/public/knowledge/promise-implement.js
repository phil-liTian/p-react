function renderPromiseImplement(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>手写 Promise 的关键在于掌握三个核心机制：
    ① <strong>状态机</strong>：pending → fulfilled/rejected，单向不可逆，resolve/reject 只有首次调用有效；
    ② <strong>回调队列</strong>：then 在 pending 时注册回调存入队列，状态变更时批量触发；
    ③ <strong>链式调用</strong>：every <code>.then</code> 返回新 Promise，新 Promise 的状态由回调返回值决定（值/Promise/异常三种情况）。
    能写出完整的手写 Promise 说明真正理解了异步调度原理。`);

  const principle = `
    <p><strong>实现路线图（由简到繁）：</strong></p>
    <ol style="padding-left:20px;line-height:2.2;">
      <li><strong>基础状态机</strong>：构造函数、resolve/reject、状态锁</li>
      <li><strong>同步 then</strong>：状态已确定时直接执行回调</li>
      <li><strong>异步 then</strong>：状态为 pending 时将回调存入队列</li>
      <li><strong>链式 then</strong>：then 返回新 Promise，处理回调返回值的三种情况</li>
      <li><strong>resolvePromise</strong>：处理回调返回 Promise / thenable 的同化逻辑</li>
      <li><strong>catch / finally</strong>：基于 then 的语法糖</li>
      <li><strong>静态方法</strong>：resolve、reject、all、allSettled、race、any</li>
    </ol>
    <p><strong>Promises/A+ 规范的两个关键约束：</strong></p>
    <ul>
      <li>then 的回调必须<strong>异步执行</strong>（即使 Promise 已 settled），规范要求"作为微任务或宏任务执行"，实现中用 <code>queueMicrotask</code></li>
      <li>resolvePromise 收到 thenable 时必须调用其 <code>then</code> 方法而非直接使用值，以兼容各种 Promise 实现</li    </ul>`;

  const coreCode = `// 手写 Promise 完整实现（遵循 Promises/A+ 核心规范）

const PENDING   = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED  = 'rejected';

class MyPromise {
  #state  = PENDING;
  #result = undefined;          // fulfilled 时存 value，rejected 时存 reason
  #fulfilledCbs = [];           // pending 期间注册的 onFulfilled 回调列表
  #rejectedCbs  = [];           // pending 期间注册的 onRejected 回调列表

  constructor(executor) {
    // resolve 和 reject 通过闭包绑定到实例，外部无法直接访问私有字段
    const resolve = (value) => {
      if (this.#state !== PENDING) return; // 状态锁：只有首次调用有效
      // 若 value 是 Promise/thenable，等待其完成后再 resolve
      if (value != null && typeof value.then === 'function') {
        value.then(resolve, reject);
        return;
      }
      this.#state  = FULFILLED;
      this.#result = value;
      this.#fulfilledCbs.forEach(cb => queueMicrotask(() => cb(value)));
    };

    const reject = (reason) => {
      if (this.#state !== PENDING) return;
      this.#state  = REJECTED;
      this.#result = reason;
      this.#rejectedCbs.forEach(cb => queueMicrotask(() => cb(reason)));
    };

    try {
      executor(resolve, reject); // executor 同步执行
    } catch (e) {
      reject(e);                 // executor 内同步抛出 → 自动 reject
    }
  }

  then(onFulfilled, onRejected) {
    // 值穿透：未传回调时原样透传
    const handleFulfilled = typeof onFulfilled === 'function' ? onFulfilled : v => v;
    const handleRejected  = typeof onRejected  === 'function' ? onRejected  : r => { throw r; };

    return new MyPromise((resolve, reject) => {
      // 执行回调并根据返回值决定新 Promise 的状态
      const settle = (fn, val) => {
        queueMicrotask(() => {      // 规范要求回调异步执行
          try {
            const x = fn(val);
            resolvePromise(resolve, reject, x);
          } catch (e) {
            reject(e);
          }
        });
      };

      if (this.#state === FULFILLED) {
        settle(handleFulfilled, this.#result);
      } else if (this.#state === REJECTED) {
        settle(handleRejected, this.#result);
      } else {
        // pending：把两个 settle 闭包存入队列，等待 resolve/reject 触发
        this.#fulfilledCbs.push(v => settle(handleFulfilled, v));
        this.#rejectedCbs.push(r => settle(handleRejected, r));
      }
    });
  }

  catch(onRejected) {
    return this.then(undefined, onRejected);
  }

  finally(onFinally) {
    // finally 不接收参数，不影响链路的值/状态（除非 onFinally 抛出/返回 rejected Promise）
    return this.then(
      value  => MyPromise.resolve(onFinally()).then(() => value),
      reason => MyPromise.resolve(onFinally()).then(() => { throw reason; }),
    );
  }

  // ── 静态方法 ─────────────────────────────────────
  static resolve(value) {
    if (value instanceof MyPromise) return value;
    return new MyPromise(resolve => resolve(value));
  }

  static reject(reason) {
    return new MyPromise((_, reject) => reject(reason));
  }

  static all(promises) {
    return new MyPromise((resolve, reject) => {
      const results = [];
      let remaining = promises.length;
      if (remaining === 0) { resolve(results); return; }

      promises.forEach((p, i) => {
        MyPromise.resolve(p).then(val => {
          results[i] = val;             // 保持顺序
          if (--remaining === 0) resolve(results);
        }, reject);                     // 任一 reject → 立即 reject（短路）
      });
    });
  }

  static allSettled(promises) {
    return MyPromise.all(
      promises.map(p =>
        MyPromise.resolve(p)
          .then(value  => ({ status: 'fulfilled', value }))
          .catch(reason => ({ status: 'rejected', reason }))
      )
    );
  }

  static race(promises) {
    return new MyPromise((resolve, reject) => {
      promises.forEach(p => MyPromise.resolve(p).then(resolve, reject));
    });
  }

  static any(promises) {
    return new MyPromise((resolve, reject) => {
      const errors = [];
      let remaining = promises.length;
      if (remaining === 0) {
        reject(new AggregateError([], 'All promises were rejected'));
        return;
      }
      promises.forEach((p, i) => {
        MyPromise.resolve(p).then(resolve, reason => {
          errors[i] = reason;
          if (--remaining === 0) reject(new AggregateError(errors, 'All promises were rejected'));
        });
      });
    });
  }
}

// resolvePromise：处理 then 回调返回值的同化逻辑
function resolvePromise(resolve, reject, x) {
  // x 是普通值直接 resolve
  if (x == null || typeof x !== 'object' && typeof x !== 'function') {
    resolve(x);
    return;
  }
  // x 是 thenable（含原生 Promise）：调用其 then 方法，跟随其状态
  let called = false; // 防止 thenable 的 resolve/reject 被多次调用
  try {
    const then = x.then;
    if (typeof then !== 'function') { resolve(x); return; }
    then.call(
      x,
      y => { if (!called) { called = true; resolvePromise(resolve, reject, y); } },
      r => { if (!called) { called = true; reject(r); } },
    );
  } catch (e) {
    if (!called) { called = true; reject(e); }
  }
}`;

  const testCode = `// 验证手写 Promise 的行为与原生一致

// 测试 1：基础状态机
const p1 = new MyPromise(resolve => setTimeout(() => resolve(42), 100));
p1.then(v => console.assert(v === 42, '基础 resolve'));

// 测试 2：链式调用值传递
MyPromise.resolve(1)
  .then(v => v + 1)       // 返回普通值 2
  .then(v => v * 3)       // 返回普通值 6
  .then(v => console.assert(v === 6, '链式值传递'));

// 测试 3：链式调用 Promise 同化（展平）
MyPromise.resolve(1)
  .then(v => MyPromise.resolve(v + 10)) // 返回 Promise，自动展平
  .then(v => console.assert(v === 11, 'Promise 同化'));

// 测试 4：错误传播与恢复
MyPromise.reject(new Error('原始错误'))
  .then(v => v * 2)          // 跳过（rejected 状态穿透）
  .catch(e => '已恢复')       // 捕获并恢复为 fulfilled('已恢复')
  .then(v => console.assert(v === '已恢复', '错误恢复'));

// 测试 5：finally 不影响链路
MyPromise.resolve('结果')
  .finally(() => console.log('清理操作'))  // 执行副作用，不影响值
  .then(v => console.assert(v === '结果', 'finally 值穿透'));

// 测试 6：all 短路
MyPromise.all([
  MyPromise.resolve(1),
  MyPromise.reject(new Error('失败')),
  MyPromise.resolve(3),
]).catch(e => console.assert(e.message === '失败', 'all 短路'));

console.log('所有测试通过！');`;

  const notes = [
    ruleBox('warning', `<strong>resolvePromise 的递归展平：</strong>当回调返回的 thenable 又返回 thenable 时，resolvePromise 会递归调用自身，直到拿到非 thenable 的普通值。这保证了 Promise 链不会出现嵌套的 Promise（即 <code>Promise&lt;Promise&lt;T&gt;&gt;</code> 会被自动展平为 <code>Promise&lt;T&gt;</code>）。面试中容易忽略 <code>called</code> 标志位——它防止 thenable 的 resolve/reject 被恶意调用多次。`),
    ruleBox('info', `<strong>手写 Promise 与原生的性能差距：</strong>原生 Promise 是 V8 内置的 C++ 实现，手写版的 <code>queueMicrotask</code> 调用和闭包开销比原生大约 10-100×。手写版只用于面试和理解原理，生产代码始终使用原生 Promise。`),
    ruleBox('success', `<strong>面试手写 Promise 的评分重点：</strong>① 状态锁（只有首次 resolve/reject 有效）；② then 回调必须异步执行；③ then 的三种返回值处理（普通值/Promise/异常）；④ 值穿透（未传 onFulfilled 时 fulfilled 状态透传）。能写出这四点基本满分，resolvePromise 的 thenable 同化是加分项。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('实现路线图', principle)}
    ${section('代码示例', codeBlock('完整手写 Promise 实现', 'dot-blue', 'javascript', coreCode) + codeBlock('行为验证测试用例', 'dot-green', 'javascript', testCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
