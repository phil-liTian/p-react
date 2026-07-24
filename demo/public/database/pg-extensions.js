function renderPgExtensions(t) {
  const conclusion = ruleBox('info',
    `PostgreSQL 的杀手锏是<strong>扩展（Extension）生态</strong>——这是"对象-关系型"中"对象"的真正含义：你可以定义新的类型、操作符、索引方法、函数，把数据库塑造成任何形状。<strong>PostGIS</strong> 让它变地理数据库、<strong>pg_vector</strong> 让它变向量数据库、<strong>TimescaleDB</strong> 让它变时序数据库、<strong>FDW</strong> 让它变联邦查询引擎。一个 PostgreSQL 实例即可覆盖关系、文档、向量、时序、地理多种场景。`);

  const extRows = [
    ['PostGIS',          '🌐 地理空间',      'GiST 索引、KNN 查询、空间分析',  '打车、外卖、LBS、地图'],
    ['pg_vector',        '🤖 AI 向量检索',   '向量存储 + 相似度检索',         'RAG、AI 应用、推荐系统'],
    ['TimescaleDB',      '📊 时序数据',      '自动分区、压缩、连续聚合',      'IoT、监控、金融行情'],
    ['pg_trgm',          '🔤 模糊搜索',      '三元组（trigram）索引',         'LIKE 搜索、拼写纠错'],
    ['pg_stat_statements', '📈 性能监控',    'SQL 维度统计',                  '慢查询分析'],
    ['pg_repack',        '♻️ 在线重建表',   '不锁表重建表与索引',            '生产环境替代 VACUUM FULL'],
    ['postgres_fdw',     '🔗 联邦查询',      '跨 PostgreSQL 实例查询',        '数据集成'],
    ['mysql_fdw',        '🔗 联邦查询',      '查 MySQL 数据',                '异构数据库联合'],
    ['uuid-ossp',        '🆔 UUID 生成',     'UUID v1/v4 生成函数',          '分布式 ID'],
    ['pgcrypto',         '🔐 加密',          '哈希、对称/非对称加密',         '密码存储、敏感字段'],
    ['hstore',           '📦 KV 存储',       'key-value 类型',                '简化版 JSONB'],
    ['citext',           '📝 不区分大小写',  '大小写不敏感的 text',          '邮箱、用户名'],
    ['pg_partman',       '📁 分区管理',      '自动建分区',                    '时序大表分区'],
    ['pglogical',        '🔄 增强逻辑复制',  '双向同步、冲突解决',            '多活、数据集成'],
  ];

  const extTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell db">扩展</div>
        <div class="compare-card-header-cell frontend">用途</div>
        <div class="compare-card-header-cell desc">典型场景</div>
      </div>
      ${extRows.map(r => `
      <div class="compare-card-row">
        <div class="compare-card-cell db"><code>${r[0]}</code></div>
        <div class="compare-card-cell frontend">${r[1]}</div>
        <div class="compare-card-cell desc">${r[3]}</div>
      </div>`).join('')}
    </div>
    <p style="font-size:12px;color:var(--text-muted);margin-top:8px;line-height:1.7">
      <strong>安装扩展</strong>：<code>CREATE EXTENSION IF NOT EXISTS postgis;</code>——本质是注册类型、函数、操作符到系统目录，不复制数据。<br>
      <strong>查看已装扩展</strong>：<code>SELECT * FROM pg_available_extensions;</code>（系统有哪些）/ <code>SELECT * FROM pg_extension;</code>（已启用）。
    </p>`;

  const postgisCmd = `-- PostGIS：地理空间数据库扩展

-- 安装
CREATE EXTENSION postgis;
CREATE EXTENSION postgis_topology;   -- 拓扑
CREATE EXTENSION postgis_raster;     -- 栅格

-- 几何类型
CREATE TABLE drivers (
  id SERIAL PRIMARY KEY,
  name TEXT,
  location GEOMETRY(POINT, 4326),       -- 经纬度（WGS84）
  area GEOMETRY(POLYGON, 4326)          -- 多边形
);

-- 插入
INSERT INTO drivers (name, location) VALUES
  ('司机1', ST_SetSRID(ST_MakePoint(116.40, 39.90), 4326)),
  ('司机2', ST_SetSRID(ST_MakePoint(116.42, 39.91), 4326));

-- GiST 索引（必备）
CREATE INDEX idx_drivers_location ON drivers USING GIST (location);

-- 查"附近 5km 的司机"（KNN 查询，毫秒级）
SELECT name,
       ST_Distance(location::geography,
                   ST_SetSRID(ST_MakePoint(116.40, 39.90), 4326)::geography) AS dist
FROM drivers
ORDER BY location <->
        ST_SetSRID(ST_MakePoint(116.40, 39.90), 4326)
LIMIT 10;

-- 查"方圆 5km 内"（范围查询）
SELECT name FROM drivers
WHERE ST_DWithin(
  location::geography,
  ST_SetSRID(ST_MakePoint(116.40, 39.90), 4326)::geography,
  5000   -- 米
);

-- 几何运算
-- ST_Contains：A 是否包含 B
-- ST_Intersects：A 与 B 是否相交
-- ST_Area / ST_Length：面积/长度
-- ST_Buffer：缓冲区
-- ST_Transform：坐标系转换

-- 应用场景：
--   打车、外卖、共享单车：附近的人
--   地图应用：路径、区域
--   物流：配送范围、路径优化`;

  const pgvectorCmd = `-- pg_vector：AI 向量检索（RAG 系统首选）

-- 安装
CREATE EXTENSION vector;

-- 向量类型
CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT,
  embedding VECTOR(1536)     -- OpenAI text-embedding-ada-002 维度
);

