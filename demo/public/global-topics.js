// ── 全局 Topic 注册表 ─────────────────────────────────────────────────────────

const globalTopics = [
  // ── 前端知识库 ──
  { id: 'ai-coding-workflow',   name: 'AI 辅助编程工作流',                          group: 'AI 前端',      icon: '🤖', page: 'knowledge' },
  { id: 'prompt-engineering',   name: 'Prompt Engineering 基础',                    group: 'AI 前端',      icon: '✍️', page: 'knowledge' },
  { id: 'rag-vector',           name: 'RAG 与向量检索',                              group: 'AI 前端',      icon: '🔍', page: 'knowledge' },
  { id: 'ai-safety',            name: 'AI 安全与幻觉',                               group: 'AI 前端',      icon: '🛡️', page: 'knowledge' },
  { id: 'event-loop',           name: 'Event Loop 运行机制',                        group: 'JS 异步',      icon: '🔄', page: 'knowledge' },
  { id: 'micro-macro',          name: '微任务 vs 宏任务',                            group: 'JS 异步',      icon: '⚡', page: 'knowledge' },
  { id: 'promise-internals',    name: 'Promise 原理与状态机',                       group: 'JS 异步',      icon: '🔮', page: 'knowledge' },
  { id: 'promise-chain',        name: 'Promise 链式调用与错误传播',                  group: 'JS 异步',      icon: '⛓️', page: 'knowledge' },
  { id: 'async-await',          name: 'async/await 原理与陷阱',                     group: 'JS 异步',      icon: '⏳', page: 'knowledge' },
  { id: 'promise-concurrency',  name: '并发控制（all / race / allSettled / any）',  group: 'JS 异步',      icon: '🔀', page: 'knowledge' },
  { id: 'promise-implement',    name: '手写 Promise',                               group: 'JS 异步',      icon: '🛠️', page: 'knowledge' },
  { id: 'generator',            name: 'Generator 与协程',                           group: 'JS 异步',      icon: '🔁', page: 'knowledge' },
  { id: 'abort-controller',     name: '取消异步任务（AbortController）',             group: 'JS 异步',      icon: '🛑', page: 'knowledge' },
  { id: 'module-history',       name: '模块化历史（IIFE → CJS → ESM）',              group: '工程化',       icon: '📦', page: 'knowledge' },
  { id: 'webpack-internals',    name: 'Webpack 构建流程',                           group: '工程化',       icon: '🔧', page: 'knowledge' },
  { id: 'tree-shaking',         name: 'Tree Shaking 原理与限制',                    group: '工程化',       icon: '🌲', page: 'knowledge' },
  { id: 'code-splitting',       name: 'Code Splitting 与懒加载',                    group: '工程化',       icon: '✂️', page: 'knowledge' },
  { id: 'vite-vs-webpack',      name: 'Vite 原理（ESM Dev Server vs Bundle）',      group: '工程化',       icon: '⚡', page: 'knowledge' },
  { id: 'bundle-analysis',      name: '构建产物分析与优化',                          group: '工程化',       icon: '🔍', page: 'knowledge' },
  { id: 'babel',                name: 'Babel 编译流程',                             group: '工程化',       icon: '🔄', page: 'knowledge' },
  { id: 'sourcemap',            name: 'Sourcemap 原理',                             group: '工程化',       icon: '🗺️', page: 'knowledge' },
  { id: 'monorepo',             name: 'Monorepo 方案对比',                          group: '工程化',       icon: '🏗️', page: 'knowledge' },
  { id: 'cicd',                 name: 'CI/CD 流水线设计',                           group: '工程化',       icon: '🚀', page: 'knowledge' },
  { id: 'reflow-repaint',       name: '重绘与回流',                                  group: '性能优化',     icon: '🎨', page: 'knowledge' },
  { id: 'composite-layer',      name: '合成层与 GPU 加速',                           group: '性能优化',     icon: '🖥️', page: 'knowledge' },
  { id: 'web-vitals',           name: 'Web Vitals',                                group: '性能优化',     icon: '📊', page: 'knowledge' },
  { id: 'first-screen',         name: '首屏加载优化策略',                            group: '性能优化',     icon: '🚀', page: 'knowledge' },
  { id: 'virtual-list',         name: '虚拟列表原理与实现',                          group: '性能优化',     icon: '📋', page: 'knowledge' },
  { id: 'lazy-load',            name: '图片懒加载',                                  group: '性能优化',     icon: '🖼️', page: 'knowledge' },
  { id: 'debounce-throttle',    name: '防抖与节流',                                  group: '性能优化',     icon: '⏱️', page: 'knowledge' },
  { id: 'memory-leak',          name: '内存泄漏与垃圾回收',                           group: '性能优化',     icon: '🗑️', page: 'knowledge' },
  { id: 'animation-perf',       name: '动画性能优化',                               group: '性能优化',     icon: '🎬', page: 'knowledge' },
  { id: 'long-tasks',           name: 'Long Tasks 与任务调度优化',                   group: '性能优化',     icon: '⏳', page: 'knowledge' },
  { id: 'perf-build',           name: '构建优化落地方案',                            group: '性能优化',     icon: '📦', page: 'knowledge' },
  { id: 'perf-network',         name: '网络优化落地方案',                            group: '性能优化',     icon: '🌐', page: 'knowledge' },
  { id: 'perf-render',          name: '渲染优化落地方案',                            group: '性能优化',     icon: '🖼️', page: 'knowledge' },
  { id: 'perf-runtime',         name: '运行时优化落地方案',                          group: '性能优化',     icon: '⚡', page: 'knowledge' },
  { id: 'url-to-render',        name: '从 URL 到页面渲染全流程',                     group: '浏览器原理',   icon: '🌐', page: 'knowledge' },
  { id: 'render-process',       name: '渲染进程架构',                               group: '浏览器原理',   icon: '🏗️', page: 'knowledge' },
  { id: 'cache-strategy',       name: '缓存策略（强缓存 / 协商缓存）',               group: '浏览器原理',   icon: '📦', page: 'knowledge' },
  { id: 'cors',                 name: '跨域原理与解决方案',                          group: '浏览器原理',   icon: '🔒', page: 'knowledge' },
  { id: 'auth-token',           name: 'Cookie / Session / Token / JWT',            group: '浏览器原理',   icon: '🔑', page: 'knowledge' },
  { id: 'xss-csrf',             name: 'XSS 与 CSRF 防御',                          group: '浏览器原理',   icon: '🛡️', page: 'knowledge' },
  { id: 'web-worker',           name: 'Web Worker 与 SharedArrayBuffer',           group: '浏览器原理',   icon: '⚙️', page: 'knowledge' },
  { id: 'track-types',          name: '埋点类型（手动 / 自动 / 可视化）',             group: '埋点监控',     icon: '📍', page: 'knowledge' },
  { id: 'pv-uv',                name: 'PV / UV / 停留时长统计',                     group: '埋点监控',     icon: '📊', page: 'knowledge' },
  { id: 'click-stream',         name: '点击流与用户行为序列',                         group: '埋点监控',     icon: '🖱️', page: 'knowledge' },
  { id: 'error-monitor',        name: '错误监控',                                   group: '埋点监控',     icon: '🚨', page: 'knowledge' },
  { id: 'perf-observer',        name: '性能埋点（PerformanceObserver）',             group: '埋点监控',     icon: '⚡', page: 'knowledge' },
  { id: 'white-screen',         name: '白屏检测方案',                               group: '埋点监控',     icon: '🔲', page: 'knowledge' },
  { id: 'report-method',        name: '数据上报方式（beacon / img / xhr）',          group: '埋点监控',     icon: '📡', page: 'knowledge' },
  { id: 'sampling',             name: '采样率与上报策略',                            group: '埋点监控',     icon: '🎲', page: 'knowledge' },
  { id: 'log-aggregation',      name: '前端日志聚合与告警',                          group: '埋点监控',     icon: '🔔', page: 'knowledge' },
  { id: 'prod-only-bug',        name: '线上问题排查思路',                             group: '埋点监控',          icon: '🔬', page: 'knowledge' },
  { id: 'large-tree-render',    name: '大数据树形渲染不卡死',           group: '前端常见疑难问题',   icon: '🌲', page: 'knowledge' },
  { id: 'frontend-idempotency', name: '千万 QPS 下前端幂等性方案',      group: '前端常见疑难问题',   icon: '🔐', page: 'knowledge' },
  { id: 'frontend-architecture', name: '前端架构设计（六大模块）',       group: '前端架构',         icon: '🏛️', page: 'knowledge' },
  { id: 'frontend-cicd',         name: '前端 CI/CD 落地',                group: '前端架构',         icon: '🚀', page: 'knowledge' },
  { id: 'frontend-devops',       name: '从前端角度理解 DevOps',          group: '前端架构',         icon: '🔧', page: 'knowledge' },
  { id: 'frontend-testing',      name: '前端测试体系（七层金字塔）',      group: '前端架构',         icon: '🧪', page: 'knowledge' },

  // ── 开发工具 ──
  { id: 'resize-image',  name: '在线改变图片尺寸',        group: '工具箱',   icon: '🖼️', page: 'tools' },
  { id: 'whistle',       name: 'whistle 抓包',            group: '日常工具', icon: '🔍', page: 'tools' },
  { id: 'switch-hosts',  name: 'SwitchHosts',             group: '日常工具', icon: '🌐', page: 'tools' },
  { id: 'jetbrains-toolbox', name: 'JetBrains Toolbox',  group: '日常工具', icon: '🧰', page: 'tools' },
  { id: 'rtk',           name: 'RTK (Rust Token Killer)', group: 'AI 工具', icon: '🟣', page: 'tools' },
  { id: 'cc-switch',     name: 'cc-switch',             group: 'AI 工具',  icon: '🟣', page: 'tools' },
  { id: 'superpowers',   name: 'Superpowers',           group: 'AI 工具',  icon: '🟣', page: 'tools' },
  { id: 'web-access',    name: 'web-access',      group: 'AI 工具',  icon: '🌐', page: 'tools' },

  // ── AI Coding ──
  { id: 'my-view',              name: '我对 AI Coding 的理解',   group: '认知篇', icon: '💡', page: 'ai-coding' },
  { id: 'industry-impact',      name: '对行业与程序员的影响',     group: '认知篇', icon: '🌊', page: 'ai-coding' },
  { id: 'tool-comparison',      name: '主流工具横评',             group: '工具篇', icon: '🛠', page: 'ai-coding' },
  { id: 'mindset',              name: '使用心法',                 group: '方法篇', icon: '🧠', page: 'ai-coding' },
  { id: 'prompt-skills',        name: '提示词技巧',               group: '方法篇', icon: '✍️', page: 'ai-coding' },
  { id: 'workflow',             name: '工作流实践',               group: '方法篇', icon: '⚙️', page: 'ai-coding' },
  { id: 'vibe-coding',          name: 'Vibe Coding 实用技巧',    group: '方法篇', icon: '🎯', page: 'ai-coding' },
  { id: 'spec-coding',          name: 'Spec Coding 落地实践',    group: '方法篇', icon: '📋', page: 'ai-coding' },
  { id: 'skill-recommendations',       name: 'AI Coding Skill 推荐',  group: '方法篇', icon: '⚡', page: 'ai-coding' },
  { id: 'claude-md-best-practices',   name: 'CLAUDE.md 最佳实践',             group: '方法篇', icon: '📄', page: 'ai-coding' },
  { id: 'claude-md-examples',         name: 'CLAUDE.md 编写示例（前端 & 后端）', group: '方法篇', icon: '📝', page: 'ai-coding' },
  { id: 'claude-code-hooks',          name: 'Claude Code Hooks 及用途',           group: '方法篇', icon: '🪝', page: 'ai-coding' },
  { id: 'limits-risks',               name: '边界与风险',             group: '风险篇', icon: '⚠️', page: 'ai-coding' },

  // ── Java 视角 ──
  { id: 'java-overview',                name: 'Java 概述',                     group: '概述',      icon: '☕', page: 'java' },
  { id: 'java-basics-fundamentals',     name: 'Java 基础知识点',                group: '概述',      icon: '🎓', page: 'java' },
  { id: 'learning-map',                 name: '学习路径总览',                   group: '学习路径',  icon: '🗺️', page: 'java' },
  { id: 'spring-bean-ioc',             name: 'Spring Bean 与 IoC 容器',       group: 'Spring',   icon: '🏭', page: 'java' },
  { id: 'spring-aop',                  name: 'AOP 代理机制',                  group: 'Spring',   icon: '🔗', page: 'java' },
  { id: 'spring-mvc-flow',             name: 'Spring MVC 请求链路',           group: 'Spring',   icon: '🌐', page: 'java' },
  { id: 'knife4j-dto-vo',              name: 'Knife4j 与 DTO/VO 分层',        group: 'Spring',   icon: '📋', page: 'java' },
  { id: 'spring-boot-autoconfig',      name: 'Spring Boot 自动配置原理',      group: 'Spring',   icon: '⚡', page: 'java' },
  { id: 'global-log-interceptor',      name: '全局日志拦截',                  group: 'Spring',   icon: '📋', page: 'java' },
  { id: 'maven-vs-npm',                name: 'Maven vs npm',                  group: '工具链',   icon: '📦', page: 'java' },
  { id: 'spring-boot-vs-vite',         name: 'Spring Boot vs Vite 项目结构', group: '项目结构',  icon: '🏗️', page: 'java' },
  { id: 'spring-transaction-intro',    name: 'Spring Boot 单表事务',          group: '数据库',   icon: '🔒', page: 'java' },
  { id: 'spring-transaction-isolation', name: '事务隔离级别',                 group: '数据库',   icon: '🔬', page: 'java' },
  { id: 'spring-transaction-pitfalls', name: '@Transactional 五大失效场景',   group: '数据库',   icon: '⚠️', page: 'java' },
  { id: 'spring-pessimistic-lock',     name: '悲观锁 FOR UPDATE 与死锁',      group: '数据库',   icon: '🔐', page: 'java' },
  { id: 'spring-redis',                name: 'Redis 整合',                    group: '数据库',   icon: '⚡', page: 'java' },
  { id: 'redis-cache-problems',        name: '缓存三大问题',                  group: '数据库',   icon: '🛡️', page: 'java' },
  { id: 'redisson-distributed-lock',   name: 'Redisson 分布式锁与看门狗',     group: '数据库',   icon: '🔐', page: 'java' },
  { id: 'cache-db-consistency',        name: '缓存与数据库双写一致性',          group: '数据库',   icon: '🔄', page: 'java' },
  { id: 'rabbitmq',                    name: 'RabbitMQ 消息队列',             group: '消息队列',  icon: '🐇', page: 'java' },
  { id: 'mybatis-dynamic-sql',         name: 'MyBatis 动态 SQL',              group: '数据库',   icon: '🧩', page: 'java' },
  { id: 'mybatis-plus',                name: 'MyBatis-Plus 分页与逻辑删除',   group: '数据库',   icon: '🚀', page: 'java' },
  { id: 'java-locks',                  name: 'Java 锁机制速查',               group: 'Java 基础', icon: '🔐', page: 'java' },
  { id: 'java-utils',                  name: '通用工具类',                    group: 'Java 基础', icon: '🧰', page: 'java' },
  { id: 'java-lambda',                 name: 'Lambda 与函数式接口',           group: 'Java 基础', icon: '🔧', page: 'java' },
  { id: 'java-stream',                 name: 'Stream 分组、统计、过滤',       group: 'Java 基础', icon: '🌊', page: 'java' },
  { id: 'distributed-system-overview', name: '分布式系统基础',                group: '分布式',   icon: '🌐', page: 'java' },
  { id: 'cluster-vs-distributed',      name: '集群 vs 分布式',                group: '分布式',   icon: '🏗️', page: 'java' },
  { id: 'cap-base-theorem',            name: 'CAP 与 BASE 理论',             group: '分布式',   icon: '⚖️', page: 'java' },
  { id: 'distributed-transaction',     name: '分布式事务方案',                group: '分布式',   icon: '🔄', page: 'java' },
  { id: 'distributed-id',              name: '分布式 ID 生成',                group: '分布式',   icon: '🆔', page: 'java' },
  { id: 'middleware-overview',         name: '什么是中间件',                  group: '中间件',   icon: '🧩', page: 'java' },
  { id: 'nacos',                       name: 'Nacos 服务发现与配置中心',      group: '中间件',   icon: '🗂️', page: 'java' },
  { id: 'rabbitmq-vs-kafka',           name: 'RabbitMQ vs Kafka',             group: '中间件',   icon: '🐇', page: 'java' },
  { id: 'idempotency',                 name: '幂等性处理机制',                group: '分布式',   icon: '🔁', page: 'java' },

  // ── 部署指南 ──
  { id: 'node-pm2',        name: 'Node.js + PM2',    group: '部署',    icon: '🚀', page: 'deployment' },
  { id: 'go-deploy',       name: 'Go 项目部署',       group: '部署',    icon: '🐹', page: 'deployment' },
  { id: 'frontend-nginx',  name: '前端 + Nginx',      group: '部署',    icon: '🖥️', page: 'deployment' },
  { id: 'mysql',           name: 'MySQL 安装',        group: '数据库',  icon: '🐬', page: 'deployment' },
  { id: 'mongodb-macos',   name: 'MongoDB (macOS)',   group: '数据库',  icon: '🍃', page: 'deployment' },
  { id: 'redis',           name: 'Redis 安装',        group: '数据库',  icon: '🔴', page: 'deployment' },
  { id: 'postgresql',      name: 'PostgreSQL 安装',   group: '数据库',  icon: '🐘', page: 'deployment' },
  { id: 'rabbitmq-macos',  name: 'RabbitMQ (macOS)',  group: '中间件',  icon: '🐇', page: 'deployment' },
  { id: 'k8s-overview',    name: 'K8s 是什么',        group: '容器编排', icon: '☸️', page: 'deployment' },

  // ── Python 视角 ──
  { id: 'python-overview',  name: 'Python 概述',         group: '概述',   icon: '🐍', page: 'python' },
  { id: 'uv-vs-npm',        name: 'uv vs npm',           group: '工具链', icon: '📦', page: 'python' },
  { id: 'python-keywords',  name: 'Python 关键字速查',   group: '语法基础', icon: '🔑', page: 'python' },
  { id: 'python-crawler',   name: 'Python 爬虫',         group: '爬虫',     icon: '🕷️', page: 'python' },
  { id: 'rag-basics',       name: 'RAG 基础概念',         group: 'AI 应用',  icon: '🔍', page: 'python' },

  // ── AI 应用开发 ──
  { id: 'no-rag-context-stuffing',  name: '不用 RAG 全塞上下文',            group: 'RAG',      icon: '📦', page: 'ai-app' },
  { id: 'rag-principle',            name: 'RAG 原理',                       group: 'RAG',      icon: '🔍', page: 'ai-app' },
  { id: 'what-is-agent',            name: '什么是 Agent',                   group: 'Agent',    icon: '🤖', page: 'ai-app' },
  { id: 'agent-work-principle',     name: 'Agent 工作原理（LangChain）',    group: 'Agent',    icon: '⚙️', page: 'ai-app' },

  // ── 踩坑指南 ──
  { id: 'stale-closure',      name: 'useEffect 闭包陷阱',             group: 'Hooks',    icon: '🪤', page: 'pitfalls' },
  { id: 'deps-object',        name: 'deps 传引用类型',                 group: 'Hooks',    icon: '♻️', page: 'pitfalls' },
  { id: 'missing-deps',       name: '漏写 deps',                      group: 'Hooks',    icon: '🔇', page: 'pitfalls' },
  { id: 'ref-not-rerender',   name: 'useRef 修改不触发重渲染',          group: 'Hooks',    icon: '🔄', page: 'pitfalls' },
  { id: 'state-batch',        name: '误解 state 批处理',               group: 'State',    icon: '🎯', page: 'pitfalls' },
  { id: 'state-immutable',    name: '直接修改 state',                  group: 'State',    icon: '✏️', page: 'pitfalls' },
  { id: 'key-anti-pattern',   name: 'key 使用不当',                   group: 'State',    icon: '🔑', page: 'pitfalls' },
  { id: 'render-in-render',   name: '渲染阶段的副作用',                 group: 'State',    icon: '💥', page: 'pitfalls' },
  { id: 'context-perf',       name: 'Context 滥用导致全局重渲',         group: '性能',     icon: '📡', page: 'pitfalls' },
  { id: 'memo-overuse',       name: 'memo / useMemo / useCallback 滥用', group: '性能',   icon: '🧊', page: 'pitfalls' },
  { id: 'transition-priority', name: 'useTransition 优先级误用',       group: '性能',     icon: '🚦', page: 'pitfalls' },
  { id: 'async-setState',     name: '异步操作后 setState 内存泄漏',     group: '生命周期', icon: '💧', page: 'pitfalls' },
  { id: 'conditional-hooks',  name: 'Hook 在条件/循环中调用',           group: '生命周期', icon: '⛔', page: 'pitfalls' },
  { id: 'layout-effect-sync', name: 'useLayoutEffect 阻塞渲染',        group: '生命周期', icon: '⏱️', page: 'pitfalls' },
  { id: 'form-action-state',  name: 'useActionState 返回值混淆',       group: 'React 19', icon: '📝', page: 'pitfalls' },
  { id: 'optimistic-ui',      name: 'useOptimistic 与真实状态同步',    group: 'React 19', icon: '✨', page: 'pitfalls' },
];

