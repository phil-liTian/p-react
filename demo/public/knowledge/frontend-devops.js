function renderFrontendDevops(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>DevOps 不是"运维 + 开发"的简单叠加，而是一套<strong>让代码从提交到上线再到运行全程自动化、可观测、可回退</strong>的工程文化与方法论。
    前端工程师之所以要懂 DevOps，是因为<strong>现代前端早已不是"打包扔 FTP"的形态</strong>——
    CDN 边缘计算、SSR/SSG、Service Worker、微前端、Edge Functions 让前端架构越来越像后端，
    不懂 DevOps 就只能等运维配环境、出故障干瞪眼。本文从前端视角拆解 DevOps 的五大支柱、工具链与落地路径。`);

  const overview = `
    <p><strong>DevOps 的本质：缩短"代码写完"到"用户用上"的距离，并让这段距离上的每一步都可重复、可观测、可回滚。</strong></p>
    <p><strong>CALMS 框架（DevOps 五要素）：</strong></p>
    <table class="metrics-table">
      <thead><tr><th>字母</th><th>含义</th><th>在前端的具体体现</th></tr></thead>
      <tbody>
        <tr><td><strong>C</strong>ulture</td><td>文化：开发与运维共同对交付质量负责</td><td>前端不能"扔包给运维"，要对线上负责</td></tr>
        <tr><td><strong>A</strong>utomation</td><td>自动化：构建/测试/部署/回滚全自动化</td><td>CI/CD 流水线、灰度发布、自动回滚</td></tr>
        <tr><td><strong>L</strong>ean</td><td>精益：消除浪费，小批量快速反馈</td><td>小 PR、特性开关、Trunk Based 开发</td></tr>
        <tr><td><strong>M</strong>easurement</td><td>度量：用数据驱动决策</td><td>Web Vitals、错误率、构建时长、部署频率</td></tr>
        <tr><td><strong>S</strong>haring</td><td>共享：知识、工具、责任跨角色共享</td><td>流水线即代码、监控面板共享、On-call 轮值</td></tr>
      </tbody>
    </table>
    <p><strong>关键认知：</strong>DevOps 不是"装一套工具链"，工具只是文化的载体。
    如果团队里前端写完代码就下班、出事故全靠运维排查——那再先进的 CI/CD 也只是装饰。
    真正的 DevOps 转变是<strong>前端工程师对"代码上线后的运行状态"也负责</strong>。</p>`;

  // ─── 前端 vs 后端 DevOps 差异 ──────────────────────────────────────────────
  const diff = `
    <h4>核心认知</h4>
    <p>很多人觉得"DevOps 是后端的事"，因为后端要管服务器、数据库、容器。
    但前端项目有自己的运维对象——<strong>静态资源、CDN、Service Worker、用户浏览器</strong>——
    与后端 DevOps 形态完全不同，不能用后端那套思路直接套用。</p>
    <h4>差异对比</h4>
    <table class="metrics-table">
      <thead><tr><th>维度</th><th>后端 DevOps</th><th>前端 DevOps</th></tr></thead>
      <tbody>
        <tr><td>部署对象</td><td>服务进程（Docker / K8s Pod）</td><td>静态文件（JS/CSS/HTML）</td></tr>
        <tr><td>部署方式</td><td>滚动更新 / 蓝绿部署</td><td>CDN 推送 + 长缓存 + 灰度比例</td></tr>
        <tr><td>扩缩容</td><td>Pod 副本数自动伸缩</td><td>CDN 天然分布式，无扩容问题（除非 SSR）</td></tr>
        <tr><td>运行环境</td><td>可控的服务器机房</td><td>用户浏览器，不可控</td></tr>
        <tr><td>监控采集</td><td>服务器 metrics（CPU/内存/QPS）</td><td>RUM（真实用户监控，浏览器上报）</td></tr>
        <tr><td>故障表现</td><td>5xx、超时、服务不可用</td><td>白屏、JS 报错、资源 404、加载慢</td></tr>
        <tr><td>回滚方式</td><td>切镜像 / 切 Pod 版本</td><td>切 CDN 路径 / 改灰度比例</td></tr>
        <tr><td>基础设施</td><td>Terraform 管 K8s / RDS / VPC</td><td>Terraform 管 CDN / OSS / 域名 / 证书</td></tr>
        <tr><td>安全边界</td><td>网络层（VPC、安全组）</td><td>浏览器层（CSP、CORS、X-Frame-Options）</td></tr>
        <tr><td>无服务化</td><td>Lambda / FaaS</td><td>Edge Functions / Cloudflare Workers</td></tr>
      </tbody>
    </table>
    <p><strong>核心差异：前端 DevOps 的"运维对象"在用户浏览器里，不在你机房里。</strong>
    这决定了前端必须用 <strong>RUM（真实用户监控）</strong>而不是服务器监控，
    必须用 <strong>CDN 灰度</strong>而不是 Pod 滚动，
    必须考虑 <strong>客户端缓存（Service Worker / HTTP 缓存）</strong>而不是只关心服务端缓存。</p>`;

  // ─── 五大支柱 ────────────────────────────────────────────────────────────────
  const pillars = `
    <h4>核心目标</h4>
    <p>DevOps 在前端落地的五大支柱：<strong>持续集成（CI）、持续交付（CD）、基础设施即代码（IaC）、可观测性（Observability）、自动恢复（Auto-remediation）</strong>。
    每个支柱都对应前端工程师的具体能力。</p>
    <h4>落地切入点</h4>
    <table class="metrics-table">
      <thead><tr><th>支柱</th><th>前端工程师要做什么</th><th>关键工具</th></tr></thead>
      <tbody>
        <tr><td>① 持续集成</td><td>PR 自动跑 lint/typecheck/test/build，红线阻断合并</td><td>GitHub Actions / husky / Vitest</td></tr>
        <tr><td>② 持续交付</td><td>合并主干自动构建产物 + 推 CDN + 灰度发布 + 一键回滚</td><td>Actions / Argo CD / OSS / CDN</td></tr>
        <tr><td>③ 基础设施即代码</td><td>CDN 配置、域名、证书、OSS Bucket 用代码声明，不手动点平台 UI</td><td>Terraform / Pulumi</td></tr>
        <tr><td>④ 可观测性</td><td>错误监控、性能埋点、用户行为、日志聚合四件套</td><td>Sentry / RUM / Grafana / ELK</td></tr>
        <tr><td>⑤ 自动恢复</td><td>错误率超阈值自动回滚 + CDN 降级 + 白屏自动刷新</td><td>Actions / 配置中心 / Service Worker</td></tr>
      </tbody>
    </table>`;

  // ─── ① 持续集成 ──────────────────────────────────────────────────────────────
  const s1 = `
    <h4>核心目标</h4>
    <p>持续集成的核心是<strong>每次提交都跑完整验证</strong>，让"我的电脑能跑"永远不再成为问题。
    前端 CI 的检查项与后端不同，要覆盖<strong>类型、规范、测试、构建、体积</strong>五个维度。</p>
    <h4>前端特化的检查项</h4>
    <ol>
      <li><strong>类型检查</strong>：<code>tsc --noEmit</code> 独立于 build，CI 必跑</li>
      <li><strong>代码规范</strong>：ESLint + Stylelint，规则统一封装成包</li>
      <li><strong>单元测试</strong>：Vitest / Jest，覆盖率门槛（核心模块 ≥ 80%）</li>
      <li><strong>构建验证</strong>：<code>pnpm build</code> 必须成功，验证生产构建无错</li>
      <li><strong>体积预算</strong>：首屏 JS gzip ≤ 200KB，超预算 fail（前端独有）</li>
      <li><strong>视觉回归</strong>（可选）：Storybook + Chromatic，截图对比 UI 变化</li>
      <li><strong>可访问性</strong>（可选）：axe-core 检测 a11y 问题</li>
      <li><strong>循环依赖检测</strong>：<code>madge --circular</code>，防止架构腐化</li>
    </ol>
    <p><strong>关键认知：</strong>CI 不是"跑一遍 build 就行"，而是<strong>把所有"上线后才知道的问题"提前到 PR 阶段</strong>。
    体积超预算、循环依赖、a11y 缺陷——这些都是上线后用户感知到的，CI 必须提前拦住。</p>`;

  const s1Code = `# ── .github/workflows/ci.yml：前端 CI 流水线 ──────────────────────────────────────
name: CI
on: [pull_request]

concurrency:
  group: ci-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  # ── Job 1: lint + typecheck + 循环依赖 ──────────────────────────────────────
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm exec madge --circular src/   # 循环依赖检测

  # ── Job 2: 单测 + 覆盖率门槛 ─────────────────────────────────────────────────
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
        run: pnpm exec vitest run --coverage --coverage.thresholds.lines=80

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
      - name: Bundle budget (gzip ≤ 200KB)
        run: |
          SIZE=\$(gzip -c dist/assets/vendor-*.js dist/assets/index-*.js | wc -c)
          echo "First-screen bundle: \$SIZE bytes (gzip)"
          [ \$SIZE -le 204800 ] || { echo "Over budget"; exit 1; }
      - uses: preactjs/compressed-size-action@v2   # PR 评论显示体积变化
        with: { repo-token: \${{ secrets.GITHUB_TOKEN }} }

  # ── Job 4: 视觉回归（可选，Storybook 项目）────────────────────────────────────
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec chromatic --project-token=\${{ secrets.CHROMATIC_TOKEN }} --exit-once-uploaded`;

  // ─── ② 持续交付 ──────────────────────────────────────────────────────────────
  const s2 = `
    <h4>核心目标</h4>
    <p>持续交付 = 合并主干后<strong>自动构建产物 + 推 CDN + 灰度发布 + 可一键回滚</strong>。
    前端 CD 的难点不是"发布"，而是<strong>"如何安全地发布"——灰度、回滚、缓存策略</strong>。</p>
    <h4>落地切入点</h4>
    <ol>
      <li><strong>构建产物归档</strong>：每次构建产物 tar.gz 上传 OSS，保留 20 个版本，回滚不重新构建</li>
      <li><strong>CDN 推送策略</strong>：
          <ul>
            <li>静态资源（JS/CSS/字体）走内容 hash 文件名 + 长缓存（<code>Cache-Control: max-age=31536000, immutable</code>）</li>
            <li>HTML 走短缓存或 no-cache（保证用户拿到最新入口）</li>
            <li>独立 CDN 域名（避开主站 cookie）</li>
          </ul>
      </li>
      <li><strong>灰度发布</strong>：1% → 5% → 25% → 100%，每档观察 30 分钟（详见 frontend-cicd 主题）</li>
      <li><strong>一键回滚</strong>：把灰度比例调回 0% 或切到旧版本 CDN 路径，秒级生效</li>
      <li><strong>蓝绿部署</strong>（前端版本）：新旧版本同时部署在 CDN 不同路径，按比例切流量</li>
      <li><strong>特性开关</strong>：新功能代码已上线，但用远程 flag 控制，无需发版即可关闭</li>
    </ol>
    <p><strong>关键认知：</strong>前端 CD 的核心是<strong>"发布与回滚都是分钟级，不需要重新构建"</strong>。
    这要求把"构建产物"与"部署动作"解耦：产物一次构建多次部署，部署动作只是改 CDN 路径或灰度比例。</p>`;

  const s2Code = `# ── .github/workflows/deploy.yml：CD 流水线 ──────────────────────────────────────
name: Deploy
on:
  push:
    branches: [main]

jobs:
  build-and-archive:
    runs-on: ubuntu-latest
    outputs:
      version: \${{ steps.meta.outputs.version }}
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - run: pnpm install --frozen-lockfile

      - name: Generate version
        id: meta
        run: |
          VERSION=\$(git describe --tags --always --dirty)
          echo "version=\$VERSION" >> \$GITHUB_OUTPUT

      - run: pnpm build

      - name: Archive and upload to OSS (回滚用)
        run: |
          tar -czf artifact-\${{ steps.meta.outputs.version }}.tar.gz dist/
          ossutil cp artifact-\${{ steps.meta.outputs.version }}.tar.gz \\
            oss://release-archive/releases/\${{ steps.meta.outputs.version }}/

      - name: Deploy to CDN (灰度路径，初始 0%)
        run: |
          # 新版本独立路径部署：cdn/app/v2.3.0/
          ossutil cp -r dist/ oss://cdn-bucket/app/\${{ steps.meta.outputs.version }}/
          # 在配置中心注册新版本，灰度比例 0%（手动或自动提升）
          curl -X POST https://api.config.example.com/versions \\
            -d "{ \\"version\\": \\"\${{ steps.meta.outputs.version }}\\", \\"grayScale\\": 0 }"

  # ── 一键回滚：手动触发，秒级生效 ──────────────────────────────────────────────
  rollback:
    if: github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    steps:
      - name: Rollback to previous version
        run: |
          # 把灰度比例调回 0%，并把默认版本切到上一版本
          curl -X POST https://api.config.example.com/rollback \\
            -d '{ "targetVersion": "\${{ inputs.target_version }}" }'

# ── CDN 缓存策略（Nginx / OSS 配置）────────────────────────────────────────────
# 静态资源：长缓存 + immutable
location ~* \\.(js|css|woff2|png|jpg)$ {
  add_header Cache-Control "public, max-age=31536000, immutable";
  # 文件名带 hash，内容变了 hash 就变，自动失效
}

# HTML 入口：短缓存，保证拿最新版本
location / {
  add_header Cache-Control "no-cache, must-revalidate";
  # 或：max-age=60，1 分钟内允许少量过期
}

# ── 特性开关：远程配置控制功能启停 ───────────────────────────────────────────────
# runtime-config.json（部署在 CDN，无需重新发版即可修改）
{
  "featureFlags": {
    "newOrderFlow": false,    # 出问题立刻关闭，无需回滚代码
    "newPayment": true
  }
}`;

  // ─── ③ 基础设施即代码 ────────────────────────────────────────────────────────
  const s3 = `
    <h4>核心目标</h4>
    <p>基础设施即代码（IaC）= <strong>CDN、OSS、域名、证书、DNS 这些资源用代码声明，而不是手动在云平台 UI 上点</strong>。
    前端工程师通常以为 IaC 是运维的事，但<strong>前端项目用的资源（CDN/OSS/域名）最适合 IaC 管理</strong>，
    因为它们变更频率低、可版本化、可回滚。</p>
    <h4>落地切入点</h4>
    <ol>
      <li><strong>工具选型</strong>：
          <ul>
            <li><strong>Terraform</strong>：行业标杆，声明式，支持所有主流云厂商</li>
            <li><strong>Pulumi</strong>：用 TypeScript/Python 写基础设施，对前端更友好</li>
            <li><strong>AWS CDK</strong>：AWS 专属，但用 TS 写</li>
          </ul>
      </li>
      <li><strong>前端要管理的基础设施</strong>：
          <ul>
            <li>CDN（CloudFront / 阿里云 CDN）：域名、回源、缓存规则、证书</li>
            <li>对象存储（S3 / OSS）：Bucket 创建、权限、生命周期规则</li>
            <li>DNS 记录：A / CNAME / TXT</li>
            <li>SSL 证书：自动续期</li>
            <li>WAF 规则：基础防护</li>
            <li>云函数 / Edge Functions：SSR、A/B 测试、重定向</li>
          </ul>
      </li>
      <li><strong>state 管理</strong>：state 文件存远程（OSS / S3 + DynamoDB 锁），
          团队多人协作不会冲突</li>
      <li><strong>变更评审</strong>：<code>terraform plan</code> 输出变更预览，PR review 看 plan，
          <code>terraform apply</code> 在 CI 中执行，避免本地误操作</li>
      <li><strong>环境隔离</strong>：dev / staging / prod 三套 state，配置文件分目录</li>
    </ol>
    <p><strong>关键认知：</strong>IaC 不是"为了高大上"，而是<strong>让基础设施变更可审查、可回滚、可复现</strong>。
    手动在 UI 上点出来的资源，三个月后没人记得点过什么，事故排查无据可查。</p>`;

  const s3Code = `# ── main.tf：前端项目基础设施声明（Terraform）────────────────────────────────────
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
  backend "s3" {                          # state 存远程，团队协作
    bucket = "my-terraform-state"
    key    = "frontend/prod/terraform.tfstate"
    region = "us-east-1"
    dynamodb_table = "terraform-locks"    # 并发锁
  }
}

