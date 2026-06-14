function renderLongTasks(t) {
  const question = ruleBox('warning',
    `<strong>结论：</strong>Long Task 是指在主线程上执行超过 <strong>50ms</strong> 的任务
    （Chrome PerformanceObserver 的定义），期间浏览器无法响应用户输入，
    导致 INP（Interaction to Next Paint）恶化、页面"假死"感。
    优化策略：① <strong>拆分任务</strong>（Task Splitting），将长任务拆成多个短任务，
    用 <code>scheduler.yield()</code> 或 <code>setTimeout(0)</code> 让出主线程；
    ② <strong>下放任务</strong>（Web Worker），将计算移出主线程；
    ③ <strong>推迟非关键任务</strong>（<code>requestIdleCallback</code>）。`);

  const principle = `
    <p><strong>为什么 50ms 是阈值？</strong></p>
    <ul>
      <li>用户感知延迟阈值约 100ms；从用户操作到主线程可响应的"预算"是 50ms（另 50ms 用于渲染）</li>
      <li>超过 50ms 的任务会导致帧丢失，INP 评分变差（Google Core Web Vitals）</li>
    </ul>
    <p><strong>三种优化手段对比：</strong></p>
    <table style="border-collapse:collapse;width:100%;font-size:13px;margin-top:8px;">
      <thead>
        <tr style="background:var(--bg-overlay);">
          <th style="padding:8px 12px;text-align:left;border:1px solid var(--border);">方案</th>
          <th style="padding:8px 12px;text-align:left;border:1px solid var(--border);">适用场景</th>
          <th style="padding:8px 12px;text-align:left;border:1px solid var(--border);">优点</th>
          <th style="padding:8px 12px;text-align:left;border:1px solid var(--border);">缺点</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:8px 12px;border:1px solid var(--border);"><code>scheduler.yield()</code></td>
          <td style="padding:8px 12px;border:1px solid var(--border);">主线程上的可拆分循环</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">保留优先级上下文，让出后恢复快</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">Chrome 129+ 实验性 API</td>
        </tr>
        <tr style="background:var(--bg-overlay);">
          <td style="padding:8px 12px;border:1px solid var(--border);"><code>setTimeout(fn, 0)</code></td>
          <td style="padding:8px 12px;border:1px solid var(--border);">兼容性要求高，简单任务拆分</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">通用，无需 polyfill</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">最小 4ms 延迟，无优先级感知</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border:1px solid var(--border);">Web Worker</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">CPU 密集计算（图像处理、加密、搜索）</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">完全不阻塞主线程</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">无法访问 DOM，postMessage 有序列化开销</td>
        </tr>
        <tr style="background:var(--bg-overlay);">
          <td style="padding:8px 12px;border:1px solid var(--border);"><code>requestIdleCallback</code></td>
          <td style="padding:8px 12px;border:1px solid var(--border);">分析、预加载、非关键更新</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">利用浏览器空闲时间，零影响关键路径</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">Safari 不支持，无执行时间保证</td>
        </tr>
      </tbody>
    </table>`;

  const yieldCode = `// 方案 1：scheduler.yield()（推荐，Chrome 129+）
// 让出主线程后，高优先级任务（用户输入）可以插队

async function processLargeDataset(items) {
  const results = [];

  for (let i = 0; i < items.length; i++) {
    results.push(heavyProcess(items[i]));

    // 每处理 50 条让出一次主线程
    if (i % 50 === 0) {
      await scheduler.yield(); // 等待下一个任务调度点
    }
  }

  return results;
}

// 方案 2：setTimeout(0) 分块处理（兼容方案）
function processInChunks(items, chunkSize = 50) {
  return new Promise(resolve => {
    const results = [];
    let index = 0;

    function processChunk() {
      const end = Math.min(index + chunkSize, items.length);

      while (index < end) {
        results.push(heavyProcess(items[index++]));
      }

      if (index < items.length) {
        setTimeout(processChunk, 0); // 让出主线程再继续
      } else {
        resolve(results);
      }
    }

    processChunk();
  });
}

// 封装通用 yield 工具（兼容两种 API）
function yieldToMain() {
  if ('scheduler' in window && 'yield' in scheduler) {
    return scheduler.yield();
  }
  return new Promise(resolve => setTimeout(resolve, 0));
}`;

  const ricCode = `// requestIdleCallback：在浏览器空闲时执行非关键任务

function scheduleNonCritical(tasks) {
  const queue = [...tasks];

  function runWhenIdle(deadline) {
    // deadline.timeRemaining() 返回当前帧剩余时间（ms）
    while (queue.length > 0 && deadline.timeRemaining() > 1) {
      const task = queue.shift();
      task();
    }

    if (queue.length > 0) {
      // 还有任务，等下次空闲时继续
      requestIdleCallback(runWhenIdle, { timeout: 2000 }); // 最晚 2s 必须执行
    }
  }

  requestIdleCallback(runWhenIdle, { timeout: 2000 });
}

// 使用场景：预加载下一页数据
scheduleNonCritical([
  () => prefetchRoute('/dashboard'),
  () => warmupCache(userPreferences),
  () => sendAnalyticsBeacon(pageData),
]);

// Safari polyfill（用 setTimeout 降级）
const rIC = window.requestIdleCallback ?? (cb => setTimeout(() => cb({ timeRemaining: () => 50 }), 1));`;

  const observeCode = `// 使用 PerformanceObserver 监测 Long Tasks
const observer = new PerformanceObserver(list => {
  for (const entry of list.getEntries()) {
    console.warn(\`Long Task detected: \${entry.duration.toFixed(1)}ms\`, {
      startTime: entry.startTime,
      attribution: entry.attribution, // 哪段脚本导致的
    });

    // 上报到监控平台
    analytics.track('long_task', {
      duration: entry.duration,
      url: entry.attribution[0]?.containerSrc,
    });
  }
});

observer.observe({ type: 'longtask', buffered: true });

// 用 performance.mark/measure 定位具体代码段
performance.mark('myTask:start');
heavyOperation();
performance.mark('myTask:end');
performance.measure('myTask', 'myTask:start', 'myTask:end');
// 在 Chrome DevTools → Performance 面板的 Timings 轨道中可见`;

  const notes = [
    ruleBox('warning', `<strong>React 并发模式的本质就是 Long Task 拆分：</strong>Fiber 架构将渲染拆成可中断的工作单元（每个 Fiber 节点一个单元），每帧开始时检查是否还有剩余时间（<code>shouldYield()</code>），没有则暂停让出主线程，下帧继续。这正是 <code>scheduler</code> 包的核心职责。`),
    ruleBox('info', `<strong>INP 优化优先级：</strong>① 先用 PerformanceObserver 找到超过 200ms 的 INP 事件；② 在 DevTools Performance 面板定位对应的 Long Task；③ 优先拆分 event handler 本身（输入延迟），其次优化渲染阶段（呈现延迟）。`),
    ruleBox('success', `<strong>面试要点：</strong>Long Task ≥ 50ms；优化三板斧 = 拆分（yield） + 下放（Worker） + 推迟（rIC）；React Concurrent Mode 是框架层的 Long Task 拆分；INP 是 2024 年替代 FID 的新 Core Web Vitals，与主线程响应性直接挂钩。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理与方案对比', principle)}
    ${section('代码示例', codeBlock('任务拆分（scheduler.yield / setTimeout）', 'dot-yellow', 'javascript', yieldCode) + codeBlock('requestIdleCallback（非关键任务）', 'dot-blue', 'javascript', ricCode) + codeBlock('PerformanceObserver 监测', 'dot-green', 'javascript', observeCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
