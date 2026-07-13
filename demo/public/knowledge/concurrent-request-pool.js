function renderConcurrentRequestPool(t) {
  const question = ruleBox('warning',
    `<strong>结论：</strong>当批量请求数量级到达几十、上千时，<code>Promise.all(urls.map(fetch))</code> 会瞬间把所有请求打到网络上——
    浏览器并发上限（HTTP/1.1 同域名 <strong>6</strong> 个连接）会让它们排队 pending，后端则可能因瞬时 QPS 触发限流（429）甚至打垮服务。
    <strong>请求池</strong>的核心思想是：维护一个固定大小的"在途集合"，把任务排进队列，每完成一个就补一个，直到队列清空。
    与 <code>promise-concurrency</code> 里的 worker pool 是同一思路，本篇聚焦工程化：超时、重试、取消、进度上报、与 HTTP/2 的关系。`);

  const principle = `
    <p><strong>请求池三要素：</strong></p>
    <ul>
      <li><strong>任务队列</strong>：存放待执行任务（通常是返回 Promise 的函数，<em>不是</em> Promise 实例——Promise 一旦创建就已发起）</li>
      <li><strong>在途计数</strong>：当前正在执行的请求数，初始 0，最大 <code>maxConcurrency</code></li>
      <li><strong>调度策略</strong>：何时拉取下一个任务。最常见是"完成一个补一个"（FIFO），进阶版支持优先级、超时、重试</li>
    </ul>
    <p style="margin-top:14px;"><strong>分批 vs 工作窃取：</strong></p>
    <table style="border-collapse:collapse;width:100%;font-size:13px;margin-top:8px;">
      <thead>
        <tr style="background:var(--bg-overlay);">
          <th style="padding:8px 12px;text-align:left;border:1px solid var(--border);">方案</th>
          <th style="padding:8px 12px;text-align:left;border:1px solid var(--border);">做法</th>
          <th style="padding:8px 12px;text-align:left;border:1px solid var(--border);">均衡性</th>
          <th style="padding:8px 12px;text-align:left;border:1px solid var(--border);">复杂度</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:8px 12px;border:1px solid var(--border);font-family:var(--font-code);font-size:11.5px;color:var(--accent-light);">分批（chunks）</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">把 urls 切成 N 等份，每份 <code>Promise.all</code></td>
          <td style="padding:8px 12px;border:1px solid var(--border);">差：同批内最慢的拖住整批</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">低</td>
        </tr>
        <tr style="background:var(--bg-overlay);">
          <td style="padding:8px 12px;border:1px solid var(--border);font-family:var(--font-code);font-size:11.5px;color:var(--accent-light);">工作窃取（worker pool）</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">N 个 worker 共享游标，谁先完成谁取下一个</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">好：慢任务不阻塞其他</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">中</td>
        </tr>
      </tbody>
    </table>
    <p style="margin-top:14px;"><strong>典型场景：</strong>批量图片上传、首屏图片预加载、数据同步（拉取 N 个分页）、爬虫式数据采集、批量删除/导入。</p>`;

  const baseCode = `// 基础版：worker 共享游标，控制最大并发数
async function requestPool(tasks, maxConcurrency = 6) {
  const results = new Array(tasks.length);
  let cursor = 0;

  async function worker() {
    while (cursor < tasks.length) {
      const index = cursor++;            // 先取号再 await，单线程 JS 不存在竞态
      results[index] = await tasks[index]();
    }
  }

  const workers = Array.from(
    { length: Math.min(maxConcurrency, tasks.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

// 注意：tasks 是"返回 Promise 的函数"，不是 Promise 实例
const tasks = urls.map(url => () => fetch(url).then(r => r.json()));
const data = await requestPool(tasks, 6);`;

  const prodCode = `// 生产版：超时 + 失败重试 + AbortController 取消 + 进度回调
async function advancedPool(tasks, {
  maxConcurrency = 6,
  timeout = 10000,
  retries = 2,
  onProgress,                         // (done, total, lastError?) => void
  signal,                             // 外部 AbortSignal，用于整体取消
} = {}) {
  const results = new Array(tasks.length);
  let cursor = 0;
  let done = 0;

  async function runWithRetry(task, index) {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      // 每次尝试新建一个 AbortController，超时只取消这一次请求
      const inner = new AbortController();
      const timer = setTimeout(() => inner.abort(), timeout);
      // 外部取消时联动内部
      const onOuterAbort = () => inner.abort();
      signal?.addEventListener('abort', onOuterAbort, { once: true });

      try {
        const res = await task(inner.signal);
        clearTimeout(timer);
        signal?.removeEventListener('abort', onOuterAbort);
        results[index] = res;
        done++;
        onProgress?.(done, tasks.length);
        return;
      } catch (err) {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onOuterAbort);
        if (signal?.aborted) throw err;        // 外部取消，立即终止
        if (err.name === 'AbortError' && attempt === retries) {
          // 超时且重试已用尽
        }
        lastError = err;
        // 退避：指数增加（200ms / 400ms / 800ms…）
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 200 * 2 ** attempt));
        }
      }
    }
    results[index] = { error: lastError };
    done++;
    onProgress?.(done, tasks.length, lastError);
  }

  async function worker() {
    while (cursor < tasks.length) {
      const index = cursor++;
      await runWithRetry(tasks[index], index);
    }
  }

  const workers = Array.from(
    { length: Math.min(maxConcurrency, tasks.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

// 使用
const controller = new AbortController();
const tasks = files.map(f => (signal) => uploadFile(f, { signal }));
const results = await advancedPool(tasks, {
  maxConcurrency: 5,
  timeout: 30000,
  retries: 3,
  signal: controller.signal,
  onProgress: (done, total) => updateProgressBar(done / total),
});
// 用户点"取消"时：controller.abort();`;

  const pitfallCode = `// 常见陷阱：把 Promise 实例当任务传入
const badTasks = urls.map(u => fetch(u));   // ❌ 此刻 1000 个请求已经发出
await requestPool(badTasks, 6);             // 池子已无意义

// ✓ 正确：传入"创建请求的函数"，由池决定何时调用
const goodTasks = urls.map(u => () => fetch(u));

// ──────────────────────────────────────────────────
// 陷阱二：重试时把整体 reject 传染开
async function uploadAll(files) {
  const results = await Promise.all(
    files.map(f => uploadWithRetry(f))   // 每个任务各自重试
  );
  // 若某个文件 3 次都失败，整个 Promise.all reject，已上传的进度全丢
}

// ✓ 用 allSettled + 池内重试，保留部分成功
async function uploadAllSafe(files) {
  const tasks = files.map(f => () => uploadWithRetry(f));
  const settled = await requestPool(tasks, 5);
  // settled 中失败的项自行处理，不传染
}`;

  const notes = [
    ruleBox('info',
      `<strong>HTTP/2 多路复用不消除请求池的必要性：</strong>HTTP/2 让同域名只占一条 TCP 连接、可并发多个流，浏览器 6-连接上限不再是瓶颈，<em>但</em>后端的 QPS 限流、数据库连接池、CPU 计算成本依然存在——请求池从"保护浏览器"变成"保护后端"。`),
    ruleBox('warning',
      `<strong>重试必须配退避（backoff）：</strong>失败后立即重试会在瞬时故障下放大流量（"惊群"）。常用<strong>指数退避</strong>：<code>delay = base * 2^attempt</code>，加随机抖动（jitter）避免多个客户端同步重试。`),
    ruleBox('success',
      `<strong>p-limit 源码思路（约 50 行）：</strong>内部维护 <code>activeCount</code> 和 <code>queue</code>，每次有任务完成时 <code>activeCount--</code> 并从队列 dequeue 下一个。<code>p-queue</code> 在此基础上加了优先级、暂停/恢复、事件回调。生产环境直接用这两个库，不要造轮子。`),
    ruleBox('warning',
      `<strong>AbortController 是取消的标准入口：</strong>fetch 接受 <code>signal</code> 参数，超时/整体取消/用户主动取消都应通过 abort 信号传递，而不是 <code>Promise.race + setTimeout</code>（race 不会真正取消请求，只是丢弃结果，请求仍在网络上跑）。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle)}
    ${section('代码示例',
      codeBlock('基础版：worker 共享游标', 'dot-blue', 'javascript', baseCode)
      + codeBlock('生产版：超时 / 重试 / 取消 / 进度', 'dot-green', 'javascript', prodCode)
      + codeBlock('常见陷阱：任务传错类型 + 重试传染', 'dot-red', 'javascript', pitfallCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
