function renderMcpArchitecture(t) {

  // ── Section 1: 核心结论 ──────────────────────────────────────────────────────

  const conclusion = ruleBox('accent',
    `<strong>核心结论：跨 Agent 共享 MCP = 把工具从"Agent 私有"变成"组织资产"</strong><br><br>
    上一篇讲了 MCP 协议本身，本篇讲<strong>怎么设计架构让一个 Server 被多个 Agent 复用</strong>。<br><br>
    工程上一句话：<code>Server 独立部署（HTTP + OAuth）→ Agent 各自带 token 接入 → Server 区分调用方做权限控制</code>。<br><br>
    三个关键决策：<strong>部署模式</strong>（本地 / 远程 / 集群）、<strong>鉴权方式</strong>（OAuth 多租户）、<strong>发现机制</strong>（配置文件 / 注册中心）。<br><br>
    没有架构设计，"写一个 MCP Server 给别的 Agent 用"会退化成每个 Agent 复制一份 Server 代码，又回到 M × N 问题。`);

  // ── Section 2: 场景切入 + 四类共享需求 ──────────────────────────────────────

  const scenarioBox = ruleBox('info',
    `<strong>场景切入：一个订单 Server 给四类 Agent 用</strong><br><br>
    同一套订单能力（query_order / refund_order / get_customer_info），不同 Agent 需要不同权限：<br><br>
    ① <strong>客服 Agent</strong>：只能 query_order + get_customer_info（查订单、查客户）<br>
    ② <strong>财务 Agent</strong>：额外能 refund_order（退款）<br>
    ③ <strong>运营 Agent</strong>：能看 aggregate_stats（数据统计）但不能退款<br>
    ④ <strong>开发者的 Claude Desktop</strong>：本地调试用，全权限<br><br>
    <strong>错误做法</strong>：写 4 个 Server，每个 Agent 接一个 → 又回到 M × N<br>
    <strong>正确做法</strong>：1 个 Server + 4 个不同 token，Server 按 token 做权限隔离`);

  const scenarioWarnBox = ruleBox('warning',
    `<strong>"给别的 Agent 用"的三个隐藏问题</strong><br><br>
    ① <strong>权限差异</strong>：不同 Agent 该看到不同工具，不能简单开全权限<br>
    ② <strong>审计需求</strong>：哪个 Agent 调了 refund_order？出问题要追责<br>
    ③ <strong>稳定性要求</strong>：一个 Server 挂了影响所有 Agent，需要水平扩展<br><br>
    本质：从"单 Agent 用工具"变成"多 Agent 共享基础设施"，要考虑<strong>多租户</strong>、<strong>可观测性</strong>、<strong>高可用</strong>。`);

  // ── Section 3: 四种部署模式 ──────────────────────────────────────────────────

  const deployTable = `
    <div class="compare-card">
      <div class="compare-card-header" style="grid-template-columns: 1.2fr 1.5fr 2fr 1.5fr">
        <div class="compare-card-header-cell frontend">模式</div>
        <div class="compare-card-header-cell ai">适用规模</div>
        <div class="compare-card-header-cell desc">特点</div>
        <div class="compare-card-header-cell desc">典型场景</div>
      </div>
      ${[
        ['① 本地 stdio',          '本机单个 Host',         '零网络开销，但无法共享',                '单机开发、私密工具'],
        ['② 远程 HTTP 单实例',     '小团队多 Host',          '一次部署全团队复用，无 HA',             '内部 API、团队工具'],
        ['③ HTTP + 负载均衡',       '企业级多 Agent 并发',     '多实例水平扩展，无状态',                '多 Agent 大并发场景'],
        ['④ OAuth 网关 + 集群',     '生产级对外服务',         '多租户隔离 + 鉴权 + 审计',              '对外 SaaS、跨组织共享'],
      ].map(([m, s, f, c]) => `
      <div class="compare-card-row" style="grid-template-columns: 1.2fr 1.5fr 2fr 1.5fr">
        <div class="compare-card-cell frontend">${escHtml(m)}</div>
        <div class="compare-card-cell ai">${escHtml(s)}</div>
        <div class="compare-card-cell desc">${escHtml(f)}</div>
        <div class="compare-card-cell desc">${escHtml(c)}</div>
      </div>`).join('')}
    </div>`;

  const deployBox = ruleBox('info',
    `<strong>部署模式选型路径</strong><br><br>
    <strong>个人用</strong> → ① 本地 stdio，无网络开销，但别的 Agent 拿不到<br>
    <strong>团队用</strong> → ② 远程 HTTP 单实例，部署在内网，团队成员的 Claude Desktop / Cursor / 自研 Agent 配上 URL 即可<br>
    <strong>公司用</strong> → ③ HTTP + 负载均衡，多个 Agent 并发调用不互相影响<br>
    <strong>对外服务</strong> → ④ OAuth 网关 + 集群，如 Sentry 官方 MCP Server，任何支持 MCP 的 Host 都能接<br><br>
    <strong>核心原则</strong>：从 ① 到 ④ 是<strong>共享范围递增</strong>，复杂度也递增。不要一上来就 ④ —— 团队内部工具用 ② 足够，少维护网关。`);

  // ── Section 4: 多租户鉴权设计 ────────────────────────────────────────────────

  const authCode = `# Server 侧：基于 token 识别 Agent 身份 + 按角色暴露不同工具
from mcp.server import Server
from mcp.types import Tool

# ① 每个 Agent 一个 token，对应一组权限
AGENT_PERMISSIONS = {
    "token-customer-service":  ["query_order", "get_customer_info"],
    "token-finance":           ["query_order", "refund_order", "get_customer_info"],
    "token-ops":               ["query_order", "aggregate_stats"],
    "token-dev-full":          ["*"],  # 开发调试用
}

server = Server("order-service")

def get_agent_tools(auth_header: str) -> list[Tool]:
    """根据 token 返回该 Agent 可见的工具列表"""
    token = auth_header.removeprefix("Bearer ").strip()
    allowed = AGENT_PERMISSIONS.get(token, [])
    all_tools = [query_order, refund_order, get_customer_info, aggregate_stats]
    if "*" in allowed:
        return all_tools
    return [t for t in all_tools if t.name in allowed]

@server.list_tools()
async def list_tools() -> list[Tool]:
    # 从请求头拿 token，按角色过滤工具
    auth = server.request_headers.get("Authorization", "")
    return get_agent_tools(auth)

@server.call_tool()
async def call_tool(name: str, arguments: dict):
    # 二次校验：防止 Agent 绕过 list_tools 直接 call
    auth = server.request_headers.get("Authorization", "")
    allowed = AGENT_PERMISSIONS.get(auth.removeprefix("Bearer ").strip(), [])
    if name not in allowed and "*" not in allowed:
        raise PermissionError(f"Agent 无权调用 {name}")
    return await execute_tool(name, arguments)`;

  const authBlock = codeBlock('Server 多租户鉴权实现', 'dot-orange', 'python', authCode);

  const authBox = ruleBox('success',
    `<strong>多租户鉴权的三个关键设计</strong><br><br>
    ① <strong>list_tools 按角色过滤</strong>：客服 Agent 调 <code>tools/list</code> 只看到 query_order 和 get_customer_info，refund_order 根本不出现 → LLM 不会尝试调用<br>
    ② <strong>call_tool 二次校验</strong>：防止恶意 Agent 绕过 list 直接调受限工具，Server 端兜底<br>
    ③ <strong>OAuth 标准流程</strong>：生产级用 OAuth 2.1 + PKCE，token 有过期时间 + 刷新机制，避免明文 token 泄露<br><br>
    <strong>关键</strong>：权限控制在 <strong>Server 侧</strong>，不依赖 Agent 自觉。Agent 配置时只拿到 token，权限策略集中在 Server，便于统一管理 + 审计。`);

  // ── Section 5: Server 注册中心 ───────────────────────────────────────────────

  const registryCode = `# 架构：Agent 注册中心（类似 npm registry）
#
# 注册中心维护一份 Server 目录：
#   - 每个 Server 有 metadata（能力描述、权限要求、SLA）
#   - Agent 启动时按需查询、订阅

# 注册中心 API 设计
GET /registry/servers
# 响应：列出所有可用 Server
{
  "servers": [
    {
      "id": "order-service",
      "name": "订单服务",
      "url": "https://mcp.internal.company.com/orders",
      "required_scopes": ["orders:read"],  # Agent 需要的权限
      "tools": ["query_order", "refund_order"],
      "sla": "99.9%",
      "owner": "trade-team"
    },
    {
      "id": "user-service",
      "name": "用户服务",
      "url": "https://mcp.internal.company.com/users",
      "required_scopes": ["users:read"],
      "tools": ["get_user_info", "search_users"],
      "sla": "99.95%",
      "owner": "platform-team"
    }
  ]
}

# Agent 启动时：
# ① 用自身 scope 查注册中心 → 拿到可用的 Server 列表
# ② 自动生成 mcpServers 配置（或动态加载）
# ③ 接入对应 Server，工具能力动态扩展
# 新工具上线 → 注册中心登记 → 所有 Agent 自动可用（无需改 Agent 代码）`;

  const registryBlock = codeBlock('注册中心架构', 'dot-blue', 'python', registryCode);

  const registryBox = ruleBox('info',
    `<strong>注册中心的三个价值</strong><br><br>
    ① <strong>解耦发现与使用</strong>：Agent 不需要硬编码每个 Server URL，启动时动态拉取<br>
    ② <strong>权限声明式</strong>：Agent 声明自己需要的 scope，注册中心过滤出可用 Server，自动匹配<br>
    ③ <strong>工具自动扩展</strong>：新 Server 上线登记即可，所有 Agent 无需改代码就能用<br><br>
    <strong>类比</strong>：npm install 一个包就用一个包的能力；Agent 接入一个注册中心就有全部工具。这是<strong>"Agent 工具云"</strong>的雏形。`);

  // ── Section 6: 安全与可观测性 ────────────────────────────────────────────────

  const securityRows = [
    ['鉴权',         'OAuth 2.1 + PKCE',                   'token 过期 + 刷新，避免明文泄露'],
    ['权限隔离',     'list + call 双重校验',                'Server 侧兜底，不依赖 Agent 自觉'],
    ['传输加密',     '强制 HTTPS + TLS 1.3',                '防止 token 和工具参数被中间人截获'],
    ['审计日志',     '记录 agent_id + tool + args + result', '出问题可追溯，满足合规要求'],
    ['限流熔断',     'per-agent 速率限制 + 熔断',            '防止某个 Agent 把 Server 打挂'],
    ['敏感字段脱敏', 'log 前对 password / token 脱敏',       '审计日志不泄露敏感信息'],
  ];
  const securityTable = compareCard(securityRows, ['维度', '实现', '说明']);

  const observabilityBox = ruleBox('warning',
    `<strong>可观测性三件套</strong><br><br>
    ① <strong>Metrics</strong>：每个 tool 的 QPS / 延迟 / 错误率，按 agent_id 维度拆分（Prometheus + Grafana）<br>
    ② <strong>Tracing</strong>：OpenTelemetry，trace_id 贯穿 Agent → Server → 下游 API，一次调用全链路可见<br>
    ③ <strong>Logging</strong>：结构化日志（JSON），含 agent_id / tool_name / args 摘要 / latency，接 ELK 检索<br><br>
    <strong>核心问题</strong>：Server 被 N 个 Agent 共享，某个 Agent 出错如何定位？没有可观测性，多租户就是灾难。`);

  // ── Section 7: 选型总结 ──────────────────────────────────────────────────────

  const summaryBox = ruleBox('success',
    `<strong>一句话总结</strong><br><br>
    跨 Agent 共享 MCP = <strong>Server 独立部署 + OAuth 多租户 + 注册中心发现</strong>。<br><br>
    <strong>工程默认决策</strong>：<br>
    • 个人 / 单机 → 本地 stdio，别折腾架构<br>
    • 团队 → 远程 HTTP 单实例 + 简单 token 鉴权<br>
    • 公司多 Agent → HTTP + 负载均衡 + OAuth + 审计<br>
    • 对外服务 → OAuth 网关 + 集群 + 注册中心（如 Sentry 模式）<br><br>
    <strong>核心原则</strong>：共享范围决定架构复杂度，不要过度设计。<strong>权限必须在 Server 侧</strong>，不依赖 Agent 自觉；可观测性是前提，没有审计别上多租户。<br><br>
    本篇承接 <strong>MCP 协议详解</strong>：协议篇讲"是什么"，架构篇讲"怎么给别的 Agent 用"。`);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('场景切入 + 四类共享需求', scenarioBox + scenarioWarnBox)}
    ${section('四种部署模式', deployTable + deployBox)}
    ${section('多租户鉴权设计', authBlock + authBox)}
    ${section('Server 注册中心', registryBlock + registryBox)}
    ${section('安全与可观测性', securityTable + observabilityBox)}
    ${section('选型总结', summaryBox)}`);
}
