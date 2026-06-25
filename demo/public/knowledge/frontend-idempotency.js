function renderFrontendIdempotency(t) {
  const conclusion = ruleBox('danger',
    `<strong>核心结论：</strong>幂等性不是前端单独能保障的——前端能做的是<strong>防止重复提交</strong>和<strong>生成请求唯一标识（idempotency key）</strong>，后端通过这个 key 实现真正的幂等去重。日均千万 QPS 下，重复请求的量级极大，前后端必须共同建立防线。`);

  // ── 问题背景 ──────────────────────────────────────────────────────────

  const background = `
    <p>日均千万 QPS 场景中，重复请求的来源主要有三类：</p>
    <ul>
      <li><strong>用户行为重复</strong>：按钮点击过快、表单多次提交、页面刷新重试</li>
      <li><strong>网络层重复</strong>：请求超时后自动重试（axios retry、fetch retry）、移动网络抖动导致同一请求发出多次</li>
      <li><strong>系统层重复</strong>：前端框架重渲染触发重复请求、路由切换时未取消的 in-flight 请求在新页面回来</li>
    </ul>
    <p>在高 QPS 下，即使只有 0.1% 的重复率，也意味着每天额外 <strong>1 万次</strong>重复操作——对支付、下单、库存扣减等场景，每一次都可能造成资损。</p>`;

  // ── 一、数据改造 ──────────────────────────────────────────────────────

  const layer1Title = '一、防止重复提交（前端第一道防线）';

  const disableBtnCode = `// 方案一：提交期间禁用按钮（最基础，必做）
// 问题：用户双击、网络慢时多次点击

function SubmitButton({ onSubmit }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading) return;           // 防重入
    setLoading(true);
    try {
      await onSubmit();
    } finally {
      setLoading(false);           // 无论成功失败都恢复
    }
  }

  return (
    <button onClick={handleClick} disabled={loading}>
      {loading ? '提交中...' : '提交'}
    </button>
  );
}

// ❌ 常见错误：只在 onClick 里 return，忘了在请求完成前组件卸载的情况
// ✅ 配合 useRef 防止组件卸载后 setState
function useSafeState(init) {
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);
  const [state, setState] = useState(init);
  return [state, v => mounted.current && setState(v)];
}`;

  const lockCode = `// 方案二：请求级别的锁（防止并发，比按钮 disabled 更可靠）
// 适合同一接口可能被多处触发的情况（快捷键、自动保存等）

const pendingRequests = new Map();

async function lockedRequest(key, requestFn) {
  if (pendingRequests.has(key)) {
    // 已有同类请求 in-flight，返回同一个 Promise，不重复发起
    return pendingRequests.get(key);
  }

  const promise = requestFn().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}

// 使用
function submitOrder(orderData) {
  return lockedRequest(
    'submit-order',          // 锁的 key，同 key 的并发请求共享同一个 Promise
    () => api.post('/order', orderData)
  );
}`;

  const throttleCode = `// 方案三：表单级防抖（适合自动保存、搜索联想等非关键操作）
// 注意：支付/下单不应该用防抖，用锁更安全

import { useDebounceFn } from 'ahooks';

function AutoSaveForm() {
  const { run: autoSave } = useDebounceFn(
    async (data) => { await api.patch('/draft', data); },
    { wait: 800 }
  );

  return <input onChange={e => autoSave({ content: e.target.value })} />;
}`;

  // ── 二、Idempotency Key（核心机制）──────────────────────────────────

  const layer2Title = '二、Idempotency Key（与后端联合保障）';

  const idempKeyNote = ruleBox('info',
    `<strong>Idempotency Key 是什么？</strong>前端为每次<strong>业务操作</strong>生成一个唯一 ID，随请求头带给后端。后端以这个 key 为去重依据：相同 key 的请求只执行一次业务逻辑，后续相同 key 的请求直接返回第一次的结果（从缓存读）。这是业界（Stripe、支付宝等支付系统）的标准方案。`);

  const idemKeyCode = `// 生成 Idempotency Key 的时机和粒度

// ✅ 正确：在用户触发操作时生成，绑定到这次"意图"
// 同一次点击无论重试多少次，key 不变
function useIdempotencyKey() {
  const keyRef = useRef(null);

  function getKey() {
    if (!keyRef.current) {
      keyRef.current = crypto.randomUUID(); // 现代浏览器原生支持
    }
    return keyRef.current;
  }

  function resetKey() {
    keyRef.current = null; // 操作成功后重置，下次操作生成新 key
  }

  return { getKey, resetKey };
}

// ❌ 错误：每次请求都生成新 key（失去幂等意义）
// ❌ 错误：用时间戳作 key（精度不够，并发下可能重复）
// ✅ 正确：用 crypto.randomUUID()（RFC 4122 UUID v4，碰撞概率极低）`;

  const axiosCode = `// 在 axios 拦截器中统一注入 Idempotency-Key
// 只对"写操作"（POST/PUT/PATCH/DELETE）注入，GET 不需要

import axios from 'axios';

const instance = axios.create({ baseURL: '/api' });

// 请求拦截器：写操作自动注入 key
instance.interceptors.request.use(config => {
  const method = config.method?.toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    // 优先使用业务层传入的 key，否则自动生成
    config.headers['Idempotency-Key'] =
      config.idempotencyKey ?? crypto.randomUUID();
  }
  return config;
});

// 响应拦截器：网络超时时，用原始 key 重试（关键！）
instance.interceptors.response.use(
  res => res,
  async err => {
    const config = err.config;
    // 只在超时或 5xx 时重试，且最多重试 2 次
    if (
      config._retryCount < 2 &&
      (err.code === 'ECONNABORTED' || err.response?.status >= 500)
    ) {
      config._retryCount = (config._retryCount ?? 0) + 1;
      // 重试时复用原 key，让后端识别为同一次操作
      config.idempotencyKey = config.headers['Idempotency-Key'];
      return instance(config);
    }
    return Promise.reject(err);
  }
);`;

  const backendContractCode = `// 前后端约定的接口契约（以下为后端需要实现的逻辑，供前端理解）

// 后端处理流程（伪代码）：
// 1. 从请求头取 Idempotency-Key
// 2. 查 Redis：key 是否已存在
//    - 存在且状态为"处理中"：返回 202 Accepted，告知前端等待
//    - 存在且状态为"已完成"：直接返回缓存的响应结果
//    - 不存在：执行业务逻辑，将结果存入 Redis（TTL 24h）
// 3. Redis Key 格式：idempotency:{service}:{key}

// 前端需要处理的 HTTP 状态码：
// 200/201：成功，重置 idempotency key（下次操作换新 key）
// 202：处理中，轮询或 WebSocket 等待结果
// 409 Conflict：key 冲突（极罕见，重新生成 key 重试）
// 422：业务校验失败（不是幂等问题，提示用户）`;

  // ── 三、取消 in-flight 请求 ──────────────────────────────────────────

  const layer3Title = '三、取消过期请求（防止"幽灵响应"）';

  const abortCode = `// 场景：用户快速切换 Tab，旧请求的响应在新页面回来，
// 覆盖新页面的数据（竞态条件，Race Condition）

// 方案：AbortController + React useEffect cleanup
function useAbortableRequest(requestFn, deps) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    requestFn(controller.signal)
      .then(res => {
        if (!controller.signal.aborted) {  // 双重检查
          setData(res.data);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    // cleanup：组件卸载或 deps 变化时取消请求
    return () => controller.abort();
  }, deps);

  return { data, loading };
}

// 使用
function OrderList({ userId }) {
  const { data } = useAbortableRequest(
    signal => api.get(\`/orders?uid=\${userId}\`, { signal }),
    [userId]
  );
}`;

  const cancelDupCode = `// 更进一步：axios 拦截器自动取消同 URL 的重复请求
// 适合搜索联想、筛选条件频繁变化的场景

const controllerMap = new Map();

instance.interceptors.request.use(config => {
  const key = \`\${config.method}:\${config.url}\`;

  // 取消同 URL 的上一个 pending 请求
  if (controllerMap.has(key)) {
    controllerMap.get(key).abort(\`Cancelled by new request: \${key}\`);
  }

  const controller = new AbortController();
  config.signal = controller.signal;
  controllerMap.set(key, controller);

  return config;
});

instance.interceptors.response.use(
  res => {
    const key = \`\${res.config.method}:\${res.config.url}\`;
    controllerMap.delete(key);
    return res;
  },
  err => {
    if (axios.isCancel(err)) return Promise.resolve(null); // 被取消的请求静默处理
    return Promise.reject(err);
  }
);`;

  // ── 决策表 ────────────────────────────────────────────────────────────

  const decisionHtml = `
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:var(--bg-overlay)">
          <th style="padding:8px 12px;text-align:left;color:var(--text-muted);font-weight:600;font-size:11px;letter-spacing:.5px;border-bottom:1px solid var(--border)">场景</th>
          <th style="padding:8px 12px;text-align:left;color:var(--text-muted);font-weight:600;font-size:11px;letter-spacing:.5px;border-bottom:1px solid var(--border)">推荐方案</th>
          <th style="padding:8px 12px;text-align:left;color:var(--text-muted);font-weight:600;font-size:11px;letter-spacing:.5px;border-bottom:1px solid var(--border)">重点</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom:1px solid var(--border)">
          <td style="padding:9px 12px;color:var(--text-primary);font-size:12.5px">支付 / 下单</td>
          <td style="padding:9px 12px;color:var(--text-secondary)">按钮 disabled + Idempotency-Key + 重试复用 key</td>
          <td style="padding:9px 12px;color:var(--text-secondary)">后端 Redis 去重是最终保障</td>
        </tr>
        <tr style="border-bottom:1px solid var(--border)">
          <td style="padding:9px 12px;color:var(--text-primary);font-size:12.5px">表单提交</td>
          <td style="padding:9px 12px;color:var(--text-secondary)">请求锁 + Idempotency-Key</td>
          <td style="padding:9px 12px;color:var(--text-secondary)">操作成功后 resetKey()</td>
        </tr>
        <tr style="border-bottom:1px solid var(--border)">
          <td style="padding:9px 12px;color:var(--text-primary);font-size:12.5px">自动保存 / 草稿</td>
          <td style="padding:9px 12px;color:var(--text-secondary)">防抖 + PATCH 语义（天然幂等）</td>
          <td style="padding:9px 12px;color:var(--text-secondary)">PATCH 用资源 ID 定位，多次 PATCH 结果一致</td>
        </tr>
        <tr style="border-bottom:1px solid var(--border)">
          <td style="padding:9px 12px;color:var(--text-primary);font-size:12.5px">搜索 / 筛选</td>
          <td style="padding:9px 12px;color:var(--text-secondary)">取消重复请求（AbortController）</td>
          <td style="padding:9px 12px;color:var(--text-secondary)">GET 语义天然幂等，重点是取消竞态</td>
        </tr>
        <tr>
          <td style="padding:9px 12px;color:var(--text-primary);font-size:12.5px">页面切换时的 in-flight 请求</td>
          <td style="padding:9px 12px;color:var(--text-secondary)">useEffect cleanup abort</td>
          <td style="padding:9px 12px;color:var(--text-secondary)">防止"幽灵响应"污染新页面状态</td>
        </tr>
      </tbody>
    </table>`;

  const notes = [
    ruleBox('warning', `<strong>幂等性的责任边界：</strong>前端只能做<strong>尽力而为</strong>的防重——按钮禁用、请求锁、AbortController 都无法覆盖用户刷新页面、同一账号多端操作的情况。真正的幂等保障必须由后端 + 数据库唯一约束 + 分布式锁来实现，前端的防重是减少后端压力，不是替代后端。`),
    ruleBox('info', `<strong>Idempotency-Key 的生命周期：</strong>key 在"用户发起操作意图"时生成，在"操作成功响应后"重置。<strong>失败不重置</strong>——失败后用同一个 key 重试，让后端识别为同一次操作而非新操作，这是关键设计。`),
    ruleBox('success', `<strong>高 QPS 下的监控建议：</strong>在埋点系统中记录 Idempotency-Key 的命中率（后端返回"已处理"的比例），可以发现客户端的重复提交热点。如果某个接口的 key 命中率超过 5%，说明该场景的前端防重逻辑需要加强。`),
    ruleBox('danger', `<strong>不要用时间戳或自增 ID 作 Idempotency-Key：</strong>时间戳精度不够（毫秒级并发仍会碰撞），自增 ID 在多 Tab / 多端场景下会重置。只用 <code>crypto.randomUUID()</code>（UUID v4），不支持的旧浏览器用 <code>uuid</code> 包 polyfill。`),
  ];

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('问题背景：重复请求的来源', `<div class="section-body">${background}</div>`)}
    ${section(layer1Title, '')}
    ${section('提交期间禁用按钮', codeBlock('SubmitButton.tsx', 'dot-blue', 'javascript', disableBtnCode))}
    ${section('请求级别的锁（推荐）', codeBlock('lockedRequest.js', 'dot-green', 'javascript', lockCode))}
    ${section('防抖（仅适合非关键操作）', codeBlock('AutoSave.tsx', 'dot-yellow', 'javascript', throttleCode))}
    ${section(layer2Title, idempKeyNote)}
    ${section('生成与管理 Idempotency Key', codeBlock('useIdempotencyKey.js', 'dot-blue', 'javascript', idemKeyCode))}
    ${section('axios 拦截器统一注入 + 超时重试', codeBlock('axios-idempotency.js', 'dot-orange', 'javascript', axiosCode))}
    ${section('前后端接口契约', codeBlock('contract.pseudo', 'dot-yellow', 'javascript', backendContractCode))}
    ${section(layer3Title, '')}
    ${section('useEffect cleanup 取消请求', codeBlock('useAbortableRequest.js', 'dot-green', 'javascript', abortCode))}
    ${section('axios 拦截器自动取消重复请求', codeBlock('cancel-duplicate.js', 'dot-red', 'javascript', cancelDupCode))}
    ${section('场景决策表', decisionHtml)}
    ${section('注意事项', notes.join(''))}`);
}
