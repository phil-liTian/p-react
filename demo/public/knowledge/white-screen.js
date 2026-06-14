function renderWhiteScreen(t) {
  const question = ruleBox('danger',
    `<strong>结论：</strong>白屏检测需要回答两个问题：
    ① <strong>页面是否渲染出了内容</strong>（视觉层面）；
    ② <strong>白屏是否是真正的故障</strong>（排除首屏骨架屏、Loading 动画等正常状态）。
    业界主流方案有三种：
    <strong>元素采样检测</strong>（轻量，主流选择）、
    <strong>MutationObserver 超时检测</strong>（早于页面稳定时触发）、
    <strong>Canvas 截图像素采样</strong>（最准确，性能开销大）。
    通常与<strong>首屏加载时间</strong>和<strong>错误监控</strong>联动，三者共同构成白屏告警链路。`);

  const principle = `
    <p><strong>白屏的成因分类：</strong></p>
    <ul>
      <li><strong>JS 报错导致渲染中断：</strong>根组件 throw，React 没有 ErrorBoundary，整棵树渲染失败</li>
      <li><strong>关键资源加载失败：</strong>入口 JS / CSS 404 或超时，页面无法执行</li>
      <li><strong>接口异常：</strong>首屏数据请求失败，业务代码未处理空数据边界，渲染空内容</li>
      <li><strong>CSP / 安全策略拦截：</strong>内联脚本或 CDN 域名被 CSP 拦截</li>
      <li><strong>兼容性问题：</strong>低版本浏览器不支持某语法，JS 解析失败</li>
    </ul>
    <p><strong>三种检测方案对比：</strong></p>
    <table style="border-collapse:collapse;width:100%;font-size:13px;margin-top:8px;">
      <thead>
        <tr style="background:var(--bg-overlay);">
          <th style="padding:8px 12px;text-align:left;border:1px solid var(--border);">方案</th>
          <th style="padding:8px 12px;text-align:left;border:1px solid var(--border);">原理</th>
          <th style="padding:8px 12px;text-align:left;border:1px solid var(--border);">优点</th>
          <th style="padding:8px 12px;text-align:left;border:1px solid var(--border);">缺点</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:8px 12px;border:1px solid var(--border);">元素采样</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">在视口九宫格取样点用 <code>elementFromPoint</code> 判断是否命中业务元素</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">轻量，不影响渲染性能</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">依赖选择器配置，骨架屏会干扰</td>
        </tr>
        <tr style="background:var(--bg-overlay);">
          <td style="padding:8px 12px;border:1px solid var(--border);">MutationObserver</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">监听根节点 DOM 变化，超时无变化则报白屏</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">无需选择器，侵入小</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">异步内容（懒加载）可能误报</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border:1px solid var(--border);">Canvas 截图</td>
          <td style="padding:8px 12px;border:1px solid var(--border);"><code>html2canvas</code> 截图后分析像素，白色占比超阈值报警</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">视觉最准确</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">性能开销大，跨域资源污染 Canvas</td>
        </tr>
      </tbody>
    </table>`;

  const samplingCode = `// 方案一：元素采样检测（推荐，业界主流）
// 在视口中取 9 个采样点，判断是否命中有效业务元素

const BLANK_SELECTORS = [
  'html', 'body', '#root', '#app', '.app-container',
  // 骨架屏元素——命中则不算白屏
  '.skeleton', '[data-skeleton]',
];

function isBlankElement(el) {
  if (!el) return true;
  const tag = el.tagName.toLowerCase();
  // 命中容器类元素或背景元素，视为未渲染有效内容
  return BLANK_SELECTORS.some(sel => el.matches?.(sel))
    || ['html', 'body'].includes(tag);
}

function checkWhiteScreen() {
  const { innerWidth: W, innerHeight: H } = window;
  // 3×3 九宫格采样点（避开边缘）
  const points = [
    [W * 0.25, H * 0.25], [W * 0.5, H * 0.25], [W * 0.75, H * 0.25],
    [W * 0.25, H * 0.5],  [W * 0.5, H * 0.5],  [W * 0.75, H * 0.5],
    [W * 0.25, H * 0.75], [W * 0.5, H * 0.75], [W * 0.75, H * 0.75],
  ];

  let blankCount = 0;
  points.forEach(([x, y]) => {
    const el = document.elementFromPoint(x, y);
    if (isBlankElement(el)) blankCount++;
  });

  const blankRatio = blankCount / points.length;
  return { isBlank: blankRatio >= 0.7, blankRatio }; // 70% 以上采样点为空则判定白屏
}

// 在页面稳定后检测（load + 额外等待，防止骨架屏干扰）
window.addEventListener('load', () => {
  setTimeout(() => {
    const { isBlank, blankRatio } = checkWhiteScreen();
    if (isBlank) {
      reportWhiteScreen({ blankRatio, method: 'sampling' });
    }
  }, 3000); // 等待 3s，给异步渲染足够时间
});`;

  const mutationCode = `// 方案二：MutationObserver 超时检测

function watchWithTimeout(timeout = 8000) {
  let hasContent = false;
  const ROOT = document.getElementById('root') ?? document.body;

  const observer = new MutationObserver(mutations => {
    // 检查是否有非空文本节点或有意义的元素被插入
    const meaningful = mutations.some(m =>
      [...m.addedNodes].some(node => {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent.trim().length > 0;
        if (node.nodeType === Node.ELEMENT_NODE) {
          const tag = node.tagName.toLowerCase();
          // 排除脚本、样式、meta 等非视觉元素
          return !['script', 'style', 'meta', 'link'].includes(tag);
        }
        return false;
      })
    );
    if (meaningful) {
      hasContent = true;
      observer.disconnect();
    }
  });

  observer.observe(ROOT, { childList: true, subtree: true });

  setTimeout(() => {
    observer.disconnect();
    if (!hasContent) {
      reportWhiteScreen({ method: 'mutation_timeout', timeout });
    }
  }, timeout);
}

// 页面加载时立即启动监测
watchWithTimeout(8000);`;

  const reportCode = `// 白屏上报：关联错误日志，构建完整诊断链路

function reportWhiteScreen(extra = {}) {
  const payload = {
    event: 'white_screen',
    url: location.href,
    ts: Date.now(),
    // 页面加载性能信息（辅助诊断是资源慢还是渲染错误）
    timing: (() => {
      const [nav] = performance.getEntriesByType('navigation');
      return nav ? {
        ttfb: nav.responseStart - nav.requestStart,
        domInteractive: nav.domInteractive,
        loadEvent: nav.loadEventEnd,
      } : null;
    })(),
    // 当前页面已报错信息（关联到错误监控）
    recentErrors: window.__errorLog?.slice(-3) ?? [],
    userId: getUser()?.id ?? 'anonymous',
    ua: navigator.userAgent,
    ...extra,
  };

  // sendBeacon 保证卸载时也能发送
  navigator.sendBeacon('/api/whitescren', JSON.stringify(payload));
  // 同时触发实时告警（P0 级别）
  console.error('[WhiteScreen]', payload);
}

// 在全局错误捕获中记录最近错误，供白屏上报关联
window.__errorLog = [];
window.addEventListener('error', e => {
  window.__errorLog.push({ msg: e.message, file: e.filename, line: e.lineno, ts: Date.now() });
  if (window.__errorLog.length > 10) window.__errorLog.shift();
});`;

  const notes = [
    ruleBox('warning', `<strong>骨架屏的干扰：</strong>骨架屏本身是有内容的 DOM，会让元素采样误判为"已渲染"。解法：① 骨架屏根节点加 <code>data-skeleton</code> 属性，采样时排除；② 延迟检测时间（超过骨架屏显示的最大时长）；③ 监听骨架屏的移除事件，移除后 500ms 再做采样。`),
    ruleBox('info', `<strong>首屏检测 vs 白屏检测的区别：</strong>首屏检测关注"<em>内容出现的时间</em>"（LCP、FMP），是性能指标；白屏检测关注"<em>内容是否出现</em>"（布尔判断），是可用性指标。两者互补：LCP 超时且白屏检测命中 → 大概率是资源加载失败或 JS 错误，可直接定性为 P0 故障。`),
    ruleBox('success', `<strong>端到端白屏告警链路：</strong>白屏上报 → 关联同 session 的错误日志 → 提取资源加载失败（404/超时） → 汇聚到告警平台 → 按小时计算白屏率（白屏 PV / 总 PV）。白屏率超过 0.1% 触发 P1 告警，超过 1% 触发 P0 紧急响应。与灰度发布系统联动，新版本上线时实时监控白屏率变化。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('成因分类与方案对比', principle)}
    ${section('代码示例', codeBlock('元素采样检测（推荐）', 'dot-red', 'javascript', samplingCode) + codeBlock('MutationObserver 超时检测', 'dot-blue', 'javascript', mutationCode) + codeBlock('白屏上报与诊断关联', 'dot-green', 'javascript', reportCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
