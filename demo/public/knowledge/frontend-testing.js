function renderFrontendTesting(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>前端测试不是"装个 Jest 跑几个 case"那么简单，而是一套<strong>分层覆盖、
    各司其职、互不重复</strong>的体系。落地目标有五个：<strong>① 静态检查拦低级错误</strong>（ESLint / TS）；
    <strong>② 单测覆盖纯逻辑</strong>（utils / hooks / 状态机）；<strong>③ 组件测交互行为</strong>（用户视角而非实现视角）；
    <strong>④ 集成测模块联动</strong>（含真实依赖、网络 Mock）；<strong>⑤ E2E 测关键路径</strong>（真实浏览器跑业务流）。
    再叠加视觉回归和性能 / 可访问性，构成从"提交到上线"的全链路防线。
    核心铁律：<strong>越靠近用户的测试越值钱，越靠近代码的测试越快</strong>，分层互补，不要让单测去验页面行为。`);

  const overview = `
    <p><strong>前端测试全景（七层金字塔）：</strong></p>
    <table class="metrics-table">
      <thead><tr><th>层级</th><th>测试什么</th><th>主力工具</th><th>速度</th><th>成本</th><th>稳定性</th></tr></thead>
      <tbody>
        <tr><td>① 静态检查</td><td>语法 / 类型 / 代码规范</td><td>ESLint / TypeScript / Stylelint</td><td>秒级</td><td>极低</td><td>极高</td></tr>
        <tr><td>② 单元测试</td><td>纯函数 / Hook / Reducer</td><td>Vitest / Jest</td><td>秒级</td><td>低</td><td>高</td></tr>
        <tr><td>③ 组件测试</td><td>组件交互 / 渲染输出</td><td>RTL / Vue Test Utils</td><td>秒级</td><td>中</td><td>中</td></tr>
        <tr><td>④ 集成测试</td><td>多模块联动 + 网络层</td><td>RTL + MSW</td><td>十秒级</td><td>中</td><td>中</td></tr>
        <tr><td>⑤ E2E 测试</td><td>真实浏览器的关键业务流</td><td>Playwright / Cypress</td><td>分钟级</td><td>高</td><td>低</td></tr>
        <tr><td>⑥ 视觉回归</td><td>UI 视觉变更 / 像素级对比</td><td>Percy / Playwright snapshots</td><td>分钟级</td><td>高</td><td>中</td></tr>
        <tr><td>⑦ 性能 / 可访问性</td><td>LCP / CLS / axe 违规</td><td>Lighthouse CI / axe-core</td><td>分钟级</td><td>高</td><td>中</td></tr>
      </tbody>
    </table>
    <p><strong>三条铁律：</strong>
      ① <strong>测试金字塔而不是冰激凌</strong>：底层多、顶层少，E2E 只覆盖核心路径（登录、下单、支付），不要拿 E2E 验表单校验；
      ② <strong>测行为不测实现</strong>：组件测试断言"用户看到什么"而不是"调了哪个 setState"，否则重构必坏测试；
      ③ <strong>测试代码也是产品代码</strong>：被人维护的测试才有价值，没人维护的测试是技术债。</p>`;

  // ─── ① 静态检查 ──────────────────────────────────────────────────────────────
  const s1 = `
    <h4>核心目标</h4>
    <p>在代码进入测试运行器之前就拦下大部分低级错误：拼写、未定义变量、错误类型、危险写法。
    这是成本最低、收益最高的一层，<strong>通常能挡住 60% 以上的 bug</strong>，但很多团队只配了 ESLint 没配 TS strict，或者 TS 开了但没开 strict。</p>
    <h4>落地切入点</h4>
    <ol>
      <li><strong>ESLint + TypeScript strict</strong>：<code>strict: true</code>、<code>noUncheckedIndexedAccess</code>、<code>noImplicitOverride</code> 全开</li>
      <li><strong>用 typescript-eslint 替代旧规则</strong>：TS 项目里很多 ESLint 规则已被类型检查覆盖，避免冗余报警</li>
      <li><strong>Stylelint 守 CSS 命名与颜色</strong>：禁止硬编码色值、强制 BEM 命名、检测未使用选择器</li>
      <li><strong>Prettier 不管质量只管格式</strong>：把 Prettier 和 ESLint 解耦，避免两者规则冲突</li>
      <li><strong>git hook + CI 双保险</strong>：本地 husky 拦一次，CI 再跑一次全量，防止 <code>--no-verify</code> 漏过</li>
    </ol>`;

  const s1Code = `// ── tsconfig.json：strict 全开 ──────────────────────────────────────────────────
{
  "compilerOptions": {
    "strict": true,                       // 总开关，下面六项全开
    "noUncheckedIndexedAccess": true,     // arr[i] 类型自动加 | undefined
    "noImplicitOverride": true,           // override 必须显式写
    "noFallthroughCasesInSwitch": true,   // switch 必须有 break / return
    "noUnusedLocals": true,               // 未使用变量报错
    "noUnusedParameters": true,           // 未使用参数报错
    "verbatimModuleSyntax": true,         // type-only import 必须用 import type
    "isolatedModules": true,              // 兼容 Vite/esbuild 单文件编译
    "useDefineForClassFields": true       // 类字段使用标准语义
  }
}

# ── eslint.config.js（flat config）──────────────────────────────────────────────
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import hooksPlugin from 'eslint-plugin-react-hooks';
import a11yPlugin from 'eslint-plugin-jsx-a11y';   // 静态阶段就能查无障碍问题

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname }
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': hooksPlugin,
      'jsx-a11y': a11yPlugin
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...hooksPlugin.configs.recommended.rules,
      'react/jsx-uses-react': 'off',           // React 17+ 不需要 import React
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error'
    }
  }
);