-- 插入（应用层调用 OpenAI 生成 embedding）
INSERT INTO documents (content, embedding) VALUES
  ('React 是 UI 库', '[0.1, 0.2, ...]'),
  ('Vue 是渐进式框架', '[0.15, 0.18, ...]');

-- 索引选择：
--   IVFFLAT：倒排文件 + 扁平量化（适合中小规模）
--   HNSW：分层可导航小世界图（适合大规模，性能更好）

-- IVFFLAT 索引
CREATE INDEX idx_docs_embedding ON documents
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- HNSW 索引（0.5.0+ 推荐）
CREATE INDEX idx_docs_embedding_hnsw ON documents
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- 相似度查询（KNN）
-- 三种距离：
--   <-> ：L2 距离（欧式）
--   <=> ：余弦相似度
--   <#> ：负内积

SELECT content, embedding <=> '[0.12, 0.2, ...]' AS distance
FROM documents
ORDER BY embedding <=> '[0.12, 0.2, ...]'
LIMIT 5;

-- RAG 应用集成：
--   1. 用户提问 → 调 embedding API 生成 query 向量
--   2. PostgreSQL SELECT ... ORDER BY embedding <=> query LIMIT 5
--   3. 把命中的文档片段塞进 prompt 上下文
--   4. 调 LLM 生成答案

-- 优势：
--   • 业务数据 + 向量数据同库，事务一致
--   • 无需引入 Milvus / Pinecone，运维简单
--   • 可用 PostgreSQL 全套能力（过滤、JOIN、聚合）配合向量查询
--   • 100w 向量内性能足够（更大规模考虑专用向量库）`;

  const timescaleCmd = `-- TimescaleDB：时序数据库扩展

-- 安装
CREATE EXTENSION timescaledb;

-- 创建超表（hypertable）：自动按时间分区
CREATE TABLE metrics (
  time TIMESTAMPTZ NOT NULL,
  device_id TEXT NOT NULL,
  temperature DOUBLE PRECISION,
  humidity DOUBLE PRECISION
);

