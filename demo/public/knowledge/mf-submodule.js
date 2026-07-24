function renderMfSubmodule(t) {
  const conclusion = ruleBox('info',
    `<strong>结论：</strong>"MF + subModule"不是把两个东西堆在一起，而是<strong>各司其职</strong>：<br>
    • <strong>Module Federation（MF）</strong>：运行时按需加载独立部署的远程模块，解决<strong>"多团队并行交付 + 独立上线"</strong>。<br>
    • <strong>subModule（Git Submodule / 子包）</strong>：开发期复用同一份源码，解决<strong>"跨仓库共享代码 + 统一改动"</strong>。<br>
    一句话：<strong>MF 管运行时，subModule 管开发时；前者解耦部署，后者统一源码</strong>。`);

  // ── 为什么需要这两个 ────────────────────────────────────────────────────────────

  const whyRows = [
    ['多团队独立交付',   'A 团队改不动 B 团队的发版节奏',     'MF：远程模块独立 CI/CD'],
    ['公共组件复用',     '组件库发版要所有项目同步升级',     'subModule：源码共享，改动同步'],
    ['版本一致性',       '同一组件在不同仓库有 5 个版本',    'subModule：单一源真相'],
    ['运行时性能',       '每个子应用都打包 react、echarts',  'MF：shared 共享运行时实例'],
    ['灰度与回滚',       '子系统出问题要整站回滚',           'MF：远程模块独立灰度'],
    ['大型 monorepo 瓶颈', '单仓库 build 越来越慢',          'subModule 拆分 + MF 独立部署'],
  ];
  const whyTable = metricsTable(['痛点', '具体表现', '谁来解决'], whyRows);

  // ── 两者定位对比 ────────────────────────────────────────────────────────────────

  const compareRows = [
    ['作用阶段',     '运行时',                    '开发时'],
    ['核心机制',     'Webpack 5 ModuleFederationPlugin', 'Git Submodule / pnpm workspace'],
    ['产物形态',     'remoteEntry.js 远程 chunk', '源码或编译产物'],
    ['独立部署',     '✅ 必须独立部署',            '❌ 跟随主仓库或单独发包'],
    ['版本管理',     '运行时按需加载 + 版本协商',  'Git commit 锁定'],
    ['改动的传染性', '不传染（运行时解耦）',       '传染（submodule 更新所有主仓都拉新版本）'],
    ['适用粒度',     '页面级 / 大功能模块',        '组件库 / 工具函数 / 类型定义'],
    ['构建复杂度',   '高（需配 shared、remotes）', '低（只是源码引用）'],
    ['回滚成本',     '低（切换 remoteEntry URL）', '中（要回滚 submodule commit）'],
  ];
  const compareTable = metricsTable(['维度', 'Module Federation', 'subModule'], compareRows);

  // ── 整体架构分层 ────────────────────────────────────────────────────────────────

  const layerBox = ruleBox('accent',
    `<strong>四层架构（自上而下）：</strong><br><br>
    <code>① 基座 Shell</code> — 路由骨架、登录鉴权、布局、错误边界<br>
    <code>② 子应用 Remote</code> — MF 远程模块，各业务线独立部署<br>
    <code>③ 共享源码包 Submodule</code> — UI 组件库 / 工具 / 类型，开发期复用<br>
    <code>④ 运行时 Shared</code> — react / react-dom / 状态库，MF shared 单例`);

  const archCode = `# ── 仓库结构 ──────────────────────────────────────────────────────────────────────
portal-shell/                    # ① 基座
├── src/
│   ├── bootstrap.ts             # 异步引导，等 shared 就绪后再 render
│   ├── App.tsx                  # 布局 + 路由 + 远程模块加载器
│   └── federated.ts             # 远程入口配置（运行时注入 URL）
├── vite.config.ts               # federationPlugin: remotes + shared
└── .gitmodules                  # submodule 配置
    ├── shared/ui                # ③ 子模块：组件库源码
    ├── shared/http              # ③ 子模块：请求层
    └── shared/types             # ③ 子模块：类型与契约

business-a/                      # ② 子应用 A（独立仓库、独立 CI）
business-b/                      # ② 子应用 B
shared/                          # ③ 共享源码（独立仓库，被 portal/业务 当 submodule 引用）`;

  // ── MF 关键配置 ────────────────────────────────────────────────────────────────

  const mfCode = `// ── portal-shell/vite.config.ts ──────────────────────────────────────────────────
import { federation } from '@originjs/vite-plugin-federation';

export default {
  plugins: [
    federation({
      name: 'portal',
      remotes: {
        // 运行时注入：从配置中心 / window.__REMOTE_URLS__ 拿
        businessA: 'remote_business_a',
        businessB: 'remote_business_b',
      },
      shared: {
        react:           { singleton: true, requiredVersion: '^18.2.0' },
        'react-dom':     { singleton: true, requiredVersion: '^18.2.0' },
        zustand:         { singleton: true },   // 全局状态库共享单例
        'shared/ui':     { requiredVersion: 'workspace:*' }, // 子模块产物也共享
      },
    }),
  ],
};

// ── 运行时加载远程模块 ────────────────────────────────────────────────────────────
const RemotePage = React.lazy(() => import('businessA/OrderList'));

<Suspense fallback={<Skeleton />}>
  <RemotePage />
</Suspense>`;

  // ── subModule 关键约定 ─────────────────────────────────────────────────────────

  const submoduleCode = `# ── 添加子模块 ───────────────────────────────────────────────────────────────────
cd portal-shell
git submodule add git@github.com:org/shared-ui.git shared/ui
git submodule add git@github.com:org/shared-http.git shared/http

# ── 克隆带子模块 ──────────────────────────────────────────────────────────────────
git clone --recurse-submodules git@github.com:org/portal-shell.git

# ── 子模块更新（在主仓库拉取子模块最新 commit） ─────────────────────────────────
git submodule update --remote --merge

# ── 关键约定 ───────────────────────────────────────────────────────────────────
# 1. 主仓库锁定子模块 commit，不是分支 → 保证可复现
# 2. 子模块改动先在子仓库提 PR、合并发版，再在主仓库更新 commit
# 3. 禁止在主仓库里直接改子模块代码（容易脏指针）`;

  // ── 关键设计点 ────────────────────────────────────────────────────────────────

  const designRows = [
    ['shared 单例',       'react / react-dom / 状态库必须 singleton',  '否则两个 React 实例 → context 失效、hook 报错'],
    ['shared 版本协商',   'requiredVersion 用范围版本 ^18.2.0',         '太严会拒绝加载、太松会行为不一致'],
    ['远程入口 URL',      '不要写死在构建产物里',                       '配置中心下发，支持灰度切换/回滚'],
    ['路由约定',          '/a/* → businessA、/b/* → businessB',         '基座统一前缀，子应用只处理相对路径'],
    ['通信契约',          '事件总线 + 共享状态库，禁止 props 透传',      '子应用挂载点稳定，props 透传耦合基座'],
    ['样式隔离',          'Shadow DOM 或 CSS Modules + 命名前缀',        '避免基座样式污染子应用、反之亦然'],
    ['沙箱',              'qiankun/wujie 或 MF 自身隔离',               '全局变量、定时器、事件监听要清理'],
    ['错误边界',          '远程模块加载失败有兜底 UI',                  '不能让一个子应用挂掉整站'],
  ];
  const designTable = metricsTable(['设计点', '怎么做', '为什么'], designRows);

  // ── 典型踩坑 ────────────────────────────────────────────────────────────────────

  const pitfallBox = ruleBox('danger',
    `<strong>高频踩坑：</strong><br><br>
    ① <strong>shared 版本不匹配</strong>：主应用 react@18.2，子应用 react@18.3，运行时报 invalid hook call。
    解法：<code>singleton: true</code> + 严格的 <code>requiredVersion</code>，CI 里跑依赖一致性检查。<br><br>
    ② <strong>submodule 脏指针</strong>：在主仓库改了子模块代码没提交，<code>git submodule update</code> 后丢失。
    解法：CI 卡 <code>git diff --submodule</code>，禁止主仓库内直接改子模块。<br><br>
    ③ <strong>循环依赖</strong>：子应用反过来 import 基座代码，构建时不报错、运行时炸。
    解法：基座暴露的 API 通过 MF <code>exposes</code> 显式声明，禁止子应用直接 import 基座源码。<br><br>
    ④ <strong>首次加载白屏</strong>：所有子应用 remoteEntry 串行加载。
    解法：<code>preload</code> 关键远程入口 + Suspense fallback 骨架屏。`);

  // ── 什么时候不要用 ──────────────────────────────────────────────────────────────

  const notForBox = ruleBox('warning',
    `<strong>不要为了用而用。下面这些场景，单仓库 + npm 包就够了：</strong><br><br>
    • 团队 < 10 人，业务线 < 3 条 → <strong>monorepo + pnpm workspace</strong> 足够<br>
    • 子应用没有独立部署诉求 → 不需要 MF，发版跟主仓库一起即可<br>
    • 共享代码只是工具函数 → 发 npm 包比 submodule 更轻<br>
    • 没有独立回滚/灰度诉求 → MF 的复杂度收益覆盖不了成本<br><br>
    <strong>判定标准</strong>：当且仅当"多团队、独立交付、独立上线"三个条件同时成立，才上 MF；submodule 仅在"跨仓库共享源码、统一改动"时使用。`);

  // ── 落地步骤 ────────────────────────────────────────────────────────────────────

  const stepRows = [
    ['Step 1 · 契约先行',   '定 API、路由前缀、shared 清单、通信协议',  '所有团队签字确认再动工'],
    ['Step 2 · 基座落地',   'Shell + 鉴权 + 路由 + 错误边界 + 沙箱',    '先跑通空壳加载远程模块'],
    ['Step 3 · 共享层抽离', 'submodule 引入 shared/ui、shared/http',    '先迁源码、不破坏现有引用'],
    ['Step 4 · 第一个远程', '挑一个边缘业务线做试点',                   '验证 CI/CD、shared、灰度'],
    ['Step 5 · 全量推广',   '其他业务线按节奏迁移',                     '每迁一个加监控、留回滚预案'],
    ['Step 6 · 治理',       '版本一致性检查 + remoteEntry 监控',         '防止漂移与静默失败'],
  ];
  const stepTable = metricsTable(['阶段', '动作', '验收标准'], stepRows);

  return articleShell(t, `
    ${section('一句话结论', conclusion)}
    ${section('为什么需要这两个', whyTable)}
    ${section('MF vs subModule 定位对比', compareTable)}
    ${section('整体架构分层', layerBox + codeBlock('仓库结构示例', 'success', 'bash', archCode))}
    ${section('MF 关键配置', codeBlock('portal-shell/vite.config.ts', 'accent', 'ts', mfCode))}
    ${section('subModule 关键约定', codeBlock('子模块操作', 'warning', 'bash', submoduleCode))}
    ${section('八个关键设计点', designTable)}
    ${section('高频踩坑', pitfallBox)}
    ${section('什么时候不要用', notForBox)}
    ${section('落地步骤', stepTable)}`);
}

function metricsTable(headers, rows) {
  const thead = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>`;
  return `<table class="metrics-table">${thead}${tbody}</table>`;
}
