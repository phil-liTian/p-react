function renderReflowRepaint(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>回流（Reflow）触发几何重新计算，代价远高于重绘（Repaint）。
    读写 DOM 几何属性（<code>offsetWidth</code>、<code>scrollTop</code>）会强制同步触发回流，
    称为 <strong>强制同步布局（Forced Synchronous Layout）</strong>，是性能杀手。`);

  const principle = `
    <p>浏览器渲染流水线：<strong>Style → Layout → Paint → Composite</strong>。</p>
    <p><strong>回流（Reflow / Layout）</strong>：元素的几何属性（尺寸、位置）发生变化，浏览器需要重新计算所有受影响节点的几何信息，并重建渲染树的布局。由于浏览器的布局是流式的，一个节点的变化可能级联影响大量祖先和兄弟节点，代价极高。</p>
    <p><strong>重绘（Repaint）</strong>：仅外观属性（颜色、背景、阴影）变化，跳过 Layout 阶段，直接进入 Paint。代价低于回流，但仍需重新光栅化受影响区域。</p>
    <p><strong>合成（Composite）</strong>：若变更的属性只影响合成层（<code>transform</code>、<code>opacity</code>），则完全跳过 Layout 和 Paint，仅由 GPU 合成，代价最低。</p>`;

  const triggerList = `
    <p><strong>常见回流触发场景：</strong></p>
    <ul>
      <li>读取几何属性：<code>offsetWidth/Height</code>、<code>clientWidth/Height</code>、<code>scrollTop/Left</code>、<code>getBoundingClientRect()</code></li>
      <li>修改几何属性：<code>width</code>、<code>height</code>、<code>margin</code>、<code>padding</code>、<code>border</code>、<code>top/left</code></li>
      <li>DOM 结构变更：增删节点、改变 <code>display</code></li>
      <li>字体大小、窗口 resize</li>
    </ul>
    <p><strong>仅触发重绘的属性：</strong><code>color</code>、<code>background-color</code>、<code>box-shadow</code>、<code>border-radius</code>（不影响尺寸时）、<code>outline</code>、<code>visibility</code>。</p>`;

  const badCode = `// ✗ 在循环中交替读写，每次读操作强制触发同步布局
const items = document.querySelectorAll('.item');
for (let i = 0; i < items.length; i++) {
  const width = items[i].offsetWidth; // 读：强制 Layout
  items[i].style.width = width + 10 + 'px'; // 写：使布局失效
  // 下次循环的读操作又强制 Layout，N 次循环 = N 次回流
}`;

  const goodCode = `// ✓ 先批量读，再批量写（读写分离）
const items = document.querySelectorAll('.item');
const widths = Array.from(items).map(el => el.offsetWidth); // 批量读（1 次布局）
items.forEach((el, i) => {
  el.style.width = widths[i] + 10 + 'px'; // 批量写（合并为 1 次布局）
});

// ✓ 使用 requestAnimationFrame 将写操作推迟到下一帧
function updateLayout() {
  requestAnimationFrame(() => {
    items.forEach(el => {
      el.style.transform = 'translateX(10px)'; // 仅触发合成，跳过 Layout/Paint
    });
  });
}

// ✓ 操作离线 DOM：DocumentFragment 或 display:none 后批量修改
const frag = document.createDocumentFragment();
data.forEach(item => {
  const el = document.createElement('li');
  el.textContent = item.name;
  frag.appendChild(el); // 操作在内存中，不触发回流
});
list.appendChild(frag); // 一次性插入，只触发 1 次回流`;

  const notes = [
    ruleBox('warning', `<strong>FastDOM：</strong>大型项目可引入 <code>fastdom</code> 库，它将所有读操作排入 <code>measure</code> 队列、写操作排入 <code>mutate</code> 队列，在每帧内自动按"先读后写"顺序执行，彻底消除强制同步布局。`),
    ruleBox('info', `<strong>Chrome DevTools 验证：</strong>Performance 面板录制后，在 Main 线程火焰图中查找紫色的 "Layout" 块。若看到大量密集的 Layout 事件，即表明存在过度回流。Timeline 中标红的 "Recalculate Style" 也需关注。`),
    ruleBox('success', `<strong>CSS 优化替代方案：</strong>位移动画优先用 <code>transform: translateX()</code> 而非修改 <code>left/top</code>；显隐切换用 <code>opacity: 0</code> + <code>pointer-events: none</code> 而非 <code>display: none</code>（前者不触发回流）；<code>will-change: transform</code> 提前将元素提升为合成层。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle + triggerList)}
    ${section('代码示例', codeBlock('✗ 强制同步布局（错误）', 'dot-red', 'javascript', badCode) + codeBlock('✓ 读写分离 + 合成层优化（正确）', 'dot-green', 'javascript', goodCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
