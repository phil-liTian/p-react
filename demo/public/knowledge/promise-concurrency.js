function renderPromiseConcurrency(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>Promise 的四个静态并发方法解决不同的"多任务协调"需求：
    <strong>all</strong> —— 全成功才成功（一失败立即失败）；
    <strong>allSettled</strong> —— 等所有完成，不管成败（永不 reject）；
    <strong>race</strong> —— 第一个完成（成功或失败）就结束；
    <strong>any</strong> —— 第一个<em>成功</em>的就结束，全失败才 reject（AggregateError）。
    工程中还有一类需求原生方法覆盖不了：<strong>限制最大并发数</strong>，需要自行实现并发池。`);

  const principle = `
    <p><strong>四个方法的行为矩阵：</strong></p>
    <table style="border-collapse:collapse;width:100%;font-size:13px;margin-top:8px;">
      <thead>
        <tr style="background:var(--bg-overlay);">
          <th style="padding:8px 12px;text-align:left;border:1px solid var(--border);">方法</th>
          <th style="padding:8px 12px;text-align:left;border:1px solid var(--border);">resolve 条件</th>
          <th style="padding:8px 12px;text-align:left;border:1px solid var(--border);">reject 条件</th>
          <th style="padding:8px 12px;text-align:left;border:1px solid var(--border);">返回值</th>
          <th style="padding:8px 12px;text-align:left;border:1px solid var(--border);">典型用途</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:8px 12px;border:1px solid var(--border);font-family:var(--font-code);font-size:11.5px;color:var(--accent-light);">Promise.all</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">全部 fulfilled</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">任一 rejected（短路）</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">结果数组（顺序与输入一致）</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">批量并行，全部成功才继续</td>
        </tr>
        <tr style="background:var(--bg-overlay);">
          <td style="padding:8px 12px;border:1px solid var(--border);font-family:var(--font-code);font-size:11.5px;color:var(--accent-light);">Promise.allSettled</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">全部 settled（永不 reject）</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">—</td>
          <td style="padding:8px 12px;border:1px solid var(--border);"><code>[{status, value/reason}]</code></td>
          <td style="padding:8px 12px;border:1px solid var(--border);">批量操作，需知道每条结果</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border:1px solid var(--border);font-family:var(--font-code);font-size:11.5px;color:var(--accent-light);">Promise.race</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">最快的 settled（成功或失败）</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">最快的是 rejected</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">最快那个的值或原因</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">超时控制、竞速</td>
        </tr>
        <tr style="background:var(--bg-overlay);">
          <td style="padding:8px 12px;border:1px solid var(--border);font-family:var(--font-code);font-size:11.5px;color:var(--accent-light);">Promise.any</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">最快的 fulfilled</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">全部 rejected（AggregateError）</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">最快成功那个的值</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">多源冗余、容错请求</td>
        </tr>
      </tbody>
    </table>
    <p style="margin-top:14px;"><strong>空数组行为（边界情况）：</strong></p>
    <ul>
      <li><code>Promise.all([])</code> → 立即 <strong>fulfilled([])</strong></li>
      <li><code>Promise.allSettled([])</code> → 立即 <strong>fulfilled([])</strong></li>
      <li><code>Promise.race([])</code> → 永远 pending（因为没有任何 Promise 来 settle）</li>
      <li><code>Promise.any([])</code> → 立即 <strong>rejected(AggregateError)</strong>（没有任何 Promise 能 fulfill）</li>
    </ul>`;

  const coreUsageCode = `// 四个方法的典型用场景

// all：页面初始化，并行加载所有依赖，全部就绪才渲染
async function initDashboard(userId) {
  const [user, config, permissions] = await Promise.all([
    fetchUser(userId),
    fetchConfig(),
    fetchPermissions(userId),
  ]);
  // 三者全部成功才执行到这里
  renderDashboard(user, config, permissions);
}

// allSettled：批量操作，需要知道每条的成败（不能因为一条失败就放弃其余）
async function batchDelete(ids) {
  const results = await Promise.allSettled(
    ids.map(id => deleteItem(id))
  );
  const failed = results
    .filter(r => r.status === 'rejected')
    .map((r, i) => ({ id: ids[i], reason: r.reason.message }));

  if (failed.length > 0) {
    showWarning(\`\${failed.length} 条删除失败\`, failed);
  }
  return results.filter(r => r.status === 'fulfilled').length; // 成功数量
}

// race：请求超时控制
function fetchWithTimeout(url, ms = 5000) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(\`请求超时 (\${ms}ms)\`)), ms)
  );
  return Promise.race([fetch(url), timeout]);
}

// any：多 CDN 冗余请求，取最快成功的
function fetchFromAnyCDN(path) {
  const cdns = ['https://cdn1.example.com', 'https://cdn2.example.com', 'https://cdn3.example.com'];
  return Promise.any(cdns.map(base => fetch(\`\${base}/\${path}\`).then(r => r.json())));
}`;

  const concurrencyLimitCode = `// 并发限制池：控制同时进行的最大请求数

// 场景：批量上传 1000 张图片，最多同时上传 5 张，防止请求爆炸
async function runWithConcurrencyLimit(tasks, limit) {
  const results = new Array(tasks.length);
  let index = 0; // 下一个待执行的 task 索引

  // 创建 limit 个"工作协程"，每个不断取任务执行
  async function worker() {
    while (index < tasks.length) {
      const taskIndex = index++;           // 原子取号（单线程 JS 不存在真正竞态）
      results[taskIndex] = await tasks[taskIndex]();
    }
  }

  // 启动 min(limit, tasks.length) 个 worker，等待全部完成
  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, worker)
  );

  return results;
}

// 使用示例
const imageFiles = getImages(); // 假设有 1000 张

const uploadTasks = imageFiles.map(file => () => uploadImage(file)); // 注意：任务是函数，不是 Promise

const uploaded = await runWithConcurrencyLimit(uploadTasks, 5);
console.log(\`上传完成：\${uploaded.length} 张\`);

// ──────────────────────────────────────────────────
// 更简洁的分批方案（不需要精确控制，接受同批内全部并发）
async function runInBatches(tasks, batchSize) {
  const results = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize).map(fn => fn());
    results.push(...await Promise.all(batch));
  }
  return results;
}`;

  const pitfallCode = `// all 的短路陷阱与 allSettled 的正确选择

// ✗ 用 all 处理允许部分失败的场景
async function loadWidgets(ids) {
  // 任意一个 widget 加载失败 → 整个页面数据全丢
  const widgets = await Promise.all(ids.map(fetchWidget));
  return widgets; // 不合理：一个失败导致全部数据丢失
}

// ✓ 用 allSettled，自行处理每个结果
async function loadWidgetsSafe(ids) {
  const results = await Promise.allSettled(ids.map(fetchWidget));
  return results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { id: ids[i], error: r.reason.message, fallback: true }
  );
}

// ──────────────────────────────────────────────────
// race 的"幽灵请求"问题：race 结束后，其他 Promise 仍在执行
// 仅 race 的结果被使用，但请求本身无法取消
function fetchWithTimeoutAndCleanup(url, ms = 5000) {
  const controller = new AbortController();

  const request = fetch(url, { signal: controller.signal }).then(r => r.json());
  const timeout = new Promise((_, reject) =>
    setTimeout(() => {
      controller.abort(); // 真正取消请求（网络层）
      reject(new Error('超时'));
    }, ms)
  );

  return Promise.race([request, timeout]);
}`;

  const notes = [
    ruleBox('warning', `<strong>Promise.all 的结果顺序与输入顺序一致，与完成顺序无关：</strong>即使第三个 Promise 最先 fulfill，<code>all</code> 返回的数组中它仍然在索引 2 的位置。这是 Promise.all 的规范要求，可以安全地依赖这个顺序来解构结果。`),
    ruleBox('info', `<strong>AggregateError（Promise.any 全部失败时）：</strong><code>err.errors</code> 是一个数组，包含所有 rejection 的原因，顺序与输入 Promise 一致。需要 Chrome 85+ / Node.js 15+，老环境需要 polyfill。注意 <code>AggregateError</code> 的 message 是 "All promises were rejected"，具体原因要从 <code>err.errors</code> 中取。`),
    ruleBox('success', `<strong>p-limit、p-queue 等库：</strong>如果项目中频繁需要并发控制，直接引入 <code>p-limit</code>（限制同时并发数）或 <code>p-queue</code>（优先级队列 + 限速）比自行实现更健壮。<code>p-limit</code> 只有约 50 行代码，值得阅读源码——其内部原理与上面的工作协程方案完全一致。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle)}
    ${section('代码示例', codeBlock('四个方法的典型使用场景', 'dot-blue', 'javascript', coreUsageCode) + codeBlock('并发限制池（自定义并发数）', 'dot-green', 'javascript', concurrencyLimitCode) + codeBlock('✗ all 短路陷阱与 race 幽灵请求', 'dot-red', 'javascript', pitfallCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
