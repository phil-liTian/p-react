function renderFrontendArchitecture(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>大型前端项目架构落地的核心不是堆技术，而是<strong>把十个维度按顺序建好</strong>：
    工程基建 → 目录分层 → 数据状态 → 路由权限 → 组件 UI → 微前端 → 性能 → 可观测 → 业务治理 → 测试。
    每个维度都是<strong>"骨架 + 契约 + 边界"</strong>三件套：骨架保证结构一致，契约保证交互规范，边界保证改不传染。
    适用场景：中后台 / ToC 复杂业务 / 多页面 / 微前端 / 千人级协作。`);

  const overview = `
    <p><strong>十大维度全景（按落地顺序）：</strong></p>
    <table class="metrics-table">
      <thead><tr><th>#</th><th>维度</th><th>核心问题</th><th>关键产物</th><th>落地优先级</th></tr></thead>
      <tbody>
        <tr><td>①</td><td>工程基建层</td><td>多人协作、环境统一、构建发布</td><td>Monorepo / Vite / CI / Git 规范</td><td>P0 先落地</td></tr>
        <tr><td>②</td><td>目录分层</td><td>代码不堆在一起、解耦核心</td><td>通用层 + 业务域双层目录</td><td>P0</td></tr>
        <tr><td>③</td><td>数据与状态</td><td>请求与状态不混乱</td><td>请求层封装 + 三层状态 + DTO</td><td>P0</td></tr>
        <tr><td>④</td><td>路由与权限</td><td>中后台必备：菜单/页面/按钮/数据四级权限</td><td>动态路由 + meta + keepAlive</td><td>P0（中后台）</td></tr>
        <tr><td>⑤</td><td>组件与 UI</td><td>复用、视觉统一</td><td>三级组件 + 主题变量 + Props 规范</td><td>P1</td></tr>
        <tr><td>⑥</td><td>微前端 / 多系统</td><td>多团队并行、子系统共存</td><td>基座 + 子应用 + 沙箱 + 通信</td><td>P2（仅超大项目）</td></tr>
        <tr><td>⑦</td><td>性能架构</td><td>打包大、加载慢</td><td>构建优化 + 运行时 + 首屏</td><td>P1</td></tr>
        <tr><td>⑧</td><td>可观测与稳定性</td><td>线上保障、防白屏</td><td>异常捕获 + 埋点 + 日志 + 容灾</td><td>P1</td></tr>
        <tr><td>⑨</td><td>业务治理与扩展</td><td>长期可维护</td><td>插件化 + 配置式 + i18n + 灰度</td><td>P2</td></tr>
        <tr><td>⑩</td><td>测试体系</td><td>防迭代崩盘</td><td>单测 + 组件测 + E2E + 静态检测</td><td>P2</td></tr>
      </tbody>
    </table>
    <p><strong>三条铁律：</strong>
      ① <strong>骨架先行</strong>：P0 维度没建好前不要写业务页面；
      ② <strong>契约驱动</strong>：所有跨模块交互先定契约（类型 + 接口签名），再写实现；
      ③ <strong>边界比实现重要</strong>：模块边界划清后，内部实现可以糙，但不能跨界。</p>`;

  // ─── ① 工程基建层 ─────────────────────────────────────────────────────────────
  const s1 = `
    <h4>核心目标</h4>
    <p>项目骨架层。决定多人协作能不能跑通——环境统一、构建一致、依赖可控、发布可回滚。
    这一层不立住，后面所有维度都是空中楼阁。</p>
    <h4>落地切入点</h4>
    <ol>
      <li><strong>技术栈选型与约束</strong>：
          <ul>
            <li><strong>框架</strong>：Vue3 / React / Web Components，是否 SSR/SSG/SPA、是否微前端，在立项时一次定死</li>
            <li><strong>语言</strong>：TypeScript <code>strict: true</code>，禁止 <code>any</code> 泛滥（用 <code>unknown</code> 替代）</li>
            <li><strong>编码规范</strong>：ESLint + Prettier + Stylelint，规则集统一封装成 npm 包（<code>@my/eslint-config</code>）</li>
          </ul>
      </li>
      <li><strong>包管理与 Monorepo 架构</strong>：
          <ul>
            <li>多项目用 pnpm workspace + Turborepo；单项目保持简单不要硬上</li>
            <li>公共包拆分：组件库 / 工具函数 / 请求层 / 常量枚举 / 业务模型，各自独立 package 可单独发版</li>
            <li>搭建私有 npm 源（Verdaccio / Nexus），区分业务包与通用基础包，禁止业务代码发到公网</li>
          </ul>
      </li>
      <li><strong>多环境与配置治理</strong>：
          <ul>
            <li>四套环境隔离：dev / test / pre / prod，配置通过环境变量注入（<code>VITE_API_BASE</code>）</li>
            <li>动态配置远程下发：接口地址、埋点开关、功能白名单、灰度比例，无需发版即可调整</li>
            <li>代码里严禁硬编码域名 / 路径，必须走配置出口</li>
          </ul>
      </li>
      <li><strong>构建与发布流水线</strong>：
          <ul>
            <li>分包策略：路由懒加载 + 公共依赖抽离 + 第三方库单独 chunk（react / lodash / echarts 各自 vendor chunk）</li>
            <li>CI/CD：lint → typecheck → 单测 → build → 体积预算 → 部署 → 健康检查 → 回滚</li>
            <li>回滚机制：保留最近 5 个版本产物，单按钮回滚，不重新构建</li>
          </ul>
      </li>
      <li><strong>Git 协作规范</strong>：
          <ul>
            <li>分支模型：中小团队 Trunk Based（main + 短期 feature 分支），大团队 GitFlow</li>
            <li>CommitLint + 语义化版本（semver）+ changeset 自动生成 changelog</li>
            <li>PR 模板：动机 / 改动 / 测试 / 截图 / 影响范围，缺项不让合并</li>
          </ul>
      </li>
    </ol>`;

  const s1Code = `# ── pnpm-workspace.yaml ─────────────────────────────────────────────────────────
packages:
  - 'apps/*'          # 业务应用：admin / portal / h5
  - 'packages/*'      # 通用包：ui / utils / http / constants / types
  - 'plugins/*'       # 构建插件、CLI 工具

# ── 根 package.json ─────────────────────────────────────────────────────────────
{
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "test": "turbo test",
    "release": "changeset publish"   # 自动发版
  },
  "devDependencies": {
    "@my/eslint-config": "workspace:*",
    "@my/tsconfig": "workspace:*",
    "turbo": "^2.0.0",
    "husky": "^9.0.0",
    "lint-staged": "^15.0.0",
    "@commitlint/cli": "^19.0.0"
  },
  "engines": { "node": ">=20", "pnpm": ">=9" },
  "packageManager": "pnpm@9.0.0"
}

# ── .env 配置隔离 ───────────────────────────────────────────────────────────────
# .env.development
VITE_API_BASE=https://api-dev.example.com
VITE_TRACK_ENABLED=false
VITE_FEATURE_NEW_ORDER=true

# .env.production
VITE_API_BASE=https://api.example.com
VITE_TRACK_ENABLED=true
VITE_FEATURE_NEW_ORDER=false

