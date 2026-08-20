function renderMcp(t) {

  // ── Section 1: 核心结论 ──────────────────────────────────────────────────────

  const conclusion = ruleBox('accent',
    `<strong>核心结论：MCP（Model Context Protocol）= AI 应用的 USB-C 接口</strong><br><br>
    MCP 是 Anthropic 2024 年开源的协议标准，把 AI 应用与外部系统（数据源、工具、工作流）的连接<strong>标准化</strong>。<br><br>
    <strong>类比</strong>：USB-C 之前，每个设备都有自己的接口（Micro-USB、Lightning、DC 圆孔）；MCP 之前，每个 AI 应用要为每个工具单独写集成代码。<br><br>
    工程上一句话：<code>Host（AI 应用）→ Client（连接器）→ Server（工具提供方）</code>，基于 JSON-RPC 2.0 通信。<br><br>
    没有协议层，每个 Agent 都要为每个工具重复造轮子 —— 这就是 MCP 要解决的 <strong>M × N 问题</strong>。`);

  // ── Section 2: 场景切入 + M×N 问题 ────────────────────────────────────────────

  const scenarioBox = ruleBox('info',
    `<strong>场景切入：3 个 Agent × 4 个工具 = 12 个集成</strong><br><br>
    假设有 3 个 AI 应用：Claude Desktop、Cursor、自研客服 Agent<br>
    要接 4 个工具：GitHub、Notion、数据库、文件系统<br><br>
    <strong>没有 MCP</strong>：每个应用为每个工具写一份集成代码 → <strong>3 × 4 = 12 份</strong><br>
    每加一个 Agent，要重写 4 份；每加一个工具，3 个应用都要改<br><br>
    <strong>有 MCP</strong>：每个工具写成 1 个 MCP Server，每个应用实现 1 套 MCP Client → <strong>3 + 4 = 7 份</strong><br>
    新加 Agent 复用已有 Server；新加工具所有 Agent 立刻能用`);

  const scenarioWarnBox = ruleBox('warning',
    `<strong>M × N 问题的三大痛点</strong><br><br>
    ① <strong>重复造轮子</strong>：GitHub 集成在 Claude、Cursor、Copilot 各写一遍，逻辑相同代码不同<br>
    ② <strong>升级地狱</strong>：GitHub API 改了，所有应用的集成代码都要同步改<br>
    ③ <strong>能力孤岛</strong>：自研 Agent 想用 Cursor 已有的工具，拿不过来，只能重写<br><br>
    本质：缺少<strong>协议层</strong>，每个应用 - 工具对都是一次性集成，不可复用。`);

  // ── Section 3: 三层架构 ──────────────────────────────────────────────────────

  const archTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell frontend">角色</div>
        <div class="compare-card-header-cell ai">职责</div>
        <div class="compare-card-header-cell desc">典型实现</div>
      </div>
      ${[
        ['Host',   'AI 应用本体，管理多个 Client，把工具能力暴露给 LLM', 'Claude Desktop / Cursor / VS Code / 自研 Agent'],
        ['Client', '维护与单个 Server 的连接，在 Host 内部 1:1 对应 Server', 'Host 内嵌的连接器对象（每接一个 Server new 一个）'],
        ['Server', '提供工具 / 资源 / 提示词，独立进程或远程服务',          'filesystem-server、github-server、自研业务 Server'],
      ].map(([r, d, e]) => `
      <div class="compare-card-row">
        <div class="compare-card-cell frontend">${escHtml(r)}</div>
        <div class="compare-card-cell ai">${escHtml(d)}</div>
        <div class="compare-card-cell desc">${escHtml(e)}</div>
      </div>`).join('')}
    </div>`;

  const archBox = ruleBox('info',
    `<strong>三层架构核心关系</strong><br><br>
    <code>1 Host : N Client : N Server</code> —— Host 内每个 Client 对应一个 Server，1:1 专属连接。<br><br>
    <strong>关键设计</strong>：Client 与 Server <strong>解耦</strong> —— Server 不知道也不关心 Host 是谁，只响应 JSON-RPC 请求。这意味着<strong>同一个 Server 可以被不同 Host 复用</strong>（Claude Desktop 用的 filesystem-server，自研 Agent 也能直接用）。<br><br>
    跨 Agent 共享的具体架构设计见同分组下的 <strong>MCP 架构设计</strong> topic。`);

  const transportCode = `# 两种传输层
# 1. stdio（本地进程）：Server 作为 Host 的子进程启动，通过标准输入输出通信
#    特点：零网络开销、最快、但只能服务本机单个 Host
"mcpServers": {
  "filesystem": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/me"]
  }
}

