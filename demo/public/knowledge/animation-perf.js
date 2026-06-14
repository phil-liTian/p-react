function renderAnimationPerf(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>流畅动画的核心是保持 <strong>60 fps（每帧 ≤16.6ms）</strong>，
    避免在动画帧内触发布局（Layout）和绘制（Paint）。
    三条黄金法则：① 只对 <code>transform</code> 和 <code>opacity</code> 做动画（跳过 Layout+Paint，只走 Composite）；
    ② 使用 <code>requestAnimationFrame</code> 而非 setTimeout；
    ③ 对动画元素启用合成层（<code>will-change: transform</code>）。`);

  const rafVsTimer = `
    <p><strong>为什么 rAF 优于 setTimeout？</strong></p>
    <ul>
      <li><code>setTimeout(fn, 16)</code>：定时器不精确（事件循环可能延迟），多个动画各自 setTimeout 会导致帧内多次渲染，造成撕裂</li>
      <li><code>requestAnimationFrame(fn)</code>：浏览器在下一帧绘制前调用，与屏幕刷新率同步（60/90/120 Hz 自适应），多个 rAF 在同一帧合并执行</li>
      <li><strong>页面不可见时自动暂停</strong>（Tab 切到后台），节省 CPU/GPU</li>
    </ul>
    <p><strong>FLIP 技术（First-Last-Invert-Play）：</strong></p>
    <ol style="padding-left:20px;line-height:2;">
      <li><strong>First：</strong>记录元素动画前的位置（<code>getBoundingClientRect</code>）</li>
      <li><strong>Last：</strong>将元素移动到目标位置（瞬间完成，触发 Layout）</li>
      <li><strong>Invert：</strong>用 <code>transform</code> 将元素"反向"拉回初始位置（视觉上仍在原地）</li>
      <li><strong>Play：</strong>移除 transform，触发过渡动画——只走 Composite，零 Layout 开销</li>
    </ol>
    <p>FLIP 的本质：把昂贵的 Layout 计算移到动画帧之前，动画阶段只用最快的 Composite。</p>`;

  const rafCode = `// requestAnimationFrame 动画循环
function animate(from, to, duration, onUpdate) {
  let start = null;

  function step(timestamp) {
    if (!start) start = timestamp;
    const elapsed = timestamp - start;
    const progress = Math.min(elapsed / duration, 1); // 0 → 1

    // easeOutCubic 缓动函数
    const ease = 1 - Math.pow(1 - progress, 3);
    onUpdate(from + (to - from) * ease);

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

// 使用示例：将元素从 x=0 平移到 x=300，耗时 600ms
animate(0, 300, 600, x => {
  el.style.transform = \`translateX(\${x}px)\`; // ✅ 只触发 Composite
});

// ❌ 不要用 style.left 做动画——每帧都触发 Layout
// el.style.left = x + 'px';`;

  const flipCode = `// FLIP 动画实现
function flip(el, targetClass) {
  // First：记录初始位置
  const first = el.getBoundingClientRect();

  // Last：应用变化（瞬间，允许触发 Layout）
  el.classList.add(targetClass);
  const last = el.getBoundingClientRect();

  // Invert：计算偏移，用 transform 把元素"拉回"初始位置
  const dx = first.left - last.left;
  const dy = first.top - last.top;
  const dsx = first.width / last.width;
  const dsy = first.height / last.height;

  // 取消动画，立即设置反转 transform
  el.style.transition = 'none';
  el.style.transform = \`translate(\${dx}px, \${dy}px) scale(\${dsx}, \${dsy})\`;

  // Play：下一帧移除 transform，触发 CSS transition（只走 Composite）
  requestAnimationFrame(() => {
    el.style.transition = 'transform 300ms ease';
    el.style.transform = '';
  });
}

// 在 React 中：使用 Framer Motion 的 layout prop（自动实现 FLIP）
// <motion.div layout />`;

  const willChangeCode = `// will-change 与合成层管理

// ✅ 正确用法：仅对即将动画的元素设置，动画结束后移除
el.addEventListener('mouseenter', () => {
  el.style.willChange = 'transform';
});
el.addEventListener('animationend', () => {
  el.style.willChange = 'auto'; // 动画结束，释放合成层占用的 GPU 内存
});

// CSS 写法（动画期间维持合成层）
.animated-item {
  will-change: transform; /* 创建独立合成层 */
}

// ❌ 避免在根元素或大量元素上设置 will-change
// 每个合成层约占 256×256px 纹理的显存，过多会导致"层爆炸"

// 检测过多合成层：Chrome DevTools → Layers 面板
// → 查找不必要的 "Composited Layer" 节点`;

  const notes = [
    ruleBox('warning', `<strong>只对这两个属性做动画：</strong><code>transform</code> 和 <code>opacity</code>。它们在合成线程处理，不影响主线程。改 <code>width</code>、<code>height</code>、<code>top</code>、<code>margin</code> 等属性会触发完整的 Layout → Paint → Composite 流程，帧内耗时可达 50ms+。`),
    ruleBox('info', `<strong>CSS 动画 vs JS 动画：</strong>CSS <code>transition/animation</code> 会被浏览器优化到合成线程（满足条件时），适合简单过渡；JS <code>rAF</code> 动画更灵活，适合数学曲线、物理模拟、序列动画。两者性能相当，关键在于<em>操作的属性</em>，而不是谁写的。`),
    ruleBox('success', `<strong>面试必答要点：</strong>① rAF 与显示器刷新同步，setTimeout 不准且不节能；② FLIP = Layout 前置 + Composite 执行，是复杂布局动画的最优解；③ <code>will-change</code> 是提示浏览器预先创建合成层，不能滥用（每层消耗显存）。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('rAF 原理与 FLIP 技术', rafVsTimer)}
    ${section('代码示例', codeBlock('rAF 动画循环', 'dot-blue', 'javascript', rafCode) + codeBlock('FLIP 实现', 'dot-green', 'javascript', flipCode) + codeBlock('will-change 合成层管理', 'dot-yellow', 'css', willChangeCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