provider "aws" {
  region = var.aws_region
}

# ── 1. S3 Bucket：存放构建产物 ─────────────────────────────────────────────────
resource "aws_s3_bucket" "frontend_assets" {
  bucket = "my-frontend-assets-prod"
}

resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.frontend_assets.id
  versioning_configuration { status = "Enabled" }   # 版本控制，便于回滚
}

resource "aws_s3_bucket_lifecycle_configuration" "this" {
  bucket = aws_s3_bucket.frontend_assets.id
  rule {
    id     = "archive-old-releases"
    status = "Enabled"
    filter { prefix = "releases/" }
    noncurrent_version_expiration { noncurrent_days = 90 }   # 旧版本保留 90 天
  }
}

# ── 2. CloudFront CDN 分发 ─────────────────────────────────────────────────────
resource "aws_cloudfront_distribution" "frontend_cdn" {
  enabled             = true
  default_root_object = "index.html"

  origin {
    domain_name = aws_s3_bucket.frontend_assets.bucket_regional_domain_name
    origin_id   = "s3-frontend"
    s3_origin_config {}
  }

  default_cache_behavior {
    target_origin_id       = "s3-frontend"
    viewer_protocol_policy = "redirect-to-https"
    # 静态资源长缓存
    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }
    min_ttl = 0
    default_ttl = 86400
    max_ttl = 31536000   # 1 年
  }

  # HTML 入口走短缓存
  ordered_cache_behavior {
    path_pattern           = "index.html"
    target_origin_id       = "s3-frontend"
    viewer_protocol_policy = "redirect-to-https"
    min_ttl = 0
    default_ttl = 60      # 1 分钟
    max_ttl = 300
  }

  restrictions { geo_restriction { restriction_type = "none" } }
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.cert.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

