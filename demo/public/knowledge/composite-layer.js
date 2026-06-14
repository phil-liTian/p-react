function renderCompositeLayer(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>浏览器将页面拆分为若干「合成层」，每层由 GPU 独立光栅化并缓存为纹理。
    动画只需移动/缩放纹理，完全绕过 CPU 的 Layout 和 Paint，实现 <strong>60fps 流畅动画</strong>。
    <code>will-change: transform</code> 和 <code>transform: translateZ(0)</code> 均可将元素提升为独立合成层。`);

  const principle = `
    <p>渲染流水线的最后一步是 <strong>Composite（合成）</strong>。主线程将页面划分为多个层（Layer），传递给合成线程（Compositor Thread），合成线程再交由 GPU 合成最终画面。</p>
    <p>关键点：<strong>合成线程运行在独立于主线程之外</strong>，即使主线程被 JavaScript 阻塞，合成动画依然流畅。这就是为什么 <code>transform</code>/<code>opacity</code> 动画不会被 JS 卡顿影响。</p>
    <p><strong>层提升（Layer Promotion）触发条件：</strong></p>
    <ul>
      <li><code>will-change: transform | opacity | left | top</code></li>
      <li><code>transform: translateZ(0)</code> 或 <code>translate3d(0,0,0)</code>（hack 写法，不推荐）</li>
      <li>CSS 动画/过渡中含有 <code>transform</code> 或 <code>opacity</code></li>
      <li><code>&lt;video&gt;</code>、<code>&lt;canvas&gt;</code>、<code>&lt;iframe&gt;</code> 元素</li>
      <li><code>position: fixed</code> 元素</li>
      <li>有 <code>z-index</code> 且兄弟节点是合成层时（层爆炸来源）</li>
    </ul>`;

  const badCode = `/* ✗ 使用 left/top 做位移动画
   每帧触发 Layout + Paint，主线程繁忙时掉帧 */
.ball {
  position: absolute;
  left: 0;
  transition: left 0.3s ease;
}
.ball.moved {
  left: 200px; /* 回流 → 重绘 → 合成，三步全走 */
}

/* ✗ 动画结束后遗忘 will-change，持续占用 GPU 内存 */
.card {
  will-change: transform; /* 页面上所有 .card 全部提升，内存爆炸 */
}`;

  const goodCode = `/* ✓ 用 transform 替代 left/top
   仅触发 Composite，跳过 Layout 和 Paint */
.ball {
  position: absolute;
  transform: translateX(0);
  transition: transform 0.3s ease;
  will-change: transform; /* 提前提升，避免第一帧重绘 */
}
.ball.moved {
  transform: translateX(200px); /* 仅合成 */
}

/* ✓ 动态加 will-change，动画结束后移除，避免内存浪费 */
el.addEventListener('mouseenter', () => {
  el.style.willChange = 'transform';
});
el.addEventListener('animationend', () => {
  el.style.willChange = 'auto'; // 释放 GPU 纹理缓存
});

/* ✓ opacity 动画也走合成层，淡入淡出不卡顿 */
.fade {
  opacity: 1;
  transition: opacity 0.25s;
  will-change: opacity;
}
.fade.hidden { opacity: 0; }`;

  const notes = [
    ruleBox('warning', `<strong>层爆炸（Layer Explosion）：</strong>若一个低 z-index 的兄弟元素是合成层，浏览器会将其上方所有重叠元素都提升为合成层（层叠上下文规则），导致内存急剧膨胀。用 Chrome DevTools → Layers 面板检查层数量，正常页面合成层不应超过几十个。`),
    ruleBox('info', `<strong>Chrome DevTools 检查方法：</strong>① Rendering 面板 → "Layer borders" 用橙线标出合成层边界；② Layers 面板查看每层内存占用；③ Performance 面板的 GPU 内存图表。`),
    ruleBox('success', `<strong>只有两个属性完全跳过 Layout 和 Paint：</strong><code>transform</code> 和 <code>opacity</code>。<code>filter</code> 部分情况下也走合成层（取决于浏览器实现）。其余所有 CSS 属性至少触发 Paint，几何属性触发 Layout。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle)}
    ${section('代码示例', codeBlock('✗ left/top 动画（触发回流）', 'dot-red', 'css', badCode) + codeBlock('✓ transform + will-change（仅合成）', 'dot-green', 'css', goodCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