-- 转为超表（按时间分区，默认 7 天一个 chunk）
SELECT create_hypertable('metrics', 'time', chunk_time_interval => INTERVAL '1 day');

-- 自动空间分区（按 device_id）
SELECT create_hypertable('metrics', 'time',
  partitioning_column => 'device_id',
  number_partitions => 4);

-- 写入（与普通表一致）
INSERT INTO metrics VALUES (now(), 'sensor1', 25.5, 60);

-- 查询（自动分区裁剪）
SELECT * FROM metrics
WHERE time > now() - INTERVAL '1 hour'
  AND device_id = 'sensor1';

-- 连续聚合（Continuous Aggregates）：自动预聚合
CREATE MATERIALIZED VIEW metrics_hourly
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', time) AS bucket,
  device_id,
  avg(temperature) AS avg_temp,
  max(temperature) AS max_temp
FROM metrics
GROUP BY bucket, device_id;

-- 数据压缩（节省 90%+ 空间）
ALTER TABLE metrics SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'device_id',
  timescaledb.compress_orderby = 'time DESC'
);
SELECT compress_chunk(c) FROM show_chunks('metrics') c;

-- 自动数据保留策略（删老数据）
SELECT add_retention_policy('metrics', INTERVAL '90 days');

-- 应用场景：
--   IoT 设备上报、监控指标、金融行情
--   优势：原生 PG + 时序优化，可 JOIN 业务表，无需 InfluxDB`;

  const fdwCmd = `-- FDW（Foreign Data Wrapper）：联邦查询

-- 安装 postgres_fdw（同源）
CREATE EXTENSION postgres_fdw;

-- 创建外部服务器
CREATE SERVER remote_db
  FOREIGN DATA WRAPPER postgres_fdw
  OPTIONS (host 'remote.host', port '5432', dbname 'remotedb');

-- 用户映射
CREATE USER MAPPING FOR current_user
  SERVER remote_db
  OPTIONS (user 'remote_user', password 'xxx');

-- 导入 schema
IMPORT FOREIGN SCHEMA public
  FROM SERVER remote_db
  INTO remote_schema;

-- 直接查询
SELECT * FROM remote_schema.orders WHERE amount > 100;

-- 跨库 JOIN（本地表 JOIN 远程表）
SELECT u.name, count(o.id)
FROM local_users u
JOIN remote_schema.orders o ON u.id = o.user_id
GROUP BY u.name;

-- 安装 mysql_fdw（异构）
CREATE EXTENSION mysql_fdw;
CREATE SERVER mysql_remote
  FOREIGN DATA WRAPPER mysql_fdw
  OPTIONS (host 'mysql.host', port '3306');
CREATE USER MAPPING FOR current_user SERVER mysql_remote
  OPTIONS (username 'root', password 'xxx');

-- 应用场景：
--   数据集成（不用 ETL 即可跨库查询）
--   在线迁移（边读旧库边写新库）
--   冷热数据分离（热数据本地，冷数据查询远程）`;

  const procedureCmd = `-- 存储过程与触发器

-- 函数（FUNCTION，可在 SELECT 中调用）
CREATE OR REPLACE FUNCTION get_user_orders(uid BIGINT)
RETURNS TABLE (id BIGINT, amount NUMERIC) AS $$
  SELECT id, amount FROM orders WHERE user_id = uid;
$$ LANGUAGE sql;