# ── .stylelintrc.json ──────────────────────────────────────────────────────────
{
  "extends": ["stylelint-config-standard", "stylelint-config-recess-order"],
  "rules": {
    "color-no-hex": true,                     // 强制走设计 token
    "declaration-property-value-disallowed-list": {
      "/.*/": ["initial", "unset"]            // 禁用 initial/unset，避免覆盖问题
    },
    "selector-class-pattern": "^[a-z][a-zA-Z0-9]+(__[a-z][a-zA-Z0-9]*)?(_[a-z][a-zA-Z0-9]*)?$"
  }
}`;

  // ─── ② 单元测试 ──────────────────────────────────────────────────────────────
  const s2 = `
    <h4>核心目标</h4>
    <p>覆盖<strong>纯逻辑</strong>：工具函数、Reducer、状态机、自定义 Hook。
    速度要快（全量几千 case 几秒跑完），覆盖率要高（核心 utils 接近 100%）。
    <strong>不要用单测去验 DOM 渲染</strong>——那是组件测试的活；也不要在单测里 Mock 全世界，Mock 越多测试越不能反映真实行为。</p>
    <h4>落地切入点</h4>
    <ol>
      <li><strong>选 Vitest 而不是 Jest</strong>：Vite 项目里 Jest 配置麻烦，Vitest 复用 Vite 配置零成本，且 ESM 原生支持</li>
      <li><strong>测函数的所有分支</strong>：每个 if / switch case 至少一个 case，覆盖正常 + 边界 + 异常</li>
      <li><strong>测 Hook 用 renderHook</strong>：不要手搓 ReactDOM.render，<code>@testing-library/react</code> 的 <code>renderHook</code> 已经处理好 act 包裹</li>
      <li><strong>测时间用 vi.useFakeTimers</strong>：所有 <code>setTimeout</code> / <code>Date.now</code> 必须假时间，否则测试时快时慢</li>
      <li><strong>覆盖率门槛</strong>：核心 utils 100%、hooks 90%、其它 70%，<code>vitest --coverage</code> 在 CI 强制门槛</li>
    </ol>`;

  const s2Code = `// ── vitest.config.ts ───────────────────────────────────────────────────────────
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',                  // DOM 类 case 默认 jsdom
    globals: true,                         // describe/it/expect 不用 import
    setupFiles: ['./test/setup.ts'],       // 全局 setup（jest-dom 等）
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {                       // CI 门槛，跌破则 fail
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80
      },
      exclude: ['**/*.config.*', '**/types.ts', 'demo/**']
    }
  }
});

