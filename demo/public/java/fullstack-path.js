function renderFullstackPath(t) {
  const conclusion = ruleBox('accent',
    `<strong>全栈不是"把后端所有东西都学一遍"，而是建立"从需求到上线"的完整链路思维。</strong><br><br>
    前端已有的能力（组件化、模块化、TS、HTTP、构建工具）可以直接迁移；真正要补的是<strong>服务端独有视角</strong>：数据持久化、并发与事务、服务依赖、可观测性、上线回滚。`);

  // ── 转全栈的五个阶段 ────────────────────────────────────────────────────────────

  const stageRows = [
    ['阶段 1 · 工程化复用',      'TS / 构建 / 模块化 / HTTP',          '前端能力直接迁移，无学习成本'],
    ['阶段 2 · Spring Boot 入门', 'IoC / MVC / Bean 生命周期 / 注解',    '类比组件，但生命周期更长更复杂'],
    ['阶段 3 · 数据访问层',      'MyBatis / 事务 / 索引 / 分页',         '后端核心：数据一致性与并发'],
    ['阶段 4 · 中间件与分布式',  'Redis / MQ / 分布式锁 / RPC',          '解决单机扛不住的问题'],
    ['阶段 5 · 部署与可观测',    'Docker / K8s / 监控 / 日志 / 链路',    '"上线"只是开始，不是结束'],
  ];
  const stageTable = compareCard(stageRows, ['阶段', '核心内容', '为什么需要']);

  // ── 遇到需求时的六层分析法 ──────────────────────────────────────────────────────

  const layers = [
    { icon: '🎯', name: '需求层',     ask: '解决什么问题？边界、异常分支、权限、性能预期',  fe: '需求评审 / PRD' },
    { icon: '🔌', name: '接口层',     ask: '入参、出参、状态码、鉴权、版本、幂等',           fe: 'API 文档 / Swagger' },
    { icon: '🗄️', name: '数据层',     ask: '表结构、索引、读写量、缓存策略、迁移',           fe: '状态管理设计' },
    { icon: '🧩', name: '服务依赖层', ask: '依赖哪些 RPC / MQ / 第三方？降级与超时？',         fe: '微前端通信' },
    { icon: '🧪', name: '验证层',     ask: '单测、集成测、边界用例、灰度',                   fe: 'E2E 测试' },
    { icon: '🚀', name: '上线层',     ask: '配置开关、灰度、回滚、监控、告警',               fe: '发布流程' },
  ];

  const layersHtml = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:4px">
      ${layers.map(l => `
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span style="font-size:18px">${l.icon}</span>
          <span style="font-size:13px;font-weight:600;color:var(--text-primary)">${l.name}</span>
        </div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          <div style="margin-bottom:4px"><strong style="color:var(--accent-light)">问什么：</strong>${l.ask}</div>
          <div><strong style="color:var(--accent-light)">前端类比：</strong>${l.fe}</div>
        </div>
      </div>`).join('')}
    </div>`;

  const layerNote = ruleBox('info',
    `<strong>六层不是流程图，是检查清单。</strong>接到需求时按顺序过一遍，每一层都能产出明确的"答案"再开始写代码。
    前端类比：你写组件前也会先想 props / state / 边界 / 交互 / 兼容——只是后端的边界更宽、代价更大。`);

  // ── 实例：用户下单走六层 ────────────────────────────────────────────────────────

  const exampleBox = ruleBox('warning',
    `<strong>实例：用户下单功能，六层怎么走？</strong><br><br>
    ① <strong>需求层</strong>：扣库存、生成订单、发通知；超卖怎么办？允许重复下单吗？<br>
    ② <strong>接口层</strong>：<code>POST /api/orders</code>，入参 <code>{skuId, qty}</code>，出参 <code>{orderId, status}</code>；401 鉴权失败、409 库存不足。<br>
    ③ <strong>数据层</strong>：<code>orders</code> + <code>inventory</code> 两张表，扣减用乐观锁或 <code>FOR UPDATE</code>；热点商品缓存预扣。<br>
    ④ <strong>服务依赖层</strong>：用户服务取地址、优惠券服务核销、MQ 通知仓储；任一依赖超时要有降级。<br>
    ⑤ <strong>验证层</strong>：库存为 0、负数、并发下单、幂等重复点击的集成测试。<br>
    ⑥ <strong>上线层</strong>：灰度 10% → 50% → 100%；监控下单失败率、库存负数告警；一键回滚到旧版本。`);

  // ── 心态转变 ────────────────────────────────────────────────────────────────────

  const mindsetBox = ruleBox('danger',
    `<strong>最大的心态转变：从"做完页面"到"对功能负责到底"。</strong><br><br>
    • 前端视角：接口是别人给我的，我渲染。<br>
    • 全栈视角：接口是我设计的，我为它的<strong>正确性、性能、可用性</strong>负责。<br><br>
    视角一变，写代码时自然会问：这条数据从哪来？写错了怎么办？挂了怎么恢复？——这就是全栈思维。`);

  return articleShell(t, `
    ${section('一句话结论', conclusion)}
    ${section('转全栈的五个阶段', stageTable)}
    ${section('遇到需求时的六层分析法', layersHtml + layerNote)}
    ${section('实例：用户下单走六层', exampleBox)}
    ${section('最大的心态转变', mindsetBox)}`);
}
