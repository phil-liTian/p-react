const topics = [
  {
    id: 'no-rag-context-stuffing',
    name: '不用 RAG 全塞上下文',
    group: '🔍 RAG',
    type: 'warning',
    icon: '📦',
    tags: [
      { label: 'Context Stuffing', type: 'warning' },
      { label: 'Long Context', type: 'info' },
      { label: '成本', type: 'danger' },
      { label: '选型', type: 'accent' },
    ],
  },
  {
    id: 'rag-principle',
    name: 'RAG 原理',
    group: '🔍 RAG',
    type: 'accent',
    icon: '🔍',
    tags: [
      { label: 'RAG', type: 'accent' },
      { label: 'Embedding', type: 'info' },
      { label: '向量数据库', type: 'success' },
      { label: 'Rerank', type: 'warning' },
    ],
  },
  {
    id: 'what-is-agent',
    name: '什么是 Agent',
    group: '🤖 Agent',
    type: 'accent',
    icon: '🤖',
    tags: [
      { label: 'Agent', type: 'accent' },
      { label: 'LLM 对话', type: 'info' },
      { label: '贾维斯', type: 'success' },
      { label: 'ReAct', type: 'warning' },
    ],
  },
  {
    id: 'agent-work-principle',
    name: 'Agent 工作原理（LangChain）',
    group: '🤖 Agent',
    type: 'accent',
    icon: '⚙️',
    tags: [
      { label: 'LangChain', type: 'accent' },
      { label: 'Tools 调用', type: 'info' },
      { label: 'AgentExecutor', type: 'success' },
      { label: 'LangGraph', type: 'warning' },
    ],
  },
  {
    id: 'react-vs-cot',
    name: 'ReAct 完整链路 vs CoT',
    group: '🤖 Agent',
    type: 'accent',
    icon: '🔁',
    tags: [
      { label: 'ReAct', type: 'accent' },
      { label: 'CoT', type: 'info' },
      { label: 'Thought/Action/Observation', type: 'success' },
      { label: 'LangChain', type: 'warning' },
    ],
  },
  {
    id: 'intent-recognition',
    name: '意图识别',
    group: '🤖 Agent',
    type: 'accent',
    icon: '🎯',
    tags: [
      { label: '意图识别', type: 'accent' },
      { label: '关键词匹配', type: 'warning' },
      { label: 'LLM 分类', type: 'info' },
      { label: 'Structured Output', type: 'success' },
    ],
  },
  {
    id: 'query-rewriting',
    name: '查询改写',
    group: '🔍 RAG',
    type: 'info',
    icon: '🔄',
    tags: [
      { label: '查询改写', type: 'info' },
      { label: 'Multi-Query', type: 'accent' },
      { label: 'HyDE', type: 'success' },
      { label: 'RAG 预处理', type: 'warning' },
    ],
  },
  {
    id: 'route-plan',
    name: '路由规划（Plan-and-Execute）',
    group: '🤖 Agent',
    type: 'accent',
    icon: '🗺️',
    tags: [
      { label: 'Route Plan', type: 'accent' },
      { label: 'Planner / Executor', type: 'info' },
      { label: 'Re-planner', type: 'success' },
      { label: 'LangGraph', type: 'warning' },
    ],
  },
  {
    id: 'hitl',
    name: 'HITL（人机协同）',
    group: '🤖 Agent',
    type: 'accent',
    icon: '🤝',
    tags: [
      { label: 'Human-in-the-Loop', type: 'accent' },
      { label: 'interrupt', type: 'info' },
      { label: 'Approve/Edit/Review', type: 'success' },
      { label: 'Checkpointer', type: 'warning' },
    ],
  },
  {
    id: 'mcp',
    name: 'MCP 协议详解',
    group: '🤖 Agent',
    type: 'accent',
    icon: '🔌',
    tags: [
      { label: 'Model Context Protocol', type: 'accent' },
      { label: 'Host/Client/Server', type: 'info' },
      { label: 'JSON-RPC', type: 'warning' },
      { label: '三大原语', type: 'success' },
    ],
  },
  {
    id: 'mcp-architecture',
    name: 'MCP 架构设计（跨 Agent 共享）',
    group: '🤖 Agent',
    type: 'accent',
    icon: '🏗️',
    tags: [
      { label: '跨 Agent 共享', type: 'accent' },
      { label: '部署模式', type: 'info' },
      { label: 'OAuth 多租户', type: 'success' },
      { label: '注册中心', type: 'warning' },
    ],
  },
];

// ── Shared helpers ────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function tagsHtml(tags) {
  return tags.map(t => `<span class="tag tag-${escHtml(t.type)}">${escHtml(t.label)}</span>`).join('');
}

function codeBlock(label, dotClass, lang, code) {
  return `
    <div class="code-block-wrap">
      <div class="code-block-label">
        <span class="code-block-label-dot ${escHtml(dotClass)}"></span>
        <span class="code-block-label-text">${escHtml(label)}</span>
      </div>
      <pre><code class="language-${lang}">${escHtml(code)}</code></pre>
    </div>`;
}

function codeBlocksRow(blocks) {
  return `<div class="code-blocks-row">${blocks.join('')}</div>`;
}

function ruleBox(type, html) {
  return `<div class="rule-box rule-box-${type}">${html}</div>`;
}

function section(title, bodyHtml) {
  return `
    <div class="section">
      <div class="section-title">${title}</div>
      <div class="section-body">${bodyHtml}</div>
    </div>`;
}

function articleShell(t, innerHtml) {
  return `
    <div class="article-header">
      <div class="article-icon">${t.icon}</div>
      <div class="article-meta">
        <div class="article-title">${t.name}</div>
        <div class="article-tags">${tagsHtml(t.tags)}</div>
      </div>
    </div>
    <div class="article-divider"></div>
    ${innerHtml}`;
}

function compareCard(rows, headers) {
  const [h1, h2] = headers || ['传统方案', 'AI 方案'];
  const headerHtml = `
    <div class="compare-card-header">
      <div class="compare-card-header-cell frontend">${escHtml(h1)}</div>
      <div class="compare-card-header-cell ai">${escHtml(h2)}</div>
      <div class="compare-card-header-cell desc">说明</div>
    </div>`;

  const rowsHtml = rows.map(([fe, ai, desc]) => `
    <div class="compare-card-row">
      <div class="compare-card-cell frontend">${escHtml(fe)}</div>
      <div class="compare-card-cell ai">${escHtml(ai)}</div>
      <div class="compare-card-cell desc">${escHtml(desc)}</div>
    </div>`).join('');

  return `<div class="compare-card">${headerHtml}${rowsHtml}</div>`;
}
