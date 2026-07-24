const topics = [
  {
    id: 'mysql-overview',
    name: 'MySQL 概述',
    group: '🐬 MySQL',
    type: 'accent',
    icon: '🐬',
    tags: [
      { label: '关系型', type: 'accent' },
      { label: 'ACID', type: 'success' },
      { label: 'InnoDB', type: 'info' },
      { label: 'OLTP', type: 'warning' },
    ],
  },
  {
    id: 'mysql-ddl',
    name: '什么是 DDL',
    group: '🐬 MySQL',
    type: 'accent',
    icon: '📐',
    tags: [
      { label: 'CREATE/ALTER', type: 'accent' },
      { label: 'Online DDL', type: 'info' },
      { label: 'TRUNCATE', type: 'warning' },
      { label: 'gh-ost', type: 'success' },
    ],
  },
  {
    id: 'mysql-index',
    name: 'MySQL 索引原理与调优',
    group: '🐬 MySQL',
    type: 'info',
    icon: '🌳',
    tags: [
      { label: 'B+ 树', type: 'info' },
      { label: '聚簇索引', type: 'accent' },
      { label: '最左匹配', type: 'warning' },
      { label: 'EXPLAIN', type: 'success' },
    ],
  },
  {
    id: 'mysql-transaction',
    name: 'MySQL 事务与锁',
    group: '🐬 MySQL',
    type: 'success',
    icon: '🔒',
    tags: [
      { label: 'ACID', type: 'success' },
      { label: 'MVCC', type: 'info' },
      { label: '隔离级别', type: 'accent' },
      { label: '死锁', type: 'warning' },
    ],
  },
  {
    id: 'mysql-tuning',
    name: 'MySQL SQL 调优',
    group: '🐬 MySQL',
    type: 'warning',
    icon: '⚡',
    tags: [
      { label: '慢查询', type: 'warning' },
      { label: 'EXPLAIN', type: 'success' },
      { label: 'JOIN', type: 'info' },
      { label: '深分页', type: 'accent' },
    ],
  },
  {
    id: 'mysql-replication',
    name: 'MySQL 主从复制与高可用',
    group: '🐬 MySQL',
    type: 'danger',
    icon: '🔄',
    tags: [
      { label: 'binlog', type: 'info' },
      { label: '半同步', type: 'success' },
      { label: 'MGR', type: 'accent' },
      { label: '读写分离', type: 'warning' },
    ],
  },
  {
    id: 'redis-overview',
    name: 'Redis 概述',
    group: '🔴 Redis',
    type: 'danger',
    icon: '🔴',
    tags: [
      { label: 'KV 存储', type: 'danger' },
      { label: '内存', type: 'warning' },
      { label: '单线程', type: 'info' },
      { label: '缓存', type: 'accent' },
    ],
  },
  {
    id: 'redis-concepts',
    name: 'Redis 核心概念深入',
    group: '🔴 Redis',
    type: 'info',
    icon: '🧠',
    tags: [
      { label: 'IO 多路复用', type: 'info' },
      { label: '数据结构', type: 'success' },
      { label: '持久化', type: 'warning' },
      { label: '淘汰策略', type: 'accent' },
    ],
  },
  {
    id: 'redis-pitfalls',
    name: 'Redis 生产高频问题与解决方案',
    group: '🔴 Redis',
    type: 'warning',
    icon: '⚠️',
    tags: [
      { label: '穿透/击穿/雪崩', type: 'danger' },
      { label: '一致性', type: 'warning' },
      { label: '热Key/大Key', type: 'accent' },
      { label: '分布式锁', type: 'info' },
    ],
  },
  {
    id: 'redis-tuning',
    name: 'Redis 性能调优与运维',
    group: '🔴 Redis',
    type: 'success',
    icon: '⚡',
    tags: [
      { label: '内存淘汰', type: 'success' },
      { label: '内存碎片', type: 'warning' },
      { label: '慢查询', type: 'danger' },
      { label: 'Pipeline', type: 'info' },
    ],
  },
  {
    id: 'redis-cluster',
    name: 'Redis 高可用与集群方案',
    group: '🔴 Redis',
    type: 'danger',
    icon: '🌐',
    tags: [
      { label: '主从', type: 'info' },
      { label: 'Sentinel', type: 'success' },
      { label: 'Cluster', type: 'accent' },
      { label: '分片', type: 'warning' },
    ],
  },
  {
    id: 'mongodb-overview',
    name: 'MongoDB 概述',
    group: '🍃 MongoDB',
    type: 'success',
    icon: '🍃',
    tags: [
      { label: '文档型', type: 'success' },
      { label: 'BSON', type: 'info' },
      { label: 'Schema-Free', type: 'accent' },
      { label: 'NoSQL', type: 'warning' },
    ],
  },
  {
    id: 'mongodb-modeling',
    name: 'MongoDB 核心概念与建模',
    group: '🍃 MongoDB',
    type: 'info',
    icon: '🧱',
    tags: [
      { label: 'BSON', type: 'info' },
      { label: '嵌套 vs 引用', type: 'accent' },
      { label: '设计模式', type: 'success' },
      { label: 'ESR 规则', type: 'warning' },
    ],
  },
  {
    id: 'mongodb-aggregation',
    name: 'MongoDB 聚合与索引调优',
    group: '🍃 MongoDB',
    type: 'success',
    icon: '🔧',
    tags: [
      { label: 'Pipeline', type: 'success' },
      { label: '$lookup', type: 'info' },
      { label: 'explain', type: 'accent' },
      { label: '索引优化', type: 'warning' },
    ],
  },
  {
    id: 'mongodb-cluster',
    name: 'MongoDB 高可用与分片集群',
    group: '🍃 MongoDB',
    type: 'warning',
    icon: '🌐',
    tags: [
      { label: '副本集', type: 'info' },
      { label: '分片', type: 'accent' },
      { label: 'oplog', type: 'success' },
      { label: '事务', type: 'warning' },
    ],
  },
  {
    id: 'mongodb-ops',
    name: 'MongoDB 生产高频问题与运维',
    group: '🍃 MongoDB',
    type: 'danger',
    icon: '🛠️',
    tags: [
      { label: '大文档', type: 'danger' },
      { label: '内存', type: 'warning' },
      { label: '备份', type: 'info' },
      { label: '安全', type: 'accent' },
    ],
  },
  {
    id: 'postgresql-overview',
    name: 'PostgreSQL 概述',
    group: '🐘 PostgreSQL',
    type: 'info',
    icon: '🐘',
    tags: [
      { label: '对象-关系型', type: 'info' },
      { label: 'MVCC', type: 'success' },
      { label: 'JSONB', type: 'accent' },
      { label: '可扩展', type: 'warning' },
    ],
  },
  {
    id: 'pg-concepts',
    name: 'PostgreSQL 核心概念与数据类型',
    group: '🐘 PostgreSQL',
    type: 'success',
    icon: '🧠',
    tags: [
      { label: 'MVCC', type: 'success' },
      { label: 'VACUUM', type: 'warning' },
      { label: 'JSONB', type: 'info' },
      { label: '进程模型', type: 'accent' },
    ],
  },
  {
    id: 'pg-tuning',
    name: 'PostgreSQL 索引与查询调优',
    group: '🐘 PostgreSQL',
    type: 'info',
    icon: '🔧',
    tags: [
      { label: '5 种索引', type: 'info' },
      { label: 'EXPLAIN', type: 'accent' },
      { label: '分区表', type: 'success' },
      { label: '并行查询', type: 'warning' },
    ],
  },
  {
    id: 'pg-replication',
    name: 'PostgreSQL 高可用与复制',
    group: '🐘 PostgreSQL',
    type: 'warning',
    icon: '🔄',
    tags: [
      { label: '流复制', type: 'info' },
      { label: '逻辑复制', type: 'success' },
      { label: 'Patroni', type: 'accent' },
      { label: '升级', type: 'warning' },
    ],
  },
  {
    id: 'pg-extensions',
    name: 'PostgreSQL 扩展生态与运维',
    group: '🐘 PostgreSQL',
    type: 'danger',
    icon: '🧩',
    tags: [
      { label: 'PostGIS', type: 'success' },
      { label: 'pg_vector', type: 'info' },
      { label: 'TimescaleDB', type: 'warning' },
      { label: 'FDW', type: 'accent' },
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
  const [h1, h2] = headers || ['MySQL', 'Redis'];
  const headerHtml = `
    <div class="compare-card-header">
      <div class="compare-card-header-cell frontend">${escHtml(h1)}</div>
      <div class="compare-card-header-cell db">${escHtml(h2)}</div>
      <div class="compare-card-header-cell desc">说明</div>
    </div>`;

  const rowsHtml = rows.map(([fe, db, desc]) => `
    <div class="compare-card-row">
      <div class="compare-card-cell frontend">${escHtml(fe)}</div>
      <div class="compare-card-cell db">${escHtml(db)}</div>
      <div class="compare-card-cell desc">${escHtml(desc)}</div>
    </div>`).join('');

  return `<div class="compare-card">${headerHtml}${rowsHtml}</div>`;
}
