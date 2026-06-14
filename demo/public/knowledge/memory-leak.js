function renderMemoryLeak(t) {
  const question = ruleBox('danger',
    `<strong>结论：</strong>内存泄漏是指程序不再需要的内存无法被 GC 回收，
    导致内存持续增长最终引发页面卡顿、崩溃。
    浏览器使用<strong>标记清除（Mark-and-Sweep）</strong>算法——从根（window）出发标记所有可达对象，
    未被标记的对象即为垃圾，在下一次 GC 时被回收。
    <strong>泄漏的本质：本该不可达的对象，仍被某个根可达的引用链持有。</strong>`);

  const gcPrinciple = `
    <p><strong>V8 GC 分代策略：</strong></p>
    <ul>
      <li><strong>新生代（Young Generation，1-8 MB）：</strong>短命对象，使用 Scavenge 算法（复制活对象到 To 区），速度极快，每次 GC &lt;1ms</li>
      <li><strong>老生代（Old Generation，数百 MB）：</strong>存活超过两次新生代 GC 的对象晋升至此，使用 Mark-Sweep + Mark-Compact，时间较长</li>
      <li><strong>增量标记（Incremental Marking）：</strong>将标记阶段拆成小片穿插在 JS 执行之间，避免长时间 Stop-The-World</li>
    </ul>
    <p><strong>常见泄漏场景：</strong></p>
    <ol style="padding-left:20px;line-height:2;">
      <li><strong>全局变量意外挂载：</strong>未声明变量 <code>a = {};</code> 会挂到 <code>window</code>，永远可达</li>
      <li><strong>未清理的定时器/事件监听：</strong>回调内引用的外部对象随定时器存活，组件卸载后忘记 <code>clearInterval</code></li>
      <li><strong>闭包引用大对象：</strong>闭包持有的作用域链不被释放，导致其中大数组/DOM 节点驻留内存</li>
      <li><strong>DOM 引用残留：</strong>JS 中保存了指向已从文档移除的 DOM 节点的引用，节点无法被回收</li>
      <li><strong>WeakMap/WeakSet 的正确用途：</strong>用弱引用保存 DOM → 数据的映射，DOM 移除时自动回收</li>
    </ol>`;

  const badCode = `// ❌ 典型内存泄漏场景

// 1. 全局变量泄漏
function foo() {
  leak = { data: new Array(100000).fill('x') }; // 没有 const/let，挂到 window
}

// 2. 定时器忘记清除（React 中最常见）
function MyComponent() {
  useEffect(() => {
    const timer = setInterval(() => {
      doSomething(heavyData); // heavyData 被 timer 回调引用
    }, 1000);
    // ❌ 缺少 return () => clearInterval(timer);
  }, []);
}

// 3. 事件监听器未移除
function setup() {
  const hugeBuf = new ArrayBuffer(50 * 1024 * 1024); // 50 MB
  document.addEventListener('click', () => {
    console.log(hugeBuf.byteLength); // 闭包捕获 hugeBuf，点击监听不移除则泄漏
  });
}

// 4. DOM 引用残留
const detachedNodes = [];
function appendAndRemove() {
  const el = document.createElement('div');
  document.body.appendChild(el);
  document.body.removeChild(el);
  detachedNodes.push(el); // el 已从 DOM 移除，但 JS 数组还持有引用
}`;

  const goodCode = `// ✅ 修复版本

// 2. React useEffect 正确清理
function MyComponent() {
  useEffect(() => {
    const timer = setInterval(() => {
      doSomething(heavyData);
    }, 1000);
    return () => clearInterval(timer); // 组件卸载时清理
  }, []);
}

// 3. 用 AbortController 批量清理监听器（现代方案）
function setup() {
  const ac = new AbortController();
  const hugeBuf = new ArrayBuffer(50 * 1024 * 1024);
  document.addEventListener('click', () => {
    console.log(hugeBuf.byteLength);
  }, { signal: ac.signal }); // 通过 signal 统一管理
  return () => ac.abort(); // 一次性移除所有通过此 signal 注册的监听器
}

// 4. 用 WeakRef + FinalizationRegistry（ES2021）追踪 DOM
const registry = new FinalizationRegistry(key => {
  cache.delete(key); // DOM 被 GC 后自动清理缓存
});

function trackNode(node) {
  const key = Symbol();
  cache.set(key, computeExpensiveData(node));
  registry.register(node, key); // 弱追踪，不阻止 GC
}`;

  const devtoolsTips = `// 使用 Chrome DevTools 定位内存泄漏

// 步骤 1：Memory 面板 → Take Heap Snapshot（操作前）
// 步骤 2：执行怀疑泄漏的操作（如路由切换 10 次）
// 步骤 3：Take Heap Snapshot（操作后）
// 步骤 4：选择 "Comparison" 视图，查看 # Delta > 0 的对象
// 步骤 5：点开 "(Detached DOM tree)" 节点 → 查看 Retainers 定位引用链

// Performance 面板检测：
// 录制 + 强制 GC（垃圾桶图标）→ 若 JS Heap 锯齿状持续上升，说明存在泄漏

// 命令行工具（Node.js 服务端）：
// node --expose-gc --inspect app.js
// global.gc(); // 强制 GC
// process.memoryUsage(); // { heapUsed, heapTotal, external, rss }`;

  const notes = [
    ruleBox('warning', `<strong>WeakMap vs Map：</strong>用 <code>WeakMap</code> 存储以 DOM/对象为键的元数据（如事件处理状态、私有数据），键对象被 GC 后 WeakMap 中的条目自动消失。普通 <code>Map</code> 会阻止 GC，是缓存泄漏的常见原因。`),
    ruleBox('info', `<strong>React 最易泄漏的 3 个场景：</strong>① <code>useEffect</code> 中的未清理订阅（setTimeout / EventEmitter / 第三方库 on）；② <code>useState</code> 在组件卸载后仍 setState（async 回调）；③ Context value 中缓存了大对象且消费者永不卸载。`),
    ruleBox('success', `<strong>排查口诀：</strong>全局变量 → 定时器/监听 → 闭包大对象 → Detached DOM → 缓存无上限。先用 Performance 面板确认泄漏存在（Heap 持续增长），再用 Heap Snapshot Comparison 精确定位对象类型。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('GC 原理与泄漏场景', gcPrinciple)}
    ${section('代码示例', codeBlock('典型泄漏模式', 'dot-red', 'javascript', badCode) + codeBlock('修复方案', 'dot-green', 'javascript', goodCode) + codeBlock('DevTools 定位步骤', 'dot-blue', 'javascript', devtoolsTips))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
