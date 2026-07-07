function renderFrontendCicd(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>前端 CI/CD 不是"装个 GitHub Actions 跑 lint"那么简单，
    而是一条从<strong>提交 → PR 检查 → 构建 → 部署 → 发布后验证 → 回滚</strong>的端到端流水线。
    落地目标有四个：<strong>① 提交即拦截低级错误</strong>（husky 钩子）；
    <strong>② PR 红线防止破窗</strong>（lint / typecheck / test / 体积预算）；
    <strong>③ 部署可灰度可回滚</strong>（按比例发布 + 单按钮回滚）；
    <strong>④ 上线后自动验证</strong>（健康检查 + 冒烟 E2E + 错误率告警）。
    每一环都要可复现、可观测、可回退。`);

  const overview = `
    <p><strong>前端 CI/CD 全景（六阶段）：</strong></p>
    <table class="metrics-table">
      <thead><tr><th>阶段</th><th>触发</th><th>核心动作</th><th>失败后果</th></tr></thead>
      <tbody>
        <tr><td>① 提交前</td><td>git commit</td><td>lint-staged / typecheck / commitlint</td><td>提交被拦截，本地修复</td></tr>
        <tr><td>② PR 检查</td><td>pull_request</td><td>lint / typecheck / test / build / bundle 预算</td><td>禁止合并到主干</td></tr>
        <tr><td>③ 预览部署</td><td>PR 创建</td><td>构建临时环境 + 评论链接</td><td>无法视觉验证</td></tr>
        <tr><td>④ 生产构建</td><td>合并到 main / tag</td><td>多环境构建 + sourcemap 归档 + 产物签名</td><td>无法发布</td></tr>
        <tr><td>⑤ 灰度发布</td><td>构建完成</td><td>1% → 5% → 25% → 100% 分桶</td><td>需手动介入或自动回滚</td></tr>
        <tr><td>⑥ 发布后验证</td><td>部署完成</td><td>健康检查 / 冒烟 E2E / 错误率监控</td><td>触发回滚告警</td></tr>
      </tbody>
    </table>
    <p><strong>三条铁律：</strong>
      ① <strong>流水线即代码</strong>：所有 CI/CD 配置提交到仓库，不依赖平台 UI 手动配；
      ② <strong>任何环节失败必须阻断</strong>：红线一旦失效就是破窗的开始；
      ③ <strong>回滚比修复快</strong>：线上故障第一动作是回滚，不是排查。</p>`;

  // ─── ① 提交前钩子 ────────────────────────────────────────────────────────────
  const s1 = `
    <h4>核心目标</h4>
    <p>把最低级的错误挡在本地，不让它进 PR。这一层投入最小、收益最大，但很多人都没配齐。</p>
    <h4>落地切入点</h4>
    <ol>
      <li><strong>husky 管理 git hooks</strong>：<code>pre-commit</code> 跑 lint-staged，<code>commit-msg</code> 跑 commitlint</li>
      <li><strong>lint-staged 只检查改动文件</strong>：避免全量 lint 拖慢提交；格式化 + lint 修复一步到位</li>
      <li><strong>commitlint 强制语义化提交</strong>：<code>feat: xxx</code> / <code>fix(scope): xxx</code>，便于后续生成 changelog</li>
      <li><strong>pre-push 跑单测</strong>（可选）：push 前跑一次完整单测，挡住明显回归</li>
      <li><strong>跳过钩子要审批</strong>：<code>--no-verify</code> 留给紧急情况，但要在团队规范里明确使用场景</li>
    </ol>`;

  const s1Code = `# ── 安装与初始化 husky ───────────────────────────────────────────────────────────
pnpm add -D husky lint-staged @commitlint/cli @commitlint/config-conventional
pnpm exec husky init        # 创建 .husky/ 目录与 pre-commit 模板

# ── package.json：lint-staged 配置 ──────────────────────────────────────────────
{
  "scripts": {
    "prepare": "husky"            // pnpm install 时自动安装钩子
  },
  "lint-staged": {
    "*.{ts,tsx,vue}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{css,scss}": [
      "stylelint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml}": [
      "prettier --write"
    ]
  }
}

# ── .husky/pre-commit（只 lint 改动文件，速度快）──────────────────────────────
pnpm lint-staged

# ── .husky/commit-msg（强制语义化提交）────────────────────────────────────────
pnpm commitlint --edit $1

# ── commitlint.config.ts ────────────────────────────────────────────────────────
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat',     // 新功能
      'fix',      // bug 修复
      'docs',     // 文档
      'style',    // 格式（不影响功能）
      'refactor', // 重构
      'perf',     // 性能优化
      'test',     // 测试
      'build',    // 构建/依赖
      'ci',       // CI 配置
      'chore',    // 杂项
      'revert'    // 回滚
    ]],
    'subject-max-length': [2, 'always', 72],   // 标题不超过 72 字符
  }
};

