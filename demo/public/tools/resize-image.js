function renderResizeImage(t) {
  return articleShell(t, `
    ${section('工具简介', `<p>${t.summary}</p>`)}
    ${section('访问地址', `
      <a href="${t.url}" target="_blank" style="
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 18px;
        background: var(--blue-glow);
        border: 1px solid rgba(88,166,255,0.35);
        border-radius: 8px;
        color: var(--blue);
        font-size: 14px;
        font-weight: 500;
        text-decoration: none;
        transition: background 0.15s, border-color 0.15s;
      " onmouseover="this.style.background='rgba(88,166,255,0.2)'" onmouseout="this.style.background='var(--blue-glow)'">
        🔗 打开工具：${t.url}
      </a>
    `)}
    ${section('主要功能', `
      <ul class="step-list">
        <li><span class="step-num">01</span><span>上传本地图片（JPG / PNG / WebP 等常见格式）</span></li>
        <li><span class="step-num">02</span><span>输入目标宽度或高度，支持等比缩放锁定比例</span></li>
        <li><span class="step-num">03</span><span>预览缩放效果，确认后一键下载处理结果</span></li>
        <li><span class="step-num">04</span><span>完全在浏览器本地处理，图片不会上传到服务器</span></li>
      </ul>
    `)}
    ${section('提示', [
      ruleBox('success', '图片在浏览器本地完成处理，无需担心隐私问题。'),
      ruleBox('info', '适合快速调整头像、Banner、缩略图等场景，无需打开 PS / Figma 等重型工具。'),
    ].join(''))}
  `);
}
