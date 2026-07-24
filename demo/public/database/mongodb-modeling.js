function renderMongodbModeling(t) {
  const conclusion = ruleBox('success',
    `MongoDB 数据建模的核心是<strong>"以查询驱动设计"</strong>——先想清楚应用怎么读、怎么写、怎么扩展，再决定文档怎么存。这与 MySQL 的"先建表再写 SQL"截然相反。掌握<strong>嵌套 vs 引用</strong>的权衡、6 种 Schema 设计模式、ObjectId 的奥秘、9 种索引类型，是 MongoDB 建模的基本功。`);

  const bsonHtml = `
    <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:16px 18px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:10px">BSON 类型速查</div>
      <pre style="margin:0;background:transparent;color:var(--text-secondary);font-size:12.5px;line-height:1.7"><code>// BSON = Binary JSON，比 JSON 多支持以下类型：

// 1. ObjectId：12 字节主键
//   [4 字节时间戳][5 字节随机值][3 字节自增计数器]
//   → 天然有序、分布式友好、可从 _id 反推创建时间
ObjectId('65f3a2b1c1d2e3f4a5b6c7d8')

// 2. Date：毫秒精度时间
new Date()             // ISODate('2026-07-19T...')

// 3. Decimal128：128 位高精度十进制（金融场景）
NumberDecimal('99.99')

// 4. BinData：二进制数据
BinData(0, 'base64...')

// 5. Regex：正则
/abc/i

// 6. Timestamp：内部复制用（不同于 Date）
Timestamp(1721300000, 1)

// 7. 普通类型：String / Number (Int32/Int64/Double) / Boolean / Null / Array / Object

// 文档最大 16MB，超过用 GridFS（拆分成多个 chunk）</code></pre>
    </div>
    <p style="font-size:12.5px;color:var(--text-secondary);line-height:1.7;margin:0">
      <strong style="color:var(--text-primary)">ObjectId 为何优于自增 ID？</strong>① 含时间戳，可从 _id 排序获得插入顺序，省去单独的 createdAt 字段；② 多节点生成不冲突，分片集群友好；③ 不需要中心化的 ID 分配器。代价是 24 字符长度比 BIGINT 大，索引稍慢。
    </p>`;

  const embedVsRefRows = [
    ['嵌套（Embedded）', '把关联数据存在同一文档内', '一对一、一对少量、读多写少、强一致性', '文章 + 评论、订单 + 商品明细', '读快（一次查询）、原子写', '文档膨胀、单文档 16MB 上限、更新重复数据'],
    ['引用（Referencing）', '存 _id 指针，类似 MySQL 外键', '一对多大量、多对多、数据频繁变化', '用户 + 订单、商品 + 分类', '文档小、避免数据冗余、独立更新', '需多次查询或 $lookup、无外键约束'],
    ['混合（Hybrid）', '部分嵌套 + 部分引用', '复杂业务，热点字段内联、冷数据外联', '用户文档内嵌最近 10 条订单 + 全量订单引用', '兼顾读写性能', '需要应用层维护一致性'],
  ];

  const embedVsRefTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell db">模式</div>
        <div class="compare-card-header-cell frontend">机制</div>
        <div class="compare-card-header-cell desc">权衡</div>
      </div>
      ${embedVsRefRows.map(r => `
      <div class="compare-card-row">
        <div class="compare-card-cell db">${r[0]}</div>
        <div class="compare-card-cell frontend">${r[1]}</div>
        <div class="compare-card-cell desc">${r[5]}</div>
      </div>`).join('')}
    </div>
    <p style="font-size:12px;color:var(--text-muted);margin-top:8px;line-height:1.7">
      <strong>经验法则</strong>：子文档不独立访问 → 嵌套；子文档独立访问或数量大 → 引用；不确定 → 先嵌套（读写快），性能/容量瓶颈时再拆。MongoDB 4.4+ 的 <code>$lookup</code> 性能大幅提升，引用模式的代价在降低。
    </p>`;

  const patternHtml = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:13px;font-weight:600;color:var(--accent);margin-bottom:8px">① 嵌套文档模式</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          一对少的关系直接嵌套。<br><br>
          <code>{ title, author:{name,bio}, comments:[...] }</code><br><br>
          适合：评论数有上限（如 100 条）、整体读取。
        </div>
      </div>
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:13px;font-weight:600;color:var(--blue);margin-bottom:8px">② 子集模式（Subset）</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          嵌套最近 N 条 + 引用全量。<br><br>
          <code>{ user, recent_orders:[最近 10 条], order_count }</code><br><br>
          适合：列表页只看最近几条，详情页才看全部。
        </div>
      </div>
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:13px;font-weight:600;color:var(--green);margin-bottom:8px">③ 扩展引用模式</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          引用 + 内联热点字段，避免 $lookup。<br><br>
          <code>{ product_id, product_name, product_price, ... }</code><br><br>
          适合：频繁一起显示但需独立更新。
        </div>
      </div>
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:13px;font-weight:600;color:var(--red);margin-bottom:8px">④ 多态模式</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          同集合存不同类型文档。<br><br>
          <code>{ type:'pdf', ... } { type:'video', duration }</code><br><br>
          适合：共享查询入口但字段差异大。
        </div>
      </div>
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:13px;font-weight:600;color:var(--yellow);margin-bottom:8px">⑤ 桶模式（Bucket）</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          时序数据按时间分桶聚合。<br><br>
          <code>{ sensor_id, date, readings:[{t,v},...] }</code><br><br>
          适合：IoT、监控数据，1 个文档存 1 小时数据。
        </div>
      </div>
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:13px;font-weight:600;color:var(--accent);margin-bottom:8px">⑥ 计算模式</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          预聚合冗余字段。<br><br>
          <code>{ user_id, total_orders, total_amount, ... }</code><br><br>
          适合：读多写少，避免实时聚合。
        </div>
      </div>
    </div>`;

  const indexRows = [
    ['单字段索引',       '{ field: 1 }',                 '等值 / 范围查询',                       '最基础，遵循 ESR 规则'],
    ['复合索引',         '{ a: 1, b: -1 }',              '多字段组合查询',                        '最左前缀，最多 32 字段'],
    ['多键索引',         '数组字段自动多键',              '查询数组元素',                          '建在数组字段上自动生效'],
    ['文本索引',         '{ content: "text" }',          '全文检索 / 分词',                       '中文需配分词器或用 Atlas Search'],
    ['地理空间索引',     '2d / 2dsphere',                '"附近的人"、LBS 查询',                  '2dsphere 支持地球球面'],
    ['哈希索引',         '{ field: "hashed" }',          '分片键 / 等值查询',                     '不支持范围，散列均匀'],
    ['TTL 索引',         '{ createdAt: 1 } + expireAfterSecs', '会话、日志自动过期',           '后台每 60s 清理一次'],
    ['唯一索引',         '{ email: 1 } + unique:true',   '业务唯一约束',                          '插入重复抛错'],
    ['稀疏索引',         '{ optional_field: 1 } + sparse:true', '跳过无此字段的文档',            '省空间，适合可选字段'],
  ];

  const indexTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell db">索引类型</div>
        <div class="compare-card-header-cell frontend">语法</div>
        <div class="compare-card-header-cell desc">适用</div>
      </div>
      ${indexRows.map(r => `
      <div class="compare-card-row">
        <div class="compare-card-cell db">${r[0]}</div>
        <div class="compare-card-cell frontend"><code>${r[1]}</code></div>
        <div class="compare-card-cell desc">${r[2]}</div>
      </div>`).join('')}
    </div>`;

  const esrBox = ruleBox('info',
    `<strong>ESR 规则（Compound Index 设计黄金法则）</strong>：复合索引字段顺序按 <strong>Equality → Sort → Range</strong> 排列：<br>
    ① <strong>E（Equality）</strong>：等值查询字段放最前，能把候选集快速缩到最小；<br>
    ② <strong>S（Sort）</strong>：排序字段放中间，让索引天然有序，避免内存排序；<br>
    ③ <strong>R（Range）</strong>：范围查询字段放最后，范围会"切断"后续字段的索引使用。<br>
    例：<code>db.orders.find({ userId, status, createdAt:{$gte:...} }).sort({ createdAt:-1 })</code> → 索引应为 <code>{ userId:1, status:1, createdAt:-1 }</code>。`);

  const schemaCmd = `// Schema 校验器（3.2+）：在 DB 层兜底，防止脏数据
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'email'],
      properties: {
        name:    { bsonType: 'string', maxLength: 50 },
        email:   { bsonType: 'string', pattern: '^.+@.+\\\\..+$' },
        age:     { bsonType: 'int', minimum: 0, maximum: 150 },
        role:    { enum: ['admin', 'user', 'guest'] },
        tags:    { bsonType: 'array', items: { bsonType: 'string' } }
      }
    }
  },
  validationLevel: 'strict',       // insert/update 都校验
  validationAction: 'error'       // 校验失败拒绝写入（'warn' 仅警告）
});