# ── .husky/pre-push（可选：push 前跑单测）──────────────────────────────────────
pnpm test --run`;

  // ─── ② PR 检查 ──────────────────────────────────────────────────────────────
  const s2 = `
    <h4>核心目标</h4>
    <p>PR 是代码进入主干前的最后一道闸门。CI 在这里跑完整检查，任何一项红都禁止合并。
    核心是<strong>并行 + 缓存 + 取消旧任务</strong>三个机制保证速度。</p>
    <h4>落地切入点</h4>
    <ol>
      <li><strong>并发取消旧任务</strong>：同一 PR 多次 push，自动取消前次运行，省 CI 资源</li>
      <li><strong>依赖缓存</strong>：缓存 pnpm store / node_modules / Vite 构建缓存，安装从 30s → 3s</li>
      <li><strong>Job 并行</strong>：lint / typecheck / test / build 四个 Job 并行跑，不要串行</li>
      <li><strong>必跑检查项</strong>：
          <ul>
            <li><strong>lint</strong>：ESLint + Stylelint</li>
            <li><strong>typecheck</strong>：<code>tsc --noEmit</code>，独立于 build</li>
            <li><strong>test</strong>：单测 + 覆盖率门槛（核心模块 ≥ 80%）</li>
            <li><strong>build</strong>：验证生产构建无错</li>
            <li><strong>bundle 预算</strong>：首屏 JS gzip ≤ 200KB，超预算 fail</li>
          </ul>
      </li>
      <li><strong>PR 模板 + 检查清单</strong>：动机 / 改动 / 测试 / 截图 / 影响范围</li>
      <li><strong>分支保护</strong>：main 分支必须 PR 合并、必须 CI 全绿、至少 1 人 review</li>
    </ol>`;

  const s2Code = `# ── .github/workflows/ci.yml：PR 检查流水线 ──────────────────────────────────────
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

# 同一 PR 新 push 取消旧运行
concurrency:
  group: ci-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  # ── Job 1: lint + typecheck ──────────────────────────────────────────────────
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm                # 关键：缓存 pnpm store
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck

  # ── Job 2: 单测 + 覆盖率 ─────────────────────────────────────────────────────
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test --coverage
      - name: Coverage threshold
        run: |
          pnpm exec vitest --coverage --coverage.thresholds.lines=80 \\
            --coverage.thresholds.branches=70
      - uses: codecov/codecov-action@v4   # 上传到 Codecov 可视化

  # ── Job 3: 构建 + 体积预算 ───────────────────────────────────────────────────
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - name: Bundle budget check
        run: |
          # 首屏 JS gzip 后 ≤ 200KB
          FIRST_SCREEN=\$(gzip -c dist/assets/vendor-*.js dist/assets/index-*.js | wc -c)
          echo "First-screen bundle: \$FIRST_SCREEN bytes (gzip)"
          [ \$FIRST_SCREEN -le 204800 ] || { echo "Over budget"; exit 1; }
      - name: Compare with base branch
        if: github.event_name == 'pull_request'
        uses: preactjs/compressed-size-action@v2
        with:
          repo-token: \${{ secrets.GITHUB_TOKEN }}
          # PR 评论里显示体积变化（+1.2KB / -0.8KB）

