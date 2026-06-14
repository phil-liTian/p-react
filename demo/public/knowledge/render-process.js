function renderRenderProcess(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>Chrome 的渲染进程（Renderer Process）是多线程的：
    <strong>主线程</strong>负责 JS 执行、Style、Layout、Paint；
    <strong>合成线程（Compositor Thread）</strong>独立于主线程，负责图层合成和用户输入响应，
    因此 <code>transform/opacity</code> 动画即使主线程繁忙也不会卡顿。`);

  const principle = `
    <p><strong>Chrome 进程架构（多进程模型）：</strong></p>
    <ul>
      <li><strong>Browser Process（浏览器主进程）</strong>：管理 UI、标签页创建销毁、网络请求代理、存储</li>
      <li><strong>Renderer Process（渲染进程）</strong>：每个标签页（或同站多标签）独享，运行页面代码；崩溃不影响其他标签</li>
      <li><strong>GPU Process</strong>：接收来自各渲染进程的 draw call，统一由 GPU 绘制上屏</li>
      <li><strong>Network Process</strong>：独立处理网络请求（Chrome 80+ 独立进程）</li>
      <li><strong>Plugin Process</strong>：NPAPI 插件隔离（现代浏览器几乎已废弃）</li>
    </ul>
    <p><strong>渲染进程内部线程：</strong></p>
    <ul>
      <li><strong>主线程（Main Thread）</strong>：解析 HTML/CSS、执行 JS、Style、Layout、Paint（光栅化调用），<strong>单线程，是性能瓶颈所在</strong></li>
      <li><strong>合成线程（Compositor Thread）</strong>：将主线程生成的图层列表（Layer Tree）合成为最终画面，直接与 GPU Process 通信；处理 <code>scroll</code>、<code>touch</code> 等输入事件的快速响应</li>
      <li><strong>Raster 线程池</strong>：将图层内容光栅化为位图（GPU 纹理），多线程并行执行</li>
      <li><strong>I/O 线程</strong>：接收 IPC 消息</li>
    </ul>
    <p><strong>为什么 transform 动画不卡顿：</strong>主线程将图层提交给合成线程后，合成线程可以独立执行合成操作（平移、缩放、旋转图层纹理），完全不需要主线程参与，不受 JS 长任务阻塞影响。</p>`;

  const badCode = `// ✗ 在主线程上做动画，会被 JS 长任务阻断
function animate() {
  el.style.left = (parseFloat(el.style.left) || 0) + 1 + 'px'; // 触发 Layout
  requestAnimationFrame(animate);
}

// ✗ 点击事件处理器有同步长任务，导致输入延迟
button.addEventListener('click', () => {
  // 主线程被占用 500ms，合成线程的滚动仍然流畅
  // ）被推迟到长任务完成后
  const result = heavySyncComputation(); // 500ms
  updateUI(result);
});

// ✗ 强制同步布局破坏合成线程优化
function badLoop() {
  boxes.forEach(box => {
    const height = box.offsetHeight; // 强制主线程 Layout
    box.style.height = height * 2 + 'px';
  });
}`;

  const goodCode = `// ✓ 用 transform 做动画，主线程只提交图层，合成线程独立执行
.ball {
  will-change: transform;       /* 提升为合成层 */
  transform: translateX(0);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.ball.moved { transform: translateX(300px); }

// ✓ 耗时计算移到 Web Worker，不占用主线程
const worker = new Worker('heavy-task.js');
button.addEventListener('click', () => {
  updateUIImmediately();        // 主线程：立即响应视觉反馈
  worker.postMessage({ data }); // Worker：后台计算
});
worker.onmessage = ({ data: result }) => {
  updateUIWithResult(result);   // 计算完成后更新
};

// ✓ 长任务拆分：用 scheduler.yield() 让出主线程
async function processItems(items) {
  for (let i = 0; i < items.length; i++) {
    processItem(items[i]);
    // 每处理 50 项让出一次主线程，让浏览器处理输入
    if (i % 50 === 0) {
      await scheduler.yield(); // Chrome 115+，或用 setTimeout(0) 替代
    }
  }
}

// ✓ 检测长任务：PerformanceObserver 监听 longtask
const observer = new PerformanceObserver(list => {
  list.getEntries().forEach(entry => {
    if (entry.duration > 50) { // > 50ms 算长任务
      console.warn('Long task:', entry.duration.toFixed(1), 'ms', entry.name);
    }
  });
});
observer.observe({ entryTypes: ['longtask'] });`;

  const notes = [
    ruleBox('warning', `<strong>合成线程无法处理的情况：</strong>若事件监听器中调用了 <code>preventDefault()</code>，合成线程必须等待主线程确认才能执行滚动，导致滚动卡顿。解决方案：滚动/触摸监听器加 <code>{ passive: true }</code>，告诉合成线程无需等待主线程。`),
    ruleBox('info', `<strong>OffscreenCanvas：</strong>将 <code>&lt;canvas&gt;</code> 渲染移到 Worker 线程，彻底解放主线程。适合复杂图表、游戏渲染。<code>const offscreen = canvas.transferControlToOffscreen(); worker.postMessage({ canvas: offscreen }, [offscreen]);</code>`),
    ruleBox('success', `<strong>Chrome DevTools 查看线程：</strong>Performance 面板录制后，时间线顶部有 "Main"（主线程）和 "Compositor"（合成线程）两条泳道。长黄色块（>50ms）表示长任务；合成线程的 "Commit" 步骤将图层提交给 GPU。"Frames" 行中红色帧表示掉帧（>16ms）。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle)}
    ${section('代码示例', codeBlock('✗ 阻塞主线程的常见错误', 'dot-red', 'javascript', badCode) + codeBlock('✓ 合理利用合成线程与 Worker', 'dot-green', 'javascript', goodCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
