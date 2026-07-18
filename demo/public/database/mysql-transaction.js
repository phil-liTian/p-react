function renderMysqlTransaction(t) {
  const conclusion = ruleBox('success',
    `事务是 MySQL 区别于 NoSQL 的<strong>核心能力</strong>——把多条操作打包成"要么全成功要么全失败"的原子单元。InnoDB 实现 ACID 的关键技术是 <strong>redo log（持久性）</strong>、<strong>undo log（原子性 + MVCC）</strong>、<strong>MVCC 多版本并发控制（隔离性）</strong>、<strong>行级锁 + 间隙锁（隔离性）</strong>。理解事务与锁就理解了"为什么两个并发事务会死锁"、"为什么默认隔离级别是 RR 而不是 RC"、"为什么 SELECT 也能被阻塞"。`);

  const acidHtml = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:13px;font-weight:600;color:var(--accent);margin-bottom:8px">A · Atomicity 原子性</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          事务要么全做要么全不做。<br><br>
          <strong style="color:var(--text-primary)">实现：undo log</strong>，记录旧版本数据。回滚时按 undo log 反向恢复。<br><br>
          <span style="color:var(--text-muted)">例：转账扣款 + 加款若失败，按 undo log 恢复扣款前的余额。</span>
        </div>
      </div>
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:13px;font-weight:600;color:var(--blue);margin-bottom:8px">C · Consistency 一致性</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          事务前后数据约束不被破坏。<br><br>
          <strong style="color:var(--text-primary)">实现：A + I + D 共同保证</strong> + 应用层约束（外键、CHECK、唯一索引）。<br><br>
          <span style="color:var(--text-muted)">例：转账前后两人余额总和不变。</span>
        </div>
      </div>
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:13px;font-weight:600;color:var(--green);margin-bottom:8px">I · Isolation 隔离性</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          并发事务互不干扰。<br><br>
          <strong style="color:var(--text-primary)">实现：MVCC + 锁</strong>。读用 MVCC 快照、写用行级锁。<br><br>
          <span style="color:var(--text-muted)">4 级隔离见下节。</span>
        </div>
      </div>
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:13px;font-weight:600;color:var(--red);margin-bottom:8px">D · Durability 持久性</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          提交后即使宕机也不丢。<br><br>
          <strong style="color:var(--text-primary)">实现：redo log + WAL</strong>（Write-Ahead Logging）。事务提交先写 redo log 并刷盘，数据页可以延迟刷盘。<br><br>
          <span style="color:var(--text-muted)">"双 1"：innodb_flush_log_at_trx_commit=1 + sync_binlog=1。</span>
        </div>
      </div>
    </div>`;

  const isolationRows = [
    ['读未提交',   'READ UNCOMMITTED', '脏读',            '否', '否', '否',  '几乎不用，仅作教学演示'],
    ['读已提交',   'READ COMMITTED',   '不可重复读',      '是', '否', '否',  'Oracle / PostgreSQL 默认；每次 SELECT 重新读视图'],
    ['可重复读',   'REPEATABLE READ',  '幻读',            '是', '是', '否*', 'InnoDB 默认；用间隙锁+临键锁解决幻读'],
    ['串行化',     'SERIALIZABLE',     '—',               '是', '是', '是',  '所有读加共享锁，并发性差，几乎不用'],
  ];

  const isolationTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell db">隔离级别</div>
        <div class="compare-card-header-cell frontend">SQL 名</div>
        <div class="compare-card-header-cell frontend">解决</div>
        <div class="compare-card-header-cell frontend">脏读</div>
        <div class="compare-card-header-cell frontend">不可重复读</div>
        <div class="compare-card-header-cell frontend">幻读</div>
        <div class="compare-card-header-cell desc">说明</div>
      </div>
      ${isolationRows.map(r => `
      <div class="compare-card-row">
        <div class="compare-card-cell db">${r[0]}</div>
        <div class="compare-card-cell frontend">${r[1]}</div>
        <div class="compare-card-cell frontend">${r[2]}</div>
        <div class="compare-card-cell frontend">${r[3]}</div>
        <div class="compare-card-cell frontend">${r[4]}</div>
        <div class="compare-card-cell frontend">${r[5]}</div>
        <div class="compare-card-cell desc">${r[6]}</div>
      </div>`).join('')}
    </div>
    <p style="font-size:12px;color:var(--text-muted);margin-top:8px;line-height:1.7">
      * InnoDB 在 RR 级别下用 Next-Key Lock（临键锁）解决了大部分幻读场景，是少数超过 SQL 标准的实现。<br>
      脏读：读到其他事务未提交的数据。不可重复读：同一事务两次读结果不同（其他事务提交了 UPDATE）。幻读：同一事务两次范围查询结果集不同（其他事务 INSERT/DELETE 了新行）。
    </p>`;

  const mvccHtml = `
    <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:16px 18px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:10px">MVCC 工作原理：版本链 + ReadView</div>
      <pre style="margin:0;background:transparent;color:var(--text-secondary);font-size:12.5px;line-height:1.7"><code>-- 每行记录在 InnoDB 中有两个隐藏字段：
--   trx_id   ：最后修改该行的事务 ID
--   roll_ptr ：指向 undo log 中该行的上一版本（构成版本链）

-- 当事务 A 执行 SELECT 时，会生成一个 ReadView，记录：
--   m_ids        ：当前活跃（未提交）事务 ID 列表
--   min_trx_id   ：m_ids 中最小值
--   max_trx_id   ：下一个将分配的事务 ID
--   creator_trx_id：当前事务自己的 ID

-- 可见性判断规则（针对行的 trx_id）：
--   ① trx_id == creator_trx_id        → 自己改的，可见
--   ② trx_id < min_trx_id             → 修改者已提交，可见
--   ③ trx_id >= max_trx_id            → 修改者晚于 ReadView，不可见
--   ④ min_trx_id <= trx_id < max_trx_id
--        且 trx_id 在 m_ids 中         → 修改者还活跃，不可见
--        否则                          → 已提交，可见
-- 不可见时顺 roll_ptr 找上一版本，继续判断。</code></pre>
    </div>
    <p style="font-size:12.5px;color:var(--text-secondary);line-height:1.7;margin:0">
      <strong style="color:var(--text-primary)">RC vs RR 的本质差异</strong>：RC 每次 SELECT 都生成新 ReadView → 看到其他事务刚提交的更新；RR 只在事务第一次 SELECT 时生成一次 ReadView → 整个事务期间看到的是同一个快照。这就是"可重复读"的由来。
    </p>`;

  const lockRows = [
    ['Record Lock',   '记录锁',     '锁住索引上的一条记录',                      'WHERE id = 1'],
    ['Gap Lock',      '间隙锁',     '锁住索引记录之间的"间隙"，防止 INSERT',     'WHERE id BETWEEN 1 AND 10（锁住 (1,10)）'],
    ['Next-Key Lock', '临键锁',     'Record + Gap 的组合，锁住一个左开右闭区间', 'RR 默认行锁，WHERE id > 5 AND id < 10 锁 (5,10]'],
    ['Insert Intention', '插入意向锁', 'INSERT 前加的间隙锁，互相兼容但被 Gap 阻塞', '并发 INSERT 同一区间'],
  ];

  const lockTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell db">锁类型</div>
        <div class="compare-card-header-cell frontend">中文名</div>
        <div class="compare-card-header-cell desc">作用</div>
      </div>
      ${lockRows.map(r => `
      <div class="compare-card-row">
        <div class="compare-card-cell db">${r[0]}</div>
        <div class="compare-card-cell frontend">${r[1]}</div>
        <div class="compare-card-cell desc">${r[2]}</div>
      </div>`).join('')}
    </div>
    <p style="font-size:12px;color:var(--text-muted);margin-top:8px;line-height:1.7">
      另外，按兼容性分两类：<strong>共享锁（S锁，读锁）</strong>用 <code>SELECT ... LOCK IN SHARE MODE</code> 加；<strong>排他锁（X锁，写锁）</strong>由 <code>UPDATE / DELETE / SELECT ... FOR UPDATE</code> 加。S 与 S 兼容，S 与 X 互斥，X 与 X 互斥。
    </p>`;

  const deadlockSql = `-- 经典死锁场景：两个事务以相反顺序加锁
-- 表：accounts(id, balance)，id=1 余额 100，id=2 余额 200

-- 事务 A                        -- 事务 B
BEGIN;                           BEGIN;
UPDATE accounts SET balance = balance - 10 WHERE id = 1;  -- A 持有 id=1 的 X 锁
                                UPDATE accounts SET balance = balance - 10 WHERE id = 2;  -- B 持有 id=2 的 X 锁
UPDATE accounts SET balance = balance + 10 WHERE id = 2;  -- A 等 id=2 的锁（被 B 持有）
                                UPDATE accounts SET balance = balance + 10 WHERE id = 1;  -- B 等 id=1 的锁（被 A 持有）
-- 💀 死锁产生：A 等 B 释放 id=2，B 等 A 释放 id=1

-- InnoDB 死锁检测：wait-for-graph 发现环 → 选择回滚代价小的事务（undo 量少的）
-- 报错：ERROR 1213 (40001): Deadlock found when trying to get lock; try restarting transaction

-- 排查命令：
SHOW ENGINE INNODB STATUS;        -- 查看最近一次死锁详情
SELECT * FROM information_schema.INNODB_TRX;        -- 当前所有事务
SELECT * FROM performance_schema.data_locks;        -- 当前的锁（8.0+）
SELECT * FROM performance_schema.data_lock_waits;   -- 锁等待关系（8.0+）

-- 预防死锁：
--   1. 所有事务按相同顺序访问表/行（如按主键升序）
--   2. 大事务拆小，缩短锁持有时间
--   3. 业务允许时用 RC 隔离级别（无间隙锁，死锁概率大幅降低）
--   4. 必要时关闭死锁检测（高并发热点行场景，检测本身有开销）`;

  const trapBox = ruleBox('warning',
    `<strong>事务使用三大陷阱</strong>：<br>
    ① <strong>长事务</strong>：事务持续越久，undo log 不能清理、MVCC 旧版本堆积、锁持有时间长 → 压垮数据库。生产上建议事务不超过 5s。<br>
    ② <strong>事务里包含 RPC 调用</strong>：HTTP / RPC 超时不可控，导致事务卡死数分钟。把外部调用移出事务边界。<br>
    ③ <strong>锁升级与热点行</strong>：高并发更新同一行（如秒杀库存）→ 行锁等待严重。用 Redis 预扣减、分库分表拆分热点、异步队列削峰。`);

  return articleShell(t, `
    ${section('事务的本质', conclusion)}
    ${section('ACID 四特性与实现原理', `<div class="section-body">${acidHtml}</div>`)}
    ${section('四种隔离级别', isolationTable)}
    ${section('MVCC：可重复读的底层实现', `<div class="section-body">${mvccHtml}</div>`)}
    ${section('InnoDB 锁类型', lockTable)}
    ${section('死锁：经典场景与排查', codeBlock('SQL · 死锁复现与排查', 'dot-red', 'sql', deadlockSql))}
    ${section('事务使用陷阱', trapBox)}`);
}
