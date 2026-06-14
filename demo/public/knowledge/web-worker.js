function renderWebWorker(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>Web Worker 在独立线程中运行 JS，通过 <code>postMessage</code> 与主线程通信，<strong>完全不阻塞 UI 渲染</strong>。
    <strong>SharedArrayBuffer</strong> 允许多个 Worker 共享同一块内存，配合 <code>Atomics</code> 实现无消息传递的高性能并发。
    适用场景：CPU 密集型计算（图像处理、加密、大数据解析）。`);

  const principle = `
    <p><strong>Web Worker 限制：</strong></p>
    <ul>
      <li>无法访问 DOM、<code>window</code>、<code>document</code>（Worker 没有渲染上下文）</li>
      <li>可使用：<code>fetch</code>、<code>IndexedDB</code>、<code>WebSocket</code>、<code>setTimeout</code>、<code>Canvas</code>（OffscreenCanvas）</li>
      <li><code>postMessage</code> 传递的数据默认被<strong>结构化克隆（Structured Clone）</strong>——深拷贝，适合普通对象；传输大数据用 <strong>Transferable Objects</strong>（ArrayBuffer、MessagePort），零拷贝转移所有权</li>
    </ul>
    <p><strong>Worker 类型：</strong></p>
    <ul>
      <li><strong>Dedicated Worker</strong>（专用）：一对一，仅创建它的页面可通信</li>
      <li><strong>Shared Worker</strong>：多个同源页面共享，通过 <code>MessagePort</code> 通信</li>
      <li><strong>Service Worker</strong>：生命周期独立于页面，拦截网络请求，实现离线缓存（PWA）</li>
    </ul>
    <p><strong>SharedArrayBuffer 安全要求（COOP + COEP）：</strong>为防止 Spectre 攻击，使用 SharedArrayBuffer 的页面必须设置两个响应头：
    <code>Cross-Origin-Opener-Policy: same-origin</code> 和 <code>Cross-Origin-Embedder-Policy: require-corp</code>，
    使页面进入跨源隔离模式（<code>crossOriginIsolated = true</code>）。</p>`;

  const workerCode = `// ── worker.js（Worker 脚本）──────────────────────────────────────────────────
self.addEventListener('message', ({ data }) => {
  const { type, payload } = data;

  if (type === 'PROCESS_DATA') {
    // CPU 密集型计算，不阻塞主线程
    const result = heavyComputation(payload);
    self.postMessage({ type: 'RESULT', payload: result });
  }

  if (type === 'PROCESS_BUFFER') {
    // 处理 Transferable ArrayBuffer（零拷贝）
    const view = new Float64Array(payload.buffer);
    for (let i = 0; i < view.length; i++) view[i] *= 2;
    // 将处理后的 buffer 转移回主线程（所有权转移，worker 不再持有）
    self.postMessage({ type: 'BUFFER_DONE', buffer: view.buffer }, [view.buffer]);
  }
});

function heavyComputation(data) {
  // 模拟耗时计算（如 FFT、图像卷积、JSON 解析）
  return data.map(x => Math.sqrt(x) * Math.PI);
}

// ── main.js（主线程）────────────────────────────────────────────────────────
class WorkerPool {
  constructor(url, size = navigator.hardwareConcurrency || 4) {
    this.workers = Array.from({ length: size }, () => new Worker(url));
    this.queue = [];
    this.idle = [...this.workers];
  }

  run(data, transfer = []) {
    return new Promise((resolve, reject) => {
      const task = { data, transfer, resolve, reject };
      if (this.idle.length > 0) {
        this._dispatch(this.idle.pop(), task);
      } else {
        this.queue.push(task);
      }
    });
  }

  _dispatch(worker, task) {
    worker.onmessage = ({ data }) => {
      task.resolve(data);
      if (this.queue.length > 0) {
        this._dispatch(worker, this.queue.shift());
      } else {
        this.idle.push(worker);
      }
    };
    worker.onerror = (e) => task.reject(e);
    worker.postMessage(task.data, task.transfer);
  }
}

const pool = new WorkerPool('./worker.js', 4);
const result = await pool.run({ type: 'PROCESS_DATA', payload: bigArray });`;

  const sabCode = `// ── SharedArrayBuffer + Atomics（共享内存并发）──────────────────────────────
// 服务端响应头（必须，否则 crossOriginIsolated = false，SAB 不可用）:
// Cross-Origin-Opener-Policy: same-origin
// Cross-Origin-Embedder-Policy: require-corp

// main.js
if (!crossOriginIsolated) {
  console.error('SharedArrayBuffer 需要跨源隔离环境');
}

// 共享内存：1024 个 32 位整数
const sab = new SharedArrayBuffer(1024 * Int32Array.BYTES_PER_ELEMENT);
const shared = new Int32Array(sab);

// 用 Atomics 安全地读写共享内存（防止数据竞争）
Atomics.store(shared, 0, 100);   // 原子写
const val = Atomics.load(shared, 0); // 原子读
Atomics.add(shared, 0, 1);       // 原子加法（counter++）

// 传给 Worker（SharedArrayBuffer 无需 transfer，可直接共享）
worker.postMessage({ sab });

// Worker 端等待主线程信号（类似 mutex/semaphore）
// worker.js
self.addEventListener('message', ({ data: { sab } }) => {
  const shared = new Int32Array(sab);

  // 等待 index 0 的值变为 1（主线程写入后通知）
  Atomics.wait(shared, 0, 0); // 阻塞直到 shared[0] !== 0

  const result = processData(shared);
  Atomics.store(shared, 1, result); // 写结果到 index 1
  // 通知主线程结果已就绪
  Atomics.notify(shared, 1, 1);
});

// ✓ OffscreenCanvas：在 Worker 中渲染 Canvas（解放主线程）
// main.js
const canvas = document.getElementById('chart');
const offscreen = canvas.transferControlToOffscreen();
worker.postMessage({ canvas: offscreen }, [offscreen]);

// worker.js
self.addEventListener('message', ({ data: { canvas } }) => {
  const ctx = canvas.getContext('2d');
  // 所有 Canvas 绘制操作在 Worker 线程执行，不占用主线程
  drawChart(ctx, data);
});`;

  const notes = [
    ruleBox('warning', `<strong>Vite / webpack 中使用 Worker：</strong>Vite 支持 <code>new Worker(new URL('./worker.js', import.meta.url))</code> 语法（ESM Worker），会被构建工具自动打包。webpack 5 用 <code>new Worker(new URL('./worker.js', import.meta.url))</code> 同样支持。避免用字符串路径（<code>new Worker('/worker.js')</code>），构建后路径会变。`),
    ruleBox('info', `<strong>Comlink：</strong>Google 出品的 Worker 封装库，将 Worker 中的函数暴露为 <code>async</code> 函数，用 Proxy 透明化 <code>postMessage</code> 通信。<code>const worker = Comlink.wrap(new Worker('./worker.js'))</code>；<code>await worker.heavyTask(data)</code>，彻底消除手写消息协议的样板代码。`),
    ruleBox('success', `<strong>Service Worker 与 Web Worker 的区别：</strong>Web Worker 生命周期绑定到页面，页面关闭即销毁；Service Worker 独立于页面持久运行，可在页面关闭后继续处理推送通知和后台同步，可拦截 fetch 请求实现离线缓存（PWA 核心能力）。两者都运行在主线程之外，但用途完全不同。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle)}
    ${section('代码示例', codeBlock('Dedicated Worker + Worker Pool 实现', 'dot-blue', 'javascript', workerCode) + codeBlock('SharedArrayBuffer + OffscreenCanvas', 'dot-green', 'javascript', sabCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
