function renderWhistle(t) {
  const quickStart = `
    <ol class="step-list">
      <li><span class="step-num">01</span><span># 全局安装<br><code>npm i -g whistle</code></span></li>
      <li><span class="step-num">02</span><span>启动代理服务<br><code>w2 start</code><br><small style="color:var(--text-muted)">默认监听 127.0.0.1:8899</small></span></li>
      <li><span class="step-num">03</span><span>浏览器 / 系统代理设置为 <code>127.0.0.1:8899</code></span></li>
      <li><span class="step-num">04</span><span>访问 <code>http://127.0.0.1:8899</code> 打开 Whistle UI</span></li>
      <li><span class="step-num">05</span><span>HTTPS 抓包：UI 顶部 → HTTPS → 下载根证书 → 系统信任</span></li>
      <li><span class="step-num">06</span><span>打开系统设置 - 代理 - 安全网页代理(服务器：127.0.0.1, 端口： 8899)</span></li>
    </ol>`;

  const rulesCode = `# mock 响应（Values 标签页新建 user.json，填入 JSON 数据）
example.com/api/user mock://{user.json}

# 重定向请求
example.com/old-path redirect://https://example.com/new-path

# 修改响应头（Values 中新建 res-headers.txt）
example.com/api resHeaders://{res-headers.txt}

# 映射到本地文件（调试本地构建产物）
example.com/bundle.js file:///Users/me/project/dist/bundle.js

# 打印请求/响应到 log（调试时常用）
example.com log://

# 模拟慢网络，delay 2 秒
example.com/api/heavy reqDelay://2000

# 注入自定义 JS 到页面
example.com/page jsAppend://{inject.js}`;

  const tips = [
    ruleBox('info', '<strong>规则生效顺序：</strong>Rules 面板中，靠上的规则优先级更高。同一域名多条规则同时生效时注意顺序。'),
    ruleBox('warning', '移动端抓包：手机与电脑连同一 WiFi → 手机 WiFi 设置手动代理 → IP 填电脑局域网 IP → 端口 8899 → 手机浏览器访问 http://电脑IP:8899/cgi-bin/rootca 安装证书。'),
    ruleBox('success', '开启 <strong>intercept HTTPS</strong> 后，whistle 充当中间人解密 HTTPS 流量。证书不受信任时浏览器会报 NET::ERR_CERT_AUTHORITY_INVALID，需手动信任根证书。'),
  ];

  return articleShell(t, `
    ${section('工具简介', `<p>${t.summary}</p>`)}
    ${section('快速上手', quickStart)}
    ${section('常用规则速查', codeBlock('whistle rules', 'dot-yellow', 'bash', rulesCode))}
    ${section('注意事项', tips.join(''))}`);
}
