function renderMysqlDdl(t) {
  const conclusion = ruleBox('accent',
    `DDL（Data Definition Language，<strong>数据定义语言</strong>）是 SQL 的子集，专门用来<strong>定义和修改数据库对象的结构</strong>——库、表、列、索引、视图、约束的"骨架"都由 DDL 构建。核心语句只有四个：<code>CREATE</code>（创建）、<code>ALTER</code>（修改）、<code>DROP</code>（删除）、<code>TRUNCATE</code>（清空）。与操作数据的 DML 不同，DDL 改的是<strong>"容器形状"</strong>而非"容器里的东西"，且每条 DDL 在 MySQL 中默认<strong>隐式提交</strong>、不能回滚——这也是大表 ALTER 让 DBA 头疼的根源。`);

  const sqlFamilyRows = [
    ['DDL',  'CREATE / ALTER / DROP / TRUNCATE', '定义结构（表、索引、视图）', '隐式提交，不可回滚'],
    ['DML',  'INSERT / UPDATE / DELETE / REPLACE', '操作行数据',              '可事务包裹，可回滚'],
    ['DQL',  'SELECT / WHERE / JOIN',             '查询数据',                  '只读，不改库结构'],
    ['DCL',  'GRANT / REVOKE / SET PASSWORD',     '权限与账号控制',            '管理谁可以做什么'],
    ['TCL',  'BEGIN / COMMIT / ROLLBACK',         '事务控制',                  '配合 DML 保证原子性'],
  ];

  const sqlFamilyTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell db">分类</div>
        <div class="compare-card-header-cell frontend">代表语句</div>
        <div class="compare-card-header-cell desc">职责</div>
      </div>
      ${sqlFamilyRows.map(([c, s, d]) => `
      <div class="compare-card-row">
        <div class="compare-card-cell db"><strong>${c}</strong></div>
        <div class="compare-card-cell frontend"><code>${s}</code></div>
        <div class="compare-card-cell desc">${d}</div>
      </div>`).join('')}
    </div>
    <p style="font-size:12px;color:var(--text-muted);margin-top:8px;line-height:1.7">
      一句话区分：<strong>DDL 管"骨架"，DML 管"血肉"</strong>。改字段类型是 DDL（动结构）；改某行的字段值是 DML（动数据）。
    </p>`;

  const coreCmd = `-- ─── 数据库（Schema）级 DDL ─────────────────────────────
CREATE DATABASE shop
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

ALTER DATABASE shop CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
DROP DATABASE shop;     -- 慎用！连表带数据全删

-- ─── 表级 DDL ─────────────────────────────────────────────
CREATE TABLE orders (
  id            BIGINT       NOT NULL AUTO_INCREMENT,
  user_id       BIGINT       NOT NULL,
  amount        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status        VARCHAR(20)  NOT NULL DEFAULT 'CREATED',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_amount (user_id, amount),
  KEY idx_status_created (status, created_at),
  CONSTRAINT chk_amount_positive CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 加列 / 删列 / 改列名 / 改类型
ALTER TABLE orders
  ADD COLUMN remark VARCHAR(200) NULL AFTER status,
  DROP COLUMN remark,
  CHANGE COLUMN amount total_amount DECIMAL(12,2) NOT NULL,
  MODIFY COLUMN status VARCHAR(32) NOT NULL;

-- 改表名 / 改引擎 / 改字符集
RENAME TABLE orders TO order_info;
ALTER TABLE orders ENGINE = InnoDB;
ALTER TABLE orders CONVERT TO CHARACTER SET utf8mb4;

-- 清空表（DDL！不是 DML）
TRUNCATE TABLE orders;   -- 自增 ID 重置为 1，无法回滚，比 DELETE 快

-- 删表
DROP TABLE orders;

-- ─── 索引 / 视图 DDL ──────────────────────────────────────
CREATE INDEX idx_user_status ON orders(user_id, status);
CREATE UNIQUE INDEX uk_order_no ON orders(order_no);
DROP INDEX idx_user_status ON orders;

CREATE VIEW v_paid_orders AS
  SELECT user_id, COUNT(*) AS paid_cnt
  FROM orders WHERE status = 'PAID' GROUP BY user_id;
DROP VIEW v_paid_orders;`;

  const truncateRows = [
    ['TRUNCATE', 'DDL',  '整表清空，自增重置',     '直接释放数据页，不记 binlog 行',     '快（毫秒级）',     '不可回滚'],
    ['DELETE',   'DML',  '按条件删行，自增保留',   '逐行记 undo log + binlog',          '慢（逐行扫描）',   '可事务回滚'],
    ['DROP',     'DDL',  '删表结构 + 数据 + 索引', '直接删 .ibd 文件',                  '快',              '不可回滚'],
  ];

  const truncateTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell db">语句</div>
        <div class="compare-card-header-cell frontend">类型</div>
        <div class="compare-card-header-cell desc">作用</div>
      </div>
      ${truncateRows.map(([s, ty, d]) => `
      <div class="compare-card-row">
        <div class="compare-card-cell db"><code>${s}</code></div>
        <div class="compare-card-cell frontend">${ty}</div>
        <div class="compare-card-cell desc">${d}</div>
      </div>`).join('')}
    </div>
    <p style="font-size:12px;color:var(--text-muted);margin-top:8px;line-height:1.7">
      <strong>经典面试题</strong>：<code>DELETE FROM t</code> vs <code>TRUNCATE t</code> —— 前者是 DML，逐行删除并写 undo/binlog，可回滚但慢；后者是 DDL，直接重建表，自增归零，不可回滚但极快。生产清空数据首选 TRUNCATE，但务必先备份。
    </p>`;

  const onlineDdlHtml = `
    <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:16px 18px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:10px">MySQL 8.0 Online DDL：大表 DDL 的"救命稻草"</div>
      <pre style="margin:0;background:transparent;color:var(--text-secondary);font-size:12.5px;line-height:1.7"><code>-- 老版本 MySQL 5.5 之前：ALTER TABLE 需锁表 + 重建全表
--   一张 10 亿行的表 ALTER 可能锁几小时，业务直接停摆

-- MySQL 5.6+ 引入 Online DDL，8.0 进一步完善：
--   INPLACE：不复制全表，原地修改（部分操作支持）
--   INSTANT：仅改元数据，瞬间完成（8.0 新增，加列/删列等）

-- 查看某个 DDL 使用的算法
ALTER TABLE orders ADD COLUMN remark VARCHAR(200),
  ALGORITHM=INSTANT, LOCK=NONE;
--   ALGORITHM=COPY     → 老办法，建临时表 + 复制（最慢，锁表）
--   ALGORITHM=INPLACE  → 原地修改（部分锁，大部分场景够用）
--   ALGORITHM=INSTANT  → 元数据修改（秒级，零锁）
--   LOCK=NONE          → 不锁表，业务可正常 DML
--   LOCK=SHARED        → 共享锁，可读不可写
--   LOCK=EXCLUSIVE     → 独占锁，读写全停

-- 8.0 支持 INSTANT 的操作：
--   • 加列（末尾）/ 删列（8.0.29+）
--   • 重命名列
--   • 修改列默认值
--   • 修改 ENUM/SET 常量
--   • 设置或删除列的 invisible 属性

-- 仍需 COPY/INPLACE 的"重活"：
--   • 修改列类型（INT → BIGINT）
--   • 修改字符集 / 排序规则
--   • 加主键 / 修改主键
--   • 行格式变更</code></pre>
    </div>
    <p style="font-size:12.5px;color:var(--text-secondary);line-height:1.7;margin:0">
      <strong style="color:var(--text-primary)">Online DDL 不是万能</strong>：① 仍会产生 <code>redo log</code> 与 <code>binlog</code>，大表 DDL 期间磁盘 IO 与主从延迟会飙升；② 主从架构下，从库重放 DDL 是单线程，主从延迟可达几小时；③ 中途失败会留下临时表，需手动清理。生产大表 DDL 仍推荐使用 <strong>gh-ost / pt-osc</strong>。
    </p>`;

  const bigTableCmd = `-- ─── 生产大表 DDL 的三种方案 ────────────────────────────

-- 方案 1：原生 Online DDL（小改动优先）
ALTER TABLE orders ADD COLUMN remark VARCHAR(200),
  ALGORITHM=INSTANT, LOCK=NONE;

-- 方案 2：pt-online-schema-change（Percona Toolkit）
--   原理：建影子表 + 触发器同步增量 + 分批 chunk 拷贝 + rename
pt-online-schema-change \\
  --alter "ADD COLUMN remark VARCHAR(200)" \\
  --host=127.0.0.1 --user=dba --ask-pass \\
  D=shop,t=orders --execute

-- 方案 3：gh-ost（GitHub 出品，推荐）
--   原理：建影子表 + 解析 binlog 同步增量 + 分批 chunk 拷贝 + rename
--   不用触发器，对主库压力更小，可暂停 / 动态调速率
gh-ost --host=127.0.0.1 --user=dba --database=shop --table=orders \\
  --alter "ADD COLUMN remark VARCHAR(200)" \\
  --execute --exact-rowcount --throttle-control-replicas=slave1,slave2

-- ─── 关键监控点 ──────────────────────────────────────────
SHOW PROCESSLIST;                              -- 查看 DDL 进度
SHOW EVENTS;                                   -- gh-ost 注册的心跳事件
SELECT * FROM information_schema.INNODB_METRICS
  WHERE name LIKE 'ddl%';                      -- DDL 阶段指标

-- ─── DDL 期间出问题怎么停 ────────────────────────────────
--   原生 Online DDL：KILL <connection_id> 可能留下临时表 #sql-xxxx
--   pt-osc：直接 KILL，触发器需手动清理
--   gh-ost：发送 SIGTERM，会优雅退出并清理影子表`;

  const trapBox = ruleBox('warning',
    `<strong>DDL 高频踩坑清单</strong>：<br>
    ① <strong>DDL 隐式提交</strong>：哪怕在 <code>BEGIN ... ROLLBACK</code> 中间执行 DDL，事务会被立刻提交，<code>ROLLBACK</code> 救不回来。<strong>DDL 永远不可回滚</strong>。<br>
    ② <strong>大表 ALTER 锁库</strong>：5.5 之前 ALTER 全程锁表；5.6+ Online DDL 改善但仍有部分操作需 COPY。线上务必先确认 ALGORITHM。<br>
    ③ <strong>TRUNCATE 误清生产</strong>：TRUNCATE 不可回滚且重置自增 ID。误操作常用 <code>binlog2sql</code> 反向解析恢复，但代价极高。<br>
    ④ <strong>主从延迟雪崩</strong>：主库 5 分钟跑完的 DDL，从库单线程重放可能要 1 小时。大表 DDL 建议先在从库执行，再切换主从角色（轮转升级）。<br>
    ⑤ <strong>字段类型变更风险</strong>：<code>VARCHAR(10) → VARCHAR(20)</code> 安全；但 <code>VARCHAR(10) → INT</code> 或反向会触发 COPY，且数据截断/格式错误会让 DDL 失败。<br>
    ⑥ <strong>忘加 IF EXISTS / IF NOT EXISTS</strong>：脚本重跑会因表已存在报错中断。迁移脚本推荐 <code>CREATE TABLE IF NOT EXISTS</code> / <code>DROP TABLE IF EXISTS</code>。<br>
    ⑦ <strong>字符集与 collation 不一致</strong>：JOIN 两张表字符集不同会导致索引失效、隐式转换。统一用 <code>utf8mb4 + utf8mb4_0900_ai_ci</code>。<br>
    ⑧ <strong>外键约束</strong>：删父表前必须先删子表或 <code>SET FOREIGN_KEY_CHECKS=0</code>。生产环境通常禁用外键，由应用层保证一致性。`);

  return articleShell(t, `
    ${section('什么是 DDL', conclusion)}
    ${section('SQL 五大语言家族：DDL 在哪', sqlFamilyTable)}
    ${section('DDL 核心语法速查', codeBlock('SQL · 数据库/表/索引/视图 DDL', 'dot-blue', 'sql', coreCmd))}
    ${section('TRUNCATE vs DELETE vs DROP', truncateTable)}
    ${section('MySQL 8.0 Online DDL：大表 ALTER 不再锁库', `<div class="section-body">${onlineDdlHtml}</div>`)}
    ${section('生产大表 DDL：pt-osc 与 gh-ost', codeBlock('运维 · 大表 DDL 三种方案', 'dot-orange', 'bash', bigTableCmd))}
    ${section('DDL 高频踩坑清单', trapBox)}`);
}
