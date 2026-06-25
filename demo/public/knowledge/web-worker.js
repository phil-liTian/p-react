function renderWebWorker(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>Web Worker 在独立线程中运行 JS，通过 <code>postMessage</code> 与主线程通信，<strong>完全不阻塞 UI 渲染</strong>。
    <strong>SharedArrayBuffer</strong> 允许多个 Worker 共享同一块内存，配合 <code>Atomics</code> 实现无消息传递的高性能并发。
    适用场景：CPU 密集型计算（图像处理、加密、大数据解析、物理模拟）。`);

  const principle = `
    <p><strong>Web Worker 限制：</strong></p>
    <ul>
      <li>无法访问 DOM、<code>window</code>、<code>document</code>（Worker 没有渲染上下文）</li>
      <li>可使用：<code>fetch</code>、<code>IndexedDB</code>、<code>WebSocket</code>、<code>setTimeout</code>、<code>Canvas</code>（OffscreenCanvas）</li>
      <li><code>postMessage</code> 传递的数据默认被<strong>结构化克隆（Structured Clone）</strong>——深拷贝，适合普通对象；传输大数据用 <strong>Transferable Objects</strong>（ArrayBuffer、MessagePort），零拷贝转移所有权</li>
    </ul>
    <p><strong>Worker 类型：</strong></p>
    <table class="metrics-table">
      <thead><tr><th>类型</th><th>作用域</th><th>生命周期</th><th>典型用途</th></tr></thead>
      <tbody>
        <tr><td>Dedicated Worker</td><td>仅创建它的页面</td><td>随页面销毁</td><td>CPU 密集计算、大文件处理</td></tr>
        <tr><td>Shared Worker</td><td>同源多个页面共享</td><td>所有连接关闭后销毁</td><td>跨 Tab 共享状态、广播消息</td></tr>
        <tr><td>Service Worker</td><td>同源所有页面</td><td>独立持久运行</td><td>离线缓存、推送通知、请求拦截</td></tr>
      </tbody>
    </table>
    <p><strong>数据传输方式对比：</strong></p>
    <table class="metrics-table">
      <thead><tr><th>方式</th><th>原理</th><th>性能</th><th>适用场景</th></tr></thead>
      <tbody>
        <tr><td>结构化克隆（默认）</td><td>深拷贝，主线程和 Worker 各有一份</td><td>数据越大越慢</td><td>普通 JS 对象、小数据</td></tr>
        <tr><td>Transferable（转移）</td><td>所有权转移，原持有者失效</td><td>O(1) 零拷贝</td><td>ArrayBuffer、ImageBitmap、OffscreenCanvas</td></tr>
        <tr><td>SharedArrayBuffer（共享）</td><td>多线程共享同一内存块</td><td>极快，无拷贝</td><td>高频读写、多 Worker 协作（需 COOP/COEP）</td></tr>
      </tbody>
    </table>
    <p><strong>SharedArrayBuffer 安全要求：</strong>为防止 Spectre 攻击，使用 SharedArrayBuffer 的页面必须设置响应头：
    <code>Cross-Origin-Opener-Policy: same-origin</code> 和 <code>Cross-Origin-Embedder-Policy: require-corp</code>。</p>`;

  const basicCode = `// ── worker.ts（Worker 脚本）──────────────────────────────────────────────────

// 定义消息类型（TypeScript 项目推荐用判别联合类型）
type WorkerInput =
  | { type: 'PROCESS_DATA'; payload: number[] }
  | { type: 'PROCESS_BUFFER'; buffer: ArrayBuffer };

type WorkerOutput =
  | { type: 'RESULT'; payload: number[] }
  | { type: 'BUFFER_DONE'; buffer: ArrayBuffer }
  | { type: 'PROGRESS'; percent: number };

self.addEventListener('message', ({ data }: MessageEvent<WorkerInput>) => {
  if (data.type === 'PROCESS_DATA') {
    // CPU 密集型计算，不阻塞主线程
    const total = data.payload.length;
    const result = data.payload.map((x, i) => {
      // 每处理 10% 上报进度
      if (i % Math.floor(total / 10) === 0) {
        self.postMessage({ type: 'PROGRESS', percent: Math.round((i / total) * 100) } satisfies WorkerOutput);
      }
      return Math.sqrt(x) * Math.PI;
    });
    self.postMessage({ type: 'RESULT', payload: result } satisfies WorkerOutput);
  }

  if (data.type === 'PROCESS_BUFFER') {
    const view = new Float64Array(data.buffer);
    for (let i = 0; i < view.length; i++) view[i] *= 2;
    // Transferable：零拷贝转移所有权回主线程，Worker 不再持有该 buffer
    self.postMessage(
      { type: 'BUFFER_DONE', buffer: view.buffer } satisfies WorkerOutput,
      [view.buffer]  // 第二个参数：要转移所有权的对象列表
    );
  }
});

// ── main.ts（主线程）────────────────────────────────────────────────────────

// Vite / webpack 5 推荐写法（构建工具自动打包 Worker 文件）
const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

// 发送任务
worker.postMessage({ type: 'PROCESS_DATA', payload: Array.from({ length: 1e6 }, (_, i) => i) });

// 接收结果
worker.addEventListener('message', ({ data }: MessageEvent<WorkerOutput>) => {
  if (data.type === 'PROGRESS') console.log(\`进度：\${data.percent}%\`);
  if (data.type === 'RESULT')   console.log('计算完成', data.payload.length);
});

// 错误处理
worker.addEventListener('error', (e) => console.error('Worker 错误：', e.message));
worker.addEventListener('messageerror', () => console.error('消息反序列化失败'));`;

  const workerPoolCode = `// ── Worker Pool：复用多个 Worker，并发处理任务队列 ─────────────────────────

class WorkerPool<TInput, TOutput> {
  private workers: Worker[] = [];
  private idle: Worker[] = [];
  private queue: Array<{ data: TInput; transfer: Transferable[]; resolve: (v: TOutput) => void; reject: (e: unknown) => void }> = [];

  constructor(url: URL, size = navigator.hardwareConcurrency ?? 4) {
    this.workers = Array.from({ length: size }, () => new Worker(url, { type: 'module' }));
    this.idle = [...this.workers];
  }

  run(data: TInput, transfer: Transferable[] = []): Promise<TOutput> {
    return new Promise((resolve, reject) => {
      const task = { data, transfer, resolve, reject };
      if (this.idle.length > 0) {
        this._dispatch(this.idle.pop()!, task);
      } else {
        this.queue.push(task);
      }
    });
  }

  private _dispatch(worker: Worker, task: typeof this.queue[0]) {
    worker.onmessage = ({ data }: MessageEvent<TOutput>) => {
      task.resolve(data);
      const next = this.queue.shift();
      if (next) this._dispatch(worker, next);
      else       this.idle.push(worker);
    };
    worker.onerror = (e) => task.reject(e);
    worker.postMessage(task.data, task.transfer);
  }

  terminate() {
    this.workers.forEach(w => w.terminate());
  }
}

// 使用示例：并发处理 100 个任务，最多 4 个 Worker 同时工作
const pool = new WorkerPool<{ type: string; payload: number[] }, { result: number[] }>(
  new URL('./worker.ts', import.meta.url)
);

const tasks = Array.from({ length: 100 }, (_, i) => pool.run({ type: 'PROCESS_DATA', payload: [i] }));
const results = await Promise.all(tasks);
pool.terminate();`;

  const imageCode = `// ── 案例一：图像灰度滤镜（OffscreenCanvas + Transferable）─────────────────

// image-worker.ts
self.addEventListener('message', ({ data }: MessageEvent<{ imageData: ImageData }>) => {
  const { imageData } = data;
  const { data: pixels } = imageData;

  // 灰度算法：BT.709 加权平均（比简单平均更接近人眼感知）
  for (let i = 0; i < pixels.length; i += 4) {
    const gray = pixels[i] * 0.2126 + pixels[i + 1] * 0.7152 + pixels[i + 2] * 0.0722;
    pixels[i] = pixels[i + 1] = pixels[i + 2] = gray;
    // pixels[i + 3] = alpha，不变
  }

  // 转移 buffer 所有权（零拷贝），而不是克隆
  self.postMessage({ imageData }, [imageData.data.buffer]);
});

// main.ts：处理用户上传的图片
async function applyGrayscale(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);

  const worker = new Worker(new URL('./image-worker.ts', import.meta.url), { type: 'module' });

  return new Promise((resolve) => {
    worker.onmessage = async ({ data }: MessageEvent<{ imageData: ImageData }>) => {
      ctx.putImageData(data.imageData, 0, 0);
      const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.9 });
      resolve(URL.createObjectURL(blob));
      worker.terminate();
    };
    // 转移 imageData.data.buffer，避免拷贝几 MB 的像素数据
    worker.postMessage({ imageData }, [imageData.data.buffer]);
  });
}`;

  const csvCode = `// ── 案例二：大文件 CSV 解析（流式处理 + 进度上报）────────────────────────

// csv-worker.ts
type CsvMsg =
  | { type: 'PARSE'; text: string }
  | { type: 'CHUNK'; rows: string[][]; progress: number }
  | { type: 'DONE'; total: number };

self.addEventListener('message', ({ data }: MessageEvent<CsvMsg>) => {
  if (data.type !== 'PARSE') return;

  const lines = data.text.split('\\n');
  const total = lines.length;
  const CHUNK = 5000; // 每批上报 5000 行
  let rowCount = 0;

  for (let i = 0; i < total; i += CHUNK) {
    const chunk = lines.slice(i, i + CHUNK).map(line => line.split(','));
    rowCount += chunk.length;
    self.postMessage({
      type: 'CHUNK',
      rows: chunk,
      progress: Math.min(100, Math.round((rowCount / total) * 100)),
    } satisfies CsvMsg);
  }

  self.postMessage({ type: 'DONE', total: rowCount } satisfies CsvMsg);
});

// main.ts：用户上传 CSV，边解析边渲染
function parseCSVFile(file: File, onChunk: (rows: string[][], progress: number) => void) {
  return new Promise<number>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const worker = new Worker(new URL('./csv-worker.ts', import.meta.url), { type: 'module' });

      worker.onmessage = ({ data }: MessageEvent<CsvMsg>) => {
        if (data.type === 'CHUNK') onChunk(data.rows, data.progress);
        if (data.type === 'DONE')  { resolve(data.total); worker.terminate(); }
      };

      // 大文件直接 postMessage 字符串（结构化克隆），避免 UI 卡顿
      worker.postMessage({ type: 'PARSE', text: reader.result as string });
    };
    reader.readAsText(file);
  });
}

// React 组件中使用
function CsvUploader() {
  const [rows, setRows] = useState<string[][]>([]);
  const [progress, setProgress] = useState(0);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await parseCSVFile(file, (newRows, pct) => {
      setRows(prev => [...prev, ...newRows]);
      setProgress(pct);
    });
  }

  return (
    <div>
      <input type="file" accept=".csv" onChange={handleFile} />
      {progress < 100 && <progress value={progress} max={100} />}
      <div>已加载 {rows.length} 行</div>
    </div>
  );
}`;

  const cryptoCode = `// ── 案例三：密码哈希（bcrypt 在 Worker 中计算，主线程不卡顿）────────────

// crypto-worker.ts（使用 bcryptjs，纯 JS 实现，可在 Worker 中运行）
import bcrypt from 'bcryptjs';

type CryptoMsg =
  | { type: 'HASH';   password: string; rounds?: number }
  | { type: 'VERIFY'; password: string; hash: string }
  | { type: 'HASH_RESULT';   hash: string }
  | { type: 'VERIFY_RESULT'; match: boolean };

self.addEventListener('message', async ({ data }: MessageEvent<CryptoMsg>) => {
  if (data.type === 'HASH') {
    // bcrypt rounds=12 在主线程约需 300ms，会阻塞 UI
    const salt = await bcrypt.genSalt(data.rounds ?? 12);
    const hash = await bcrypt.hash(data.password, salt);
    self.postMessage({ type: 'HASH_RESULT', hash } satisfies CryptoMsg);
  }

  if (data.type === 'VERIFY') {
    const match = await bcrypt.compare(data.password, data.hash);
    self.postMessage({ type: 'VERIFY_RESULT', match } satisfies CryptoMsg);
  }
});

// main.ts
function createCryptoWorker() {
  const worker = new Worker(new URL('./crypto-worker.ts', import.meta.url), { type: 'module' });

  function hashPassword(password: string, rounds = 12): Promise<string> {
    return new Promise((resolve) => {
      worker.onmessage = ({ data }: MessageEvent<CryptoMsg>) => {
        if (data.type === 'HASH_RESULT') resolve(data.hash);
      };
      worker.postMessage({ type: 'HASH', password, rounds });
    });
  }

  function verifyPassword(password: string, hash: string): Promise<boolean> {
    return new Promise((resolve) => {
      worker.onmessage = ({ data }: MessageEvent<CryptoMsg>) => {
        if (data.type === 'VERIFY_RESULT') resolve(data.match);
      };
      worker.postMessage({ type: 'VERIFY', password, hash });
    });
  }

  return { hashPassword, verifyPassword, terminate: () => worker.terminate() };
}

// React 中调用：用户注册时哈希密码，整个 300ms 运算期间 UI 保持响应
const crypto = createCryptoWorker();
const hash = await crypto.hashPassword('user-password', 12);
// hash → '$2a$12$...'（存入数据库）`;

  const comlinkCode = `// ── 案例四：Comlink 封装（消除 postMessage 样板代码）────────────────────

// npm install comlink
// analytics-worker.ts
import * as Comlink from 'comlink';

// 直接暴露普通函数/类，Comlink 自动处理消息序列化
export const analyticsApi = {
  // 大数据聚合：按维度分组统计
  aggregate(events: Event[], dimension: string): Record<string, number> {
    return events.reduce((acc, e) => {
      const key = (e as Record<string, unknown>)[dimension] as string;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  },

  // 漏斗分析：计算每步转化率
  funnel(events: Event[], steps: string[]): number[] {
    return steps.map(step => events.filter(e => e.type === step).length);
  },

  // 耗时的数据预处理
  async preprocess(rawData: unknown[]): Promise<ProcessedData[]> {
    // 模拟耗时操作
    return rawData.map(normalizeEvent);
  },
};

Comlink.expose(analyticsApi);

// main.ts：调用方式和普通函数完全一致，无需手写 postMessage
import * as Comlink from 'comlink';
import type { analyticsApi } from './analytics-worker';

const worker = new Worker(new URL('./analytics-worker.ts', import.meta.url), { type: 'module' });
const api = Comlink.wrap<typeof analyticsApi>(worker);

// 直接 await 调用，Comlink 在背后处理 postMessage/onmessage
const result = await api.aggregate(millionEvents, 'page');
const funnelData = await api.funnel(events, ['view', 'click', 'purchase']);

// React Hook 封装
function useWorkerApi() {
  const apiRef = useRef<Comlink.Remote<typeof analyticsApi> | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL('./analytics-worker.ts', import.meta.url), { type: 'module' });
    apiRef.current = Comlink.wrap(worker);
    return () => { worker.terminate(); apiRef.current = null; };
  }, []);

  return apiRef;
}`;

  const sabCode = `// ── SharedArrayBuffer + Atomics（共享内存并发）──────────────────────────────

// 使用条件：服务端响应头（缺少则 crossOriginIsolated = false）
// Cross-Origin-Opener-Policy: same-origin
// Cross-Origin-Embedder-Policy: require-corp

// main.ts
if (!crossOriginIsolated) throw new Error('需要跨源隔离环境');

const sab = new SharedArrayBuffer(4 * Int32Array.BYTES_PER_ELEMENT);
const shared = new Int32Array(sab);

// Atomics API 防止多线程数据竞争
Atomics.store(shared, 0, 0);      // 原子写：index 0 初始化为 0
Atomics.add(shared, 0, 1);        // 原子加法（等价于 shared[0]++，线程安全）
const val = Atomics.load(shared, 0); // 原子读

// 传给 Worker（SharedArrayBuffer 不需要 transfer，多个线程共享同一块内存）
worker.postMessage({ sab });

// worker.ts
self.addEventListener('message', ({ data: { sab } }: MessageEvent) => {
  const shared = new Int32Array(sab);

  // Atomics.wait：阻塞当前 Worker，直到 shared[0] 的值不再是 0
  // 类似于操作系统的 mutex.lock()
  Atomics.wait(shared, 0, 0);

  // 处理完成，写结果并通知主线程
  Atomics.store(shared, 1, computeResult(shared));
  Atomics.notify(shared, 1, 1); // 唤醒等待 index 1 的线程
});

// ── OffscreenCanvas：在 Worker 中渲染 WebGL / Canvas 2D ────────────────────

// main.ts：将 canvas 控制权转交给 Worker
const canvas = document.getElementById('chart') as HTMLCanvasElement;
const offscreen = canvas.transferControlToOffscreen(); // 转交后主线程无法再操作该 canvas
const renderWorker = new Worker(new URL('./render-worker.ts', import.meta.url), { type: 'module' });
renderWorker.postMessage({ canvas: offscreen }, [offscreen]);

// render-worker.ts：所有绘制在 Worker 线程执行，主线程完全不参与
self.addEventListener('message', ({ data: { canvas } }: MessageEvent) => {
  const ctx = canvas.getContext('2d')!;

  function renderLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawFrame(ctx); // 绘制一帧，可以是复杂图表或粒子动画
    requestAnimationFrame(renderLoop); // Worker 中也支持 rAF
  }

  renderLoop();
});`;

  const notes = [
    ruleBox('warning', `<strong>Vite / webpack 中 Worker 路径写法：</strong>必须用 <code>new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })</code>，构建工具才能正确打包 Worker 文件并处理路径。避免用字符串路径 <code>new Worker('/worker.js')</code>，构建后路径会失效。`),
    ruleBox('info', `<strong>何时用 Worker，何时用 useTransition：</strong>两者都能避免 UI 卡顿，但机制不同。<code>useTransition</code> 是在主线程上把更新标记为低优先级，本质上还是串行的；Web Worker 是真正的多线程并行。如果任务是"更新 React 状态"，用 useTransition；如果任务是"CPU 密集型纯计算（图像、加密、解析）"，必须用 Worker。`),
    ruleBox('danger', `<strong>Worker 通信的常见陷阱：</strong>① 在同一个 Worker 上并发发送多条消息，<code>onmessage</code> 响应顺序与发送顺序一致，但如果每条消息都覆盖 <code>worker.onmessage</code>，只有最后一个 handler 生效——用 Worker Pool 或 Comlink 规避；② ArrayBuffer 被 transfer 后原持有者访问长度为 0，需要确认所有权转移后不再读写；③ Worker 中未捕获的异常不会传到主线程，必须监听 <code>worker.addEventListener('error', handler)</code>。`),
    ruleBox('success', `<strong>生产级 Worker 选型建议：</strong>① 简单一次性任务 → 原生 Worker；② 多任务并发 → WorkerPool；③ 需要 TypeScript 类型安全 + 消除样板 → Comlink；④ 多 Worker 高频共享数据 → SharedArrayBuffer + Atomics；⑤ Canvas/WebGL 渲染卸载 → OffscreenCanvas。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle)}
    ${section('基础用法', codeBlock('Dedicated Worker 基础通信（含 TypeScript 类型）', 'dot-blue', 'typescript', basicCode) + codeBlock('Worker Pool：任务队列 + 并发复用', 'dot-cyan', 'typescript', workerPoolCode))}
    ${section('案例一：图像灰度滤镜', codeBlock('OffscreenCanvas + ImageData Transferable', 'dot-purple', 'typescript', imageCode))}
    ${section('案例二：大文件 CSV 解析', codeBlock('流式处理 + 进度上报 + React 集成', 'dot-green', 'typescript', csvCode))}
    ${section('案例三：密码哈希（bcrypt）', codeBlock('bcrypt 计算卸载到 Worker，UI 不卡顿', 'dot-yellow', 'typescript', cryptoCode))}
    ${section('案例四：Comlink 封装', codeBlock('消除 postMessage 样板，像调用普通函数一样', 'dot-red', 'typescript', comlinkCode))}
    ${section('进阶：SharedArrayBuffer & OffscreenCanvas', codeBlock('共享内存 + Atomics + OffscreenCanvas 渲染', 'dot-green', 'javascript', sabCode))}
    ${section('延伸与注意事项', notes.join(''))}
  `);
}
