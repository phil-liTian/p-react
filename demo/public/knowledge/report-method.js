function renderReportMethod(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>三种上报方式各有适用场景：
    <strong>sendBeacon</strong> 是页面卸载场景的首选——异步、不阻塞卸载、浏览器保证发送；
    <strong>img pixel（1×1 GIF）</strong>兼容性最好，适合纯 GET 的轻量上报；
    <strong>fetch / XHR</strong> 功能最全，支持大数据量和自定义 headers，但页面卸载时可能被中断。
    实际工程中通常<strong>优先 Beacon，降级 img，批量场景用 fetch</strong>。`);

  const principle = `
    <p><strong>三种方式对比：</strong></p>
    <table style="border-collapse:collapse;width:100%;font-size:13px;margin-top:8px;">
      <thead>
        <tr style="background:var(--bg-overlay);">
          <th style="padding:8px 12px;text-align:left;border:1px solid var(--border);">方式</th>
          <th style="padding:8px 12px;text-align:left;border:1px solid var(--border);">原理</th>
          <th style="padding:8px 12px;text-align:left;border:1px solid var(--border);">卸载可靠性</th>
          <th style="padding:8px 12px;text-align:left;border:1px solid var(--border);">数据大小限制</th>
          <th style="padding:8px 12px;text-align:left;border:1px solid var(--border);">兼容性</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:8px 12px;border:1px solid var(--border);font-family:var(--font-code);font-size:11.5px;color:var(--accent-light);">sendBeacon</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">浏览器后台异步 POST，不阻塞卸载，浏览器接管发送</td>
          <td style="padding:8px 12px;border:1px solid var(--border);color:var(--green);">✓ 最可靠</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">≤ 64KB（实现相关）</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">IE 不支持，现代浏览器全覆盖</td>
        </tr>
        <tr style="background:var(--bg-overlay);">
          <td style="padding:8px 12px;border:1px solid var(--border);font-family:var(--font-code);font-size:11.5px;color:var(--accent-light);">img pixel</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">创建 &lt;img&gt; 节点，URL 带参数，发送 GET 请求</td>
          <td style="padding:8px 12px;border:1px solid var(--border);color:var(--yellow);">△ 较可靠</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">URL 长度限制（≤2KB）</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">全浏览器支持，含 IE6+</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border:1px solid var(--border);font-family:var(--font-code);font-size:11.5px;color:var(--accent-light);">fetch / XHR</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">标准 HTTP 请求，支持 POST + JSON body</td>
          <td style="padding:8px 12px;border:1px solid var(--border);color:var(--red);">✗ 卸载时被取消</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">无实际限制</td>
          <td style="padding:8px 12px;border:1px solid var(--border);">fetch IE 不支持，XHR 全支持</td>
        </tr>
      </tbody>
    </table>
    <p style="margin-top:14px;"><strong>sendBeacon 的核心优势——为什么它"保证发送"：</strong></p>
    <p>普通的 <code>fetch</code>/<code>XHR</code> 请求归属于页面的生命周期。浏览器在卸载页面时会取消所有 pending 请求。
    <code>sendBeacon</code> 的请求由<strong>浏览器进程接管</strong>，独立于页面线程，即便页面已销毁，浏览器仍会尝试完成发送。
    因此 <code>pagehide</code>、<code>visibilitychange: hidden</code>、<code>beforeunload</code> 等卸载事件中，Beacon 是唯一可靠选择。</p>
    <p><strong>img pixel 的适用场景：</strong>不需要响应体（服务端返回 1×1 透明 GIF）；数据量小（能 URL 编码进去）；需要兼容旧版浏览器；
    常用于第三方统计脚本（Google Analytics 早期版本就是这个方案）。</p>`;

  const beaconCode = `// sendBeacon：页面卸载场景的标准方案

class BeaconReporter {
  constructor(url) {
    this.url = url;
  }

  send(data) {
    const payload = JSON.stringify(data);
    const blob = new Blob([payload], { type: 'application/json' });

    // sendBeacon 返回 false 表示数据太大或队列已满
    const ok = navigator.sendBeacon(this.url, blob);
    if (!ok) {
      // 降级：尝试同步 XHR（仅在 beforeunload 中有效，不推荐）
      this._syncFallback(payload);
    }
    return ok;
  }

  _syncFallback(payload) {
    // 只在卸载场景下才应该使用同步 XHR
    const xhr = new XMLHttpRequest();
    xhr.open('POST', this.url, false); // false = 同步
    xhr.setRequestHeader('Content-Type', 'application/json');
    try {
      xhr.send(payload);
    } catch (e) {
      // 同步 XHR 在部分场景也可能失败，静默处理
    }
  }
}

// 在页面卸载时批量发送队列中的事件
const reporter = new BeaconReporter('/api/track');

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    // visibilitychange: hidden 比 beforeunload 更早触发，兼容移动端 Safari
    reporter.send({ events: eventQueue.flush(), ts: Date.now() });
  }
});`;

  const imgCode = `// img pixel：兼容性最好的轻量上报

