function renderClusterVsDistributed(t) {

  const conclusion = ruleBox('info',
    `<strong>一句话区分：</strong><br>
    • <strong>集群（Cluster）</strong>：多台机器跑<em>同一个</em>应用，对外是"一台更强"——核心目的是<strong>高可用 + 负载均衡</strong>。<br>
    • <strong>分布式（Distributed）</strong>：多台机器跑<em>不同</em>应用（或不同部分），协作完成任务——核心目的是<strong>分治 + 扩展</strong>。<br><br>
    前端类比：CDN 边缘节点是"集群"（每台都返回同一个 a.js），微前端各子应用是"分布式"（每个子应用负责不同页面）。`);

  // ── 对比表 ──────────────────────────────────────────────────────────────────────

  const compareRows = [
    ['部署形态',    '多台机器跑同一份代码',             '多台机器跑不同服务'],
    ['目标',        '高可用、扩容、负载均衡',            '业务拆分、解耦、扩展'],
    ['是否同构',    '通常同构（同一镜像）',              '通常异构（不同语言/技术栈）'],
    ['机器间通信',  '通常不需要（无状态）',              '必须（RPC/MQ 调用）'],
    ['单台宕机',    '其他机器顶上，用户无感知',          '需熔断/降级，否则调用方报错'],
    ['典型例子',    'Tomcat 集群、Redis 主从、MySQL 主从',  '微服务架构、订单+支付+库存'],
    ['复杂度',      '低（运维为主）',                    '高（涉及一致性、事务、链路）'],
    ['前端类比',    '多 CDN 节点缓存同一份 JS',          '微前端：订单、商品、营销子应用'],
  ];
  const compareTable = compareCard(compareRows, ['维度', '集群', '分布式']);

  // ── 关系澄清 ────────────────────────────────────────────────────────────────────

  const relationBox = ruleBox('accent',
    `<strong>集群和分布式不是互斥的，而是"层叠关系"。</strong><br><br>
    真实生产系统通常是<strong>分布式 + 集群</strong>：<br>
    订单服务（分布式的一部分）→ 内部部署 3 台机器（订单服务集群）<br><br>
    可以理解为：<br>
    • 集群是"横向复制"<br>
    • 分布式是"纵向切分"<br>
    • 两者叠加 = 高可用 + 高扩展的现代后端架构`);

  // ── 负载均衡 ────────────────────────────────────────────────────────────────────

  const lbRows = [
    ['轮询 (Round Robin)',      '依次分配',                 '请求均匀、最简单，不看机器负载'],
    ['加权轮询',                '按机器性能加权',            '8 核机器分 8 份、4 核机器分 4 份'],
    ['最小连接',                '分配给当前连接数最少的机器',   '长连接场景（数据库连接池）更合理'],
    ['IP Hash',                 '同一 IP 固定到同一台机器',    'Session 粘性，但有热点风险'],
    ['一致性 Hash',             '环上 Hash 落点固定',         '节点增减只影响相邻段，缓存常用'],
    ['随机',                    '随机分配',                  '简单，量大时趋近均匀'],
  ];
  const lbTable = compareCard(lbRows, ['策略', '原理', '适用场景']);

  // ── 负载均衡层次 ────────────────────────────────────────────────────────────────

  const lbLayerRows = [
    ['DNS 负载均衡',  '同一域名解析到多个 IP',          'www.example.com → 北京/上海机房 IP'],
    ['LVS / Nginx',   '四层 / 七层反向代理',             'Nginx upstream 转发到多台 Tomcat'],
    ['网关层',        'Spring Cloud Gateway',           '路由、鉴权、限流，再转发到服务集群'],
    ['服务间',        'Ribbon / LoadBalancer',          '微服务调用时从注册中心选一台实例'],
    ['数据库',        'MyCat / ShardingSphere',          '读写分离、分库分表'],
  ];
  const lbLayerTable = compareCard(lbLayerRows, ['层次', '工具', '示例']);

  // ── 集群脑裂 ────────────────────────────────────────────────────────────────────

  const splitBrainBox = ruleBox('danger',
    `<strong>集群脑裂（Split-Brain）：网络分区导致集群分裂为两个独立子集群。</strong><br><br>
    典型场景：MySQL 主从，主从之间网络断开 → 从库认为主库宕机，自己升为主 → 现在有两个主库同时接受写入 → 网络恢复后数据冲突。<br><br>
    <strong>解决方案：</strong><br>
    • <strong>多数派投票</strong>（Raft / Paxos）：节点数必须奇数（3/5/7），获得多数票才能成为 Leader<br>
    • <strong> fencing</strong>：升级主库前先强制关掉旧主（STONITH）<br>
    • <strong>仲裁节点</strong>：第三个机房部署无数据仲裁者，分区时决定谁是主`);

  // ── 前端类比 ────────────────────────────────────────────────────────────────────

  const feCode = `// 前端"集群"：CDN 多节点缓存同一份资源
// 用户访问 cdn.example.com/a.js
// DNS 会根据用户地理位置返回最近的边缘节点 IP
// 任意节点都能返回相同的 a.js → 高可用 + 就近访问

// 前端"分布式"：微前端架构
// 主应用 shell 加载子应用 order / product / marketing
// 每个子应用独立部署、独立技术栈、独立团队维护
// 子应用之间通过 CustomEvent 通信，类似后端 RPC`;

  const feCodeBlock = codeBlock('前端视角：集群与分布式的影子', 'dot-blue', 'javascript', feCode);

  // ── 选型建议 ────────────────────────────────────────────────────────────────────

  const selectionBox = ruleBox('success',
    `<strong>什么时候用集群？什么时候上分布式？</strong><br><br>
    • <strong>初期</strong>：单体跑得动，最多做主从读写分离（轻集群）<br>
    • <strong>流量上来</strong>：Nginx + 多台 Tomcat 集群（无状态化 + Session 共享 Redis）<br>
    • <strong>团队超过 3 个 Pizza Team</strong>：按业务域拆微服务（分布式）<br>
    • <strong>每个微服务内部</strong>：再各自部署集群（分布式 + 集群叠加）<br><br>
    口诀：<strong>先集群，后分布式；分布式之后每个节点再集群。</strong>`);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('集群 vs 分布式：八大维度对比', compareTable)}
    ${section('关系：不是二选一，而是层叠', relationBox)}
    ${section('负载均衡策略', lbTable)}
    ${section('负载均衡层次', lbLayerTable)}
    ${section('集群脑裂：分区时的致命问题', splitBrainBox)}
    ${section('前端类比', feCodeBlock)}
    ${section('选型建议', selectionBox)}`);
}
