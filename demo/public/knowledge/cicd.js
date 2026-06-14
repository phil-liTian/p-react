function renderCicd(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>CI/CD 流水线将代码从提交到上线的全流程自动化：
    <strong>CI（持续集成）</strong>在每次 PR 时自动运行 lint/test/build，确保代码质量；
    <strong>CD（持续部署）</strong>在合并主干后自动部署到预发/生产环境。
    <strong>GitHub Actions</strong> 是目前前端项目最主流的 CI/CD 工具，
    配置即代码，与 GitHub 深度集成。`);

  const principle = `
    <p><strong>流水线核心阶段：</strong></p>
    <ol style="padding-left:20px; line-height:2.2;">
      <li><strong>触发（Trigger）</strong>：push、pull_request、schedule、workflow_dispatch 等事件触发</li>
      <li><strong>安装依赖</strong>：配合缓存（node_modules 或 pnpm store）避免每次重新下载</li>
      <li><strong>代码质量检查</strong>：ESLint、TypeScript 类型检查、格式化检查（Prettier）</li>
      <li><strong>测试</strong>：单元测试（Vitest）、集成测试、E2E 测试（Playwright）</li>
      <li><strong>构建</strong>：生产构建，验证无编译错误，输出产物</li>
      <li><strong>部署</strong>：将构建产物推送到目标环境（Vercel、AWS S3、Docker Registry 等）</li>
    </ol>
    <p><strong>GitHub Actions 核心概念：</strong></p>
    <ul>
      <li><strong>Workflow</strong>：<code>.github/workflows/*.yml</code> 文件，一个工作流</li>
      <li><strong>Job</strong>：运行在独立 Runner 上的一组 Step，默认并行执行，可用 <code>needs</code> 声明依赖顺序</li>
      <li><strong>Step</strong>：Job 中的单个操作，可以是 shell 命令或 <code>uses</code> 调用现成 Action</li>
      <li><strong>Runner</strong>：执行 Job 的虚拟机，<code>ubuntu-latest</code> 是最常用的选择</li>
      <li><strong>Secret</strong>：加密存储的敏感变量（Token、密钥），在 <code>env</code> 中通过 <code>$secrets.NAME</code> 引用</li>
    </ul>`;

  const ciCode = `# ── .github/workflows/ci.yml（PR 检查流水线）────────────────────────────────
name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

# 同一 PR 的新 push 自动取消旧的运行，节省 CI 资源
concurrency:
  group: ci-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  # ── Job 1: 代码质量检查（并行）──────────────────────────────────────────────
  quality:
    name: 'Lint & Type Check'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with: { version: 9 }

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm          # 缓存 pnpm store，加速依赖安装

      - name: Install dependencies
        run: pnpm install --frozen-lockfile   # CI 中必须用 frozen，保证锁文件一致性

      - name: TypeScript type check
        run: pnpm tsc --noEmit

      - name: ESLint
        run: pnpm lint

  # ── Job 2: 测试（并行）──────────────────────────────────────────────────────
  test:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - name: Run tests with coverage
        run: pnpm test --coverage
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          token: \${{ secrets.CODECOV_TOKEN }}

  # ── Job 3: 构建（依赖 quality + test 通过）────────────────────────────────
  build:
    name: Build
    needs: [quality, test]          # 等前两个 Job 成功后才运行
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - name: Build
        run: pnpm build
      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
          retention-days: 1         # 构建产物保留 1 天`;

  const cdCode = `# ── .github/workflows/deploy.yml（合并主干后自动部署）──────────────────────
name: Deploy

on:
  push:
    branches: [main]              # 仅主干触发部署

jobs:
  deploy-preview:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.myapp.com
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
        env:
          VITE_API_URL: \${{ vars.STAGING_API_URL }}

      # 部署到 Vercel（示例）
      - name: Deploy to Vercel
        run: npx vercel --prod --token \${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: \${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: \${{ secrets.VERCEL_PROJECT_ID }}

  deploy-production:
    name: Deploy to Production
    needs: deploy-preview
    runs-on: ubuntu-latest
    environment:
      name: production              # 需要 Reviewer 手动审批才继续
      url: https://myapp.com
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
        env:
          VITE_API_URL: \${{ vars.PROD_API_URL }}

      # 部署到 AWS S3 + CloudFront（示例）
      - name: Deploy to S3
        run: aws s3 sync dist/ s3://\${{ vars.S3_BUCKET }} --delete
        env:
          AWS_ACCESS_KEY_ID: \${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: \${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: us-east-1

      - name: Invalidate CloudFront cache
        run: |
          aws cloudfront create-invalidation \\
            --distribution-id \${{ vars.CF_DISTRIBUTION_ID }} \\
            --paths "/*"

      # 通知 Sentry 新版本发布（关联 sourcemap）
      - name: Notify Sentry release
        run: |
          npx @sentry/cli releases new \${{ github.sha }}
          npx @sentry/cli releases set-commits --auto \${{ github.sha }}
          npx @sentry/cli releases finalize \${{ github.sha }}
        env:
          SENTRY_AUTH_TOKEN: \${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: my-org
          SENTRY_PROJECT: my-frontend`;

  const notes = [
    ruleBox('warning', `<strong>依赖缓存策略：</strong>GitHub Actions 对 pnpm 推荐使用 <code>actions/setup-node</code> 的 <code>cache: 'pnpm'</code>（缓存 pnpm store 全局目录）而非缓存 <code>node_modules</code>（各项目的 node_modules 由 pnpm 通过硬链接从 store 重建，速度极快）。缓存 key 包含 <code>pnpm-lock.yaml</code> 哈希，锁文件变化时自动失效。`),
    ruleBox('info', `<strong>Environment Protection Rules：</strong>生产环境部署应在 GitHub → Settings → Environments 中设置 "Required reviewers"（需要指定人审批才能继续）和 "Wait timer"（部署前强制等待 N 分钟）。这两个保护规则可有效防止意外推送直接上线生产，是标准的 GitOps 实践。`),
    ruleBox('success', `<strong>常用 Actions 速查：</strong><code>actions/checkout@v4</code>（拉代码）、<code>actions/cache@v4</code>（自定义缓存）、<code>actions/upload-artifact</code>/<code>download-artifact</code>（Job 间传递产物）、<code>github/codeql-action</code>（代码安全扫描）、<code>changesets/action</code>（自动版本发布）、<code>peter-evans/create-pull-request</code>（自动创建 PR）。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle)}
    ${section('代码示例', codeBlock('.github/workflows/ci.yml（PR 质量门禁）', 'dot-blue', 'yaml', ciCode) + codeBlock('.github/workflows/deploy.yml（自动部署流水线）', 'dot-green', 'yaml', cdCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