function imgReport(url, params) {
  const qs = new URLSearchParams({
    ...params,
    _t: Date.now(), // 防缓存
  }).toString();

  const fullUrl = \`\${url}?\${qs}\`;

  // URL 长度校验（2048 是业界安全线）
  if (fullUrl.length > 2048) {
    console.warn('[imgReport] URL too long, fallback to beacon');
    navigator.sendBeacon(url, JSON.stringify(params));
    return;
  }

  const img = new Image();
  // 不需要处理 onload / onerror：img pixel 上报本身就是"尽力而为"
  img.src = fullUrl;
}

// 示例调用
imgReport('https://track.example.com/pixel.gif', {
  event: 'page_view',
  page: location.pathname,
  uid: getUserId(),
});`;

  const fetchCode = `// fetch 批量上报：大数据量场景，非卸载时使用

class BatchReporter {
  constructor(url, { maxSize = 20, flushInterval = 5000 } = {}) {
    this.url = url;
    this.queue = [];
    this.maxSize = maxSize;
    // 定时批量上报（降低请求频率）
    this.timer = setInterval(() => this.flush(), flushInterval);
  }

  push(event) {
    this.queue.push(event);
    if (this.queue.length >= this.maxSize) {
      this.flush(); // 队列满则立即上报
    }
  }

  async flush() {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0); // 原子取出，防止竞态

    try {
      await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: batch, ts: Date.now() }),
        // keepalive: true 让请求在页面卸载后继续（有 64KB 限制）
        keepalive: true,
      });
    } catch {
      // 网络失败：放回队列，等下次 flush 重试
      this.queue.unshift(...batch);
    }
  }

  destroy() {
    clearInterval(this.timer);
    this.flush(); // 销毁前尝试最后一次上报
  }
}

// 使用
const tracker = new BatchReporter('/api/events');
tracker.push({ type: 'click', target: '#btn-buy', ts: Date.now() });`;

  const notes = [
    ruleBox('warning', `<strong>fetch keepalive 的陷阱：</strong><code>fetch({ keepalive: true })</code> 允许请求在页面卸载后继续，但有 <strong>64KB 的 body 限制</strong>（与 Beacon 类似）。超出时浏览器会静默丢弃请求，不报错。批量队列必须在 flush 前检查总体积，超出时拆包或降级使用 Beacon。`),
    ruleBox('info', `<strong>CORS 对上报的影响：</strong>img pixel 是 GET 请求，无需 CORS 预检；sendBeacon 发送 <code>text/plain</code> 类型可绕过预检（简单请求），但发送 <code>application/json</code> 会触发 OPTIONS 预检。线上监控平台通常让 Beacon 端点接受 <code>text/plain</code> body（内容仍是 JSON 字符串），规避预检延迟。`),
    ruleBox('success', `<strong>推荐组合策略：</strong>① <em>卸载/离开场景</em>：sendBeacon（优先）→ keepalive fetch（降级）；② <em>实时单条上报</em>：img pixel（兼容）或 Beacon；③ <em>批量高频事件</em>：内存队列 + 定时 fetch flush + visibilitychange 时强制 Beacon flush。这套组合在各种网络和浏览器条件下都能保证最大上报完整性。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle)}
    ${section('代码示例', codeBlock('sendBeacon（卸载场景首选）', 'dot-green', 'javascript', beaconCode) + codeBlock('img pixel（兼容性兜底）', 'dot-yellow', 'javascript', imgCode) + codeBlock('fetch 批量上报（常规场景）', 'dot-blue', 'javascript', fetchCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