// ── test/setup.ts ──────────────────────────────────────────────────────────────
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => cleanup());                // 每个 case 后清理 DOM，防止串味

// ── 示例：纯函数单测 ───────────────────────────────────────────────────────────
// src/utils/format.ts
export function formatPrice(cents: number, currency = 'CNY'): string {
  if (!Number.isFinite(cents)) throw new Error('invalid cents');
  const symbol = currency === 'CNY' ? '¥' : '$';
  return \`\${symbol}\${(cents / 100).toFixed(2)}\`;
}

// test/utils/format.test.ts
import { describe, it, expect } from 'vitest';
import { formatPrice } from '@/utils/format';

describe('formatPrice', () => {
  it('正常金额', () => {
    expect(formatPrice(12345)).toBe('¥123.45');
  });
  it('负数也走格式化', () => {
    expect(formatPrice(-100)).toBe('¥-1.00');
  });
  it('非数字抛错', () => {
    expect(() => formatPrice(NaN)).toThrow('invalid cents');
  });
  it('支持美元', () => {
    expect(formatPrice(500, 'USD')).toBe('$5.00');
  });
});

// ── 示例：Hook 单测 ────────────────────────────────────────────────────────────
// src/hooks/useDebouncedValue.ts
import { useState, useEffect } from 'react';
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// test/hooks/useDebouncedValue.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('延迟后才更新', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), {
      initialProps: { v: 'a' }
    });
    expect(result.current).toBe('a');
    rerender({ v: 'b' });
    expect(result.current).toBe('a');      // 期间还是旧值
    act(() => vi.advanceTimersByTime(299));
    expect(result.current).toBe('a');      // 没到时间
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('b');      // 时间到才更新
  });

  it('卸载时清理 timer', () => {
    const { result, unmount } = renderHook(() => useDebouncedValue('x', 1000));
    unmount();
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe('x');      // 卸载后不再触发 setState
  });
});`;

  // ─── ③ 组件测试 ──────────────────────────────────────────────────────────────
  const s3 = `
    <h4>核心目标</h4>
    <p>测组件的<strong>交互行为与渲染输出</strong>，而不是测它内部怎么实现。
    核心原则是<strong>"以用户视角测"</strong>：用户怎么用，测试就怎么写——找按钮、输入、点击、断言屏幕上出现什么。
    <strong>绝不测 setState / 内部方法 / 实例 ref</strong>，那是测实现，重构必坏。</p>
    <h4>落地切入点</h4>
    <ol>
      <li><strong>用 Testing Library</strong>：API 围绕 <code>screen.getByRole</code> / <code>getByText</code>，逼你写无障碍友好的代码</li>
      <li><strong>优先用 getByRole 而不是 getByTestId</strong>：能 getByRole 就别用 testId，逼组件走语义化 HTML</li>
      <li><strong>用 userEvent 而不是 fireEvent</strong>：<code>userEvent.click</code> 模拟真实点击链路（focus / pointer / mouse），fireEvent 只触发单一事件</li>
      <li><strong>用 waitFor 处理异步</strong>：不要 <code>await act</code> 手动包，<code>await screen.findByText</code> 自带等待</li>
      <li><strong>不 Mock 同模块组件</strong>：测 <code>&lt;Form/&gt;</code> 就不要 Mock <code>&lt;Input/&gt;</code>，否则测的是 Mock 不是 Form</li>
    </ol>`;

  const s3Code = `// ── 示例：登录表单组件测试 ─────────────────────────────────────────────────────
// src/components/LoginForm.tsx
import { useState } from 'react';

export function LoginForm({ onSubmit }: { onSubmit: (u: string, p: string) => Promise<void> }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try { await onSubmit(username, password); }
    catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} aria-label="登录表单">
      <label>
        用户名
        <input value={username} onChange={e => setUsername(e.target.value)} required />
      </label>
      <label>
        密码
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
      </label>
      <button type="submit" disabled={loading}>{loading ? '登录中…' : '登录'}</button>
      {error && <div role="alert">{error}</div>}
    </form>
  );
}

// ── test/components/LoginForm.test.tsx ─────────────────────────────────────────
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/components/LoginForm';

describe('LoginForm', () => {
  it('输入并提交表单', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<LoginForm onSubmit={onSubmit} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('用户名'), 'alice');
    await user.type(screen.getByLabelText('密码'), 'secret123');
    await user.click(screen.getByRole('button', { name: '登录' }));

    expect(onSubmit).toHaveBeenCalledWith('alice', 'secret123');
    expect(await screen.findByRole('button', { name: '登录中…' })).toBeInTheDocument();
  });

  it('提交失败展示错误', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('密码错误'));
    render(<LoginForm onSubmit={onSubmit} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('用户名'), 'alice');
    await user.type(screen.getByLabelText('密码'), 'wrong');
    await user.click(screen.getByRole('button', { name: '登录' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('密码错误');
  });

  it('必填字段为空时不调用 onSubmit', async () => {
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} />);
    const user = userEvent.setup();
    // HTML form 的 required 校验会阻止提交
    await user.click(screen.getByRole('button', { name: '登录' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});`;

  // ─── ④ 集成测试 ──────────────────────────────────────────────────────────────
  const s4 = `
    <h4>核心目标</h4>
    <p>测<strong>多个模块联动</strong>后的真实行为，重点是<strong>组件 + 状态 + 网络层</strong>的组合。
    与组件测试的差别：组件测试 Mock 掉所有依赖，集成测试<strong>尽量用真实依赖</strong>，只在网络边界用 MSW 拦截。
    能用集成测试覆盖的场景，就不要用 E2E——快一个数量级。</p>
    <h4>落地切入点</h4>
    <ol>
      <li><strong>用 MSW 拦截网络请求</strong>：在 Service 层之下拦截 fetch / xhr，<strong>不要 Mock 模块内的 fetch 函数</strong>，否则换 HTTP 库测试就废</li>
      <li><strong>用真实的状态管理</strong>：Redux / Zustand / Jotai 都用真实 store，不要 Mock selector</li>
      <li><strong>用真实的子组件</strong>：只在跨应用边界（如路由）才 Mock，同应用内不 Mock</li>
      <li><strong>覆盖关键业务流</strong>：登录 → 拉列表 → 编辑 → 提交 → 看到结果，一条龙集成测试</li>
      <li><strong>每个 case 独立隔离</strong>：用 <code>beforeEach</code> 重置 MSW handler 与 store，避免串味</li>
    </ol>`;

  const s4Code = `// ── test/integration/user-flow.test.tsx ───────────────────────────────────────
// 场景：用户登录 → 拉取订单列表 → 取消第一个订单 → 列表刷新
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { App } from '@/App';

// ── MSW server：拦截网络层，但组件/状态/路由都用真实实现 ─────────────────────
const server = setupServer(
  http.post('/api/login', async ({ request }) => {
    const { username } = await request.json() as { username: string };
    return HttpResponse.json({ token: \`token-\${username}\` });
  }),
  http.get('/api/orders', ({ request }) => {
    const auth = request.headers.get('Authorization');
    if (!auth) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json([
      { id: 'o1', title: '订单 A', status: 'pending' },
      { id: 'o2', title: '订单 B', status: 'paid' }
    ]);
  }),
  http.post('/api/orders/:id/cancel', () => HttpResponse.json({ ok: true }))
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());      // 每个 case 重置 handler
afterAll(() => server.close());

describe('订单取消流程', () => {
  it('登录后取消订单', async () => {
    render(<App />);
    const user = userEvent.setup();

    // ① 登录
    await user.type(await screen.findByLabelText('用户名'), 'alice');
    await user.type(screen.getByLabelText('密码'), 'secret123');
    await user.click(screen.getByRole('button', { name: '登录' }));

    // ② 列表出现
    const list = await screen.findByRole('list', { name: '订单列表' });
    expect(within(list).getByText('订单 A')).toBeInTheDocument();

    // ③ 取消第一单
    const firstItem = within(list).getAllByRole('listitem')[0];
    await user.click(within(firstItem).getByRole('button', { name: '取消订单' }));

    // ④ 取消按钮消失 + 列表状态更新
    expect(await screen.findByText('订单 A 已取消')).toBeInTheDocument();
  });

  it('未登录直接访问订单页跳登录', async () => {
    render(<App />);
    // 路由守卫触发重定向到 /login
    expect(await screen.findByText('请先登录')).toBeInTheDocument();
  });
});`;

  // ─── ⑤ E2E 测试 ──────────────────────────────────────────────────────────────
  const s5 = `
    <h4>核心目标</h4>
    <p>在<strong>真实浏览器</strong>里跑<strong>真实业务流</strong>，验证从用户输入到后端到前端渲染的完整链路。
    E2E 慢、贵、易碎，<strong>只覆盖关键路径</strong>：登录、下单、支付、注册、核心导航。
    <strong>不要用 E2E 测表单校验、不要用 E2E 测每个分支</strong>——那是单测和组件测试的活。</p>
    <h4>落地切入点</h4>
    <ol>
      <li><strong>选 Playwright 而不是 Cypress</strong>：Playwright 多浏览器并行、原生跨域、API 更现代；Cypress 单线程、iframe 与新窗口支持差</li>
      <li><strong>用 page object 模式封装</strong>：把"登录页"做成一个类，避免每个 spec 重复写 <code>page.fill('#user')</code></li>
      <li><strong>用 data-testid 锚定元素</strong>：E2E 不依赖文案，文案改了就坏；testId 是契约</li>
      <li><strong>用 trace + video 录制失败现场</strong>：CI 失败时直接看录像，比看截图强十倍</li>
      <li><strong>并行 + 分片</strong>：用 <code>--shard</code> 把 case 分到多台机器跑，10 分钟跑完 200 个 case</li>
      <li><strong>使用 Playwright UI 模式开发</strong>：<code>npx playwright test --ui</code> 写新 case 时实时回放，效率倍增</li>
    </ol>`;

  const s5Code = `// ── playwright.config.ts ───────────────────────────────────────────────────────
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,                    // 文件级并行
  forbidOnly: !!process.env.CI,           // CI 上禁止 test.only
  retries: process.env.CI ? 2 : 0,        // CI 失败重试 2 次，对抗 flaky
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['github']                            // CI 里输出 GitHub Annotations
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',              // 失败重试时录 trace
    video: 'retain-on-failure',           // 失败保留视频
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
    { name: 'mobile',   use: { ...devices['iPhone 15'] } }
  ],
  webServer: {                            // 自动起 dev server
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI
  }
});

// ── e2e/login.spec.ts ──────────────────────────────────────────────────────────
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { OrderPage } from './pages/OrderPage';

test('用户登录后查看订单', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.fillCredentials('alice', 'secret123');
  await login.submit();

  const order = new OrderPage(page);
  await expect(order.firstOrderTitle).toHaveText('订单 A');
  await order.cancelFirstOrder();
  await expect(page.getByText('订单 A 已取消')).toBeVisible();
});

// ── e2e/pages/LoginPage.ts（page object 模式）──────────────────────────────────
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.getByTestId('login-username');
    this.passwordInput = page.getByTestId('login-password');
    this.submitButton  = page.getByRole('button', { name: '登录' });
  }

  async goto() { await this.page.goto('/login'); }
  async fillCredentials(u: string, p: string) {
    await this.usernameInput.fill(u);
    await this.passwordInput.fill(p);
  }
  async submit() { await this.submitButton.click(); }
}`;

  // ─── ⑥ 视觉回归 ──────────────────────────────────────────────────────────────
  const s6 = `
    <h4>核心目标</h4>
    <p>挡住<strong>视觉层面的回归</strong>：布局错位、间距变了、颜色变了、字体变小了。
    这些问题单测和 E2E 都难发现——文字还在、按钮还能点，但视觉已经崩了。
    视觉回归用<strong>像素级对比</strong>覆盖：基线截图 vs 当前截图，diff 超阈值就告警。</p>
    <h4>落地切入点</h4>
    <ol>
      <li><strong>关键页面 + 关键状态截基线</strong>：登录页空 / 错 / 加载中三种状态都截，列表页空 / 满 / 错三种</li>
      <li><strong>用 Playwright 自带 snapshot</strong>：<code>expect(page).toHaveScreenshot()</code> 零额外成本</li>
      <li><strong>稳定反闪烁</strong>：用 <code>animations: 'disabled'</code>、<code>caret: 'hide'</code> 关掉动画和光标，避免假阳性</li>
      <li><strong>专项页面而不是组件</strong>：组件级截图容易因父级样式变化误报，整页截图才反映真实视觉</li>
      <li><strong> Percy / Chromatic 托管方案</strong>：不想自己运维基线图，就接托管服务，diff 在 PR 里可视化审阅</li>
    </ol>`;

  const s6Code = `// ── e2e/visual.spec.ts ─────────────────────────────────────────────────────────
import { test, expect } from '@playwright/test';

test('登录页 - 默认态', async ({ page }) => {
  await page.goto('/login');
  // 关掉动画与光标，避免像素抖动
  await expect(page).toHaveScreenshot('login-default.png', {
    animations: 'disabled',
    caret: 'hide',
    threshold: 0.1                       // 允许 0.1% 像素差异
  });
});

test('登录页 - 错误态', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('login-username').fill('alice');
  await page.getByTestId('login-password').fill('wrong');
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveScreenshot('login-error.png', {
    animations: 'disabled'
  });
});

// ── 仅在视觉回归 job 跑（避免拖慢主 CI）──────────────────────────────────────
// .github/workflows/visual.yml
// on: { pull_request: { paths: ['src/**', 'e2e/visual.spec.ts'] } }
// jobs:
//   visual:
//     runs-on: ubuntu-latest
//     steps:
//       - uses: actions/checkout@v4
//       - uses: actions/setup-node@v4
//         with: { node-version: 20 }
//       - run: pnpm install --frozen-lockfile
//       - run: pnpm exec playwright install --with-deps chromium
//       - run: pnpm exec playwright test e2e/visual.spec.ts
//       - if: failure()
//         uses: actions/upload-artifact@v4
//         with:
//           name: visual-diff
//           path: test-results/*-diff.png

// ── 更新基线（视觉变更确认后）──────────────────────────────────────────────
// pnpm exec playwright test e2e/visual.spec.ts --update-snapshots
// 然后 git add e2e/visual.spec.ts-snapshots/ && git commit -m "chore: 更新视觉基线"`;

  // ─── ⑦ 性能 / 可访问性 ──────────────────────────────────────────────────────
  const s7 = `
    <h4>核心目标</h4>
    <p>把<strong>性能预算</strong>和<strong>无障碍合规</strong>变成 CI 红线，防止上线后慢慢劣化。
    性能回归通常不是一次提交引入的，而是"加了个图标库""多套了一层 Provider""忘记 code split"积累出来的。
    可访问性同理：键盘可达、对比度达标、ARIA 正确，这些用人工 review 必漏，必须自动化。</p>
    <h4>落地切入点</h4>
    <ol>
      <li><strong>Lighthouse CI 守性能预算</strong>：LCP &lt; 2.5s、CLS &lt; 0.1、INP &lt; 200ms，跌破红线 PR 不能合</li>
      <li><strong>bundle 预算</strong>：主 bundle gzip &lt; 200KB、单 chunk &lt; 100KB，<code>vite-plugin-bundle-analyzer</code> + CI 报告</li>
      <li><strong>axe-core 单测 / E2E 集成</strong>：在组件测试里跑 <code>axe()</code> 自动查 WCAG 违规，零成本接入</li>
      <li><strong>键盘流测试</strong>：E2E 里写"只用 Tab 走完整页面"的 case，键盘不可达必坏</li>
      <li><strong>对比度检查</strong>：设计 token 阶段就验对比度，避免上线后人工扫色</li>
    </ol>`;

  const s7Code = `// ── .github/workflows/lighthouse.yml ──────────────────────────────────────────
// on: { pull_request: }
// jobs:
//   lighthouse:
//     runs-on: ubuntu-latest
//     steps:
//       - uses: actions/checkout@v4
//       - run: pnpm install --frozen-lockfile
//       - run: pnpm build
//       - run: pnpm exec lhci autorun -- --collect.url=http://localhost:5173 \\
//              --assert.preset=lighthouse:no-pwa \\
//              --assert.assertions.categories.performance=warn \\
//              --assert.assertions.categories.accessibility=error
//       - run: pnpm exec lhci autorun -- --upload.target=temporary-public-storage

// ── lighthouserc.json ──────────────────────────────────────────────────────────
{
  "ci": {
    "assert": {
      "assertions": {
        "first-contentful-paint": ["error", { "maxNumeric": 1800 }],
        "largest-contentful-paint": ["error", { "maxNumeric": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumeric": 0.1 }],
        "total-blocking-time": ["error", { "maxNumeric": 200 }],
        "categories:performance": ["warn", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 1 }],   // a11y 必须 100 分
        "categories:seo": ["warn", { "minScore": 0.9 }]
      }
    }
  }
}

// ── 性能预算：bundle 体积 ──────────────────────────────────────────────────────
// vite.config.ts
import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'utils-vendor': ['lodash-es', 'dayjs']
        }
      }
    },
    chunkSizeWarningLimit: 500         // 单 chunk 超过 500KB 警告
  },
  plugins: [
    visualizer({
      filename: 'dist/bundle-report.html',
      gzipSize: true,
      brotliSize: true
    })
  ]
});

// ── CI bundle 预算检查 ─────────────────────────────────────────────────────────
// scripts/check-bundle-size.ts
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';

const BUDGET = 200 * 1024;              // 主 bundle gzip 后 200KB
const dist = 'dist/assets';
const main = readdirSync(dist).find(f => /^main\\.[^/]+\\.js$/.test(f));
if (!main) throw new Error('main chunk not found');

const buf = readFileSync(join(dist, main));
const gz = gzipSync(buf);
const sizeKB = Math.round(gz.length / 1024);
console.log(\`main bundle gzip: \${sizeKB}KB / budget \${BUDGET / 1024}KB\`);
if (gz.length > BUDGET) {
  console.error(\`❌ 超预算 \${sizeKB - BUDGET / 1024}KB\`);
  process.exit(1);
}

// ── axe-core 在组件测试里跑 a11y 检查 ─────────────────────────────────────────
// test/utils/axe.ts
import { axe } from 'vitest-axe';
import { expect } from 'vitest';

export async function expectNoA11yViolations(container: HTMLElement) {
  const results = await axe(container);
  expect(results.violations.length).toBe(0);
}

// ── 在组件测试中使用 ─────────────────────────────────────────────────────────
import { render } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/utils/axe';
import { LoginForm } from '@/components/LoginForm';

it('LoginForm 无 a11y 违规', async () => {
  const { container } = render(<LoginForm onSubmit={() => {}} />);
  await expectNoA11yViolations(container);
});

// ── E2E 里跑键盘可达性测试 ─────────────────────────────────────────────────────
test('仅用键盘能完成登录', async ({ page }) => {
  await page.goto('/login');
  await page.keyboard.press('Tab');                          // 焦点到用户名
  await expect(page.getByTestId('login-username')).toBeFocused();
  await page.keyboard.type('alice');
  await page.keyboard.press('Tab');                          // 焦点到密码
  await page.keyboard.type('secret123');
  await page.keyboard.press('Enter');                        // 提交
  await expect(page.getByText('欢迎 alice')).toBeVisible();
});`;

  // ─── 常见陷阱 ─────────────────────────────────────────────────────────────────
  const notes = [
    ruleBox('warning', `<strong>测试金字塔变冰激凌是常见反模式：</strong>很多团队一上来就配 E2E，单测写得少、E2E 写得多。
      结果 CI 跑 30 分钟、flaky 率 30%、改一行代码坏 50 个 case。正确做法：<strong>把 E2E 控制在 20-50 个核心路径</strong>，
      单测覆盖所有 utils / hooks，组件测试覆盖交互行为。判断标准：CI 全量跑 &lt; 5 分钟，单测占比 &gt; 70%。</p>
      <p><strong>记住：</strong>E2E 每多写一个，团队就多一份维护成本，多一个 flaky 风险。</p>`),
    ruleBox('info', `<strong>flaky 测试必须当日修复或下线：</strong>偶发失败的测试比没有测试还糟糕——它消磨团队对测试体系的信任。
      出现 flaky 的常见原因：① 用了真实定时器没 <code>vi.useFakeTimers</code>；② 测试间共享状态没 cleanup；
      ③ E2E 等待条件用 <code>setTimeout</code> 而不是 <code>waitFor</code>；④ 依赖网络的真实第三方 API。
      一律修：要么让它稳定通过，要么 <code>test.skip</code> 并登记到待修清单，<strong>禁止假装它不存在</strong>。</p>`),
    ruleBox('success', `<strong>测试不是越多越好，是越能挡住 bug 越好：</strong>盯着"覆盖率 80%"指标使劲灌水案例是常见误区——
      100% 覆盖率也可能只测了 happy path。判断测试价值的标准：<strong>这行代码改坏了，测试会不会红？</strong>
      不红的测试就是死代码。建议每季度做一次<strong>变异测试</strong>（mutmut /stryker），主动改坏代码看哪些测试没反应，没反应的就是该删的。</p>`),
    ruleBox('danger', `<strong>不要 Mock 你不拥有的东西：</strong>第三方库的内部 API、未公开的 React 内部 Hook、组件库的私有方法——
      Mock 这些等于<strong>把第三方库的实现细节焊死进了你的测试</strong>，他们升级你就坏，且坏得不真实。
      正确做法：在边界 Mock（fetch、window、第三方库的公开 API），让真实代码跑起来，测试才反映真实行为。</p>`),
    ruleBox('warning', `<strong>测行为不测实现是组件测试的命门：</strong>看到 <code>expect(spy).toHaveBeenCalledWith</code> 就要警惕——
      你在测"调用了哪个函数"而不是"用户看到了什么"。一旦你重构实现（比如换状态管理库、拆子组件），所有这种测试全坏，
      但实际功能根本没变。<strong>正确的断言：</strong>用 <code>getByRole</code> / <code>findByText</code> 断言屏幕上的可见变化，
      让测试跟随用户视角而不是实现视角。</p>`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('测试全景（七层金字塔）', overview)}
    ${section('① 静态检查（ESLint / TypeScript / Stylelint）', s1 + codeBlock('tsconfig + eslint flat config + stylelint', 'dot-blue', 'ts', s1Code))}
    ${section('② 单元测试（Vitest + 纯函数 / Hook）', s2 + codeBlock('vitest.config + 纯函数 + Hook 单测', 'dot-green', 'ts', s2Code))}
    ${section('③ 组件测试（RTL + userEvent）', s3 + codeBlock('LoginForm 组件测试', 'dot-blue', 'tsx', s3Code))}
    ${section('④ 集成测试（RTL + MSW 真实依赖）', s4 + codeBlock('订单取消集成测试', 'dot-green', 'tsx', s4Code))}
    ${section('⑤ E2E 测试（Playwright 关键路径）', s5 + codeBlock('playwright.config + page object', 'dot-blue', 'ts', s5Code))}
    ${section('⑥ 视觉回归（Playwright snapshots / Percy）', s6 + codeBlock('视觉基线 + CI 工作流', 'dot-green', 'ts', s6Code))}
    ${section('⑦ 性能 / 可访问性（Lighthouse CI / axe-core）', s7 + codeBlock('lighthouse + bundle 预算 + axe-core + 键盘测试', 'dot-blue', 'ts', s7Code))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
