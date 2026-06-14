function renderPerfObserver(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>性能埋点的数据来源有两层：
    ① <strong>Navigation Timing API</strong>——页面加载各阶段的精确时间戳（DNS、TCP、TTFB、DOM 解析等）；
    ② <strong>PerformanceObserver</strong>——异步观察 LCP、FID/INP、CLS、Long Task、资源加载等性能条目。
    两者结合可完整还原页面性能快照，是 Web Vitals 监控和性能回归告警的数据基础。
    采集后必须<strong>关联会话与用户</strong>，才能区分"整体慢"还是"特定用户/网络环境慢"。`);

  const timingPrinciple = `
    <p><strong>Navigation Timing v2 关键节点（按时序）：</strong></p>
    <ol style="padding-left:20px;line-height:2.2;font-size:13px;">
      <li><code>navigationStart（0）</code> → <code>domainLookupStart</code>：重定向 + 缓存查找</li>
      <li><code>domainLookupStart</code> → <code>domainLookupEnd</code>：<strong>DNS 解析</strong></li>
      <li><code>connectStart</code> → <code>connectEnd</code>：<strong>TCP 握手</strong>（含 TLS）</li>
      <li><code>requestStart</code> → <code>responseStart</code>：<strong>TTFB</strong>（Time To First Byte）= 服务端处理 + 网络传输</li>
      <li><code>responseStart</code> → <code>responseEnd</code>：<strong>响应体下载</strong></li>
      <li><code>domInteractive</code>：HTML 解析完毕，JS 开始执行（可交互前）</li>
      <li><code>domContentLoadedEventEnd</code>：<strong>DCL</strong>，同步 JS 执行完毕</li>
      <li><code>loadEventEnd</code>：所有资源加载完毕（<strong>Load</strong>）</li>
    </ol>
    <p><strong>PerformanceObserver 可观察的条目类型：</strong></p>
    <ul>
      <li><code>largest-contentful-paint</code>：LCP，最大内容绘制时间</li>
      <li><code>layout-shift</code>：CLS，累计布局偏移</li>
      <li><code>first-input</code>：FID，首次输入延迟（已被 INP 取代）</li>
      <li><code>longtask</code>：主线程超过 50ms 的长任务</li>
      <li><code>resource</code>：各资源的加载时序详情</li>
      <li><code>paint</code>：FP / FCP 时间点</li>
    </ul>`;

  const timingCode = `// Navigation Timing：采集页面加载各阶段耗时

function collectNavTiming() {
  // 用 PerformanceObserver 取代已废弃的 performance.timing
  const observer = new PerformanceObserver(list => {
    const [entry] = list.getEntries(); // navigation 类型只有一条
    const t = entry;

    const metrics = {
      // DNS 解析
      dns: t.domainLookupEnd - t.domainLookupStart,
      // TCP 握手（含 TLS）
      tcp: t.connectEnd - t.connectStart,
      // TTFB：首字节时间（衡量服务端响应速度）
      ttfb: t.responseStart - t.requestStart,
      // 响应体下载
      download: t.responseEnd - t.responseStart,
      // DOM 解析到可交互
      domParse: t.domInteractive - t.responseEnd,
      // 资源加载（图片/CSS/JS）
      resourceLoad: t.loadEventStart - t.domContentLoadedEventEnd,
      // 完整 Load 事件
      totalLoad: t.loadEventEnd - t.fetchStart,
      // 导航类型：navigate / reload / back_forward / prerender
      type: t.type,
      // 协议
      protocol: t.nextHopProtocol,
    };

    reportPerf('nav_timing', metrics);
    observer.disconnect();
  });

  observer.observe({ type: 'navigation', buffered: true });
}`;

  const vitalsCode = `// PerformanceObserver：采集 Web Vitals

// LCP（Largest Contentful Paint）
function observeLCP() {
  let lcpValue = 0;
  const observer = new PerformanceObserver(list => {
    // 取最后一个条目（LCP 可能多次更新，以最终值为准）
    const entries = list.getEntries();
    lcpValue = entries[entries.length - 1].startTime;
  });
  observer.observe({ type: 'largest-contentful-paint', buffered: true });

  // 页面首次交互时停止观察，此时 LCP 已确定
  ['click', 'keydown', 'scroll'].forEach(type => {
    window.addEventListener(type, () => {
      observer.disconnect();
      reportPerf('lcp', { value: lcpValue, rating: lcpRating(lcpValue) });
    }, { once: true, capture: true, passive: true });
  });
}

// CLS（Cumulative Layout Shift）
function observeCLS() {
  let clsValue = 0;
  let sessionValue = 0;
  let sessionEntries = [];

  const observer = new PerformanceObserver(list => {
    list.getEntries().forEach(entry => {
      // 排除用户主动操作引起的偏移（如点击展开）
      if (!entry.hadRecentInput) {
        const firstEntry = sessionEntries[0];
        const lastEntry = sessionEntries[sessionEntries.length - 1];
        // 同一"会话窗口"（间隔 < 1s 且总长 < 5s）的偏移合并计算
        if (sessionEntries.length
            && entry.startTime - lastEntry.startTime < 1000
            && entry.startTime - firstEntry.startTime < 5000) {
          sessionValue += entry.value;
          sessionEntries.push(entry);
        } else {
          sessionValue = entry.value;
          sessionEntries = [entry];
        }
        clsValue = Math.max(clsValue, sessionValue);
      }
    });
  });

  observer.observe({ type: 'layout-shift', buffered: true });

  // 页面卸载时上报最终 CLS
  window.addEventListener('pagehide', () => {
    observer.disconnect();
    reportPerf('cls', { value: clsValue, rating: clsRating(clsValue) });
  }, { once: true });
}

// 评级辅助函数（按 Google 阈值）
const lcpRating = v => v <= 2500 ? 'good' : v <= 4000 ? 'needs-improvement' : 'poor';
const clsRating = v => v <= 0.1 ? 'good' : v <= 0.25 ? 'needs-improvement' : 'poor';`;

  const longTaskCode = `// Long Tasks + 资源加载耗时监控

// Long Tasks
function observeLongTasks() {
  const observer = new PerformanceObserver(list => {
    list.getEntries().forEach(entry => {
      reportPerf('long_task', {
        duration: entry.duration,
        startTime: entry.startTime,
        attribution: entry.attribution.map(a => ({
          name: a.name,
          containerType: a.containerType,
          containerSrc: a.containerSrc,
        })),
      });
    });
  });
  observer.observe({ type: 'longtask', buffered: true });
}

// 慢资源检测（加载超过阈值的资源）
function observeSlowResources(threshold = 1000) {
  const observer = new PerformanceObserver(list => {
    list.getEntries().forEach(entry => {
      const duration = entry.responseEnd - entry.startTime;
      if (duration > threshold) {
        reportPerf('slow_resource', {
          name: entry.name,
          type: entry.initiatorType, // script / img / fetch / css
          duration,
          size: entry.transferSize,
          protocol: entry.nextHopProtocol,
        });
      }
    });
  });
  observer.observe({ type: 'resource', buffered: true });
}

function reportPerf(event, metrics) {
  navigator.sendBeacon('/api/perf', JSON.stringify({
    event,
    ...metrics,
    url: location.href,
    ts: Date.now(),
    userId: getUser()?.id ?? 'anonymous',
    sessionId: getSessionId(),
    connection: navigator.connection?.effectiveType, // '4g' / '3g' / '2g'
    deviceMemory: navigator.deviceMemory,            // GB，分桶用
  }));
}`;

  const notes = [
    ruleBox('warning', `<strong>SPA 的 Navigation Timing 只采集首次加载：</strong>后续路由切换没有新的 navigation 条目。SPA 的"路由切换耗时"需要自行在路由 Hook 中用 <code>performance.mark/measure</code> 打点，测量从点击到新页面内容渲染完成的时间。`),
    ruleBox('info', `<strong>INP 采集（FID 的继任者）：</strong>INP = 所有交互的响应延迟的 P98 值（2024 年 3 月起正式纳入 Core Web Vitals）。官方推荐使用 <code>web-vitals</code> 库（<code>onINP(cb)</code>），它处理了复杂的交互分组逻辑；自己实现需要观察 <code>event</code> 类型的 PerformanceEntry（Chrome 96+）。`),
    ruleBox('success', `<strong>性能数据分层上报：</strong>P50（中位数）反映大多数用户体验；P75 是 Google Web Vitals 的评分口径；P95/P99 揭示长尾问题。单纯看均值会被极端值拉偏。用 <code>navigator.connection.effectiveType</code> 和 <code>deviceMemory</code> 分桶分析，才能找到真正的性能瓶颈用户群体。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('数据来源与 API 体系', timingPrinciple)}
    ${section('代码示例', codeBlock('Navigation Timing 采集', 'dot-blue', 'javascript', timingCode) + codeBlock('LCP / CLS 观察', 'dot-green', 'javascript', vitalsCode) + codeBlock('Long Tasks + 慢资源检测', 'dot-yellow', 'javascript', longTaskCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
