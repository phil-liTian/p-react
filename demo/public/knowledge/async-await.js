function renderAsyncAwait(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong><code>async/await</code> 是 Promise 的语法糖——<code>async</code> 函数始终返回 Promise，<code>await</code> 暂停函数执行并等待 Promise 完成，等价于 <code>.then</code> 的链式调用但写法线性易读。
    核心陷阱有两类：<strong>① 串行等待本可并行的请求</strong>（在循环里 await 是最常见的性能问题）；<strong>② try/catch 范围不对</strong>，导致某些错误没有被捕获。`);

  const principle = `
    <p><strong>async/await 的脱糖（Desugaring）：</strong></p>
    <p><code>async function</code> 在遇到 <code>await expr</code> 时，其后续代码等价于 <code>Promise.resolve(expr).then(continuation)</code>。编译器将 async 函数体切割成多个微任务回调，由 Promise 机制串联执行。</p>
    <p><strong>三条核心行为：</strong></p>
    <ol style="padding-left:20px;line-height:2.2;">
      <li><code>async</code> 函数<strong>始终返回 Promise</strong>。<code>return 42</code> 等价于 <code>return Promise.resolve(42)</code>；函数内抛出异常等价于返回 <code>Promise.reject(e)</code></li>
      <li><code>await</code> 只在 <code>async</code> 函数内有效。在普通函数里写 <code>await</code> 是语法错误</li>
      <li><code>await</code> 后面可以跟任何值，非 Promise 值会被 <code>Promise.resolve()</code> 包裹。<code>await 42</code> 合法，等价于 <code>await Promise.resolve(42)</code>，但会额外消耗一个微任务</li>
    </ol>
    <p><strong>错误处理的三种模式：</strong></p>
    <ul>
      <li><em>try/catch</em>：等价于链.catch</code>，适合需要明确分支处理的场景</li>
      <li><em>返回 <code>[error, data]</code> 元组</em>：Go 风格，避免 try/catch 嵌套，适合需要精细控制每个步骤错误的场景</li>
      <li><em>链尾 .catch</em>：直接在 async 函数调用处加 <code>.catch</code>，适合统一兜底</li>
    </ul>`;

  const basicCode = `// async/await 基础用法与脱糖对比

// async/await 写法（线性易读）
async function loadUserProfile(userId) {
  const res = await fetch(\`/api/users/\${userId}\`);
  if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
  const user = await res.json();
  const posts = await fetch(\`/api/posts?uid=\${userId}\`).then(r => r.json());
  return { user, posts };
}

// 等价的 Promise 链写法（脱糖结果）
function loadUserProfilePromise(userId) {
  return fetch(\`/api/users/\${userId}\`)
    .then(res => {
      if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
      return res.json();
    })
    .then(user => {
      return fetch(\`/api/posts?uid=\${userId}\`)
        .then(r => r.json())
        .then(posts => ({ user, posts }));
    });
}

// 调用 async 函数：返回值是 Promise，可以 .then/.catch
loadUserProfile(1)
  .then(({ user, posts }) => render(user, posts))
  .catch(err => showError(err.message));

// 或者在另一个 async 函数里 await
async function init() {
  try {
    const { user, posts } = await loadUserProfile(1);
    render(user, posts);
  } catch (err) {
    showError(err.message);
  }
}`;

  const parallelCode = `// 串行 vs 并行：最常见的性能陷阱

// ✗ 串行等待（两个互不依赖的请求被迫排队）
async function loadSerial() {
  const user  = await fetchUser(1);  // 等 user 完成…
  const posts = await fetchPosts(1); // …才开始请求 posts，总耗时 = T_user + T_posts
  return { user, posts };
}

// ✓ 并行等待（同时发起请求，总耗时 = max(T_user, T_posts)）
async function loadParallel() {
  const [user, posts] = await Pise.all([
    fetchUser(1),
    fetchPosts(1),
  ]);
  return { user, posts };
}

// ──────────────────────────────────────────────────
// ✗ 循环里 await（串行化所有请求）
async function processItemsSerial(ids) {
  const results = [];
  for (const id of ids) {
    results.push(await fetchItem(id)); // 每次循环都等待上一个完成
  }
  return results; // 总耗时 = 所有请求时间之和
}

// ✓ 并发处理所有请求（批量并发）
async function processItemsParallel(ids) {
  return Promise.all(ids.map(id => fetchItem(id))); // 全部并发，总耗时 = 最慢的那个
}

// ✓ 控制并发数（避免请求爆炸，适合 ids 很多的场景）
async function processWithLimit(ids, concurrency = 5) {
  const results = [];
  for (let i = 0; i < ids.length; i += concurrency) {
    const batch = ids.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(id => fetchItem(id)));
    results.push(...batchResults);
  }
  return results;
}`;

  const errorCode = `// 错误处理的三种模式

// ── 模式一：try/catch（标准写法） ──────────────────
async function fetchData(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
    return await res.json();
  } catch (err) {
    // 网络错误和 HTTP 错误都在这里捕获
    console.error('fetchData 失败:', err.message);
    return null; // 返回 null 表示失败，调用方自行处理
  }
}

// ── 模式二：Go 风格元组（精细控制每步错误） ─────────
// 工具函数：将 Promise 转为 [error, data] 元组
function to(promise) {
  return promise.then(data => [null, data]).catch(err => [err, null]);
}

async function loadDashboard(userId) {
  const [userErr, user] = await to(fetchUser(userId));
  if (userErr) return showError('用户加载失败');

  const [postsErr, posts] = await to(fetchPosts(userId));
  // posts 失败不阻塞渲染，降级为空列表
  if (postsErr) console.warn('文章加载失败，显示空列表');

  render(user, posts ?? []);
}

// ── 模式三：链尾 .catch（统一兜底） ──────────────────
async function bootstrap() {
  await initDB();
  await loadConfig();
  await renderApp();
}

// 调用处统一处理异常
bootstrap().catch(err => {
  console.error('启动失败:', err);
  document.body.innerHTML = '<div>应用加载失败，请刷新重试</div>';
});`;

  const notes = [
    ruleBox('warning', `<strong>await 在非 async 函数中的变通方案：</strong>模块顶层（<code>&lt;script type="module"&gt;</code>）支持 Top-level await，可以直接写 <code>const data = await fetch(...);</code>。但在普通脚本或回调函数中不能用 await，只能改用 <code>.then</code> 链或把代码移入 async 函数。常见误区：在 <code>Array.forEach</code> 回调里写 await，forEach 的回调是普通函数，await 不能让 forEach 本身等待——应改用 <code>for...of</code> 循环。`),
    ruleBox('danger', `<strong>try/catch 不能捕获未 await 的 Promise 错误：</strong><code>try { asyncFn(); } catch(e) {}</code> 中如果 <code>asyncFn()</code> 没有被 await，其内部 rejection 不会被 catch 块捕获，会变成未处理的 Promise rejection。必须写成 <code>try { await asyncFn(); } catch(e) {}</code>。这是最隐蔽的 async/await 错误处理 bug。`),
    ruleBox('success', `<strong>async 函数与 useEffect 的配合：</strong>React 的 <code>useEffect</code> 回调不能直接是 async 函数（因为 async 函数返回 Promise，而 useEffect 期望回调返回清理函数或 undefined）。正确做法是在 useEffect 内部定义并立即调用 async 函数：<code>useEffect(() => { const load = async () => { await fetch(...); }; load(); }, []);</code>。或者使用封装好的数据获取 hook（如 SWR、React Query）替代手动 fetch。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle)}
    ${section('代码示例', codeBlock('基础用法与 Promise 链脱糖对比', 'dot-blue', 'javascript', basicCode) + codeBlock('✗ 串行 vs ✓ 并行（最常见的性能陷阱）', 'dot-red', 'javascript', parallelCode) + codeBlock('错误处理的三种模式', 'dot-green', 'javascript', errorCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