# ── 动态配置远程下发（runtime-config.json，部署时由 CI 替换）──────────────────
{
  "apiBase": "https://api.example.com",
  "trackEnabled": true,
  "grayScale": 0.1,
  "featureFlags": { "newOrder": true, "newPayment": false }
}

// ── 远程配置加载 ───────────────────────────────────────────────────────────────
fetch('/runtime-config.json?t=' + Date.now())
  .then(r => r.json())
  .then(config => window.__RUNTIME_CONFIG__ = config);`;

  // ─── ② 目录分层设计 ──────────────────────────────────────────────────────────
  const s2 = `
    <h4>核心目标</h4>
    <p>大型项目禁止页面堆在一起。按<strong>通用基础分层 + 业务域分层双维度</strong>组织目录：
    通用层放跨业务复用代码，业务域内自治，跨域复用才上浮到公共层。</p>
    <h4>落地切入点</h4>
    <ol>
      <li><strong>通用基础分层</strong>（全局通用，所有人可 import）：
          <code>api / assets / components / composables / config / router / store / styles / types / utils / directives / plugins / views</code>
      </li>
      <li><strong>业务域拆分</strong>（大型项目关键）：
          <ul>
            <li>按业务模块拆 <code>views/order/</code>、<code>views/user/</code>、<code>views/finance/</code></li>
            <li>每个业务域内部自治：自有组件、自有状态、自有本地工具</li>
            <li>跨域复用三次以上才上浮到 <code>components/</code> 公共层（避免过早抽象）</li>
          </ul>
      </li>
      <li><strong>超大型多系统</strong>：微前端方案，每个业务域独立仓库独立部署</li>
      <li><strong>出口模式</strong>：每个目录用 <code>index.ts</code> 只导出契约，内部可重构</li>
    </ol>`;

  const s2Code = `# ── 通用基础分层（src/ 全局结构）──────────────────────────────────────────────
src/
├── api/                  # 请求层：接口封装、请求拦截、统一错误处理
│   ├── modules/          #   按业务模块拆：order.ts / user.ts / finance.ts
│   ├── request.ts        #   基础请求类（axios 实例 + 拦截器）
│   └── index.ts
├── assets/               # 静态资源：图片、字体、全局样式
├── components/           # 公共组件
│   ├── ui/               #   基础组件：Button / Input / Table（二次封装 UI 库）
│   ├── business/         #   业务通用组件：SearchBar / FormDialog / UploadButton
│   └── layout/           #   布局组件：PageContainer / CardList
├── composables/          # 通用 hooks：useDebounce / usePermission / useFormDialog
├── config/               # 全局配置、路由配置、权限映射、常量枚举
│   ├── menu.ts           #   菜单元信息
│   ├── permission.ts     #   权限码映射
│   └── constants.ts      #   常量枚举（订单状态、用户角色）
├── router/               # 路由：守卫、元信息、动态路由生成
│   ├── guards.ts
│   ├── routes-static.ts  #   静态路由：登录、404、空白页
│   └── routes-dynamic.ts #   动态路由：由后端菜单生成
├── store/                # 全局状态（按业务域分模块）
│   ├── modules/
│   │   ├── user.ts       #   用户信息、权限
│   │   ├── app.ts        #   全局配置、主题、侧边栏
│   │   └── order.ts      #   订单业务状态
│   └── index.ts
├── styles/               # 全局样式、主题变量、重置样式
│   ├── variables.css     #   CSS 变量：主色、间距、圆角
│   ├── reset.css
│   └── common.css        #   通用布局类
├── types/                # 全局 TS 类型、接口返回类型、业务实体
│   ├── api.ts            #   接口 DTO
│   ├── business.ts       #   业务实体（User / Order）
│   └── global.d.ts
├── utils/                # 纯工具函数（无副作用、无状态）
│   ├── date.ts
│   ├── crypto.ts
│   ├── storage.ts        #   统一 storage 封装
│   └── tree.ts           #   树形数据处理
├── directives/           # 全局指令：v-permission / v-copy / v-debounce / v-watermark
├── plugins/              # 第三方插件封装：axios / echarts / upload
└── views/                # 业务页面（按业务域分文件夹）