# ── GitHub 分支保护规则（在仓库设置中开启）─────────────────────────────────────
# Settings → Branches → Branch protection rules → main
# ☑ Require a pull request before merging
# ☑ Require status checks to pass before merging
#     必须包含：quality / test / build
# ☑ Require branches to be up to date before merging
# ☑ Require conversation resolution before merging
# ☑ Do not allow bypassing the above settings`;

  // ─── ③ 预览部署 ──────────────────────────────────────────────────────────────
  const s3 = `
    <h4>核心目标</h4>
    <p>每个 PR 自动部署一个临时环境，让 review 的人能直接看到效果，不只是看代码。
    这是<strong>视觉验证 / 设计 review / 联调测试</strong>的杀手级能力，落地后 PR 通过率显著提升。</p>
    <h4>落地切入点</h4>
    <ol>
      <li><strong>方案选型</strong>：
          <ul>
            <li><strong>Vercel / Netlify</strong>：托管型，PR 自动部署零配置，适合中小项目</li>
            <li><strong>自建</strong>：构建产物上传到 OSS 子目录 + 评论链接，适合内网 / 大企业</li>
          </ul>
      </li>
      <li><strong>子目录隔离</strong>：<code>dist/pr-123/</code>，每个 PR 独立目录，互不影响</li>
      <li><strong>评论链接</strong>：部署完成后自动在 PR 评论里贴访问地址</li>
      <li><strong>环境变量隔离</strong>：预览环境用独立的 API base（指向 staging 后端）</li>
      <li><strong>自动清理</strong>：PR 合并 / 关闭后自动删除预览目录，避免 OSS 堆积</li>
    </ol>`;

  const s3Code = `# ── .github/workflows/preview.yml：PR 预览部署 ───────────────────────────────────
name: Preview Deploy

on:
  pull_request:
    types: [opened, synchronize, reopened, closed]

concurrency:
  group: preview-\${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  deploy:
    if: github.event.action != 'closed'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }

      - run: pnpm install --frozen-lockfile
      - name: Build with preview env
        env:
          VITE_API_BASE: https://api-staging.example.com
        run: pnpm build -- --base=/pr-\${{ github.event.pull_request.number }}/

      - name: Upload to OSS sub-path
        uses: tvrcgo/oss-action@1.0.0
        with:
          key-id: \${{ secrets.OSS_KEY_ID }}
          key-secret: \${{ secrets.OSS_KEY_SECRET }}
          region: oss-cn-hangzhou
          bucket: preview-cdn
          assets: dist/**:pr-\${{ github.event.pull_request.number }}/

      - name: Comment PR with preview URL
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          header: preview
          message: |
            🚀 预览环境已部署
            🔗 https://preview-cdn.example.com/pr-\${{ github.event.pull_request.number }}/

  cleanup:
    if: github.event.action == 'closed'
    runs-on: ubuntu-latest
    steps:
      - name: Delete preview directory from OSS
        run: |
          ossutil rm -rf oss://preview-cdn/pr-\${{ github.event.pull_request.number }}/
        env:
          OSS_KEY_ID: \${{ secrets.OSS_KEY_ID }}
          OSS_KEY_SECRET: \${{ secrets.OSS_KEY_SECRET }}`;

  // ─── ④ 生产构建 ──────────────────────────────────────────────────────────────
  const s4 = `
    <h4>核心目标</h4>
    <p>合并到 main 或打 tag 后触发。这一阶段不是"再 build 一次"，而是要产出<strong>可发布、可追溯、可回滚</strong>的产物。</p>
    <h4>落地切入点</h4>
    <ol>
      <li><strong>多环境构建</strong>：staging / pre-prod / prod 三套构建，环境变量分别注入</li>
      <li><strong>Sourcemap 策略</strong>：
          <ul>
            <li>生产不发布 sourcemap 到 CDN（避免源码泄露）</li>
            <li>构建时生成 sourcemap，归档到内部对象存储（OSS / S3）</li>
            <li>错误监控后端用 sourcemap 还原真实行列号</li>
          </ul>
      </li>
      <li><strong>产物签名</strong>：构建完成后计算 dist 目录的 hash，记录到发布元数据，
          线上验证产物完整性（防止 CDN 被篡改）</li>
      <li><strong>构建产物归档</strong>：每次构建打包成 tar.gz 上传 OSS，保留最近 20 个版本，
          回滚时直接下载旧产物，<strong>不重新构建</strong></li>
      <li><strong>版本号规范</strong>：用 git tag 或 changeset 生成版本号，写入产物 metadata</li>
      <li><strong>构建缓存</strong>：Vite / Webpack 构建缓存 + Turborepo 远程缓存，
          大型 Monorepo 构建从 8 分钟 → 1 分钟</li>
    </ol>`;

  const s4Code = `# ── .github/workflows/release.yml：生产构建与发布 ────────────────────────────────
name: Release

on:
  push:
    tags: ['v*']          # 打 tag 触发正式发布
    branches: [main]      # 合并 main 触发 staging 部署

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      version: \${{ steps.meta.outputs.version }}
      artifact-path: \${{ steps.archive.outputs.path }}
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }   # 完整历史，用于生成版本号

      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }

      - run: pnpm install --frozen-lockfile

      - name: Generate version metadata
        id: meta
        run: |
          VERSION=\$(git describe --tags --always --dirty)
          echo "version=\$VERSION" >> \$GITHUB_OUTPUT
          # 写入产物，运行时可读
          echo "{ \\"version\\": \\"\$VERSION\\", \\"buildTime\\": \\"\$(date -u +%FT%TZ)\\" }" > dist/meta.json

      - name: Build production
        env:
          VITE_API_BASE: https://api.example.com
          VITE_TRACK_ENABLED: 'true'
        run: pnpm build -- --sourcemap     # 生成 sourcemap 但不上 CDN

      - name: Generate sourcemap archive (only for error tracking backend)
        run: |
          tar -czf sourcemaps-\${{ steps.meta.outputs.version }}.tar.gz dist/assets/*.map
          # 从 CDN 产物中删除 sourcemap
          find dist -name "*.map" -delete

      - name: Archive build artifact
        id: archive
        run: |
          tar -czf artifact-\${{ steps.meta.outputs.version }}.tar.gz dist/
          echo "path=artifact-\${{ steps.meta.outputs.version }}.tar.gz" >> \$GITHUB_OUTPUT

      - name: Compute artifact hash (签名)
        run: |
          sha256sum artifact-\${{ steps.meta.outputs.version }}.tar.gz > artifact.sha256
          cat artifact.sha256

      - name: Upload to OSS for archive (回滚用)
        uses: tvrcgo/oss-action@1.0.0
        with:
          key-id: \${{ secrets.OSS_KEY_ID }}
          key-secret: \${{ secrets.OSS_KEY_SECRET }}
          region: oss-cn-hangzhou
          bucket: release-archive
          assets: |
            artifact-\${{ steps.meta.outputs.version }}.tar.gz:releases/\${{ steps.meta.outputs.version }}/
            sourcemaps-\${{ steps.meta.outputs.version }}.tar.gz:releases/\${{ steps.meta.outputs.version }}/
            artifact.sha256:releases/\${{ steps.meta.outputs.version }}/

      - name: Upload sourcemap to Sentry (错误还原)
        run: pnpm exec sentry-cli sourcemaps upload --release=\${{ steps.meta.outputs.version }} dist/

      - uses: actions/upload-artifact@v4
        with:
          name: build-\${{ steps.meta.outputs.version }}
          path: dist/`;

  // ─── ⑤ 灰度发布 ──────────────────────────────────────────────────────────────
  const s5 = `
    <h4>核心目标</h4>
    <p>不是"一刀切全量上线"。按比例灰度，让小流量先验证，出问题影响面可控。
    前端灰度的难点是<strong>静态资源无法像后端那样按请求比例分流</strong>，需要靠 CDN / Nginx / Service Worker 实现。</p>
    <h4>落地切入点</h4>
    <ol>
      <li><strong>方案对比</strong>：
          <table class="metrics-table">
            <thead><tr><th>方案</th><th>原理</th><th>优点</th><th>缺点</th></tr></thead>
            <tbody>
              <tr><td>双 CDN 路径</td><td>新旧版本不同路径，Nginx 按比例 redirect</td><td>简单可控</td><td>需要后端配合</td></tr>
              <tr><td>Service Worker</td><td>SW 拦截请求，按用户桶决定加载版本</td><td>纯前端可控</td><td>首次访问无 SW，需首屏兼容</td></tr>
              <tr><td>按用户分桶</td><td>后端按 uid 哈希下发版本标识，前端按标识加载</td><td>精确到用户</td><td>需要 BFF 配合</td></tr>
              <tr><td>功能开关</td><td>新版本全量部署，但功能用 flag 控制</td><td>无需多版本</td><td>代码包变大</td></tr>
            </tbody>
          </table>
      </li>
      <li><strong>推荐：用户分桶 + 远程配置</strong>：
          <ul>
            <li>前端拉远程配置 <code>runtime-config.json</code>，含灰度比例</li>
            <li>按 uid 哈希 0-99，落在 [0, grayScale) 范围内走新版本</li>
            <li>新版本独立 chunk 路径，按桶加载</li>
          </ul>
      </li>
      <li><strong>灰度梯度</strong>：1% → 5% → 25% → 50% → 100%，每档观察 30 分钟到 2 小时</li>
      <li><strong>自动阻断</strong>：监控错误率 / 性能指标，新版本比旧版本劣化超阈值自动停灰度</li>
      <li><strong>一键回滚</strong>：把灰度比例调回 0% 即可，无需重新构建</li>
    </ol>`;

  const s5Code = `# ── runtime-config.json（部署在 CDN，CI 可动态修改）──────────────────────────────
{
  "version": "v2.3.0",
  "grayScale": 5,
  "featureFlags": {
    "newOrderFlow": true
  }
}

// ── 应用启动时拉远程配置 ───────────────────────────────────────────────────────
async function loadRuntimeConfig() {
  const config = await fetch('/runtime-config.json?t=' + Date.now()).then(r => r.json());
  window.__RUNTIME_CONFIG__ = config;
}

// ── 用户分桶（按 uid 哈希，0-99）─────────────────────────────────────────────────
function inGrayBucket(userId: string, percent: number): boolean {
  // 简单 hash，确保同用户每次结果一致
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 100 < percent;
}

// ── 按桶决定加载哪个版本 ────────────────────────────────────────────────────────
async function bootstrap() {
  await loadRuntimeConfig();
  const { grayScale, version } = window.__RUNTIME_CONFIG__;
  const userId = getUserId() || 'anonymous-' + randomId();
  const useNewVersion = inGrayBucket(userId, grayScale);

  if (useNewVersion) {
    // 新版本独立 chunk 路径
    await import(\`/v2.3.0/main.[hash].js\`);
  } else {
    // 旧版本继续使用
    await import(\`/v2.2.9/main.[hash].js\`);
  }
}

# ── Nginx 双路径灰度方案（替代纯前端方案）──────────────────────────────────────
# /etc/nginx/conf.d/app.conf
upstream frontend_old { server cdn-old.example.com; }
upstream frontend_new { server cdn-new.example.com; }

# 按比例 split（10% 流量到新版本）
split_clients "\${remote_addr}\${http_user_agent}" $frontend_backend {
  10% frontend_new;
  *  frontend_old;
}

server {
  location / {
    proxy_pass http://$frontend_backend;
  }
}

# ── CI 修改灰度比例（无需重新构建）──────────────────────────────────────────────
# .github/workflows/gray-release.yml
- name: Bump gray scale to 25%
  run: |
    curl -X PUT https://api.config-service.example.com/gray-scale \\
      -H "Authorization: Bearer \${{ secrets.CONFIG_TOKEN }}" \\
      -d '{"grayScale": 25}'

# ── 一键回滚：把 grayScale 调回 0 ────────────────────────────────────────────────
- name: Rollback to 0%
  run: |
    curl -X PUT https://api.config-service.example.com/gray-scale \\
      -H "Authorization: Bearer \${{ secrets.CONFIG_TOKEN }}" \\
      -d '{"grayScale": 0}'`;

  // ─── ⑥ 发布后验证 ────────────────────────────────────────────────────────────
  const s6 = `
    <h4>核心目标</h4>
    <p>部署完成 ≠ 发布成功。上线后 5-10 分钟是事故高发期，必须有自动化验证：
    健康检查 + 冒烟 E2E + 错误率监控，一旦异常自动告警 / 自动回滚。</p>
    <h4>落地切入点</h4>
    <ol>
      <li><strong>健康检查</strong>：
          <ul>
            <li>部署后立即 curl 关键页面，验证 HTTP 200 + 关键 DOM 节点存在</li>
            <li>失败直接判定部署失败，触发回滚</li>
          </ul>
      </li>
      <li><strong>冒烟 E2E</strong>：
          <ul>
            <li>在 staging 跑核心业务流程（登录 → 下单 → 支付）</li>
            <li>用 Playwright，5 分钟内出结果</li>
            <li>不要全覆盖，只覆盖 P0 流程（性价比最高）</li>
          </ul>
      </li>
      <li><strong>错误率监控</strong>：
          <ul>
            <li>新版本上线后 10 分钟内错误率 > 阈值 → 自动告警</li>
            <li>对比新旧版本错误率，新版本显著劣化 → 触发回滚</li>
            <li>Sentry / 自建监控平台</li>
          </ul>
      </li>
      <li><strong>性能回归检测</strong>：
          <ul>
            <li>对比新旧版本 LCP / INP / 包体积</li>
            <li>新版本性能劣化超 30% → 告警</li>
          </ul>
      </li>
      <li><strong>通知机制</strong>：发布成功 / 失败都推送钉钉 / 飞书 / Slack，
          附版本号、构建链接、监控面板链接</li>
    </ol>`;

  const s6Code = `# ── .github/workflows/post-deploy.yml：发布后验证 ────────────────────────────────
name: Post-Deploy Verification

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Released version'
        required: true
      environment:
        description: 'Target environment'
        required: true
        type: choice
        options: [staging, production]

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4

      # ── 1. 健康检查：立即执行 ─────────────────────────────────────────────────
      - name: Health check
        id: health
        run: |
          BASE_URL=\${{ env.STAGING_URL }}
          [ "\${{ inputs.environment }}" = "production" ] && BASE_URL=\${{ env.PROD_URL }}

          # 验证首页返回 200 且关键 DOM 节点存在
          STATUS=\$(curl -s -o /tmp/index.html -w "%{http_code}" \$BASE_URL)
          [ \$STATUS = "200" ] || { echo "Health check failed: HTTP \$STATUS"; exit 1; }
          grep -q '<div id="app"' /tmp/index.html || { echo "Missing root element"; exit 1; }
          # 验证 JS 产物可访问
          JS_PATH=\$(grep -oP 'src="\\K/assets/[^"]+' /tmp/index.html | head -1)
          curl -sI "\$BASE_URL\$JS_PATH" | grep -q "200 OK" || { echo "JS asset not accessible"; exit 1; }
          echo "✅ Health check passed"

      # ── 2. 冒烟 E2E：核心业务流程 ───────────────────────────────────────────────
      - name: Smoke E2E tests
        working-directory: e2e
        run: |
          pnpm install --frozen-lockfile
          BASE_URL=\${{ steps.health.outputs.url }} pnpm exec playwright test --grep="@smoke"

      # ── 3. 错误率监控（部署后等待 10 分钟再采集）────────────────────────────────
      - name: Wait for error rate sampling
        run: sleep 600

      - name: Check error rate
        id: error_rate
        run: |
          # 调用 Sentry API 拉取新版本错误率
          ERROR_RATE=\$(curl -s "https://sentry.io/api/0/projects/org/frontend/stats/" \\
            -H "Authorization: Bearer \${{ secrets.SENTRY_TOKEN }}" \\
            | jq '.[] | select(.version=="\${{ inputs.version }}") | .error_rate')
          echo "Error rate: \$ERROR_RATE"
          # 错误率 > 1% 判定异常
          awk "BEGIN { exit !(\$ERROR_RATE > 0.01) }" && {
            echo "::error::Error rate \$ERROR_RATE exceeds threshold"
            exit 1
          } || echo "✅ Error rate within threshold"

      # ── 4. 自动回滚（前面任一步失败）──────────────────────────────────────────
      - name: Rollback on failure
        if: failure()
        run: |
          # 调用回滚 API：把灰度比例调回 0 + 切到上一版本产物
          curl -X POST https://api.deploy.example.com/rollback \\
            -H "Authorization: Bearer \${{ secrets.DEPLOY_TOKEN }}" \\
            -d '{"environment": "\${{ inputs.environment }}", "reason": "post-deploy verify failed"}'

      # ── 5. 通知 ────────────────────────────────────────────────────────────────
      - name: Notify release result
        if: always()
        uses: slackapi/slack-github-action@v1
        with:
          webhook-type: incoming-webhook
          payload: |
            {
              "text": "\${{ job.status == 'success' && '✅' || '❌' }} Release \${{ inputs.version }} to \${{ inputs.environment }}",
              "blocks": [{
                "type": "section",
                "text": { "type": "mrkdwn", "text": "*版本*: \${{ inputs.version }}\\n*环境*: \${{ inputs.environment }}\\n*结果*: \${{ job.status }}\\n*构建*: <\${{ github.server_url }}/\${{ github.repository }}/actions/runs/\${{ github.run_id }}|查看>" }
              }]
            }`;

  // ─── 特殊场景 ─────────────────────────────────────────────────────────────────
  const s7 = `
    <h4>核心目标</h4>
    <p>两个高价值场景：<strong>Monorepo 多包发布</strong>与<strong>微前端子应用独立发布</strong>，
    这两者是大型项目 CI/CD 的难点，配置不当会成为发布瓶颈。</p>
    <h4>落地切入点</h4>
    <ol>
      <li><strong>Monorepo + Changesets 自动发版</strong>：
          <ul>
            <li>开发者在 PR 中执行 <code>pnpm changeset</code> 记录变更（patch/minor/major）</li>
            <li>合并到 main 后，CI 自动生成 changeset PR，汇总版本号与 changelog</li>
            <li>合并 changeset PR 触发自动发布到 npm + GitHub Release</li>
            <li>只发布有变更的包，依赖该包的其他包同步升版本</li>
          </ul>
      </li>
      <li><strong>微前端子应用独立发布</strong>：
          <ul>
            <li>每个子应用独立 CI/CD，不互相阻塞</li>
            <li>基座 + 子应用版本契约：基座 externals 共享依赖，子应用声明 peerDeps</li>
            <li>子应用发布前先在基座的"子应用版本表"注册新版本</li>
            <li>灰度先灰子应用，再灰基座（子应用挂载到基座上）</li>
            <li>回滚子应用只改基座版本表，不需要重新部署基座</li>
          </ul>
      </li>
    </ol>`;

  const s7Code = `# ── Monorepo：Changesets 自动发版 ──────────────────────────────────────────────
# .github/workflows/release-packages.yml
name: Release Packages

on:
  push:
    branches: [main]

# Changesets 会创建 PR，避免与发布循环触发
concurrency:
  group: release
  cancel-in-progress: false

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          registry-url: 'https://npm.pkg.github.com'   # 发布到 GitHub Packages，或换私有源

      - run: pnpm install --frozen-lockfile

      - name: Create or update changeset PR
        uses: changesets/action@v1
        with:
          publish: pnpm changeset publish
          version: pnpm changeset version
          title: 'chore: bump versions'
          commit: 'chore: bump versions'
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          NODE_AUTH_TOKEN: \${{ secrets.GITHUB_TOKEN }}

# ── 开发者 PR 中记录变更 ────────────────────────────────────────────────────────
# 在 feature 分支执行
pnpm changeset
# 交互式选择：
#   - 哪些包受影响？
#   - 版本变化类型？（patch / minor / major）
#   - 写一句变更说明
# 生成 .changeset/<random>.md 文件，提交到 PR

# 合并到 main 后：
# 1. Changesets Action 检测到 .changeset/，自动汇总生成 "Version Packages" PR
# 2. 该 PR 包含：所有受影响包的 package.json 版本号升级、CHANGELOG.md 更新
# 3. 合并 Version Packages PR → 自动执行 changeset publish → 发布到 npm

# ── 微前端：子应用独立 CI ───────────────────────────────────────────────────────
# packages/order-app/.github/workflows/deploy.yml（子应用仓库）
name: Deploy Sub-App

on:
  push:
    branches: [main]
    paths:
      - 'apps/order-app/**'      # 只在子应用代码变化时触发

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter order-app build

      - name: Upload to CDN with version path
        run: |
          VERSION=\$(pnpm --filter order-app exec node -p "require('./package.json').version")
          # 子应用产物按版本路径部署：cdn/order-app/v1.2.3/
          ossutil cp -r apps/order-app/dist/ oss://cdn-bucket/order-app/\$VERSION/

      - name: Register version to base app
        run: |
          # 在基座的子应用版本注册表中新增版本（可灰度）
          curl -X POST https://api.config.example.com/sub-apps/order-app/versions \\
            -H "Authorization: Bearer \${{ secrets.CONFIG_TOKEN }}" \\
            -d "{ \\"version\\": \\"\$VERSION\\", \\"grayScale\\": 0 }"
          # 基座运行时拉取版本注册表，按灰度比例加载对应版本的子应用`;

  // ─── 常见陷阱 ─────────────────────────────────────────────────────────────────
  const notes = [
    ruleBox('warning', `<strong>缓存失效是 CI 慢的元凶：</strong>很多人配了 <code>cache: pnpm</code> 但缓存命中率低。
      原因通常是 <code>pnpm-lock.yaml</code> 频繁变化导致缓存 key 不命中。正确做法是缓存 key 用 <code>pnpm-lock.yaml</code> 的 hash，
      但 <strong>缓存的是 pnpm store（<code>~/.local/share/pnpm/store</code>）而不是 node_modules</strong>，
      store 不变就能秒级 install。同时开启 <code>Vite cache</code> 和 <code>Turborepo remote cache</code>，
      Monorepo 大型项目构建能从 8 分钟降到 1 分钟。`),
    ruleBox('info', `<strong>Sourcemap 不能上 CDN 但必须留：</strong>常见错误是图省事生产构建直接不生成 sourcemap，
      结果线上错误栈只能看到压缩后的行列号，根本无法排查。正确做法：构建时生成 sourcemap → 上传到 Sentry 或内部 OSS →
      从 CDN 产物中删除 <code>*.map</code> 文件 → 错误监控后端用 sourcemap 反查真实位置。
      Sentry 的 <code>sentry-cli sourcemaps upload --release=VERSION</code> 一行命令搞定。`),
    ruleBox('success', `<strong>回滚不重新构建：</strong>每次构建产物归档到 OSS（保留最近 20 个版本），
      回滚时直接下载旧产物部署，不重新跑 build。原因：重新构建可能因为依赖升级、Git 历史变化而产出不一致的产物，
      而且 build 本身就要几分钟。回滚必须是"秒级切到历史版本"，不能是"再走一遍发布流程"。
      关键设计：把"构建"和"部署"做成两个独立 Job，部署 Job 接收版本号作为参数，从归档拉对应产物。`),
    ruleBox('danger', `<strong>CI 红线一旦失效就是破窗：</strong>项目初期大家重视 CI，过段时间为了赶进度开始 <code>--no-verify</code>
      跳过钩子、合并红 PR、注释掉失败的测试。一旦破窗就再难挽回。三条硬约束：
      ① main 分支保护开启后任何人不能 push，必须走 PR；
      ② CI 红的 PR 禁止 merge（GitHub 设置 "Require status checks to pass"）；
      ③ 跳过钩子 <code>--no-verify</code> 要在团队规范里明确"仅限紧急 hotfix"，并在 PR 模板里要求说明。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('流水线全景（六阶段）', overview)}
    ${section('① 提交前钩子（husky / lint-staged / commitlint）', s1 + codeBlock('husky + lint-staged + commitlint 配置', 'dot-blue', 'bash', s1Code))}
    ${section('② PR 检查（lint / typecheck / test / build / bundle 预算）', s2 + codeBlock('GitHub Actions PR 流水线 + 分支保护', 'dot-green', 'yaml', s2Code))}
    ${section('③ 预览部署（PR 临时环境）', s3 + codeBlock('PR 自动部署到 OSS 子目录 + 评论链接', 'dot-blue', 'yaml', s3Code))}
    ${section('④ 生产构建（多环境 / sourcemap / 产物归档）', s4 + codeBlock('构建 + 签名 + 归档 + Sentry 上传', 'dot-green', 'yaml', s4Code))}
    ${section('⑤ 灰度发布（按比例 / 用户分桶）', s5 + codeBlock('远程配置 + 用户分桶 + Nginx 灰度', 'dot-blue', 'yaml', s5Code))}
    ${section('⑥ 发布后验证（健康检查 / 冒烟 E2E / 错误率 / 自动回滚）', s6 + codeBlock('Post-deploy 验证 + 自动回滚 + 通知', 'dot-green', 'yaml', s6Code))}
    ${section('特殊场景（Monorepo Changesets / 微前端子应用）', s7 + codeBlock('Changesets 自动发版 + 子应用独立 CI', 'dot-blue', 'yaml', s7Code))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