# ── 3. DNS 记录 ────────────────────────────────────────────────────────────────
resource "aws_route53_record" "frontend" {
  zone_id = var.route53_zone_id
  name    = "app.example.com"
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.frontend_cdn.domain_name
    zone_id                = aws_cloudfront_distribution.frontend_cdn.hosted_zone_id
    evaluate_target_health = false
  }
}

# ── 4. SSL 证书（自动续期）──────────────────────────────────────────────────────
resource "aws_acm_certificate" "cert" {
  domain_name       = "app.example.com"
  validation_method = "DNS"
}

# ── CI 中执行：plan 在 PR 评论，apply 在合并 main 后 ───────────────────────────
# .github/workflows/terraform.yml
- name: Terraform Plan
  run: terraform plan -no-color > plan.txt
- name: Comment plan on PR
  uses: marocchino/sticky-pull-request-comment@v2
  with: { path: plan.txt }

- name: Terraform Apply
  if: github.ref == 'refs/heads/main'
  run: terraform apply -auto-approve`;

  // ─── ④ 可观测性 ──────────────────────────────────────────────────────────────
  const s4 = `
    <h4>核心目标</h4>
    <p>可观测性 = <strong>线上发生了什么、为什么发生、影响多少人</strong>，从三个角度回答：
    <strong>Metrics（指标）、Logs（日志）、Traces（链路）</strong>。
    前端可观测性的难点是用户在浏览器里，必须用 <strong>RUM（真实用户监控）</strong>采集。</p>
    <h4>前端可观测三支柱</h4>
    <table class="metrics-table">
      <thead><tr><th>支柱</th><th>采集内容</th><th>工具</th></tr></thead>
      <tbody>
        <tr><td><strong>Metrics</strong></td><td>Web Vitals（LCP/CLS/INP）、构建时长、部署频率、错误率、首屏耗时</td><td>PerformanceObserver / Web Vitals / Grafana</td></tr>
        <tr><td><strong>Logs</strong></td><td>JS 错误、Promise 异常、接口错误、资源加载失败、用户操作日志</td><td>Sentry / 自建日志聚合</td></tr>
        <tr><td><strong>Traces</strong></td><td>用户行为序列、请求链路、页面跳转路径</td><td>浏览器 performance API / 自建 trace</td></tr>
      </tbody>
    </table>
    <h4>落地切入点</h4>
    <ol>
      <li><strong>RUM 采集</strong>：
          <ul>
            <li>JS 错误：<code>window.onerror</code> + <code>unhandledrejection</code></li>
            <li>资源失败：capture 阶段的 <code>error</code> 事件</li>
            <li>性能指标：Web Vitals 库（LCP/CLS/INP/FCP/TTFB）</li>
            <li>接口耗时：axios 拦截器记录 <code>startTime</code> / <code>endTime</code></li>
            <li>用户行为：点击、路由跳转、表单提交</li>
          </ul>
      </li>
      <li><strong>错误聚合</strong>：
          <ul>
            <li>按 message + stack hash 聚合，避免一条错误刷屏</li>
            <li>带版本号，便于按版本对比错误率</li>
            <li>Sourcemap 还原真实行列号（详见 sourcemap 主题）</li>
          </ul>
      </li>
      <li><strong>告警规则</strong>：
          <ul>
            <li>错误率 5 分钟内 > 1% → 告警</li>
            <li>新版本上线 10 分钟内错误激增 → 立即告警</li>
            <li>LCP P95 持续劣化超 30% → 告警</li>
            <li>告警内容必须含：版本号、影响用户数、错误链接、最近发布</li>
          </ul>
      </li>
      <li><strong>用户行为回放</strong>：错误前 30 步行为序列，复现成本从"用户截图"降到"看日志"</li>
      <li><strong>看板共享</strong>：Grafana 看板对全员可见，不只是运维看</li>
    </ol>
    <p><strong>关键认知：</strong>可观测性不是为了"出事能查"，而是为了<strong>"出事前能预警，出事后能定位"</strong>。
    只有错误监控叫"看得见"，加上性能监控 + 行为回放 + 告警才叫"可观测"。</p>`;

  const s4Code = `// ── RUM 采集：统一上报通道 ───────────────────────────────────────────────────────