# 2. Streamable HTTP（远程服务）：Server 部署在远端，通过 HTTP POST + SSE 通信
#    特点：可被多个 Host 共享、支持 OAuth 鉴权、跨网络访问
"mcpServers": {
  "sentry": {
    "url": "https://mcp.sentry.dev/mcp",
    "headers": { "Authorization": "Bearer xxx" }
  }
}`;

  const transportBlock = codeBlock('两种传输层', 'dot-yellow', 'json', transportCode);

  const transportBox = ruleBox('success',
    `<strong>选传输层的决策</strong><br><br>
    • <strong>本地工具</strong>（文件系统、本地脚本）→ stdio，性能最好，但只能本机用<br>
    • <strong>团队共享工具</strong>（内部 API、数据库）→ HTTP 远程 Server，一次部署全团队复用<br>
    • <strong>公开服务</strong>（Sentry、GitHub）→ HTTP 远程 Server，提供商自己运维<br><br>
    <strong>跨 Agent 共享的关键</strong>：要让"给别的 Agent 用"，Server 必须用 HTTP 传输，部署成远程服务。stdio 启动的本地 Server 每台机器、每个 Host 各起一份，没有共享价值。`);

  // ── Section 4: 三大原语 + JSON-RPC 示例 ──────────────────────────────────────

  const primitivesTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell frontend">原语</div>
        <div class="compare-card-header-cell ai">作用</div>
        <div class="compare-card-header-cell desc">典型场景</div>
      </div>
      ${[
        ['Tools',     '可执行函数', '查天气、查数据库、发邮件'],
        ['Resources', '只读数据源', '文件内容、数据库 schema、API 响应'],
        ['Prompts',   '模板化对话', '系统 prompt、few-shot 示例'],
      ].map(([p, r, s]) => `
      <div class="compare-card-row">
        <div class="compare-card-cell frontend">${escHtml(p)}</div>
        <div class="compare-card-cell ai">${escHtml(r)}</div>
        <div class="compare-card-cell desc">${escHtml(s)}</div>
      </div>`).join('')}
    </div>`;

  const jsonrpcCode = `# tools/list：Client 发现 Server 提供哪些工具
{
  "jsonrpc": "2.0", "id": 2, "method": "tools/list"
}
# 响应：列出所有工具 + inputSchema（JSON Schema 定义参数）
{
  "tools": [{
    "name": "weather_current",
    "description": "查询指定城市实时天气",
    "inputSchema": {
      "type": "object",
      "properties": { "location": { "type": "string" } },
      "required": ["location"]
    }
  }]
}

# tools/call：Client 调用具体工具，Server 返回 content 数组（支持文本/图片/资源）
{
  "jsonrpc": "2.0", "id": 3, "method": "tools/call",
  "params": { "name": "weather_current", "arguments": { "location": "上海" } }
}
# 响应
{
  "content": [{ "type": "text", "text": "上海 22°C，湿度 65%" }]
}`;

  const jsonrpcBlock = codeBlock('JSON-RPC 2.0 交互示例', 'dot-orange', 'json', jsonrpcCode);

  const primitivesBox = ruleBox('info',
    `<strong>三个设计要点</strong><br><br>
    ① <strong>Discovery 先于调用</strong>：Client 先 <code>tools/list</code> 发现能力，再 <code>tools/call</code> 执行 —— LLM 拿到工具列表后才决定调哪个<br>
    ② <strong>JSON Schema 自描述</strong>：每个工具的 <code>inputSchema</code> 告诉 LLM 该传什么参数，LLM 自动生成合规调用<br>
    ③ <strong>无状态协议</strong>：每个请求都带 <code>_meta</code>（协议版本 + 能力 + Client 身份），Server 不依赖连接状态 —— 同一个 Server 可被任意 Client 调用<br><br>
    <strong>对比 Function Calling</strong>：Function Calling 让 LLM 输出 JSON，但<strong>执行函数的代码每个应用都要自己写</strong>；MCP 把执行侧标准化，Server 写一次所有 Host 都能用。`);

  // ── Section 5: MCP vs Function Calling 对比 ─────────────────────────────────

  const compareRows = [
    ['集成方式',     '每个应用为每个工具单独写代码',       '工具写成 Server，应用接 Client 即可'],
    ['M × N 问题',   'M × N 份集成代码',                   'M + N 份（M 个 Client + N 个 Server）'],
    ['工具升级',     '改 API 要同步改所有应用',             '改 Server，所有应用自动受益'],
    ['能力复用',     'A 应用的工具 B 应用拿不过来',         '所有应用共享同一组 Server'],
    ['执行位置',     '在应用内执行',                        '在 Server 进程内执行（解耦）'],
    ['适用场景',     '单一应用、工具少',                    '多应用、多工具、需团队/跨组织共享'],
  ];
  const compareTable = compareCard(compareRows, ['Function Calling', 'MCP']);

  const decisionBox = ruleBox('warning',
    `<strong>选型决策</strong><br><br>
    • <strong>单一应用 + 工具少</strong> → Function Calling 够用，引入 MCP 是过度设计<br>
    • <strong>多应用 / 多工具 / 团队共享</strong> → MCP，工具集中维护、按需复用<br>
    • <strong>给别的 Agent 用</strong> → MCP 唯一选择，Server 写一次所有 Agent 共享；具体架构设计见<strong>MCP 架构设计</strong> topic<br><br>
    反例：3 个工具的小项目用 MCP，多写一堆 Server 代码还没复用机会；10 个 Agent 各自实现 GitHub 集成，每次 API 改动同步改 10 处，应该是 1 个 MCP Server + 10 个 Client。`);

  // ── Section 6: 选型总结 ──────────────────────────────────────────────────────

  const summaryBox = ruleBox('success',
    `<strong>一句话总结</strong><br><br>
    MCP 是 AI 应用与外部系统的<strong>"USB-C 协议"</strong>，把 M × N 集成问题降为 M + N。<br><br>
    <strong>本篇覆盖</strong>：协议定义、三层架构、三大原语、vs Function Calling。<br>
    <strong>架构设计</strong>（多 Agent 共享、部署模式、安全隔离、注册中心）见同分组下 <strong>MCP 架构设计</strong> topic。<br><br>
    <strong>工程默认决策</strong>：单应用 + 工具少 → Function Calling；多应用 / 多工具 / 团队共享 → MCP；要"给别的 Agent 用" → MCP 唯一选择。`);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('场景切入 + M × N 问题', scenarioBox + scenarioWarnBox)}
    ${section('三层架构：Host / Client / Server', archTable + archBox + transportBlock + transportBox)}
    ${section('三大原语 + JSON-RPC 示例', primitivesTable + jsonrpcBlock + primitivesBox)}
    ${section('MCP vs Function Calling 对比', compareTable + decisionBox)}
    ${section('选型总结', summaryBox)}`);
}
