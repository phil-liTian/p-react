function renderPromiseChain(t) {
  const question = ruleBox('warning',
    `<strong>结论：</strong>Promise 链式调用能消除回调地狱，依赖两条规则：
    ①<code>.then</code> 始终返回<strong>新的 Promise</strong>，新 Promise 的状态由回调的返回值决定；
    ② 错误会沿链<strong>自动向下传播</strong>，直到被某个 <code>.catch</code>（或 <code>.then(null, onRejected)</code>）捕获——捕获后链路<strong>恢复为 fulfilled</strong>，除非 catch 回调里再次抛出。
    最常见的 bug 是<em>忘记在链尾加 .catch</em>，导致静默吞掉错误。`);

  const principle = `
    <p><strong>链式调用的值流动规则（每个节点都是一个新 Promise）：</strong></p>
    <ol style="padding-left:20px;line-height:2.2;">
      <li>回调<strong>返回普通值</strong> <code>x</code> → 下游 Promise <strong>fulfilled(x)</strong></li>
      <li>回调<strong>返回 Promise p</strong> → 下游 Promise 状态<strong>跟随 p</strong>（同化，自动展平，不嵌套）</li>
      <li>回调<strong>抛出异常 e</strong> → 下游 Promise <strong>rejected(e)</strong></li>
      <li>无 <code>onFulfilled</code>（如只传了 <code>onRejected</code>）→ fulfilled 状态<strong>值穿透</strong>到下一个节点</li>
      <li>无 <code>onRejected</code>（如只传了 <code>onFulfilled</code>）→ rejected 状态<strong>错误穿透</strong>到下一个节点</li>
    </ol>
    <p><strong>错误传播机制：</strong>规则 3 + 规则 5 共同实现了"错误自动下沉"——中间节点如果没有 onRejected，rejected 状态会穿过去，一路传到最近的 <code>.catch</code>。<code>.catch(fn)</code> 本质是 <code>.then(undefined, fn)</code>，捕获后回调的返回值决定链路是否恢复。</p>
    <p><strong>链式 vs 嵌套的对比：</strong></p>
    <ul>
      <li><em>嵌套 Promise</em>（回调地狱的 Promise 版本）：在 <code>.then</code> 里创建并返回嵌套的 <code>new Promise</code>，错误处理需要每层单独写 <code>.catch</code>，层层传递极为脆弱</li>
      <li><em>链式 Promise</em>：在 <code>.then</code> 里直接返回下一个操作的 Promise，展平为线性链，一个 <code>.catch</code> 兜底全链</li>
    </ul>`;

  const basicChainCode = `// 链式调用：值流动与错误传播

fetch('/api/user')
  .then(res => {
    if (!res.ok) throw new Error(\`HTTP \${res.status}\`); // 抛出 → 下游 rejected
    return res.json(); // 返回 Promise → 同化，自动展平
  })
  .then(user => {
    console.log('用户:', user.name);
    return fetch(\`/api/posts?userId=\${user.id}\`); // 再返回一个 Promise
  })
  .then(res => res.json())
  .then(posts => {
    console.log('文章数:', posts.length);
    // 不 return → 下一个 then 收到 undefined（fulfilled(undefined)）
  })
  .catch(err => {
    // 以上任何步骤的错误都会在这里被捕获
    console.error('链路错误:', err.message);
    // catch 回调正常返回 → 链路恢复为 fulfilled
    // catch 回调再次 throw → 继续向下传播
  })
  .finally(() => {
    // finally 不接收值，不影响链路的值/状态
    // 常用于关闭 loading 状态
    setLoading(false);
  });`;

  const recoveryCode = `// 错误恢复：catch 之后链路如何继续

// 场景：主接口失败时使用降级数据
function fetchWithFallback(url, fallback) {
  return fetch(url)
    .then(res => {
      if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
      return res.json();
    })
    .catch(err => {
      console.warn('主接口失败，使用降级数据:', err.message);
      return fallback; // catch 回调返回普通值 → 链路恢复为 fulfilled(fallback)
    });
}

fetchWithFallback('/api/config', { theme: 'dark', lang: 'zh' })
  .then(config => {
    // 无论主接口成功还是失败（降级），这里都能收到配置
    applyConfig(config);
  });

// ──────────────────────────────────────────────────
// 对比：catch 内继续抛出 → 链路仍为 rejected

function fetchStrict(url) {
  return fetch(url)
    .then(res => res.json())
    .catch(err => {
      // 记录日志后重新抛出，保持 rejected 状态继续传播
      logger.error(err);
      throw err; // ← 这一行决定了错误继续传播而非被"吞掉"
    });
}`;

  const pitfallCode = `// ✗ 常见陷阱一览

// 陷阱 1：嵌套 Promise（回调地狱的 Promise 版本）
// ✗ 错误
getUser(id).then(user => {
  getPosts(user.id).then(posts => { // 嵌套！错误无法被外层 catch 捕获
    console.log(posts);
  });
});

// ✓ 正确：return 内层 Promise，展平为链式
getUser(id)
  .then(user => getPosts(user.id)) // return！
  .then(posts => console.log(posts))
  .catch(console.error);

// ──────────────────────────────────────────────────
// 陷阱 2：中途断链（then 没有 return）
// ✗ 错误
getUser(id)
  .then(user => {
    user.name = user.name.toUpperCase();
    // 忘记 return → 下一个 then 收到 undefined
  })
  .then(user => console.log(user.name)); // TypeError: Cannot read 'name' of undefined

// ✓ 正确
getUser(id)
  .then(user => ({ ...user, name: user.name.toUpperCase() })) // return!
  .then(user => console.log(user.name));

// ──────────────────────────────────────────────────
// 陷阱 3：catch 之后的 then 仍然会执行
Promise.reject('error')
  .catch(e => '已恢复') // 返回普通值 → fulfilled('已恢复')
  .then(v => console.log(v)); // 执行！输出 "已恢复"
// 如果不想 catch 后继续执行，需要在 catch 内再次 throw

// ──────────────────────────────────────────────────
// 陷阱 4：忘记在链尾加 .catch → 静默吞掉错误
// ✗ 错误（会触发 unhandledRejection 警告）
fetch('/api/data').then(res => res.json()).then(processData);

// ✓ 正确
fetch('/api/data').then(res => res.json()).then(processData).catch(console.error);`;

  const notes = [
    ruleBox('danger', `<strong>Promise 链中最危险的 bug：静默吞错误</strong>。<code>.then</code> 里如果抛了错误但链尾没有 <code>.catch</code>，错误会消失——既不打印、也不崩溃，只是什么都没发生。这在生产环境里极难排查。养成习惯：<strong>所有 Promise 链必须以 <code>.catch</code> 结尾</strong>，哪怕只是 <code>.catch(console.error)</code>。`),
    ruleBox('info', `<strong>.then(onFulfilled, onRejected) vs .then(onFulfilled).catch(onRejected) 的区别：</strong>前者的 onRejected 只能捕获上一个 Promise 的 rejection，<em>捕获不到 onFulfilled 内部抛出的错误</em>；后者的 <code>.catch</code> 可以捕获 <em>onFulfilled 内部的错误</em>。生产代码几乎总应该用后者（链尾统一 catch），而非在每个 then 里传第二个参数。`),
    ruleBox('success', `<strong>finally 的两个关键特性：</strong>① finally 回调<strong>不接收任何参数</strong>（不知道是成功还是失败），适合做清理工作（关闭弹窗、停止 loading）；② finally 回调的返回值<strong>不影响链路</strong>，状态和值直接穿透，除非 finally 里抛出异常或返回 rejected Promise，那样会覆盖原有状态。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle)}
    ${section('代码示例', codeBlock('基础链式调用：值流动与错误传播', 'dot-blue', 'javascript', basicChainCode) + codeBlock('错误恢复与降级策略', 'dot-green', 'javascript', recoveryCode) + codeBlock('✗ 四个常见陷阱', 'dot-red', 'javascript', pitfallCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