# ── 业务域自治（views/order/）──────────────────────────────────────────────────
views/order/
├── components/           # 订单域私有组件（只在本域复用）
│   ├── OrderCard.vue
│   └── OrderStatusTag.vue
├── composables/          # 订单域私有 hooks
│   └── useOrderList.ts
├── store.ts              # 订单域本地 store（仅本域使用，不进全局 store）
├── api.ts                # 订单域接口（调用全局 api/modules/order）
├── types.ts              # 订单域私有类型
├── List.vue              # 订单列表页
├── Detail.vue            # 订单详情页
└── Create.vue            # 创建订单页`;

  // ─── ③ 数据与状态架构 ─────────────────────────────────────────────────────────
  const s3 = `
    <h4>核心目标</h4>
    <p>数据流治理。请求层不统一、状态散落、字段名混乱是大型项目最常见的屎山源头。
    治理目标：<strong>请求出口唯一、状态分层清晰、数据模型显式转换</strong>。</p>
    <h4>落地切入点</h4>
    <ol>
      <li><strong>请求层统一封装</strong>：
          <ul>
            <li>axios 实例 + 拦截器：token 注入、401 自动登出、统一报错、请求防抖、重复请求取消（AbortController）</li>
            <li>三层结构：基础请求类 → 模块 API → 页面调用，每层职责单一</li>
            <li>统一入参出参格式化：所有接口返回 <code>{ code, data, message }</code>，拦截器剥壳</li>
            <li>缓存策略：内存缓存（react-query / SWR）、localStorage、接口本地缓存</li>
          </ul>
      </li>
      <li><strong>状态三层设计</strong>：
          <table class="metrics-table">
            <thead><tr><th>层</th><th>用途</th><th>技术</th><th>示例</th></tr></thead>
            <tbody>
              <tr><td>组件本地</td><td>页面私有临时数据</td><td>ref / useState</td><td>弹窗开关、输入框值</td></tr>
              <tr><td>业务模块</td><td>仅本业务使用</td><td>分模块 store</td><td>订单列表筛选条件</td></tr>
              <tr><td>全局共享</td><td>跨业务复用</td><td>全局 store</td><td>用户信息、权限、主题</td></tr>
            </tbody>
          </table>
      </li>
      <li><strong>数据模型治理</strong>：
          <ul>
            <li>统一后端实体 TS 类型（<code>types/api.ts</code>），避免各处重复定义</li>
            <li><strong>DTO 转换层</strong>：后端返回原始数据 → 前端业务模型，统一格式化字段
                （蛇形 → 驼峰、时间戳 → Date、状态码 → 枚举）</li>
            <li>转换函数显式存在：<code>toUser(dto: UserDTO): User</code>，可单测、可复用</li>
          </ul>
      </li>
      <li><strong>本地存储规范</strong>：
          <ul>
            <li>封装统一 storage 工具：<code>storage.get(key)</code> / <code>storage.set(key, val, ttl)</code></li>
            <li>统一 key 命名前缀（<code>app:user:token</code>），避免冲突</li>
            <li>过期清理：写入时记录 ttl，读取时检查；定期清扫过期项</li>
            <li>敏感数据加密（用户信息、token），不直接存明文</li>
          </ul>
      </li>
    </ol>`;

  const s3Code = `// ── api/request.ts：基础请求类 ──────────────────────────────────────────────────
import axios from 'axios';

const request = axios.create({
  baseURL: window.__RUNTIME_CONFIG__?.apiBase || import.meta.env.VITE_API_BASE,
  timeout: 15000,
});

// 请求拦截：token 注入 + 重复请求取消
const pending = new Map<string, AbortController>();
request.interceptors.request.use((config) => {
  const key = config.url + JSON.stringify(config.params);
  if (pending.has(key)) pending.get(key)!.abort();
  const controller = new AbortController();
  config.signal = controller.signal;
  pending.set(key, controller);
  config.headers.Authorization = 'Bearer ' + storage.get('app:user:token');
  return config;
});

// 响应拦截：剥壳 + 错误统一处理
request.interceptors.response.use(
  (res) => {
    pending.delete(res.config.url!);
    const { code, data, message } = res.data;
    if (code === 0) return data;          // 成功：剥壳返回 data
    if (code === 401) { logoutAndRedirect(); return Promise.reject(); }
    toast.error(message);                 // 业务错误：统一 toast
    return Promise.reject(new Error(message));
  },
  (err) => {
    if (err.name === 'CanceledError') return Promise.reject(err);
    toast.error('网络异常，请稍后重试');
    return Promise.reject(err);
  }
);

// ── api/modules/order.ts：模块 API ──────────────────────────────────────────────
import { request } from '../request';
import type { OrderDTO } from '@/types/api';
import { toOrder, type Order } from '@/types/business';

export const orderApi = {
  list: (params: OrderListParams) =>
    request.get<OrderDTO[]>('/api/v1/orders', { params }).then(list => list.map(toOrder)),
  detail: (id: string) =>
    request.get<OrderDTO>(\`/api/v1/orders/\${id}\`).then(toOrder),
};

// ── types/business.ts：DTO → 业务模型转换 ──────────────────────────────────────
import { toOrderStatus } from '@/config/constants';

interface OrderDTO {
  order_id: string;
  created_at: number;        // 时间戳
  status_code: number;       // 数字状态码
  user_name: string;         // 蛇形命名
}

export interface Order {
  id: string;
  createdAt: Date;           // Date 对象
  status: OrderStatus;       // 业务枚举
  userName: string;          // 驼峰
}

export function toOrder(dto: OrderDTO): Order {
  return {
    id: dto.order_id,
    createdAt: new Date(dto.created_at),
    status: toOrderStatus(dto.status_code),
    userName: dto.user_name,
  };
}

// ── 三层状态示例 ───────────────────────────────────────────────────────────────
// 1. 组件本地状态（页面私有）
const dialogOpen = ref(false);

// 2. 业务模块状态（订单 store）
const useOrderStore = defineStore('order', () => {
  const filters = ref<OrderFilters>({});
  return { filters };
});

// 3. 全局共享状态（用户 store，跨业务复用）
const useUserStore = defineStore('user', () => {
  const info = ref<UserInfo | null>(null);
  const perms = ref<string[]>([]);
  return { info, perms };
});

// ── utils/storage.ts：统一 storage 工具 ─────────────────────────────────────────
const PREFIX = 'app:';
const storage = {
  get<T>(key: string): T | null {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { value, expire } = JSON.parse(raw);
    if (expire && Date.now() > expire) { localStorage.removeItem(PREFIX + key); return null; }
    return value;
  },
  set<T>(key: string, value: T, ttl?: number) {
    const expire = ttl ? Date.now() + ttl : 0;
    localStorage.setItem(PREFIX + key, JSON.stringify({ value, expire }));
  },
  remove(key: string) { localStorage.removeItem(PREFIX + key); },
};`;

  // ─── ④ 路由与权限架构 ─────────────────────────────────────────────────────────
  const s4 = `
    <h4>核心目标</h4>
    <p>中后台大型项目必备。核心是<strong>四级权限体系</strong>：接口权限、页面权限、按钮权限、数据权限，
    加上动态路由下发与页面缓存策略。</p>
    <h4>落地切入点</h4>
    <ol>
      <li><strong>路由分层</strong>：
          <ul>
            <li>静态基础路由：登录、404、403、空白页（无需鉴权）</li>
            <li>动态业务路由：后端菜单接口下发，前端递归生成路由表</li>
            <li>路由 meta 统一规范：<code>{ requireAuth, permission, title, keepAlive, layout }</code></li>
          </ul>
      </li>
      <li><strong>完整权限体系</strong>：
          <table class="metrics-table">
            <thead><tr><th>层级</th><th>实现</th><th>触发场景</th></tr></thead>
            <tbody>
              <tr><td>接口权限</td><td>请求头携带 token + 权限码，后端拦截</td><td>所有 API 调用</td></tr>
              <tr><td>页面权限</td><td>路由守卫 + meta.permission 判断</td><td>访问无权限路由跳 403</td></tr>
              <tr><td>按钮权限</td><td>v-permission 指令 / usePerm hook</td><td>编辑、删除等操作按钮</td></tr>
              <tr><td>数据权限</td><td>列表接口由后端按用户过滤</td><td>只能看自己部门数据</td></tr>
            </tbody>
          </table>
      </li>
      <li><strong>动态路由生成</strong>：
          <ul>
            <li>登录后调 <code>/api/menus</code> 拿到菜单树</li>
            <li>递归遍历菜单，按 <code>component</code> 字段映射到本地组件，调用 <code>router.addRoute()</code></li>
            <li>菜单层级与路由层级一致，菜单数据驱动侧边栏渲染</li>
          </ul>
      </li>
      <li><strong>页面缓存策略</strong>：
          <ul>
            <li>keepAlive 按路由 name 缓存，meta.keepAlive 控制</li>
            <li>列表页缓存筛选条件 + 滚动位置，详情页不缓存</li>
            <li>缓存清除：登出 / 切换角色时清空所有 keepAlive</li>
          </ul>
      </li>
    </ol>`;

  const s4Code = `// ── router/routes-static.ts：静态路由 ──────────────────────────────────────────
export const staticRoutes = [
  { path: '/login', component: () => import('@/views/login/Login.vue'), meta: { layout: 'blank' } },
  { path: '/403',   component: () => import('@/views/error/Forbidden.vue') },
  { path: '/404',   component: () => import('@/views/error/NotFound.vue') },
];

// ── router/guards.ts：路由守卫 ──────────────────────────────────────────────────
import { useUserStore } from '@/store/modules/user';

router.beforeEach(async (to, from) => {
  const user = useUserStore();
  if (to.meta.requireAuth === false) return true;          // 不需要鉴权
  if (!user.info) {
    await user.fetchUserInfo();                             // 拉用户 + 权限
    await initDynamicRoutes();                              // 注册动态路由
    return { ...to, replace: true };                        // 重新进入，匹配刚注册的路由
  }
  if (to.meta.permission && !user.perms.includes(to.meta.permission)) {
    return '/403';
  }
  return true;
});

// ── router/routes-dynamic.ts：后端菜单 → 动态路由 ────────────────────────────────
const componentMap = {
  'order/list':   () => import('@/views/order/List.vue'),
  'order/detail': () => import('@/views/order/Detail.vue'),
  'user/list':    () => import('@/views/user/List.vue'),
};

async function initDynamicRoutes() {
  const menus = await menuApi.fetchTree();                  // 后端下发菜单树
  const routes = flattenMenu(menus).map(menu => ({
    path: menu.path,
    name: menu.routeName,
    component: componentMap[menu.component],
    meta: {
      title: menu.title,
      permission: menu.permissionCode,
      keepAlive: menu.keepAlive ?? false,
      layout: 'default',
    },
  }));
  routes.forEach(r => router.addRoute('layout', r));
}

// ── directives/permission.ts：按钮级权限指令 ────────────────────────────────────
import { useUserStore } from '@/store/modules/user';

export const vPermission = {
  mounted(el: HTMLElement, binding: { value: string }) {
    const user = useUserStore();
    if (!user.perms.includes(binding.value)) el.parentNode?.removeChild(el);
  },
};

// 模板里使用：<el-button v-permission="'order.edit'">编辑</el-button>

// ── composables/usePermission.ts：hook 形式 ─────────────────────────────────────
export function usePermission() {
  const user = useUserStore();
  return {
    has: (code: string) => user.perms.includes(code),
    hasAny: (codes: string[]) => codes.some(c => user.perms.includes(c)),
  };
}

// ── 页面缓存：keep-alive 按 name 缓存 ───────────────────────────────────────────
<router-view v-slot="{ Component }">
  <keep-alive :include="cachedRouteNames">
    <component :is="Component" />
  </keep-alive>
</router-view>`;

  // ─── ⑤ 组件与 UI 架构 ─────────────────────────────────────────────────────────
  const s5 = `
    <h4>核心目标</h4>
    <p>复用与视觉统一。三级组件分层 + 主题架构 + 组件设计规范。</p>
    <h4>落地切入点</h4>
    <ol>
      <li><strong>三级组件分层</strong>：
          <ul>
            <li><strong>基础组件</strong>（components/ui）：Button / Input / Table，二次封装 UI 库，统一样式、交互、异常处理</li>
            <li><strong>业务通用组件</strong>（components/business）：SearchBar / FormDialog / UploadButton / StatusTag / DataCard，多页面复用</li>
            <li><strong>页面私有组件</strong>：仅当前页面使用，放在页面同目录 <code>components/</code> 下</li>
          </ul>
      </li>
      <li><strong>主题与样式架构</strong>：
          <ul>
            <li>CSS 变量统一：主色、间距、圆角、字号、阴影，支持动态换肤</li>
            <li>样式隔离：Scoped CSS / CSS Module / Tailwind，杜绝全局样式污染</li>
            <li>全局重置样式 + 统一布局类（弹性、卡片、分页）</li>
            <li>主题切换：切换 CSS 变量值即可，组件库跟随变量</li>
          </ul>
      </li>
      <li><strong>组件设计规范</strong>：
          <ul>
            <li>统一入参命名：<code>v-model</code> 用 <code>modelValue</code>，事件 <code>kebab-case</code></li>
            <li>Props 严格 TS 类型校验，必填项 + 默认值 + 校验函数</li>
            <li>插槽命名规范：default / header / footer / action</li>
            <li>统一错误兜底：组件加载失败 / 数据为空 / 加载中三种状态显式处理</li>
          </ul>
      </li>
    </ol>`;

  const s5Code = `/* ── styles/variables.css：主题变量 ─────────────────────────────────────────────── */
:root {
  --color-primary: #1677ff;
  --color-success: #52c41a;
  --color-warning: #faad14;
  --color-danger:  #ff4d4f;
  --color-text:    #1f1f1f;
  --color-bg:      #ffffff;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --radius-sm: 4px;
  --radius-md: 8px;
  --shadow-card: 0 2px 8px rgba(0,0,0,0.08);
}

/* 暗色主题：切换 data-theme 属性即可 */
[data-theme="dark"] {
  --color-text: #f0f0f0;
  --color-bg:   #141414;
  --shadow-card: 0 2px 8px rgba(0,0,0,0.3);
}

/* ── 基础组件：二次封装 UI 库 ─────────────────────────────────────────────────── */
<!-- components/ui/UButton.vue -->
<template>
  <el-button :type="type" :size="size" :loading="loading" :disabled="disabled">
    <slot />
  </el-button>
</template>

<script setup lang="ts">
interface Props {
  type?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
}
withDefaults(defineProps<Props>(), {
  type: 'default', size: 'medium', loading: false, disabled: false,
});
</script>

/* ── 业务通用组件：SearchBar 配置式 ───────────────────────────────────────────── */
<!-- components/business/SearchBar.vue -->
<template>
  <UForm :fields="fields" v-model="model" @search="emit('search', model)" @reset="emit('reset')" />
</template>

<script setup lang="ts">
interface SearchField {
  name: string;
  label: string;
  type: 'input' | 'select' | 'date' | 'dateRange';
  options?: { label: string; value: any }[];
}
const props = defineProps<{ fields: SearchField[] }>();
const model = defineModel<any>();
const emit = defineEmits<{ search: [any]; reset: [] }>();
</script>

/* ── 三种状态兜底：Loading / Empty / Error ────────────────────────────────────── */
<template>
  <div class="data-card">
    <Loading v-if="loading" />
    <Empty v-else-if="!data?.length" />
    <ErrorState v-else-if="error" @retry="fetch" />
    <slot v-else :data="data" />
  </div>
</template>`;

  // ─── ⑥ 微前端 / 多系统架构 ────────────────────────────────────────────────────
  const s6 = `
    <h4>核心目标</h4>
    <p>超大型项目专项。多团队并行、多子系统共存时采用。代价是复杂度大幅上升，<strong>非必要不上</strong>。</p>
    <h4>落地切入点</h4>
    <ol>
      <li><strong>框架选型</strong>：
          <ul>
            <li><strong>qiankun</strong>：基于 single-spa，成熟稳定，JS 沙箱 + 样式隔离</li>
            <li><strong>micro-app</strong>：京东开源，Web Component 思想，接入更简单</li>
            <li><strong>Module Federation</strong>：Webpack 5 原生能力，运行时共享依赖，适合同栈场景</li>
          </ul>
      </li>
      <li><strong>基座与子应用职责拆分</strong>：
          <table class="metrics-table">
            <thead><tr><th>角色</th><th>职责</th><th>不负责</th></tr></thead>
            <tbody>
              <tr><td>基座</td><td>登录、全局权限、公共状态、路由分发、全局弹窗、布局</td><td>具体业务</td></tr>
              <tr><td>子应用</td><td>独立业务、独立路由、独立依赖、独立部署</td><td>登录、权限框架</td></tr>
            </tbody>
          </table>
      </li>
      <li><strong>应用通信规范</strong>：
          <ul>
            <li><strong>全局事件总线</strong>：基座提供 EventBus，子应用通过 props 接收</li>
            <li><strong>共享状态池</strong>：基座维护全局 store，子应用通过 <code>props.getGlobalState()</code> 读</li>
            <li><strong>跨应用方法调用</strong>：基座注册 API 到 <code>window.__APP__</code>，子应用调用（慎用，强耦合）</li>
          </ul>
      </li>
      <li><strong>资源隔离</strong>：
          <ul>
            <li>样式隔离：qiankun 的 strictStyleIsolation / experimentalStyleIsolation</li>
            <li>JS 沙箱：qiankun 默认开启 Proxy 沙箱，子应用操作 window 被代理</li>
            <li>避免依赖冲突：基座 externals 抽离 React/Vue/UI 库，子应用复用</li>
          </ul>
      </li>
      <li><strong>公共依赖复用</strong>：
          <ul>
            <li>大依赖（React / Vue / 组件库）由基座 externals 抽离，子应用声明 peerDependencies</li>
            <li>包体积可减少 30-50%</li>
            <li>注意版本兼容：基座升级 React 大版本前必须协调所有子应用</li>
          </ul>
      </li>
    </ol>`;

  const s6Code = `// ── 基座：注册子应用（qiankun）──────────────────────────────────────────────────
import { registerMicroApps, start } from 'qiankun';

registerMicroApps([
  {
    name: 'order-app',
    entry: '//cdn.example.com/order-app/index.html',
    container: '#sub-app-container',
    activeRule: '/order',
    props: {                  // 基座传递给子应用的能力
      getGlobalState: () => globalStore.getState(),
      setGlobalState: (patch) => globalStore.setState(patch),
      eventBus,
      userStore,
      perms,
    },
  },
  {
    name: 'user-app',
    entry: '//cdn.example.com/user-app/index.html',
    container: '#sub-app-container',
    activeRule: '/user',
  },
]);

start({ prefetch: true, sandbox: { experimentalStyleIsolation: true } });

// ── 子应用：导出生命周期 ────────────────────────────────────────────────────────
// order-app/src/main.ts
import { createApp, type App } from 'vue';
import Root from './App.vue';

let app: App;
export async function mount(props: any) {
  app = createApp(Root);
  app.provide('globalProps', props);          // 注入基座传递的能力
  app.mount(props.container.querySelector('#app'));
}
export async function unmount() {
  app?.unmount();
}

// ── Module Federation（Webpack 5）────────────────────────────────────────────────
// 基座 webpack.config.js
new ModuleFederationPlugin({
  name: 'host',
  remotes: {
    orderApp: 'orderApp@//cdn.example.com/order-app/remoteEntry.js',
  },
  shared: ['react', 'react-dom', 'antd'],     // 共享依赖
});

// 子应用 webpack.config.js
new ModuleFederationPlugin({
  name: 'orderApp',
  filename: 'remoteEntry.js',
  exposes: {
    './OrderPage': './src/pages/OrderPage',
  },
  shared: ['react', 'react-dom', 'antd'],
});

// 基座里直接 import 子应用暴露的模块
const OrderPage = React.lazy(() => import('orderApp/OrderPage'));`;

  // ─── ⑦ 性能架构 ──────────────────────────────────────────────────────────────
  const s7 = `
    <h4>核心目标</h4>
    <p>大型项目极易出现打包大、加载慢。性能优化分三层：构建性能、运行时性能、首屏性能。</p>
    <h4>落地切入点</h4>
    <ol>
      <li><strong>构建性能优化</strong>：
          <ul>
            <li>依赖预构建（Vite optimizeDeps）+ 构建产物缓存（Turborepo 远程缓存）</li>
            <li>多线程打包（Webpack thread-loader / esbuild）</li>
            <li>按需引入第三方库：<code>import { get } from 'lodash-es'</code> 而非 <code>import _ from 'lodash'</code></li>
            <li>Tree-Shaking：确保依赖有 <code>sideEffects: false</code>，ESM 优先</li>
          </ul>
      </li>
      <li><strong>运行时性能</strong>：
          <ul>
            <li>路由懒加载：<code>React.lazy</code> / Vue 异步组件</li>
            <li>大列表虚拟滚动（详见 virtual-list 主题）</li>
            <li>图片优化：WebP / AVIF、CDN、懒加载、srcset 多分辨率</li>
            <li>大数据处理：分页、分片渲染、WebWorker 搬复杂计算</li>
            <li>避免不必要重渲：memo / useMemo / useCallback / Vue shallowRef</li>
          </ul>
      </li>
      <li><strong>首屏优化</strong>：
          <ul>
            <li>骨架屏：避免白屏感知</li>
            <li>SSR / SSG：内容直出，减少客户端渲染等待</li>
            <li>资源预加载：<code>&lt;link rel="preload"&gt;</code> 关键资源，<code>prefetch</code> 下一路由</li>
            <li>关键 CSS 内联：首屏样式 inline 到 HTML，避免等待 CSS 请求</li>
            <li>分包拆分：vendor / 路由 chunk，减少首屏 JS 体积</li>
            <li>性能预算：首屏 JS gzip ≤ 200KB，CI 中超预算报警</li>
          </ul>
      </li>
    </ol>`;

  const s7Code = `// ── vite.config.ts：构建优化 ────────────────────────────────────────────────────
export default defineConfig({
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/[name].[hash].js',
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react'))    return 'vendor-react';
            if (id.includes('echarts'))  return 'vendor-echarts';
            if (id.includes('lodash'))   return 'vendor-lodash';
            return 'vendor';
          }
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios'],  // 预构建
  },
});

// ── 路由懒加载 + idle prefetch ──────────────────────────────────────────────────
const OrderPage = lazy(() => import('@/views/order/List'));

function prefetchOnHover(loader: () => Promise<any>) {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(loader, { timeout: 2000 });
  }
}

<Link to="/order" onMouseEnter={() => prefetchOnHover(() => import('@/views/order/List'))}>订单</Link>

// ── Web Worker 搬复杂计算 ───────────────────────────────────────────────────────
// worker.ts
self.onmessage = (e) => {
  const result = heavyCompute(e.data);   // 大数据排序、统计
  self.postMessage(result);
};

// 主线程
const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
worker.postMessage(bigArray);
worker.onmessage = (e) => setData(e.data);

// ── 首屏优化：关键 CSS 内联 + 资源预加载 ────────────────────────────────────────
<!DOCTYPE html>
<html>
<head>
  <!-- 关键 CSS 内联 -->
  <style>
    body { margin: 0; font-family: system-ui; background: #f5f5f5; }
    .app-shell { max-width: 1200px; margin: 0 auto; padding: 16px; }
  </style>
  <!-- 预加载关键资源 -->
  <link rel="preload" href="/assets/fonts/main.woff2" as="font" crossorigin>
  <link rel="preload" href="/assets/vendor-react.[hash].js" as="script">
  <!-- 预取下一路由 -->
  <link rel="prefetch" href="/assets/order.[hash].js">
</head>
<body>
  <div class="app-shell" id="app">
    <!-- 骨架屏：服务端直出 -->
    <div class="skeleton">加载中...</div>
  </div>
</body>
</html>

// ── CI 性能预算 ─────────────────────────────────────────────────────────────────
# .github/workflows/perf-budget.yml
- name: Bundle budget check
  run: |
    SIZE=$(gzip -c dist/assets/vendor-*.js dist/assets/index-*.js | wc -c)
    [ $SIZE -le 204800 ] || { echo "Bundle over 200KB: $SIZE"; exit 1; }`;

  // ─── ⑧ 可观测与稳定性架构 ────────────────────────────────────────────────────
  const s8 = `
    <h4>核心目标</h4>
    <p>线上保障。前端运维难点是用户在浏览器里、不在你机房里，必须靠 RUM（真实用户监控）+ 错误聚合 + 容灾方案。</p>
    <h4>落地切入点</h4>
    <ol>
      <li><strong>全局异常捕获</strong>：
          <ul>
            <li>JS 运行时错误：<code>window.onerror</code> + <code>window.addEventListener('error')</code>（capture 阶段抓资源加载失败）</li>
            <li>Promise 异常：<code>window.addEventListener('unhandledrejection')</code></li>
            <li>接口请求错误：axios 拦截器统一上报</li>
            <li>资源加载失败：<code>&lt;img&gt;</code> / <code>&lt;script&gt;</code> 的 error 事件</li>
            <li>框架错误边界：React ErrorBoundary / Vue errorHandler</li>
            <li>全局错误兜底页面，防止白屏</li>
          </ul>
      </li>
      <li><strong>埋点监控体系</strong>：
          <ul>
            <li>业务埋点：PV / UV、页面停留时长、按钮点击、关键路径转化</li>
            <li>性能埋点：FP / LCP / FID / INP / CLS、打包体积、接口耗时</li>
            <li>行为埋点：用户操作序列，错误发生前 30 步行为回放</li>
          </ul>
      </li>
      <li><strong>日志上报</strong>：
          <ul>
            <li>统一日志工具：<code>log.debug / log.info / log.warn / log.error</code></li>
            <li>线上过滤敏感信息：手机号、身份证、密码字段脱敏</li>
            <li>批量上报 + 采样 + 失败重试（详见 sampling / report-method 主题）</li>
          </ul>
      </li>
      <li><strong>容灾方案</strong>：
          <ul>
            <li>接口超时重试 + 降级兜底数据（缓存 / 默认值）</li>
            <li>CDN 资源加载失败降级：主 CDN 挂了切备用 CDN</li>
            <li>静态资源备用地址：<code>&lt;script onerror&gt;</code> 切换</li>
            <li>白屏检测 + 自动恢复（详见 white-screen 主题）</li>
          </ul>
      </li>
      <li><strong>Sourcemap 还原</strong>：生产不发布 sourcemap 到 CDN，但保留内部对象存储，错误栈后端还原</li>
    </ol>`;

  const s8Code = `// ── 全局异常捕获 ───────────────────────────────────────────────────────────────
class Reporter {
  private queue: any[] = [];
  report(event: any) {
    this.queue.push({ ...event, ts: Date.now(), url: location.href, v: __APP_VERSION__, uid: getUserId() });
    if (this.queue.length >= 10) this.flush();
  }
  private flush() {
    const batch = this.queue.splice(0);
    fetch('/api/log/batch', { method: 'POST', body: JSON.stringify(batch), keepalive: true })
      .catch(() => saveToIDB('retry-queue', batch));   // 失败落 IndexedDB 重试
  }
}
export const reporter = new Reporter();

window.addEventListener('error', (e) => {
  // 资源加载失败（capture 阶段才能抓到）
  const target = e.target as HTMLElement;
  if (target instanceof HTMLElement && (target.tagName === 'IMG' || target.tagName === 'SCRIPT')) {
    reporter.report({ type: 'resource_error', src: target.src, tag: target.tagName });
    // CDN 降级：主 CDN 失败切备用
    if (target.tagName === 'SCRIPT' && target.src.includes('cdn1.example.com')) {
      const backup = target.src.replace('cdn1', 'cdn2');
      const script = document.createElement('script'); script.src = backup; document.head.appendChild(script);
    }
    return;
  }
  reporter.report({ type: 'js_error', msg: e.message, src: e.filename, line: e.lineno, col: e.colno });
}, true);

window.addEventListener('unhandledrejection', (e) => {
  reporter.report({ type: 'promise_error', msg: String(e.reason) });
});

// ── 框架错误边界 ───────────────────────────────────────────────────────────────
// React
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reporter.report({ type: 'react_error', msg: error.message, stack: error.stack, info });
  }
  render() { return this.state.hasError ? <RouteError /> : this.props.children; }
}

// Vue
app.config.errorHandler = (err, instance, info) => {
  reporter.report({ type: 'vue_error', msg: String(err), info, component: instance?.$options.name });
};

// ── 性能埋点：Web Vitals ─────────────────────────────────────────────────────────
import { onLCP, onCLS, onINP, onFCP } from 'web-vitals';
onLCP(m  => reporter.report({ type: 'vitals_lcp',  value: m.value }));
onCLS(m  => reporter.report({ type: 'vitals_cls',  value: m.value }));
onINP(m  => reporter.report({ type: 'vitals_inp',  value: m.value }));
onFCP(m  => reporter.report({ type: 'vitals_fcp',  value: m.value }));

// 接口耗时
request.interceptors.request.use(c => { c.__startTime = performance.now(); return c; });
request.interceptors.response.use(r => {
  reporter.report({ type: 'api_timing', url: r.config.url, duration: performance.now() - r.config.__startTime });
  return r;
});

// ── 容灾：接口超时重试 + 兜底数据 ────────────────────────────────────────────────
async function fetchWithFallback<T>(api: () => Promise<T>, fallback: T, retries = 2): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try { return await api(); }
    catch (e) { if (i === retries - 1) { reporter.report({ type: 'api_fallback', err: String(e) }); return fallback; } }
  }
  return fallback;
}

// ── 白屏检测 ─────────────────────────────────────────────────────────────────────
new MutationObserver(() => {
  if (document.body.innerHTML.length < 100 && performance.now() > 5000) {
    reporter.report({ type: 'white_screen' });
    location.reload();
  }
}).observe(document.body, { childList: true, subtree: true });`;

  // ─── ⑨ 业务治理与可扩展性 ────────────────────────────────────────────────────
  const s9 = `
    <h4>核心目标</h4>
    <p>长期可维护。让业务功能可以"插拔式"启停、配置式开发、跨端复用、灰度发布，不被业务变化拖垮架构。</p>
    <h4>落地切入点</h4>
    <ol>
      <li><strong>插件化设计</strong>：
          <ul>
            <li>通用能力（弹窗、导出、打印、导入、报表）抽成插件，可插拔启用</li>
            <li>插件接口规范：<code>install(app, options)</code>，注册组件 / 指令 / store</li>
            <li>业务插件化：不同租户 / 不同版本启用不同功能集</li>
          </ul>
      </li>
      <li><strong>表单 / 表格通用解决方案</strong>：
          <ul>
            <li>配置式表单：传 schema 自动生成表单（字段、校验、布局、联动）</li>
            <li>配置式表格：传 columns 自动生成表格（列、筛选、分页、操作列）</li>
            <li>减少页面重复模板代码 60%+</li>
          </ul>
      </li>
      <li><strong>国际化 i18n 架构</strong>：
          <ul>
            <li>语言文件按业务域分模块管理：<code>locales/zh-CN/order.json</code></li>
            <li>动态切换语言：按需加载语言包，不一次性打包所有</li>
            <li>抽离公共文案：按钮、状态、错误信息复用</li>
            <li>禁止硬编码中文，lint 规则强制（<code>no-literal-string</code>）</li>
          </ul>
      </li>
      <li><strong>多端适配</strong>：
          <ul>
            <li>后台：响应式布局 + 大屏 / 小屏自适应（断点切换布局）</li>
            <li>ToC：移动端 + PC 端同项目适配方案——同代码库 + 多套组件</li>
            <li>跨端框架：Taro / uni-app（一套代码多端编译）</li>
          </ul>
      </li>
      <li><strong>灰度与功能开关</strong>：
          <ul>
            <li>远程功能配置：不用发版即可关闭 / 开启业务功能</li>
            <li>灰度比例：1% → 5% → 25% → 100%，按用户 ID 哈希分桶</li>
            <li>A/B 测试：不同桶走不同实现，埋点对比转化率</li>
            <li>开关兜底：功能关闭时显示原版，确保可回退</li>
          </ul>
      </li>
    </ol>`;

  const s9Code = `// ── 插件化设计 ─────────────────────────────────────────────────────────────────
// plugins/export/index.ts
import type { App } from 'vue';
import ExportButton from './ExportButton.vue';

export default {
  install(app: App, options: { enabled: boolean }) {
    if (!options.enabled) return;
    app.component('ExportButton', ExportButton);
    app.provide('exportConfig', options);
  },
};

// main.ts
import ExportPlugin from '@/plugins/export';
app.use(ExportPlugin, { enabled: featureFlags.exportEnabled });

// ── 配置式表单 ─────────────────────────────────────────────────────────────────
<!-- components/business/SchemaForm.vue -->
<template>
  <UForm :model="model">
    <UFormItem v-for="field in schema.fields" :key="field.name" :label="field.label">
      <UInput v-if="field.type === 'input'" v-model="model[field.name]" />
      <USelect v-else-if="field.type === 'select'" v-model="model[field.name]" :options="field.options" />
      <UDatePicker v-else-if="field.type === 'date'" v-model="model[field.name]" />
    </UFormItem>
  </UForm>
</template>

<script setup lang="ts">
interface SchemaField {
  name: string;
  label: string;
  type: 'input' | 'select' | 'date' | 'dateRange';
  options?: { label: string; value: any }[];
  rules?: Rule[];
  visible?: (model: any) => boolean;   // 联动显隐
}
defineProps<{ schema: { fields: SchemaField[] }; model: any }>();
</script>

// 使用：定义 schema 即生成完整表单
const schema = {
  fields: [
    { name: 'name',   label: '姓名',  type: 'input',  rules: [required] },
    { name: 'gender', label: '性别',  type: 'select', options: genderOptions },
    { name: 'birthday', label: '生日', type: 'date' },
  ],
};

// ── i18n 按需加载 ───────────────────────────────────────────────────────────────
import { createI18n } from 'vue-i18n';

const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  messages: { 'zh-CN': {} },     // 默认空，按需加载
});

async function loadLocale(lang: string) {
  const messages = await import(\`./locales/\${lang}/index.ts\`);
  i18n.global.mergeLocaleMessage(lang, messages.default);
  i18n.global.locale.value = lang;
}

// ── 灰度与功能开关 ─────────────────────────────────────────────────────────────
// 远程配置
const featureFlags = ref<Record<string, boolean>>({});
async function loadFeatureFlags() {
  const config = await fetch('/runtime-config.json').then(r => r.json());
  featureFlags.value = config.featureFlags;
}

// 灰度分桶（按用户 ID 哈希，0-99）
function inGrayBucket(userId: string, percent: number): boolean {
  const hash = simpleHash(userId) % 100;
  return hash < percent;
}

// 使用
const showNewOrder = computed(() =>
  featureFlags.value.newOrder && inGrayBucket(userStore.id, 10)   // 10% 灰度
);

// 模板里：开关关闭时显示原版
<NewOrderV2 v-if="showNewOrder" />
<NewOrderV1 v-else />`;

  // ─── ⑩ 测试体系架构 ─────────────────────────────────────────────────────────
  const s10 = `
    <h4>核心目标</h4>
    <p>防迭代崩盘。大型项目没有测试，每次改一行都怕。测试体系分四级：单测、组件测、E2E、静态检测。</p>
    <h4>落地切入点</h4>
    <ol>
      <li><strong>单元测试</strong>：
          <ul>
            <li>工具函数、hooks、纯业务逻辑（domain 层）：Vitest / Jest</li>
            <li>覆盖率目标：核心模块 ≥ 80%，整体 ≥ 60%</li>
            <li>优先测"易错"的：日期、树处理、金额计算、状态机</li>
          </ul>
      </li>
      <li><strong>组件测试</strong>：
          <ul>
            <li>Vue Test Utils / React Testing Library</li>
            <li>测交互而非实现：点击 / 输入 / 提交，断言渲染结果</li>
            <li>避免快照测试滥用（snapshot）——快照失败不等于 bug，容易"重新生成"蒙混过关</li>
          </ul>
      </li>
      <li><strong>E2E 自动化测试</strong>：
          <ul>
            <li>Playwright / Cypress，跑核心业务流程：登录 → 下单 → 支付 → 退款</li>
            <li>每次发布前在 staging 跑一遍，30 分钟内出结果</li>
            <li>不要追求全覆盖，覆盖 P0 流程即可（性价比最高）</li>
          </ul>
      </li>
      <li><strong>静态检测</strong>：
          <ul>
            <li>TS 类型校验：<code>tsc --noEmit</code>，CI 必跑</li>
            <li>ESLint：自定义规则强制分层、禁止魔法数、禁止 any</li>
            <li>样式检测：Stylelint 检查颜色、命名、选择器深度</li>
            <li>循环依赖检测：<code>madge</code> / <code>circular-dependency-plugin</code>，CI 卡关</li>
            <li>包体积检测：<code>size-limit</code> / <code>bundlewatch</code></li>
          </ul>
      </li>
    </ol>`;

  const s10Code = `// ── Vitest 单测：纯函数 ─────────────────────────────────────────────────────────
// utils/__tests__/tree.test.ts
import { describe, it, expect } from 'vitest';
import { flattenTree, findPath } from '../tree';

describe('flattenTree', () => {
  it('扁平化嵌套树', () => {
    const tree = [{ id: 1, children: [{ id: 2, children: [] }] }];
    expect(flattenTree(tree)).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('空树返回空数组', () => {
    expect(flattenTree([])).toEqual([]);
  });
});

// ── React Testing Library：组件测试 ─────────────────────────────────────────────
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar } from '../SearchBar';

test('点击搜索触发回调', () => {
  const onSearch = vi.fn();
  render(<SearchBar fields={[{ name: 'kw', label: '关键字', type: 'input' }]} onSearch={onSearch} />);
  fireEvent.change(screen.getByLabelText('关键字'), { target: { value: '订单' } });
  fireEvent.click(screen.getByText('搜索'));
  expect(onSearch).toHaveBeenCalledWith({ kw: '订单' });
});

// ── Playwright：E2E 核心流程 ────────────────────────────────────────────────────
// e2e/order-flow.spec.ts
import { test, expect } from '@playwright/test';

test('下单完整流程', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name=username]', 'testuser');
  await page.fill('[name=password]', 'password');
  await page.click('button[type=submit]');
  await expect(page).toHaveURL('/dashboard');

  await page.click('text=订单列表');
  await page.click('text=新建订单');
  await page.fill('[name=sku]', 'SKU001');
  await page.fill('[name=quantity]', '2');
  await page.click('text=提交');
  await expect(page.locator('.toast')).toContainText('下单成功');
});

// ── package.json scripts ─────────────────────────────────────────────────────────
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --max-warnings 0",
    "lint:cycle": "madge --circular src/"
  }
}

// ── CI：测试闸门 ─────────────────────────────────────────────────────────────────
- name: Test gate
  run: |
    pnpm typecheck && pnpm lint && pnpm test:coverage && pnpm lint:cycle
    pnpm test:e2e -- --project=chromium    # E2E 仅在 staging 跑`;

  // ─── 落地顺序 ─────────────────────────────────────────────────────────────────
  const rollout = `
    <p><strong>整体设计落地顺序（实操推荐）：</strong></p>
    <ol>
      <li><strong>确定业务规模</strong>：单应用 / 微前端多应用——决定是否上⑥</li>
      <li><strong>选型基建</strong>：构建工具、TS、Monorepo、CI 流程（P0，1-2 周）</li>
      <li><strong>基础分层搭建</strong>：目录、请求层、全局状态、路由权限（P0，2-3 周）</li>
      <li><strong>公共组件、工具、样式统一封装</strong>：组件库 + 主题 + 工具函数（P1，2-3 周）</li>
      <li><strong>性能、监控、异常兜底配套</strong>：埋点 + 错误捕获 + 容灾（P1，2 周）</li>
      <li><strong>业务域拆分，落地页面开发规范</strong>：开始写业务（P2，持续）</li>
      <li><strong>完善测试、发布、灰度运维体系</strong>：单测 + E2E + 灰度发布（P2，持续）</li>
    </ol>
    <p><strong>关键节奏：</strong>P0 三周内必须落地（让团队有骨架可写代码），P1 两月内补全（让系统可观测、可发布），
    P2 持续打磨（让业务长期可维护）。每一步都要给下一步留迁移路径——架构是演进的，不是一次设计到位的。</p>`;

  const notes = [
    ruleBox('warning', `<strong>架构是演进的，不是设计的：</strong>不要在项目初期就铺开十大维度的所有最佳实践——
      初期团队 5 人，硬上 Monorepo + 微前端 + 全套监控，维护成本反而拖垮业务。正确路径是：
      P0 三周搭骨架（基建 + 分层 + 请求 + 路由），让团队能写代码；
      P1 两月补观测（监控 + 性能 + 容灾），让系统可发布；
      P2 持续打磨（业务治理 + 测试 + 灰度），让业务长期可维护。
      每次架构升级要明确触发条件（如"页面数超过 30 个"或"线上事故超过 X 次"），避免为了升级而升级。`),
    ruleBox('info', `<strong>微前端不是默认选项：</strong>很多人把"多团队"等于"必须微前端"。
      实际上微前端带来运行时开销、样式隔离、状态共享、发布协调等复杂度，只在<strong>"多团队需要独立部署、技术栈异构、遗留系统整合"</strong>
      三种场景才值得。同团队同栈的多模块，用 Monorepo + 路由分包就够了。
      先证明"单仓 Monorepo"不够用了，再考虑微前端，而不是反过来。`),
    ruleBox('success', `<strong>架构落地的优先级排序：</strong>按 ROI（投入产出比）排序：
      先做"投入小、收益大、能立刻止血"的——ESLint + TS strict + 统一构建 + 错误监控四件套；
      再做"投入中等、长期收益"的——Monorepo + 路由懒加载 + 性能预算 + 配置式表单；
      最后做"投入大、需要组织配合"的——微前端 + 灰度发布 + SLI/SLO 闭环 + E2E。
      顺序反了会让团队在还没尝到架构甜头前就放弃。`),
    ruleBox('danger', `<strong>DTO 转换层必须显式存在：</strong>很多项目让后端字段名（蛇形、缩写）直接漏到 UI 层，
      导致改后端字段要全局搜索替换。正确做法：Service 层出口处调用 <code>toUser(dto)</code> 转换函数，
      UI 只见业务模型。后端字段变了，只改转换函数；UI 想要的字段后端没有，转换函数里补。这一层成本不大但收益巨大。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('十大维度全景', overview)}
    ${section('① 工程基建层（项目骨架）', s1 + codeBlock('Monorepo / 环境配置 / Git 协作', 'dot-blue', 'yaml', s1Code))}
    ${section('② 目录分层设计（解耦核心）', s2 + codeBlock('通用分层 + 业务域自治', 'dot-blue', 'plaintext', s2Code))}
    ${section('③ 数据与状态架构（数据流治理）', s3 + codeBlock('请求层 / 三层状态 / DTO 转换 / storage', 'dot-green', 'typescript', s3Code))}
    ${section('④ 路由与权限架构（中后台必备）', s4 + codeBlock('动态路由 / 路由守卫 / 权限指令 / keepAlive', 'dot-blue', 'typescript', s4Code))}
    ${section('⑤ 组件与 UI 架构（复用、统一视觉）', s5 + codeBlock('三级组件 / 主题变量 / 配置式表单', 'dot-green', 'vue', s5Code))}
    ${section('⑥ 微前端 / 多系统架构（超大项目专项）', s6 + codeBlock('qiankun / Module Federation', 'dot-blue', 'typescript', s6Code))}
    ${section('⑦ 性能架构（构建 / 运行时 / 首屏）', s7 + codeBlock('Vite 分包 / 懒加载 / Web Worker / 性能预算', 'dot-green', 'typescript', s7Code))}
    ${section('⑧ 可观测与稳定性架构（线上保障）', s8 + codeBlock('异常捕获 / 埋点 / 容灾降级', 'dot-blue', 'typescript', s8Code))}
    ${section('⑨ 业务治理与可扩展性（长期维护）', s9 + codeBlock('插件化 / 配置式 / i18n / 灰度', 'dot-green', 'typescript', s9Code))}
    ${section('⑩ 测试体系架构（防迭代崩盘）', s10 + codeBlock('单测 / 组件测 / E2E / 静态检测', 'dot-blue', 'typescript', s10Code))}
    ${section('整体落地顺序（实操推荐）', rollout)}
    ${section('延伸与注意事项', notes.join(''))}`);
}
