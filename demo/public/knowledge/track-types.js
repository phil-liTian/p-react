function renderTrackTypes(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>前端埋点按<strong>实施方式</strong>分三类：
    ① <strong>手动埋点</strong>——开发者在关键逻辑处主动调用上报 API，精度最高、维护成本最高；
    ② <strong>自动埋点（无埋点）</strong>——SDK 全量拦截 DOM 事件，零代码接入，但数据噪声大、包体增加；
    ③ <strong>可视化埋点</strong>——运营在圈选工具中点选页面元素，SDK 按选择器匹配后上报，
    介于两者之间，适合频繁变更的营销页。
    三者不互斥，实际项目常<strong>组合使用</strong>。`);

  const comparison = `
    <table style="border-collapse:collapse;width:100%;font-size:13px;">
      <thead>
        <tr style="background:var(--bg-overlay);">
          <th style="padding:8px 12px;text-align:left;border:1px solid var(--border);">维度</th>
          <th style="padding:8px 12px;text-align:left;border:1px solid var(--border);">手动埋点</th>
          <th style="padding:8px 12px;text-align:left;border:1px solid var(--border);">自动埋点</th>
          <th style="padding:8px 12px;text-align:left;border:1px solid var(--border);">可视化埋点</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:8px 12px;border:1px solid var(--border);color:var(--text-muted);font-weight:600;">数据精度</td>
          <td style="padding:8px 12px;border:1px solid var(--border);color:var(--green);">★★★ 最高</td>
          <td style="padding:8px 12px;border:1px solid var(--border);color:var(--yellow);">★★ 噪声多</td>
          <td style="padding:8px 12px;border:1px solid var(--border);color:var(--blue);">★★★ 较高</td>
        </tr>
        <tr style="background:var(--bg-overlay);">
          <td style="padding:8px 12px;border:1px solid var(--border);color:var(--text-muted);font-weight:600;">接入成本</td>
          <td style="padding:8px 12px;border:1px solid var(--border);color:var(--red);">高，逐处植入</td>
          <td style="padding:8px 12px;border:1px solid var(--border);color:var(--green);">低，引入 SDK</td>
          <td style="padding:8px 12px;border:1px solid var(--border);color:var(--yellow);">中，需圈选配置</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border:1px solid var(--border);color:var(--text-muted);font-weight:600;">迭代灵活性</td>
          <td style="padding:8px 12px;border:1px solid var(--border);color:var(--red);">改需求就要改埋点</td>
          <td style="padding:8px 12px;border:1px solid var(--border);color:var(--green);">全量采集，随时回溯</td>
          <td style="padding:8px 12px;border:1px solid var(--border);color:var(--green);">运营自助，不依赖开发</td>
        </tr>
        <tr style="background:var(--bg-overlay);">
          <td style="padding:8px 12px;border:1px solid var(--border);color:var(--text-muted);font-weight:600;">性能影响</td>
          <td style="padding:8px 12px;border:1px solid var(--border);color:var(--green);">可控，按需上报</td>
          <td style="padding:8px 12px;border:1px solid var(--border);color:var(--red);">高，全量监听所有事件</td>
          <td style="padding:8px 12px;border:1px solid var(--border);color:var(--yellow);">中，只监听圈选元素</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border:1px solid var(--border);color:var(--text-muted);font-weight:600;">典型场景</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">核心业务漏斗、转化分析</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">用户行为回放、热力图</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">营销活动、AB 测试</td>
        </tr>
      </tbody>
    </table>`;

  const manualCode = `// 手动埋点：在业务逻辑关键节点调用 track()

// 通用 track 函数（封装上报 SDK）
function track(eventName, properties = {}) {
  const payload = {
    event: eventName,
    timestamp: Date.now(),
    url: location.href,
    userId: getUser()?.id ?? 'anonymous',
    sessionId: getSessionId(),
    ...properties,
  };
  // 优先用 sendBeacon，页面卸载时也能可靠发送
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/track', JSON.stringify(payload));
  } else {
    fetch('/api/track', { method: 'POST', body: JSON.stringify(payload),
      keepalive: true }); // keepalive 保证页面关闭时请求完成
  }
}