class Telemetry {
  private queue: any[] = [];

  capture(event: { type: string; [k: string]: any }) {
    this.queue.push({
      ...event,
      ts: Date.now(),
      url: location.href,
      v: __APP_VERSION__,
      uid: getUserId(),
      // 错误前 30 步行为序列，便于复现
      trail: behaviorRecorder.recent(30),
    });
    if (this.queue.length >= 10) this.flush();
  }

  private flush() {
    const batch = this.queue.splice(0);
    fetch('/api/telemetry', {
      method: 'POST',
      body: JSON.stringify(batch),
      keepalive: true,           // 页面卸载也能发出
    }).catch(() => saveToIDB('retry-queue', batch));
  }
}
export const telemetry = new Telemetry();

// ── JS 错误 + Promise 异常 + 资源失败 ──────────────────────────────────────────
window.addEventListener('error', (e) => {
  const target = e.target as HTMLElement;
  // 资源加载失败（capture 阶段才能抓）
  if (target?.tagName === 'IMG' || target?.tagName === 'SCRIPT') {
    telemetry.capture({ type: 'resource_error', src: target.src });
    return;
  }
  telemetry.capture({ type: 'js_error', msg: e.message, stack: e.error?.stack });
}, true);

window.addEventListener('unhandledrejection', (e) => {
  telemetry.capture({ type: 'promise_error', msg: String(e.reason) });
});

