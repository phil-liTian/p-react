function renderPerfRuntime(t) {
  const question = ruleBox('info',
    `<strong>运行时优化的目标：</strong>让页面在用户交互时保持流畅（INP < 200ms），不因主线程被长任务占用而卡顿。
    核心手段：<strong>减少 JavaScript 执行时间</strong>→ <strong>拆分长任务</strong>→ <strong>把计算移到 Worker</strong>→ <strong>减少内存压力</strong>。
    用 Chrome Performance 面板录制真实交互，找到"红色"长任务（> 50ms）再针对性优化。`);

  const overview = `
    <table class="metrics-table">
      <thead><tr><th>手段</th><th>改善指标</th><th>适用场景</th></tr></thead>
      <tbody>
        <tr><td>长任务拆分（scheduler.yield）</td><td>INP、TBT</td><td>循环处理大数据集、批量 DOM 操作</td></tr>
        <tr><td>Web Worker 多线程</td><td>INP（主线程不阻塞）</td><td>图像处理、加密、大数据排序/聚合</td></tr>
        <tr><td>requestIdleCallback</td><td>不阻塞关键交互</td><td>非紧急后台任务：日志上报、预计算</td></tr>
        <tr><td>虚拟列表</td><td>FPS、内存</td><td>列表项 > 500，高度固定或动态</td></tr>
        <tr><td>防抖 / 节流</td><td>CPU 占用</td><td>scroll/resize/input 高频事件</td></tr>
        <tr><td>WeakRef + FinalizationRegistry</td><td>内存</td><td>大对象缓存、DOM 引用管理</td></tr>
        <tr><td>避免内存泄漏</td><td>内存、长时间运行稳定性</td><td>事件监听、定时器、闭包、缓存</td></tr>
      </tbody>
    </table>`;

  const longTaskCode = `// ── 拆分长任务：让浏览器有机会响应用户输入 ──────────────────────────────────

// 问题：单次循环处理 10000 条数据，主线程被占 200ms+，用户点击无响应
function badProcess(items: Item[]) {
  items.forEach(item => heavyCompute(item)); // 阻塞主线程
}

// ── 方案一：scheduler.yield（Chrome 129+，最推荐）────────────────────────────
async function processWithYield(items: Item[]) {
  for (let i = 0; i < items.length; i++) {
    heavyCompute(items[i]);

    // 每处理 50 条让出主线程，浏览器可插入用户事件处理
    if (i % 50 === 0) {
      await scheduler.yield(); // 相当于 await Promise.resolve()，但优先级更高
    }
  }
}

// ── 方案二：requestIdleCallback（处理非紧急任务）────────────────────────────
function processInIdle(items: Item[]) {
  let index = 0;

  function processChunk(deadline: IdleDeadline) {
    // 在空闲时间内尽可能多处理，timeRemaining() < 5ms 时停止
    while (index < items.length && deadline.timeRemaining() > 5) {
      heavyCompute(items[index++]);
    }
    if (index < items.length) {
      requestIdleCallback(processChunk, { timeout: 2000 }); // timeout 兜底
    }
  }

  requestIdleCallback(processChunk);
}

// ── 方案三：setTimeout 分片（兼容性最好）────────────────────────────────────
function processInChunks(items: Item[], chunkSize = 100) {
  let index = 0;

  function processNext() {
    const end = Math.min(index + chunkSize, items.length);
    for (let i = index; i < end; i++) {
      heavyCompute(items[i]);
    }
    index = end;
    if (index < items.length) {
      setTimeout(processNext, 0); // 让出主线程，下一个宏任务继续
    }
  }

  setTimeout(processNext, 0);
}`;

  const workerCode = `// ── Web Worker：把 CPU 密集任务移到后台线程 ─────────────────────────────────

// worker.ts
// Worker 运行在独立线程，无法访问 DOM，但可以做任意计算
self.addEventListener('message', (e: MessageEvent) => {
  const { type, data } = e.data;
  if (type === 'SORT') {
    // 大数据排序：主线程的 200ms 长任务 → Worker 后台执行，主线程零阻塞
    const sorted = data.sort((a: number, b: number) => a - b);
    self.postMessage({ type: 'SORT_DONE', result: sorted });
  }
});

// main.ts
const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

function sortLargeArray(data: number[]): Promise<number[]> {
  return new Promise((resolve) => {
    worker.postMessage({ type: 'SORT', data });
    worker.onmessage = (e) => {
      if (e.data.type === 'SORT_DONE') resolve(e.data.result);
    };
  });
}

// 使用 Comlink 简化 Worker 通信（推荐）
// npm i comlink
// worker.ts
import * as Comlink from 'comlink';
export const api = {
  sort: (data: number[]) => [...data].sort((a, b) => a - b),
  hash: async (text: string) => { /* crypto 操作 */ },
};
Comlink.expose(api);

// main.ts
import * as Comlink from 'comlink';
const worker = new Worker('./worker.ts', { type: 'module' });
const api = Comlink.wrap<typeof import('./worker').api>(worker);
const sorted = await api.sort(bigArray); // 像调用普通函数一样

// ── SharedArrayBuffer：零拷贝共享内存 ────────────────────────────────────────
// 注意：需要设置 COOP/COEP 响应头才能使用
// Cross-Origin-Opener-Policy: same-origin
// Cross-Origin-Embedder-Policy: require-corp

const buffer = new SharedArrayBuffer(1024 * 1024 * 4); // 4MB 共享内存
const view = new Int32Array(buffer);
// 主线程和 Worker 共享同一块内存，避免大数据 postMessage 拷贝开销`;

  const memoryCode = `// ── 常见内存泄漏模式与修复 ──────────────────────────────────────────────────

// 1. 事件监听未清理
// ✗
class BadComponent {
  componentDidMount() {
    window.addEventListener('resize', this.handleResize); // 忘记移除
  }
  // componentWillUnmount 中没有 removeEventListener → 泄漏
}

// ✓ React 中正确清理
function GoodComponent() {
  useEffect(() => {
    const handleResize = () => { /* ... */ };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize); // 清理
  }, []);
}

// 2. 定时器未清理
function TimerComponent() {
  useEffect(() => {
    const id = setInterval(() => { /* ... */ }, 1000);
    return () => clearInterval(id); // 组件卸载时清理
  }, []);
}

// 3. 闭包持有大对象引用
// ✗ largeData 被闭包持有，GC 无法回收
function createHandler(largeData: BigData[]) {
  return () => console.log(largeData.length); // 持有整个 largeData
}

// ✓ 只保留需要的值
function createHandler(largeData: BigData[]) {
  const count = largeData.length; // 只保留 count，largeData 可被 GC 回收
  return () => console.log(count);
}

// 4. WeakRef：弱引用缓存（不阻止 GC）
const cache = new Map<string, WeakRef<ExpensiveObject>>();

function getCached(key: string): ExpensiveObject | null {
  const ref = cache.get(key);
  if (ref) {
    const obj = ref.deref();
    if (obj) return obj; // 对象还在
    cache.delete(key);   // 对象已被 GC，清理 key
  }
  return null;
}

// 5. 用 FinalizationRegistry 在对象被 GC 时执行清理
const registry = new FinalizationRegistry((key: string) => {
  console.log(\`对象 \${key} 已被回收，清理相关资源\`);
  cache.delete(key);
});

function setCached(key: string, obj: ExpensiveObject) {
  cache.set(key, new WeakRef(obj));
  registry.register(obj, key); // obj 被 GC 时自动触发回调
}`;

  const reactPerfCode = `// ── React 运行时性能优化 ─────────────────────────────────────────────────────

import { memo, useCallback, useMemo, useTransition, useDeferredValue } from 'react';

// 1. useTransition：把非紧急更新标记为低优先级
function SearchPage() {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value); // 紧急：输入框立即响应

    startTransition(() => {
      // 低优先级：搜索结果更新可以被用户输入打断
      setSearchResults(performExpensiveSearch(e.target.value));
    });
  }

  return (
    <>
      <input value={query} onChange={handleChange} />
      {isPending && <Spinner />}
      <SearchResults /> {/* 可能延迟渲染 */}
    </>
  );
}

// 2. useDeferredValue：推迟派生值的更新（类似防抖，但不固定延迟）
function FilteredList({ query }: { query: string }) {
  const deferredQuery = useDeferredValue(query); // 滞后于 query，避免每次击键都重新过滤
  const filtered = useMemo(
    () => expensiveFilter(items, deferredQuery),
    [deferredQuery]
  );
  const isStale = query !== deferredQuery; // 用于显示"结果滞后"状态

  return (
    <div style={{ opacity: isStale ? 0.7 : 1 }}>
      {filtered.map(item => <Item key={item.id} {...item} />)}
    </div>
  );
}

// 3. React 19 Compiler：自动 memo（无需手写 memo/useMemo/useCallback）
// 开启后，React 编译器自动分析组件，在必要时插入 memoization
// babel.config.js
// { "plugins": [["babel-plugin-react-compiler", {}]] }`;

  const notes = [
    ruleBox('warning', `<strong>不要过早优化：</strong>useMemo/useCallback 本身有计算和内存开销，滥用反而增加负担。只在"Profile 确认是热路径"或"组件树中传递的函数/对象导致大量子树重渲染"时使用。React 19 Compiler 自动处理大部分场景，手写 memo 的必要性大幅降低。`),
    ruleBox('info', `<strong>INP 排查工具：</strong>① Chrome DevTools Performance 面板 → 录制交互 → 查找 > 50ms 的 Task（红色标记）；② PerformanceObserver 监听 event 类型采集真实 INP；③ Chrome 128+ 在 DevTools 中直接显示 INP 分数和归因信息（哪个事件、哪段 JS 贡献了延迟）。`),
    ruleBox('success', `<strong>运行时优化优先级：</strong>① 修复明确的内存泄漏（setInterval/事件未清理）→ ② 用虚拟列表替换全量渲染长列表 → ③ 用 useTransition 标记非紧急搜索/过滤更新 → ④ 把 > 100ms 的纯计算移到 Web Worker。前两步通常覆盖 80% 的运行时问题。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('优化手段总览', overview)}
    ${section('代码示例', codeBlock('长任务拆分：scheduler.yield / rIC / setTimeout', 'dot-yellow', 'javascript', longTaskCode) + codeBlock('Web Worker & Comlink & SharedArrayBuffer', 'dot-blue', 'javascript', workerCode) + codeBlock('内存泄漏排查与 WeakRef / FinalizationRegistry', 'dot-red', 'javascript', memoryCode) + codeBlock('React 运行时优化：useTransition / useDeferredValue / Compiler', 'dot-green', 'javascript', reactPerfCode))}
    ${section('延伸与注意事项', notes.join(''))}
  `);
}