// ── 全局筛选弹框 ──────────────────────────────────────────────────────────────

const _pageUrls = {
  knowledge: '/knowledge.html', tools: '/tools.html', 'ai-coding': '/ai-coding.html',
  java: '/java.html', deployment: '/deployment.html', pitfalls: '/pitfalls.html',
  python: '/python.html', 'ai-app': '/ai-app.html',
};

const _pageLabels = {
  knowledge: '知识库', tools: '工具', 'ai-coding': 'AI Coding',
  java: 'Java', deployment: '部署', pitfalls: '踩坑', python: 'Python', 'ai-app': 'AI 应用',
};

function initFilterModal(currentPage, localNavigate) {
  const overlay = document.getElementById('filter-overlay');
  const searchInput = document.getElementById('filter-search-input');
  const filterResults = document.getElementById('filter-results');
  const filterBtn = document.getElementById('filter-btn');
  let highlighted = -1;

  function navigate(id, page) {
    if (page === currentPage) {
      localNavigate(id);
    } else {
      window.location.href = _pageUrls[page] + '?topic=' + id;
    }
  }

  function renderResults(query) {
    const q = query.toLowerCase().trim();
    if (!q) {
      filterResults.innerHTML = '<div class="filter-empty">输入关键字快速跳转...</div>';
      highlighted = -1;
      return;
    }
    const matched = globalTopics.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.group.toLowerCase().includes(q) ||
      (_pageLabels[t.page] || '').toLowerCase().includes(q)
    );
    if (!matched.length) {
      filterResults.innerHTML = '<div class="filter-empty">无匹配结果</div>';
      highlighted = -1;
      return;
    }
    const pageOrder = ['knowledge', 'tools', 'ai-coding', 'java', 'python', 'ai-app', 'deployment', 'pitfalls'];
    let html = '';
    pageOrder.forEach(page => {
      const gi = matched.filter(t => t.page === page);
      if (!gi.length) return;
      html += `<div class="filter-group-label">${_pageLabels[page]}</div>`;
      gi.forEach(t => {
        html += `<div class="filter-item" data-id="${t.id}" data-page="${t.page}">
          <span class="filter-item-icon">${t.icon || ''}</span>
          <span class="filter-item-name">${t.name}</span>
          <span class="filter-item-page">${t.group}</span>
        </div>`;
      });
    });
    filterResults.innerHTML = html;
    highlighted = -1;
    filterResults.querySelectorAll('.filter-item').forEach(el =>
      el.addEventListener('click', () => { navigate(el.dataset.id, el.dataset.page); closeFilter(); }));
  }

  function openFilter() {
    overlay.classList.add('visible');
    searchInput.value = '';
    renderResults('');
    requestAnimationFrame(() => searchInput.focus());
  }
  function closeFilter() { overlay.classList.remove('visible'); }

  function updateHighlight(n) {
    const items = filterResults.querySelectorAll('.filter-item');
    items.forEach(el => el.classList.remove('highlighted'));
    if (n >= 0 && n < items.length) {
      items[n].classList.add('highlighted');
      items[n].scrollIntoView({ block: 'nearest' });
    }
    highlighted = n;
  }

  filterBtn.addEventListener('click', openFilter);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeFilter(); });
  searchInput.addEventListener('input', () => renderResults(searchInput.value));
  searchInput.addEventListener('keydown', e => {
    const items = filterResults.querySelectorAll('.filter-item');
    if (e.key === 'ArrowDown') { e.preventDefault(); updateHighlight(Math.min(highlighted + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); updateHighlight(Math.max(highlighted - 1, 0)); }
    else if (e.key === 'Enter' && highlighted >= 0) { navigate(items[highlighted].dataset.id, items[highlighted].dataset.page); closeFilter(); }
    else if (e.key === 'Escape') closeFilter();
  });
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openFilter(); }
    else if (e.key === 'Escape' && overlay.classList.contains('visible')) closeFilter();
  });
}