-- PL/pgSQL 函数（过程化 SQL）
CREATE OR REPLACE FUNCTION transfer(
  from_id BIGINT, to_id BIGINT, amount NUMERIC
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE accounts SET balance = balance - amount WHERE id = from_id;
  UPDATE accounts SET balance = balance + amount WHERE id = to_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 存储过程（PROCEDURE，11+，支持事务控制）
CREATE PROCEDURE transfer_proc(
  from_id BIGINT, to_id BIGINT, amount NUMERIC
) LANGUAGE plpgsql AS $$
BEGIN
  UPDATE accounts SET balance = balance - amount WHERE id = from_id;
  UPDATE accounts SET balance = balance + amount WHERE id = to_id;
  COMMIT;     -- 存储过程内可显式 COMMIT
END;
$$;

-- 触发器（TRIGGER）
CREATE OR REPLACE FUNCTION update_modified_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.modified_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_modified
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_at();

-- 事件触发器（DDL 级）
CREATE EVENT TRIGGER log_ddl ON ddl_command_end
  EXECUTE FUNCTION log_ddl_event();

-- 应用场景：
--   • 业务逻辑下沉（金融、计费等强一致场景）
--   • 自动审计字段（created_at / modified_at）
--   • 复杂数据校验（CHECK 约束无法表达的）`;

  const opsCmd = `# 生产运维与备份恢复

# 1. 备份
# 物理备份：pg_basebackup（基础备份 + WAL 归档）
pg_basebackup -h primary -U replicator -D /backup/$(date +%Y%m%d) -F c -Z 9
#   -F c：自定义压缩格式
#   -Z 9：最高压缩

# PITR（时间点恢复）：
#   配置 archive_mode=on + archive_command='cp %p /archive/%f'
#   恢复时：基础备份 + 重放 WAL 到指定时间

# 逻辑备份：pg_dump / pg_dumpall
pg_dump -h host -U user -F c -f backup.dump mydb
pg_dumpall -h host -U user > all.sql    # 全集群（含角色、表空间）

# 恢复
pg_restore -h host -U user -d newdb backup.dump

# 2. 监控必备扩展
CREATE EXTENSION pg_stat_statements;  -- 慢 SQL 统计
CREATE EXTENSION pg_stat_user_tables; -- 表访问统计
CREATE EXTENSION pg_buffercache;      -- 缓存查看

# 查看 Top 10 慢 SQL
SELECT query, calls, total_exec_time, mean_exec_time, rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC LIMIT 10;

# 3. 关键参数
SHOW shared_buffers;        -- 缓存大小（建议 RAM 25%）
SHOW work_mem;              -- 单查询内存（建议 16-64MB）
SHOW maintenance_work_mem;  -- VACUUM/INDEX 内存（建议 1GB）
SHOW effective_cache_size;  -- 告诉优化器 OS 缓存（建议 RAM 50-75%）
SHOW max_connections;       -- 连接数（建议 < 100，用 PgBouncer）
SHOW wal_buffers;           -- WAL 缓存（建议 16MB）

# 4. 检查数据库健康
SELECT * FROM pg_stat_activity WHERE state != 'idle';  -- 活跃连接
SELECT * FROM pg_stat_replication;                      -- 复制状态
SELECT * FROM pg_locks WHERE NOT granted;               -- 锁等待
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';  -- 活跃数`;

  return articleShell(t, `
    ${section('扩展生态：PG 的杀手锏', conclusion)}
    ${section('常用扩展速查', extTable)}
    ${section('PostGIS：地理空间数据库', codeBlock('PostgreSQL · PostGIS', 'dot-green', 'sql', postgisCmd))}
    ${section('pg_vector：AI 向量检索', codeBlock('PostgreSQL · pg_vector', 'dot-blue', 'sql', pgvectorCmd))}
    ${section('TimescaleDB：时序数据库', codeBlock('PostgreSQL · TimescaleDB', 'dot-orange', 'sql', timescaleCmd))}
    ${section('FDW：联邦查询', codeBlock('PostgreSQL · FDW', 'dot-orange', 'sql', fdwCmd))}
    ${section('存储过程与触发器', codeBlock('PostgreSQL · PL/pgSQL', 'dot-blue', 'sql', procedureCmd))}
    ${section('运维与备份恢复', codeBlock('PostgreSQL · 运维命令', 'dot-green', 'shell', opsCmd))}`);
}
