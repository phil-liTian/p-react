function renderAbortController(t) {
  const question = ruleBox('warning',
    `<strong>结论：</strong>原生 Promise 一旦创建便无法取消，<code>AbortController</code> 填补了这个空缺——通过 <code>AbortSignal</code> 在网络请求、异步任务、事件监听三个层面统一传递"取消"信号。
    核心模式：创建 controller，把 <code>controller.signal</code> 传给可取消的 API，调用 <code>controller.abort(reason)</code> 触发取消。
    React 18 中，组件卸载时取消正在进行的 fetch 请求是防止"竞态条件"和"内存泄漏"的标准方案。`);

  const principle = `
    <p><strong>AbortController 的三个组件：</strong></p>
    <ul>
      <li><strong>AbortController</strong>：控制器，调用 <code>.abort(reason?)</code> 触发取消</li>
      <li><strong>AbortSignal</strong>：信号对象（<code>controller.signal</code>），传给可取消的 API；<code>signal.aborted</code> 为布尔值；<code>signal.reason</code> 为取消原因；<code>signal.addEventListener('abort', fn)</code> 监听取消事件</li>
      <li><strong>受控 API</strong>：<code>fetch(url, { signal })</code>、<code>addEventListener(type, fn, { signal })</code>、<code>new Promise</code> 内手动检查</li>
    </ul>
    <p><strong>signal 传入 fetch 后，abort 时发生什么：</strong></p>
    <p>fetch 内部监听了 signal 的 abort 事件。调用 <code>controller.abort()</code> 时，fetch 立即取消网络请求并以 <code>AbortError</code>（<code>DOMException</code>，name 为 <code>'AbortError'</code>）reject 返回的 Promise。未使用完的网络资源被释放。</p>
    <p><strong>AbortSignal 静态方法（现代简写）：</strong></p>
    <ul>
      <li><code>AbortSignal.timeout(ms)</code>：创建一个在 ms 毫秒后自动 abort 的 signal（Chrome 103+）</li>
      <li><code>AbortSignal.any([sig1, sig2])</code>：任意一个 signal abort 就 abort（Chrome 116+）</li>
    </ul>`;

  const fetchCode = `// fetch 取消：最常见的使用场景

// 场景 1：搜索框防竞态（每次新搜索取消上一次请求）
function createSearchController() {
  let controller = null;

  return async function search(query) {
    // 取消上一次未完成的请求
    controller?.abort('superseded');
    controller = new AbortController();

    try {
      const res = await fetch(\`/api/search?q=\${encodeURIComponent(query)}\`, {
        signal: controller.signal,
      });
      return await res.json();
    } catch (err) {
      if (err.name === 'AbortError') {
        // 被主动取消，不是真正的错误，静默处理
        return null;
      }
      throw err; // 真实网络错误继续抛出
    }
  };
}

const doSearch = createSearchController();

// 用户快速输入时，只有最后一次请求的结果会被处理
input.addEventListener('input', e => doSearch(e.target.value).then(render));

// ──────────────────────────────────────────────────
// 场景 2：超时控制（用 AbortSignal.timeout 简化）
async function fetchWithTimeout(url, ms = 5000) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(ms), // Chrome 103+ 原生支持
    });
    return res.json();
  } catch (err) {
    if (err.name === 'TimeoutError') throw new Error(\`请求超时（>\${ms}ms）\`);
    throw err;
  }
}

// 旧版兼容写法（手动 setTimeout + abort）
function fetchWithTimeoutLegacy(url, ms = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('超时')), ms);

  return fetch(url, { signal: controller.signal })
    .finally(() => clearTimeout(timer)); // 请求完成后清除定时器
}`;

  const reactCode = `// React 中的标准取消模式

// 场景：组件卸载时取消正在进行的 fetch，防止在已卸载组件上 setState
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadUser() {
      try {
        const res = await fetch(\`/api/users/\${userId}\`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setUser(data); // 只有在组件仍挂载时才执行
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('加载用户失败:', err);
        }
      }
    }

    loadUser();

    // 清理函数：组件卸载或 userId 变化时取消请求
    return () => controller.abort('component unmounted');
  }, [userId]);

  return user ? <div>{user.name}</div> : <div>加载中...</div>;
}

// ──────────────────────────────────────────────────
// 场景：同时取消多个请求（AbortSignal.any）
async function loadDashboard(userId, pageSignal) {
  // pageSignal 来自路由层，页面切换时 abort
  // 组件自身也有超时控制
  const combined = AbortSignal.any([
    pageSignal,
    AbortSignal.timeout(10_000),
  ]);

  const [user, posts] = await Promise.all([
    fetch(\`/api/users/\${userId}\`, { signal: combined }).then(r => r.json()),
    fetch(\`/api/posts?uid=\${userId}\`, { signal: combined }).then(r => r.json()),
  ]);

  return { user, posts };
}`;

  const customCode = `// 让自定义异步任务支持 AbortController

// 封装可取消的 sleep
function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
      return;
    }

    const timer = setTimeout(resolve, ms);

    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
    }, { once: true }); // once: true 确保监听器只触发一次，自动移除
  });
}

// 可取消的轮询任务
async function pollUntil(condition, { interval = 1000, signal } = {}) {
  while (true) {
    if (signal?.aborted) throw signal.reason;
    if (await condition()) return true;
    await sleep(interval, signal);
  }
}

// 使用
const controller = new AbortController();

// 最多轮询 30 秒
setTimeout(() => controller.abort(new Error('轮询超时')), 30_000);

try {
  await pollUntil(() => checkPaymentStatus(orderId), {
    interval: 2000,
    signal: controller.signal,
  });
  showSuccess('支付成功');
} catch (err) {
  if (err.name === 'AbortError' || err.message === '轮询超时') {
    showError('支付确认超时，请刷新页面');
  }
}`;

  const notes = [
    ruleBox('warning', `<strong>abort 后 controller 不可复用：</strong>调用 <code>abort()</code> 后，<code>signal.aborted</code> 变为 <code>true</code> 且不可逆。若需要取消并重新开始，必须创建新的 <code>AbortController</code>。这就是搜索防竞态示例中每次请求前都 <code>new AbortController()</code> 的原因。`),
    ruleBox('info', `<strong>addEventListener 的 signal 参数：</strong>DOM 的 <code>addEventListener</code> 接受 <code>{ signal }</code> 选项，signal abort 时事件监听器<em>自动移除</em>，无需手动调用 <code>removeEventListener</code>。这在需要批量清理事件监听器时极为方便：创建一个 controller，把同一个 signal 传给所有监听器，组件卸载时 <code>abort()</code> 一次全部清理。`),
    ruleBox('success', `<strong>AbortError 的捕获模式：</strong>判断是否为 AbortError 用 <code>err.name === 'AbortError'</code>，而非 <code>err instanceof DOMException</code>（跨 iframe/Worker 时 DOMException 构造函数不同，instanceof 可能为 false）。也可以用 <code>signal.aborted</code> 在 catch 块里判断是否为主动取消，然后决定是否重新抛出错误。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle)}
    ${section('代码示例', codeBlock('fetch 取消：搜索防竞态与超时控制', 'dot-blue', 'javascript', fetchCode) + codeBlock('React useEffect 中的标准取消模式', 'dot-green', 'javascript', reactCode) + codeBlock('自定义可取消异步任务', 'dot-yellow', 'javascript', customCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
