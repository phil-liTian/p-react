function renderErrorMonitor(t) {
  const question = ruleBox('danger',
    `<strong>结论：</strong>前端错误监控需覆盖三个层次：
    ① <strong>同步/异步 JS 错误</strong>——<code>window.onerror</code> + <code>window.addEventListener('error')</code>；
    ② <strong>未处理的 Promise 拒绝</strong>——<code>window.addEventListener('unhandledrejection')</code>；
    ③ <strong>React 渲染错误</strong>——<code>ErrorBoundary</code>（类组件 <code>componentDidCatch</code>）。
    三者互不覆盖，缺一就会有盲区。
    上报时必须携带<strong>完整堆栈 + Sourcemap 还原</strong>，否则压缩后的报错毫无定位价值。`);

  const principle = `
    <p><strong>各捕获方式的覆盖范围：</strong></p>
    <table style="border-collapse:collapse;width:100%;font-size:13px;">
      <thead>
        <tr style="background:var(--bg-overlay);">
          <th style="padding:8px 12px;text-align:left;border:1px solid var(--border);">方式</th>
          <th style="padding:8px 12px;text-align:left;border:1px solid var(--border);">覆盖场景</th>
          <th style="padding:8px 12px;text-align:left;border:1px solid var(--border);">不覆盖</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:8px 12px;border:1px solid var(--border);font-family:var(--font-code);font-size:11.5px;color:var(--accent-light);">window.onerror</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">同步错误、setTimeout/setInterval 内错误</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">Promise 错误、跨域脚本错误（只显示 Script error）</td>
        </tr>
        <tr style="background:var(--bg-overlay);">
          <td style="padding:8px 12px;border:1px solid var(--border);font-family:var(--font-code);font-size:11.5px;color:var(--accent-light);">addEventListener('error')</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">同上 + 资源加载失败（img/script/link）</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">Promise 错误</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border:1px solid var(--border);font-family:var(--font-code);font-size:11.5px;color:var(--accent-light);">unhandledrejection</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">未捕获的 Promise 拒绝（含 async/await）</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">已有 .catch() 的 Promise</td>
        </tr>
        <tr style="background:var(--bg-overlay);">
          <td style="padding:8px 12px;border:1px solid var(--border);font-family:var(--font-code);font-size:11.5px;color:var(--accent-light);">ErrorBoundary</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">React 渲染/生命周期中的错误</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">事件处理器、异步代码（需自行 try/catch）</td>
        </tr>
      </tbody>
    </table>
    <p style="margin-top:12px;"><strong>跨域脚本的 Script error 问题：</strong></p>
    <ul>
      <li>CDN 上的脚本因跨域，<code>onerror</code> 只能拿到 "Script error." 和空堆栈</li>
      <li>解法：CDN 响应头加 <code>Access-Control-Allow-Origin: *</code>，script 标签加 <code>crossorigin="anonymous"</code></li>
    </ul>`;

  const globalCode = `// 全局错误捕获（SDK 初始化时执行一次）

function initErrorMonitor() {
  // 1. 同步错误 + 资源加载失败（capture 阶段才能捕获资源错误）
  window.addEventListener('error', e => {
    if (e.target !== window) {
      // 资源加载失败（img / script / link）
      reportError({
        type: 'resource',
        tagName: e.target.tagName,
        src: e.target.src || e.target.href,
        url: location.href,
      });
      return; // 不阻止默认行为
    }
    reportError({
      type: 'js',
      message: e.message,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      stack: e.error?.stack,
    });
  }, true); // capture: true 才能捕到资源错误

  // 2. 未处理的 Promise 拒绝
  window.addEventListener('unhandledrejection', e => {
    const reason = e.reason;
    reportError({
      type: 'promise',
      message: reason?.message ?? String(reason),
      stack: reason?.stack,
      url: location.href,
    });
    // e.preventDefault(); // 可选：阻止控制台输出
  });
}

function reportError(payload) {
  const data = {
    ...payload,
    ts: Date.now(),
    ua: navigator.userAgent,
    userId: getUser()?.id ?? 'anonymous',
    sessionId: getSessionId(),
    buildId: window.__BUILD_ID__, // 构建 ID，用于匹配 Sourcemap
  };
  // 用 sendBeacon 保证页面卸载时也能送达
  navigator.sendBeacon('/api/error', JSON.stringify(data));
}`;

  const boundaryCode = `// React ErrorBoundary（类组件，React 16+）

class ErrorBoundary extends React.Component {
  state = { hasError: false, errorId: null };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // info.componentStack 是 React 组件调用链
    const errorId = crypto.randomUUID?.() ?? Date.now().toString(36);
    this.setState({ errorId });

    reportError({
      type: 'react',
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
      errorId,
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{ padding: 24, color: '#f85149' }}>
          页面渲染异常（ID: {this.state.errorId}）
        </div>
      );
    }
    return this.props.children;
  }
}

// 使用：包裹路由级组件
function App() {
  return (
    <ErrorBoundary fallback={<ErrorPage />}>
      <Router />
    </ErrorBoundary>
  );
}

// React 19 新增 createRoot 级别的 onCaughtError / onUncaughtError 回调
// const root = createRoot(el, {
//   onUncaughtError: (error, info) => reportError({ type: 'react', ... }),
// });`;

  const dedupeCode = `// 错误去重与聚合（避免同一错误刷屏）

const reportedErrors = new Map(); // errorKey → lastReportTime
const DEDUP_WINDOW = 60 * 1000;  // 60 秒内相同错误只上报一次

function dedupeReport(payload) {
  // 用 message + filename + lineno 作为指纹
  const key = [payload.message, payload.filename, payload.lineno].join('|');
  const last = reportedErrors.get(key);
  if (last && Date.now() - last < DEDUP_WINDOW) return; // 去重

  reportedErrors.set(key, Date.now());
  // 防止 Map 无限增长
  if (reportedErrors.size > 200) {
    const oldest = reportedErrors.keys().next().value;
    reportedErrors.delete(oldest);
  }

  reportError(payload);
}

// 采样（高流量下降低上报量）
function sampleReport(payload, rate = 0.1) {
  if (Math.random() < rate) reportError(payload);
}`;

  const notes = [
    ruleBox('warning', `<strong>错误信息脱敏：</strong>堆栈中可能包含 URL 参数（含 token）、用户输入内容。上报前需过滤 <code>password</code>、<code>token</code>、<code>Authorization</code> 等敏感字段。同时注意 GDPR/个人信息保护法——用户 ID 等标识符属于个人信息，需在隐私政策中告知。`),
    ruleBox('info', `<strong>Sourcemap 还原流程：</strong>① 构建时生成 <code>.map</code> 文件，上传到错误监控平台（不要公开到 CDN）；② 上报时携带 <code>buildId</code> + 压缩后的行列号；③ 平台用 <code>source-map</code> 库将 <code>lineno:colno</code> 映射回原始源码位置。Sentry 等工具已内置此流程。`),
    ruleBox('success', `<strong>错误分级策略：</strong>P0 = 影响核心链路（下单、登录）的 JS 错误，实时告警；P1 = 页面级崩溃（ErrorBoundary 触发），5 分钟内通知；P2 = 资源加载失败、非核心功能报错，每日汇总。去重后按错误指纹聚合，展示"影响用户数"而非原始上报量，更有行动价值。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('覆盖范围与原理', principle)}
    ${section('代码示例', codeBlock('全局错误捕获', 'dot-red', 'javascript', globalCode) + codeBlock('React ErrorBoundary', 'dot-blue', 'javascript', boundaryCode) + codeBlock('去重与采样', 'dot-green', 'javascript', dedupeCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