// ── Web Vitals 采集 ─────────────────────────────────────────────────────────────
import { onLCP, onCLS, onINP, onFCP, onTTFB } from 'web-vitals';
onLCP(m  => telemetry.capture({ type: 'vitals', metric: 'lcp',  value: m.value }));
onCLS(m  => telemetry.capture({ type: 'vitals', metric: 'cls',  value: m.value }));
onINP(m  => telemetry.capture({ type: 'vitals', metric: 'inp',  value: m.value }));
onFCP(m  => telemetry.capture({ type: 'vitals', metric: 'fcp',  value: m.value }));
onTTFB(m => telemetry.capture({ type: 'vitals', metric: 'ttfb', value: m.value }));

// ── 接口耗时：axios 拦截器 ──────────────────────────────────────────────────────
axios.interceptors.request.use(c => { c.__startTime = performance.now(); return c; });
axios.interceptors.response.use(r => {
  telemetry.capture({
    type: 'api_timing',
    url: r.config.url,
    duration: performance.now() - r.config.__startTime,
    status: r.status,
  });
  return r;
});

// ── 行为记录器：错误前 30 步回放 ─────────────────────────────────────────────────
class BehaviorRecorder {
  private trail: any[] = [];
  push(event: any) {
    this.trail.push({ ...event, ts: Date.now() });
    if (this.trail.length > 30) this.trail.shift();
  }
  recent(n: number) { return this.trail.slice(-n); }
}
export const behaviorRecorder = new BehaviorRecorder();

