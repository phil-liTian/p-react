function renderMonorepo(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>Monorepo 将多个相关项目放在同一个仓库管理，
    核心收益是<strong>代码共享、原子提交、统一工具链</strong>。
    现代推荐方案：<strong>pnpm workspace</strong>（原生包管理）+ <strong>Turborepo</strong>（构建缓存与任务编排），
    相比 Lerna 配置更简单，相比 Yarn workspace 性能更好。`);

  const principle = `
    <p><strong>Monorepo vs Multirepo 对比：</strong></p>
    <table class="metrics-table">
      <thead><tr><th>维度</th><th>Monorepo</th><th>Multirepo</th></tr></thead>
      <tbody>
        <tr><td>代码复用</td><td>直接引用本地包，修改即生效</td><td>需发布 npm 版本，跨仓协作慢</td></tr>
        <tr><td>原子提交</td><td>一次 PR 同时修改多个包，保证一致性</td><td>多仓 PR 难以保证同步合并</td></tr>
        <tr><td>工具链</td><td>统一 ESLint/TS/测试配置</td><td>各仓各自维护，易漂移</td></tr>
        <tr><td>构建速度</td><td>需任务编排（Turborepo），否则全量重建</td><td>各仓独立构建，互不影响</td></tr>
        <tr><td>权限管理</td><td>所有人可见全部代码</td><td>按仓库粒度控制访问</td></tr>
        <tr><td>适用规模</td><td>中大型前端团队（2-50个包）</td><td>独立团队、独立发布节奏的服务</td></tr>
      </tbody>
    </table>
    <p><strong>pnpm workspace 核心优势：</strong></p>
    <ul>
      <li><strong>硬链接 + 符号链接</strong>：所有依赖存在全局 store，各项目通过硬链接引用，磁盘占用减少 60%+</li>
      <li><strong>严格模式</strong>：默认不允许访问未声明的依赖（幽灵依赖问题），避免隐式依赖</li>
      <li><strong>wor议</strong>：<code>"@my/ui": "workspace:*"</code> 声明本地包引用，发布时自动替换为真实版本号</li>
    </ul>
    <p><strong>Turborepo 核心能力：</strong></p>
    <ul>
      <li><strong>任务依赖图</strong>：声明 <code>build</code> 依赖上游包的 <code>build</code>，自动按拓扑顺序执行</li>
      <li><strong>本地缓存</strong>：输入文件哈希不变则直接复用上次输出，跳过重建</li>
      <li><strong>远程缓存</strong>：团队共享缓存（Vercel Remote Cache 或自建），CI 首次构建后后续成员直接命中缓存</li>
    </ul>`;

  const setupCode = `# ── 初始化 pnpm workspace Monorepo ──────────────────────────────────────────
mkdir my-monorepo && cd my-monorepo
pnpm init

# pnpm-workspace.yaml（定义 workspace 范围）
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'apps/*'       # 应用（Next.js、Vite app 等）
  - 'packages/*'   # 共享库（UI 组件、工具函数、类型等）
EOF

# 目录结构
# my-monorepo/
# ├── apps/
# │   ├── web/          package.json: { "name": "@my/web" }
# │   └── admin/        package.json: { "name": "@my/admin" }
# ├── packages/
# │   ├── ui/           package.json: { "name": "@my/ui" }
# │   └── utils/        package.json: { "name": "@my/utils" }
# ├── pnpm-workspace.yaml
# └── package.json      (根 package.json，管理全局脚本)

# 在 apps/web 中引用本地包（workspace 协议）
# apps/web/package.json
{
  "name": "@my/web",
  "dependencies": {
    "@my/ui": "workspace:*",      // 开发时指向本地，发布时替换为 "^1.0.0"
    "@my/utils": "workspace:*"
  }
}

# 安装所有依赖（一条命令，安装整个 monorepo）
pnpm install

# 只在特定 workspace 执行命令
pnpm --filter @my/web dev
pnpm --filter @my/ui build
pnpm --filter "./packages/**" build   # glob 批量操作`;

  const turboCode = `// ── turbo.json（任务编排配置）─────────────────────────────────────────────────
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      // build 依赖其上游包的 build 先完成（拓扑排序）
      "dependsOn": ["^build"],
      // 声明输入：这些文件变化才需要重新构建
      "inputs": ["src/**", "package.json", "tsconfig.json"],
      // 声明输出：缓存这些目录
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      // dev 不缓存（每次都要启动 dev server）
      "cache": false,
      "persistent": true      // 长期运行的任务（dev server）
    },
    "test": {
      "dependsOn": ["^build"],
      "inputs": ["src/**", "test/**", "vitest.config.ts"],
      "outputs": []
    },
    "lint": {
      "inputs": ["src/**", ".eslintrc.*"]
    }
  }
}

// ── 根 package.json scripts ───────────────────────────────────────────────────
{
  "scripts": {
    // turbo 自动并行执行所有包的 build（按依赖顺序）
    "build": "turbo build",
    "dev": "turbo dev",
    "test": "turbo test",
    "lint": "turbo lint",
    // 只构建受影响的包（基于 git diff，CI 中常用）
    "build:affected": "turbo build --filter=...[HEAD^1]"
  },
  "devDependencies": {
    "turbo": "latest"
  }
}

// ── 远程缓存配置（团队共享，CI 加速）────────────────────────────────────────
// .env（本地）或 CI 环境变量
// TURBO_TOKEN=your_vercel_remote_cache_token
// TURBO_TEAM=your_team_slug

// CI（GitHub Actions）中使用远程缓存
// - name: Build
//   run: turbo build
//   env:
//     TURBO_TOKEN: \${{ secrets.TURBO_TOKEN }}
//     TURBO_TEAM: \${{ vars.TURBO_TEAM }}
// 首次构建后，后续 PR 直接命中缓存，构建时间从 5min → 10s`;

  const notes = [
    ruleBox('warning', `<strong>幽灵依赖（Phantom Dependencies）：</strong>npm/yarn 的扁平化 node_modules 允许访问未在 package.json 声明的间接依赖，项目貌似能跑但实际依赖不稳定。pnpm 的非扁平化结构从根本上解决此问题——每个包只能访问自己 package.json 里声明的依赖。迁移到 pnpm 时，需要补全所有隐式依赖（<code>pnpm install</code> 后运行项目，按报错逐一补充）。`),
    ruleBox('info', `<strong>Changesets：版本管理与发布自动化：</strong>Monorepo 中多包的版本号管理推荐用 <code>@changesets/cli</code>。开发者在每次 PR 时运行 <code>pnpm changeset</code> 记录变更类型（patch/minor/major），CI 自动汇总生成 CHANGELOG 并发布到 npm。配合 GitHub Actions 的 <code>changesets/action</code> 可实现全自动发布流水线。`),
    ruleBox('success', `<strong>TypeScript 路径映射：</strong>在根 <code>tsconfig.json</code> 配置 <code>paths</code>，让 IDE 和 tsc 识别 workspace 包的类型：<code>"@my/ui": ["./packages/ui/src/index.ts"]</code>。各子包的 tsconfig 继承根配置（<code>"extends": "../../tsconfig.base.json"</code>），统一 target/lib/strict 设置，避免各包类型检查行为不一致。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle)}
    ${section('代码示例', codeBlock('pnpm workspace 初始化与本地包引用', 'dot-blue', 'bash', setupCode) + codeBlock('turbo.json 任务编排 + 远程缓存配置', 'dot-green', 'javascript', turboCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