// 已有集合加校验器
db.runCommand({
  collMod: 'users',
  validator: { $jsonSchema: { ... } }
});

// 应用层（Mongoose）：定义 Schema 与钩子
const userSchema = new Schema({
  name:  { type: String, required: true, maxlength: 50 },
  email: { type: String, required: true, match: /^.+@.+\..+$/ },
  age:   { type: Number, min: 0, max: 150 }
});
userSchema.pre('save', function() {
  if (this.isModified('email')) this.email = this.email.toLowerCase();
});`;

  const antiHtml = `
    <ul style="margin:0;padding-left:20px;font-size:12.5px;color:var(--text-secondary);line-height:1.9">
      <li><strong>无限增长的数组</strong>：把所有评论嵌套在文章文档里，热门文章文档膨胀到 MB 级 → 读写慢、迁移难。改用子集模式或单独的 comments 集合</li>
      <li><strong>过度规范化</strong>：把 MongoDB 当 MySQL 用，所有关系都引用 → 大量 $lookup，性能不如直接 JOIN。MongoDB 鼓励适度冗余</li>
      <li><strong>热点字段频繁更新</strong>：在文档里维护实时计数器，高并发更新同一文档 → 锁竞争。用 <code>$inc</code> 原子操作或分离到独立集合</li>
      <li><strong>大文档</strong>：单个文档接近 16MB 上限 → 索引膨胀、网络传输慢。GridFS 或拆分</li>
      <li><strong>字段名过长</strong>：MongoDB 字段名也占存储空间（每文档都存）。生产环境避免 <code>userInformationDetails</code> 这种长名</li>
      <li><strong>类型不一致</strong>：同一字段有的存 String 有的存 Number → 索引失效、查询诡异。Schema 校验器兜底</li>
      <li><strong>使用 ObjectId 当业务键</strong>：业务对外暴露 _id 暴露创建时间戳和机器信息。敏感场景用独立 UUID</li>
    </ul>`;

  return articleShell(t, `
    ${section('建模的本质', conclusion)}
    ${section('BSON 类型与 ObjectId', `<div class="section-body">${bsonHtml}</div>`)}
    ${section('嵌套 vs 引用：建模第一抉择', embedVsRefTable)}
    ${section('6 种 Schema 设计模式', `<div class="section-body">${patternHtml}</div>`)}
    ${section('9 种索引类型', indexTable)}
    ${section('ESR 规则：复合索引黄金法则', esrBox)}
    ${section('Schema 校验：DB 层 + 应用层双保险', codeBlock('MongoDB · 校验器与 Mongoose', 'dot-green', 'javascript', schemaCmd))}
    ${section('建模反模式', `<div class="section-body">${antiHtml}</div>`)}`);
}
