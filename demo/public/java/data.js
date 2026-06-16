const topics = [
  {
    id: 'spring-bean-ioc',
    name: 'Spring Bean 与 IoC 容器',
    group: '🌱 Spring 通识',
    type: 'success',
    icon: '🏭',
    tags: [
      { label: 'IoC', type: 'success' },
      { label: '@Autowired', type: 'info' },
      { label: '依赖注入', type: 'accent' },
      { label: 'Bean', type: 'warning' },
    ],
  },
  {
    id: 'spring-aop',
    name: 'AOP 代理机制',
    group: '🌱 Spring 通识',
    type: 'info',
    icon: '🔗',
    tags: [
      { label: 'AOP', type: 'info' },
      { label: '动态代理', type: 'accent' },
      { label: '@Around', type: 'warning' },
      { label: '切面', type: 'success' },
    ],
  },
  {
    id: 'spring-mvc-flow',
    name: 'Spring MVC 请求链路',
    group: '🌱 Spring 通识',
    type: 'accent',
    icon: '🌐',
    tags: [
      { label: 'DispatcherServlet', type: 'accent' },
      { label: '@RestController', type: 'info' },
      { label: 'REST API', type: 'success' },
      { label: '路由', type: 'warning' },
    ],
  },
  {
    id: 'spring-boot-autoconfig',
    name: 'Spring Boot 自动配置原理',
    group: '🌱 Spring 通识',
    type: 'warning',
    icon: '⚡',
    tags: [
      { label: '自动配置', type: 'warning' },
      { label: 'Starter', type: 'success' },
      { label: '@Conditional', type: 'info' },
      { label: '开箱即用', type: 'accent' },
    ],
  },
  {
    id: 'maven-vs-npm',
    name: 'Maven vs npm',
    group: '📦 工具链',
    type: 'accent',
    icon: '📦',
    tags: [
      { label: 'Maven', type: 'accent' },
      { label: 'npm', type: 'info' },
      { label: '依赖管理', type: 'warning' },
      { label: '工具链', type: 'success' },
    ],
  },
  {
    id: 'spring-boot-vs-vite',
    name: 'Spring Boot vs Vite 项目结构',
    group: '🏗️ 项目结构',
    type: 'info',
    icon: '🏗️',
    tags: [
      { label: 'Spring Boot', type: 'accent' },
      { label: 'Vite', type: 'info' },
      { label: '项目结构', type: 'warning' },
      { label: '约定优于配置', type: 'success' },
    ],
  },
  {
    id: 'spring-transaction-intro',
    name: 'Spring Boot 单表事务',
    group: '🗄️ 数据库',
    type: 'success',
    icon: '🔒',
    tags: [
      { label: '@Transactional', type: 'success' },
      { label: '原子性', type: 'info' },
      { label: '回滚', type: 'danger' },
      { label: '入门', type: 'accent' },
    ],
  },
  {
    id: 'java-locks',
    name: 'Java 锁机制速查',
    group: '🧵 并发',
    type: 'warning',
    icon: '🔐',
    tags: [
      { label: 'synchronized', type: 'warning' },
      { label: 'ReentrantLock', type: 'accent' },
      { label: 'volatile', type: 'info' },
      { label: '并发', type: 'danger' },
    ],
  },
  {
    id: 'spring-transaction-isolation',
    name: '事务隔离级别',
    group: '🗄️ 数据库',
    type: 'info',
    icon: '🔬',
    tags: [
      { label: '隔离级别', type: 'info' },
      { label: '脏读', type: 'danger' },
      { label: '幻读', type: 'warning' },
      { label: 'MVCC', type: 'accent' },
    ],
  },
  {
    id: 'spring-transaction-pitfalls',
    name: '@Transactional 五大失效场景',
    group: '🗄️ 数据库',
    type: 'danger',
    icon: '⚠️',
    tags: [
      { label: 'AOP 代理', type: 'warning' },
      { label: '自调用', type: 'danger' },
      { label: '异常处理', type: 'info' },
      { label: '踩坑', type: 'accent' },
    ],
  },
  {
    id: 'spring-pessimistic-lock',
    name: '悲观锁 FOR UPDATE 与死锁',
    group: '🗄️ 数据库',
    type: 'warning',
    icon: '🔐',
    tags: [
      { label: 'FOR UPDATE', type: 'warning' },
      { label: '死锁', type: 'danger' },
      { label: '乐观锁', type: 'info' },
      { label: '并发重试', type: 'accent' },
    ],
  },
  {
    id: 'spring-redis',
    name: 'Redis 整合',
    group: '🗄️ 数据库',
    type: 'accent',
    icon: '⚡',
    tags: [
      { label: 'RedisTemplate', type: 'accent' },
      { label: '@Cacheable', type: 'success' },
      { label: '分布式锁', type: 'warning' },
      { label: 'Redisson', type: 'info' },
    ],
  },
  {
    id: 'redis-cache-problems',
    name: '缓存三大问题',
    group: '🗄️ 数据库',
    type: 'danger',
    icon: '🛡️',
    tags: [
      { label: '缓存穿透', type: 'danger' },
      { label: '缓存击穿', type: 'warning' },
      { label: '缓存雪崩', type: 'accent' },
      { label: '布隆过滤器', type: 'info' },
    ],
  },
  {
    id: 'java-utils',
    name: '通用工具类',
    group: '☕ Java 基础',
    type: 'info',
    icon: '🧰',
    tags: [
      { label: 'Optional', type: 'info' },
      { label: 'Stream', type: 'success' },
      { label: 'LocalDateTime', type: 'accent' },
      { label: 'StringUtils', type: 'warning' },
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
  const [h1, h2] = headers || ['前端（npm）', 'Java（Maven）'];
  const headerHtml = `
    <div class="compare-card-header">
      <div class="compare-card-header-cell frontend">${escHtml(h1)}</div>
      <div class="compare-card-header-cell java">${escHtml(h2)}</div>
      <div class="compare-card-header-cell desc">说明</div>
    </div>`;

  const rowsHtml = rows.map(([fe, java, desc]) => `
    <div class="compare-card-row">
      <div class="compare-card-cell frontend">${escHtml(fe)}</div>
      <div class="compare-card-cell java">${escHtml(java)}</div>
      <div class="compare-card-cell desc">${escHtml(desc)}</div>
    </div>`).join('');

  return `<div class="compare-card">${headerHtml}${rowsHtml}</div>`;
}