// 自动采集：路由跳转、点击
router.afterEach(to => behaviorRecorder.push({ type: 'navigate', to: to.path }));
document.addEventListener('click', e => {
  const target = e.target as HTMLElement;
  behaviorRecorder.push({ type: 'click', text: target.innerText?.slice(0, 50) });
}, true);

# ── 告警规则（Sentry / Grafana）──────────────────────────────────────────────────
# 触发条件：5 分钟内 error_rate > 1%
# 告警内容模板：
#   "前端告警 | 版本 {{version}} | 错误率 {{rate}}% | 影响 {{users}} 用户
#    错误链接 {{sentry_url}} | 最近发布 {{release_url}}
#    行为示例 {{top_trail}}"
# 通知渠道：钉钉 / 飞书 / Slack / PagerDuty

# ── Grafana 看板：核心指标 ───────────────────────────────────────────────────────
# Panel 1: 错误率（按版本分组折线图）
# Panel 2: LCP P75 / P95 趋势
# Panel 3: 部署频率（每周发布次数）
# Panel 4: 构建时长趋势
# Panel 5: 首屏 JS 体积变化
# Panel 6: 接口 P95 耗时（按域名分组）`;

  // ─── ⑤ 自动恢复 ──────────────────────────────────────────────────────────────
  const s5 = `
    <h4>核心目标</h4>
    <p>自动恢复 = <strong>出问题不需要人介入，系统自动回到健康状态</strong>。
    前端能做到的自动恢复比后端有限，但仍有四个层次：</p>
    <h4>四层自动恢复</h4>
    <ol>
      <li><strong>CDN 资源降级</strong>：主 CDN 挂了，<code>&lt;script onerror&gt;</code> 自动切备用 CDN</li>
      <li><strong>白屏自动刷新</strong>：检测到白屏（DOM 节点 &lt; 阈值 + 时间 &gt; 5s）自动 reload 一次</li>
      <li><strong>Service Worker 兜底</strong>：网络失败时从缓存返回兜底页面 / 旧版本</li>
      <li><strong>错误率自动回滚</strong>：监控后端检测新版本错误率超阈值，调 API 把灰度比例调回 0</li>
    </ol>
    <p><strong>关键认知：</strong>自动恢复的边界是<strong>"不要掩盖问题"</strong>——
    自动回滚后必须告警，让人事后排查；自动刷新只能刷新一次，避免死循环。
    所有自动恢复动作都要上报，否则就成了"用户被救了但团队不知道出过事"。</p>`;

  const s5Code = `// ── 1. CDN 资源降级：主 CDN 挂了切备用 ────────────────────────────────────────────
const CDN_BACKUP = {
  'https://cdn1.example.com': 'https://cdn2.example.com',
};

function loadScript(src: string) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => {
      // 主 CDN 失败，切备用
      const backup = CDN_BACKUP[new URL(src).origin];
      if (backup) {
        const s2 = document.createElement('script');
        s2.src = src.replace(new URL(src).origin, backup);
        s2.onload = resolve;
        s2.onerror = reject;
        document.head.appendChild(s2);
        telemetry.capture({ type: 'cdn_fallback', from: src, to: s2.src });
      } else {
        reject(new Error('Script load failed: ' + src));
      }
    };
    document.head.appendChild(s);
  });
}

// ── 2. 白屏自动刷新（只刷一次，避免死循环）────────────────────────────────────────
let reloaded = false;
new MutationObserver(() => {
  if (reloaded) return;
  // DOM 内容少 + 时间超过 5s → 判定白屏
  if (document.body.innerHTML.length < 100 && performance.now() > 5000) {
    reloaded = true;
    telemetry.capture({ type: 'white_screen_auto_reload' });
    sessionStorage.setItem('auto-reloaded', '1');   // 防止下次再刷
    location.reload();
  }
}).observe(document.body, { childList: true, subtree: true });

// ── 3. Service Worker 兜底：离线 + 旧版本回退 ────────────────────────────────────
// sw.ts
self.addEventListener('fetch', (event) => {
  // 优先网络，失败走缓存
  event.respondWith(
    fetch(event.request).catch(() => {
      // 接口失败：返回兜底数据
      if (event.request.url.includes('/api/')) {
        return new Response(JSON.stringify({ code: -1, message: 'offline' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      // 页面失败：返回缓存的旧 HTML
      return caches.match('/index.html');
    })
  );
});

// ── 4. 错误率自动回滚：监控后端调配置中心 API ────────────────────────────────────
# .github/workflows/auto-rollback.yml
name: Auto Rollback
on:
  schedule:
    - cron: '*/5 * * * *'   # 每 5 分钟检查一次

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - name: Check error rate and rollback if needed
        run: |
          # 拉取最近 5 分钟新版本错误率
          ERROR_RATE=$(curl -s "https://sentry.io/api/0/organizations/org/stats/" \\
            -H "Authorization: Bearer \${{ secrets.SENTRY_TOKEN }}" \\
            -G -d "field=error_rate" -d "groupby=release" \\
            | jq '.[] | select(.release=="'"$NEW_VERSION"'") | .error_rate')

          # 错误率 > 2% 自动回滚
          if (( $(echo "$ERROR_RATE > 0.02" | bc -l) )); then
            curl -X POST https://api.config.example.com/rollback \\
              -H "Authorization: Bearer \${{ secrets.CONFIG_TOKEN }}" \\
              -d '{ "reason": "auto rollback: error rate $ERROR_RATE" }'

            # 告警通知
            curl -X POST https://oapi.dingtalk.com/robot/send?access_token=xxx \\
              -H "Content-Type: application/json" \\
              -d '{"msgtype":"text","text":{"content":"🚨 自动回滚触发：错误率 '"$ERROR_RATE"'"}}'
          fi`;

  // ─── 前端 DevOps 工具链 ────────────────────────────────────────────────────────
  const toolchain = `
    <p><strong>前端 DevOps 工具链全景（按支柱分类）：</strong></p>
    <table class="metrics-table">
      <thead><tr><th>支柱</th><th>主流工具</th><th>选型建议</th></tr></thead>
      <tbody>
        <tr><td>版本控制</td><td>Git / GitHub / GitLab / Bitbucket</td><td>GitHub 配合 Actions 最顺手</td></tr>
        <tr><td>CI/CD</td><td>GitHub Actions / GitLab CI / Jenkins / CircleCI</td><td>开源项目首选 GitHub Actions</td></tr>
        <tr><td>构建</td><td>Vite / Webpack / Turbopack / esbuild</td><td>新项目 Vite，老项目 Webpack 5</td></tr>
        <tr><td>包管理</td><td>pnpm / npm / yarn</td><td>pnpm（Monorepo 尤其推荐）</td></tr>
        <tr><td>Monorepo</td><td>Turborepo / Nx / Lerna</td><td>Turborepo 上手快，Nx 功能全</td></tr>
        <tr><td>产物存储</td><td>S3 / OSS / Nexus / Artifactory</td><td>云端对象存储最简单</td></tr>
        <tr><td>CDN</td><td>CloudFront / Cloudflare / 阿里云 CDN / 腾讯云 CDN</td><td>用户分布全球用 CloudFront/CF</td></tr>
        <tr><td>IaC</td><td>Terraform / Pulumi / AWS CDK</td><td>跨云用 Terraform，全 AWS 用 CDK</td></tr>
        <tr><td>容器（SSR）</td><td>Docker / K8s / ECS</td><td>SSR 才需要，纯 SPA 不必</td></tr>
        <tr><td>错误监控</td><td>Sentry / Bugsnag / 自建</td><td>Sentry 开源版可自部署</td></tr>
        <tr><td>性能监控</td><td>Web Vitals / RUM / Lighthouse</td><td>真实用户看 RUM，实验室看 Lighthouse</td></tr>
        <tr><td>日志聚合</td><td>ELK / Loki / Grafana</td><td>Loki 比 ELK 轻量</td></tr>
        <tr><td>看板</td><td>Grafana / Kibana / DataDog</td><td>Grafana 开源免费</td></tr>
        <tr><td>告警</td><td>PagerDuty / 钉钉 / 飞书 / Slack</td><td>国内用钉钉/飞书机器人</td></tr>
        <tr><td>特性开关</td><td>LaunchDarkly / Unleash / 自建</td><td>自建简单版：runtime-config.json</td></tr>
        <tr><td>灰度发布</td><td>配置中心 + CDN / Nginx split / Service Worker</td><td>看场景选</td></tr>
        <tr><td>Edge Functions</td><td>Cloudflare Workers / Vercel Edge / Deno Deploy</td><td>按 CDN 厂商选</td></tr>
      </tbody>
    </table>`;

  // ─── 落地路径 ─────────────────────────────────────────────────────────────────
  const rollout = `
    <p><strong>从 0 到 1 落地路径（前端工程师视角）：</strong></p>
    <ol>
      <li><strong>第 1 步：把 CI 跑起来</strong>（1 天）<br>
          GitHub Actions 配 lint + typecheck + build，让 PR 不能跳过检查</li>
      <li><strong>第 2 步：把 CD 跑起来</strong>（3 天）<br>
          合并 main 自动构建 + 推 OSS + CDN 刷新，能自动发布到 staging</li>
      <li><strong>第 3 步：错误监控接入</strong>（1 天）<br>
          Sentry SDK 集成，错误能上报，能看到聚合后的错误列表</li>
      <li><strong>第 4 步：性能监控接入</strong>（2 天）<br>
          Web Vitals 采集 + 上报，Grafana 看 LCP/CLS/INP 趋势</li>
      <li><strong>第 5 步：回滚机制</strong>（3 天）<br>
          产物归档 + 一键回滚脚本，回滚分钟级生效</li>
      <li><strong>第 6 步：灰度发布</strong>（1 周）<br>
          远程配置 + 用户分桶，按比例上线</li>
      <li><strong>第 7 步：IaC 接入</strong>（1 周）<br>
          Terraform 管 CDN/OSS/域名，PR 流程化评审</li>
      <li><strong>第 8 步：自动恢复</strong>（2 周）<br>
          白屏检测 + 错误率自动回滚 + CDN 降级</li>
      <li><strong>第 9 步：On-call 文化</strong>（持续）<br>
          前端工程师参与轮值，事故复盘，把根因写进 CI 检查项</li>
    </ol>
    <p><strong>关键节奏：</strong>不要一上来就追求"全栈 DevOps"。
    先把 CI/CD + 错误监控跑起来（前 4 步，1-2 周搞定），让团队尝到"自动化"的甜头；
    再补回滚 + 灰度 + IaC（5-7 步，1 个月）；最后做自动恢复 + On-call（8-9 步，2-3 个月）。
    每一步都解决一个具体痛点，不是为了凑齐 DevOps 五件套。</p>`;

  const notes = [
    ruleBox('warning', `<strong>DevOps 不是"装工具"，是"担责任"：</strong>很多团队装了 GitHub Actions / Sentry / Grafana，
      就觉得自己"上了 DevOps"，但前端工程师依然写完代码就下班，线上事故全靠运维排查——这不叫 DevOps，叫"装了监控的瀑布流"。
      真正的转变是<strong>前端工程师对"代码上线后的运行状态"也负责</strong>：参与 On-call 轮值、写事故复盘、把根因变成 CI 检查项。
      文化不改，工具再多也只是装饰。`),
    ruleBox('info', `<strong>前端 DevOps 与后端 DevOps 的边界：</strong>前端工程师不需要懂 K8s 滚动更新、数据库主从切换、网络 VPC 配置——
      那是后端/SRE 的职责。但<strong>必须懂</strong>：CDN 缓存策略、灰度发布、Web Vitals、Sourcemap、特性开关、Service Worker 兜底。
      边界判断：这件事的"运维对象"在浏览器里 → 前端负责；在服务器机房里 → 后端负责。两者交接的地方（如 BFF、SSR）共同负责。`),
    ruleBox('success', `<strong>部署频率是 DevOps 成熟度的核心指标：</strong>DORA 指标（Deploy Frequency / Lead Time / MTTR / Change Failure Rate）
      是衡量 DevOps 成熟度的业界标准。高成熟度团队：一天多次部署、从提交到上线 &lt; 1 小时、故障平均恢复 &lt; 1 小时、变更失败率 &lt; 15%。
      前端项目最容易先突破"部署频率"——构建快、回滚秒级，应该做到一天多次部署无压力。如果团队还在"一周一次发布、发版日全员留守"，
      说明 CI/CD 还没真正跑起来。`),
    ruleBox('danger', `<strong>不要为了 DevOps 而 DevOps：</strong>常见误区是把后端那套（K8s、Service Mesh、蓝绿部署）硬套到纯 SPA 前端项目上——
      前端只是静态资源，根本不需要容器化。判断标准：<strong>用最小复杂度满足当前痛点</strong>。
      单页应用 + CDN 就够，别上 Docker；
      小团队 + GitHub Actions 就够，别上 Jenkins；
      没有多环境配置需求，别上配置中心。
      复杂度上去了但用不上，反而成为维护负担。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('CALMS 框架与 DevOps 本质', overview)}
    ${section('前端 vs 后端 DevOps 差异', diff)}
    ${section('五大支柱全景', pillars)}
    ${section('① 持续集成（CI）', s1 + codeBlock('GitHub Actions 多 Job 并行 + 体积预算', 'dot-blue', 'yaml', s1Code))}
    ${section('② 持续交付（CD）', s2 + codeBlock('产物归档 + CDN 推送 + 灰度 + 一键回滚', 'dot-green', 'yaml', s2Code))}
    ${section('③ 基础设施即代码（IaC）', s3 + codeBlock('Terraform 管 CDN/OSS/DNS/证书', 'dot-blue', 'hcl', s3Code))}
    ${section('④ 可观测性（Observability）', s4 + codeBlock('RUM 采集 + 错误聚合 + 告警 + 看板', 'dot-green', 'typescript', s4Code))}
    ${section('⑤ 自动恢复（Auto-remediation）', s5 + codeBlock('CDN 降级 + 白屏刷新 + SW 兜底 + 自动回滚', 'dot-blue', 'typescript', s5Code))}
    ${section('前端 DevOps 工具链全景', toolchain)}
    ${section('从 0 到 1 落地路径（9 步）', rollout)}
    ${section('延伸与注意事项', notes.join(''))}`);
}