// 使用示例
function handleCheckout() {
  track('checkout_submit', {
    cartValue: cart.total,
    itemCount: cart.items.length,
    paymentMethod: 'alipay',
  });
  submitOrder();
}

// React 中通过自定义 Hook 封装
function useTrack() {
  return useCallback((event, props) => track(event, props), []);
}`;

  const autoCode = `// 自动埋点：SDK 统一拦截 click / change / submit 事件
// 通过 XPath 或 data-track 属性标识元素

(function initAutoTrack() {
  // 方案一：事件委托，拦截所有冒泡到 document 的 click
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-track]') ?? e.target;
    track('auto_click', {
      xpath: getXPath(el),            // 唯一标识 DOM 位置
      text: el.textContent?.trim().slice(0, 50),
      tagName: el.tagName.toLowerCase(),
      dataTrack: el.dataset.track,    // 可选的业务语义标注
    });
  }, { capture: true }); // capture 确保先于业务代码执行
})();

// XPath 生成（简化版）
function getXPath(el) {
  if (!el || el === document.body) return '/body';
  const idx = [...el.parentNode.children]
    .filter(c => c.tagName === el.tagName)
    .indexOf(el) + 1;
  return getXPath(el.parentNode) + '/' + el.tagName.toLowerCase()
    + (idx > 1 ? '[' + idx + ']' : '');
}

// 在元素上打标记，提升自动埋点语义（推荐）
// <button data-track="checkout-submit-btn">结算</button>`;

  const visualCode = `// 可视化埋点：SDK 根据圈选规则（选择器 + 事件）动态绑定

// 圈选配置示例（由平台下发，存储在 CDN）
const trackingRules = [
  {
    selector: '.product-card .buy-btn',
    event: 'click',
    trackEvent: 'product_buy_click',
    properties: { source: 'list_page' },
  },
  {
    selector: '#search-input',
    event: 'change',
    trackEvent: 'search_input',
    debounce: 500,
  },
];

// SDK 启动时应用规则
function applyVisualRules(rules) {
  rules.forEach(rule => {
    const handler = debounce(e => {
      track(rule.trackEvent, {
        ...rule.properties,
        value: e.target.value,    // input 的当前值
        selector: rule.selector,
      });
    }, rule.debounce ?? 0);

    // MutationObserver 监听 DOM 变化，支持动态渲染的元素
    const observer = new MutationObserver(() => bindRule(rule, handler));
    observer.observe(document.body, { childList: true, subtree: true });
    bindRule(rule, handler);
  });
}

function bindRule(rule, handler) {
  document.querySelectorAll(rule.selector).forEach(el => {
    if (!el._tracked) {
      el.addEventListener(rule.event, handler);
      el._tracked = true; // 防止重复绑定
    }
  });
}`;

  const notes = [
    ruleBox('warning', `<strong>元素唯一标识是自动/可视化埋点的核心难题：</strong>XPath 随 DOM 结构变化而失效；CSS 类名随迭代变更。最佳实践是在关键元素上打 <code>data-trackid="stable-name"</code>，SDK 优先使用该属性，降级才用 XPath。`),
    ruleBox('info', `<strong>自动埋点性能优化：</strong>① 使用 <code>capture: true</code> + 单一事件委托，而非给每个元素绑定监听；② 将 XPath 计算推迟到空闲时间（<code>requestIdleCallback</code>）；③ 批量上报——本地攒满 N 条或每隔 T 秒统一发送，而非每次点击都请求。`),
    ruleBox('success', `<strong>组合策略（业界主流）：</strong>核心漏斗用<strong>手动埋点</strong>保证精度；PV/热力图/点击流用<strong>自动埋点</strong>全量采集；营销活动用<strong>可视化埋点</strong>让运营自助配置。三类数据在数仓中关联，形成完整的用户旅程分析。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('三类埋点对比', comparison)}
    ${section('代码示例', codeBlock('手动埋点', 'dot-green', 'javascript', manualCode) + codeBlock('自动埋点 SDK', 'dot-blue', 'javascript', autoCode) + codeBlock('可视化埋点规则引擎', 'dot-yellow', 'javascript', visualCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
