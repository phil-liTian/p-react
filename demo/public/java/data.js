const topics = [
  {
    id: 'java-overview',
    name: 'Java 概述',
    group: '☕ 概述',
    type: 'accent',
    icon: '☕',
    tags: [
      { label: '概述', type: 'accent' },
      { label: '应用场景', type: 'info' },
      { label: '企业级', type: 'success' },
      { label: 'JVM', type: 'warning' },
    ],
  },
  {
    id: 'learning-map',
    name: '学习路径总览',
    group: '🗺️ 学习路径',
    type: 'accent',
    icon: '🗺️',
    tags: [
      { label: '思维导图', type: 'accent' },
      { label: '总览', type: 'info' },
      { label: '路径', type: 'success' },
    ],
  },
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
    id: 'knife4j-dto-vo',
    name: 'Knife4j 与 DTO/VO 分层',
    group: '🌱 Spring 通识',
    type: 'success',
    icon: '📋',
    tags: [
      { label: 'Knife4j', type: 'success' },
      { label: 'DTO', type: 'info' },
      { label: 'VO', type: 'accent' },
      { label: '接口文档', type: 'warning' },
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
    id: 'redisson-distributed-lock',
    name: 'Redisson 分布式锁与看门狗',
    group: '🗄️ 数据库',
    type: 'accent',
    icon: '🔐',
    tags: [
      { label: 'Redisson', type: 'accent' },
      { label: '看门狗', type: 'warning' },
      { label: '可重入锁', type: 'info' },
      { label: 'Lua 原子', type: 'success' },
    ],
  },
  {
    id: 'cache-db-consistency',
    name: '缓存与数据库双写一致性',
    group: '🗄️ 数据库',
    type: 'warning',
    icon: '🔄',
    tags: [
      { label: 'Cache-Aside', type: 'success' },
      { label: '延迟双删', type: 'warning' },
      { label: 'Canal Binlog', type: 'info' },
      { label: '双写一致性', type: 'accent' },
    ],
  },
  {
    id: 'rabbitmq',
    name: 'RabbitMQ 消息队列',
    group: '📨 消息队列',
    type: 'warning',
    icon: '🐇',
    tags: [
      { label: 'RabbitMQ', type: 'warning' },
      { label: 'Exchange', type: 'accent' },
      { label: '消息确认', type: 'info' },
      { label: '死信队列', type: 'danger' },
    ],
  },
  {
    id: 'mybatis-dynamic-sql',
    name: 'MyBatis 动态 SQL',
    group: '🗄️ 数据库',
    type: 'info',
    icon: '🧩',
    tags: [
      { label: 'MyBatis', type: 'info' },
      { label: '<if>', type: 'accent' },
      { label: '<foreach>', type: 'warning' },
      { label: '动态 SQL', type: 'success' },
    ],
  },
  {
    id: 'mybatis-plus',
    name: 'MyBatis-Plus 分页与逻辑删除',
    group: '🗄️ 数据库',
    type: 'accent',
    icon: '🚀',
    tags: [
      { label: 'MyBatis-Plus', type: 'accent' },
      { label: '分页', type: 'info' },
      { label: '逻辑删除', type: 'warning' },
      { label: '@TableLogic', type: 'success' },
    ],
  },
  {
    id: 'global-log-interceptor',
    name: '全局日志拦截',
    group: '🌱 Spring 通识',
    type: 'info',
    icon: '📋',
    tags: [
      { label: 'AOP 日志', type: 'info' },
      { label: 'Filter', type: 'accent' },
      { label: 'MDC 链路', type: 'success' },
      { label: 'HandlerInterceptor', type: 'warning' },
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
  {
    id: 'java-lambda',
    name: 'Lambda 与函数式接口',
    group: '☕ Java 基础',
    type: 'accent',
    icon: '🔧',
    tags: [
      { label: 'Lambda', type: 'accent' },
      { label: 'Function', type: 'info' },
      { label: 'Predicate', type: 'success' },
      { label: '方法引用', type: 'warning' },
    ],
  },
  {
    id: 'java-stream',
    name: 'Stream 分组、统计、过滤',
    group: '☕ Java 基础',
    type: 'success',
    icon: '🌊',
    tags: [
      { label: 'Stream', type: 'success' },
      { label: 'groupingBy', type: 'accent' },
      { label: '统计', type: 'info' },
      { label: 'filter', type: 'warning' },
    ],
  },
  {
    id: 'distributed-system-overview',
    name: '分布式系统基础',
    group: '🌐 分布式',
    type: 'accent',
    icon: '🌐',
    tags: [
      { label: '分布式', type: 'accent' },
      { label: '进程', type: 'info' },
      { label: '透明性', type: 'success' },
      { label: '可扩展', type: 'warning' },
    ],
  },
  {
    id: 'cluster-vs-distributed',
    name: '集群 vs 分布式',
    group: '🌐 分布式',
    type: 'info',
    icon: '🏗️',
    tags: [
      { label: '集群', type: 'info' },
      { label: '分布式', type: 'accent' },
      { label: '负载均衡', type: 'warning' },
      { label: '对比', type: 'success' },
    ],
  },
  {
    id: 'cap-base-theorem',
    name: 'CAP 与 BASE 理论',
    group: '🌐 分布式',
    type: 'warning',
    icon: '⚖️',
    tags: [
      { label: 'CAP', type: 'warning' },
      { label: 'BASE', type: 'accent' },
      { label: '一致性', type: 'info' },
      { label: '可用性', type: 'success' },
    ],
  },
  {
    id: 'distributed-transaction',
    name: '分布式事务方案',
    group: '🌐 分布式',
    type: 'danger',
    icon: '🔄',
    tags: [
      { label: '2PC', type: 'danger' },
      { label: 'TCC', type: 'warning' },
      { label: 'Seata', type: 'accent' },
      { label: '最终一致', type: 'info' },
    ],
  },
  {
    id: 'distributed-id',
    name: '分布式 ID 生成',
    group: '🌐 分布式',
    type: 'success',
    icon: '🆔',
    tags: [
      { label: '雪花算法', type: 'success' },
      { label: 'UUID', type: 'info' },
      { label: 'Leaf', type: 'accent' },
      { label: '趋势递增', type: 'warning' },
    ],
  },
  {
    id: 'middleware-overview',
    name: '什么是中间件',
    group: '🧩 中间件',
    type: 'accent',
    icon: '🧩',
    tags: [
      { label: '中间件', type: 'accent' },
      { label: '消息队列', type: 'warning' },
      { label: '缓存', type: 'info' },
      { label: '基础设施', type: 'success' },
    ],
  },
  {
    id: 'nacos',
    name: 'Nacos 服务发现与配置中心',
    group: '🧩 中间件',
    type: 'info',
    icon: '🗂️',
    tags: [
      { label: 'Nacos', type: 'info' },
      { label: '服务发现', type: 'accent' },
      { label: '配置中心', type: 'success' },
      { label: 'Spring Cloud', type: 'warning' },
    ],
  },
  {
    id: 'rabbitmq-vs-kafka',
    name: 'RabbitMQ vs Kafka',
    group: '🧩 中间件',
    type: 'warning',
    icon: '🐇',
    tags: [
      { label: 'RabbitMQ', type: 'warning' },
      { label: 'Kafka', type: 'accent' },
      { label: '选型对比', type: 'info' },
      { label: '消息队列', type: 'success' },
    ],
  },
  {
    id: 'idempotency',
    name: '幂等性处理机制',
    group: '🌐 分布式',
    type: 'danger',
    icon: '🔁',
    tags: [
      { label: '幂等性', type: 'danger' },
      { label: '防重', type: 'warning' },
      { label: '唯一索引', type: 'success' },
      { label: 'Token', type: 'info' },
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
