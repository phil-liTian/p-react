function renderGenerator(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>Generator 是 JS 中实现<strong>协程（Coroutine）</strong>的机制——函数可以在执行中间<em>暂停</em>并<em>交出控制权</em>，之后从同一位置恢复执行。
    <code>yield</code> 是暂停点，<code>next(value)</code> 恢复执行并向 Generator 内部传值。
    Generator 是 async/await 的底层实现基础：Babel 将 async/await 编译为 Generator + 自动执行器，理解 Generator 就理解了 async/await 的工作原理。`);

  const principle = `
    <p><strong>Generator vs 普通函数的关键差异：</strong></p>
    <ul>
      <li>普通函数：<em>Run-to-completion</em>，调用后一直执行到 return</li>
      <li>Generator 函数：可以在 <code>yield</code> 处暂停，由外部通过 <code>next()</code> 控制恢复时机和传入值</li>
    </ul>
    <p><strong>执行模型（双向通信）：</strong></p>
    <ol style="padding-left:20px;line-height:2.2;">
      <li>调用 Generator 函数返回<strong>迭代器对象</strong>（iterator），函数体<em>不执行</em></li>
      <li>第一次调用 <code>iterator.next()</code>：从头执行到第一个 <code>yield</code>，暂停，返回 <code>{ value: yieldValue, done: false }</code></li>
      <li>后续调用 <code>iterator.next(resumeValue)</code>：从上次暂停处恢复，<code>resumeValue</code> 成为上个 <code>yield</code> 表达式的返回值，执行到下一个 <code>yield</code> 或 <code>return</code></li>
      <li>遇到 <code>return</code> 或函数体结束：返回 <code>{ value: returnValue, done: true }</code></li>
    </ol>
    <p><strong>协程 vs 线程：</strong>协程是<em>用户态调度</em>，切换由代码控制（<code>yield</code>），无需操作系统介入，切换开销极小；线程是内核态调度，切换有上下文保存开销。Node.js 利用协程实现高并发 I/O，无需多线程。</p>`;

  const basicCode = `// Generator 基础：yield 暂停与 next() 恢复

function* counter(start = 0) {
  let i = start;
  while (true) {
    const reset = yield i;  // 暂停，向外传出 i；恢复时收到 next() 传入的值
    i = reset !== undefined ? reset : i + 1;
  }
}

const gen = counter(10);

console.log(gen.next());       // { value: 10, done: false }  — 从头执行到第一个 yield
console.log(gen.next());       // { value: 11, done: false }  — 恢复，reset=undefined，i++
console.log(gen.next(100));    // { value: 100, done: false } — 恢复，reset=100，i=100
console.log(gen.next());       // { value: 101, done: false }

// ── yield* 委托：将执行权转交另一个迭代器 ───────────────
function* flatten(arr) {
  for (const item of arr) {
    if (Array.isArray(item)) {
      yield* flatten(item); // 递归委托，自动展开嵌套
    } else {
      yield item;
    }
  }
}

console.log([...flatten([1, [2, [3, 4]], 5])]); // [1, 2, 3, 4, 5]

// ── return() 和 throw() 方法 ─────────────────────────────
function* safe() {
  try {
    yield 1;
    yield 2;
  } finally {
    console.log('Generator 清理'); // return()/throw() 都会触发 finally
  }
}

const g = safe();
g.next();            // { value: 1, done: false }
g.return('提前结束'); // 触发 finally，返回 { value: '提前结束', done: true }`;

  const asyncRunnerCode = `// Generator 实现异步控制流（async/await 的前身）

// 自动执行器：接受 Generator，自动调用 next()，处理 yield 出来的 Promise
function run(generatorFn) {
  return new Promise((resolve, reject) => {
    const gen = generatorFn();

    function step(nextFn, arg) {
      let result;
      try {
        result = nextFn(arg); // gen.next(val) 或 gen.throw(err)
      } catch (e) {
        reject(e); // Generator 内部同步错误
        return;
      }

      if (result.done) {
        resolve(result.value); // Generator 执行完毕
        return;
      }

      // yield 出来的应该是一个 Promise
      Promise.resolve(result.value).then(
        val => step(gen.next.bind(gen), val),       // Promise 成功 → 继续执行
        err => step(gen.throw.bind(gen), err),      // Promise 失败 → 向 Generator 内部抛错
      );
    }

    step(gen.next.bind(gen), undefined);
  });
}

// 使用自动执行器（与 async/await 写法几乎一样）
run(function* () {
  try {
    const user  = yield fetch('/api/user').then(r => r.json());  // yield Promise
    const posts = yield fetch(\`/api/posts?uid=\${user.id}\`).then(r => r.json());
    console.log(user.name, posts.length);
  } catch (err) {
    // Generator 内部的 try/catch 捕获 Promise rejection
    console.error('加载失败:', err.message);
  }
});

// Babel 将 async/await 编译后的等价形态：
// async function loadUser() { ... }  ≈  run(function* () { ... })`;

  const iteratorCode = `// Generator 作为自定义迭代器（实现 Symbol.iterator）

// 为普通对象实现懒惰分页迭代器
function* paginate(fetchPage, totalPages) {
  for (let page = 1; page <= totalPages; page++) {
    const data = yield fetchPage(page); // 暂停等待外部传入数据
    yield* data.items;                  // 将当前页的每条记录逐一 yield 出去
  }
}

// 无限斐波那契序列（懒求值，按需生成）
function* fibonacci() {
  let [a, b] = [0, 1];
  while (true) {
    yield a;
    [a, b] = [b, a + b];
  }
}

// 取前 10 个斐波那契数
function take(iter, n) {
  const result = [];
  for (const val of iter) {
    result.push(val);
    if (result.length >= n) break;
  }
  return result;
}

console.log(take(fibonacci(), 10)); // [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]

// 为自定义数据结构添加迭代器
class Range {
  constructor(start, end, step = 1) {
    this.start = start;
    this.end = end;
    this.step = step;
  }

  // 让 Range 支持 for...of 和扩展运算符
  [Symbol.iterator]() {
    return this.values();
  }

  *values() {
    for (let i = this.start; i <= this.end; i += this.step) {
      yield i;
    }
  }
}

console.log([...new Range(1, 10, 2)]); // [1, 3, 5, 7, 9]`;

  const notes = [
    ruleBox('warning', `<strong>第一次 next() 不能传参：</strong>第一次调用 <code>gen.next(value)</code> 传入的 <code>value</code> 会被忽略——因为 Generator 从函数头部开始执行，没有任何 <code>yield</code> 表达式在等待接收值。值只能从第二次 <code>next()</code> 开始传入，成为上一个 <code>yield</code> 表达式的结果。这是手写自动执行器时常见的 bug。`),
    ruleBox('info', `<strong>Generator 与 async/await 的本质关系：</strong>Babel 早期将 async/await 转译为 Generator + 执行器（如 regenerator-runtime）。现代 V8 直接在引擎层面实现 async/await，不再依赖 Generator。但理解 Generator 的暂停/恢复机制，就彻底理解了 await 为什么能"暂停函数执行"而不阻塞主线程——本质是交出控制权，由 Promise 的微任务机制在完成时调用 <code>next()</code> 恢复。`),
    ruleBox('success', `<strong>Generator 的现代用途：</strong>直接用 async/await 的场景几乎不再需要 Generator。Generator 现在主要用于：① 实现<em>自定义迭代器</em>（<code>Symbol.iterator</code>）；② 实现<em>懒求值序列</em>（无限序列、分页）；③ Redux-Saga 的 Effect 模型（yield 发出 Effect 描述，Saga 中间件解释执行）；④ 理解 async/await 的底层原理。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle)}
    ${section('代码示例', codeBlock('Generator 基础：双向通信与 yield*', 'dot-blue', 'javascript', basicCode) + codeBlock('自动执行器：async/await 的前身', 'dot-green', 'javascript', asyncRunnerCode) + codeBlock('自定义迭代器与懒求值序列', 'dot-yellow', 'javascript', iteratorCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
