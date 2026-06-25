function renderJavaOverview(t) {
  const conclusion = ruleBox('accent',
    `Java 是一门<strong>强类型、面向对象</strong>的通用编程语言，凭借"一次编写、到处运行"（JVM）的特性，在<strong>企业级后端、大数据、Android 开发</strong>三大领域长期占据主流地位。对前端开发者而言，Java 的类型系统比 TypeScript 更严格，生态更重，但解决的问题规模也更大。`);

  const scenariosHtml = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:4px">
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:22px;margin-bottom:8px">🏢</div>
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:6px">企业级后端服务</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          Java 是<strong style="color:var(--text-primary)">银行、保险、电商、政务系统</strong>的首选语言。Spring Boot 提供开箱即用的 REST API、事务管理、安全认证；Spring Cloud / Dubbo 支撑微服务架构。国内大厂（阿里、京东、美团）核心业务系统大量使用 Java。
        </div>
      </div>
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:22px;margin-bottom:8px">📱</div>
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:6px">Android 开发</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          Android 官方最初以 Java 为第一语言，目前已逐步迁移到 Kotlin（100% 与 Java 互操作，同样运行在 JVM）。存量 Android 代码库中仍有大量 Java，理解 Java 是看懂 Android 源码的前提。
        </div>
      </div>
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:22px;margin-bottom:8px">🔬</div>
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:6px">大数据 / 流处理</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          Hadoop、Spark、Flink、Kafka 均用 Java/Scala 编写，API 也主要面向 JVM 语言。数据工程师处理 TB 级日志、实时流计算、ETL 管道时，Java/Scala 生态是最成熟的选择。
        </div>
      </div>
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:22px;margin-bottom:8px">☁️</div>
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:6px">云原生 / 中间件</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          Elasticsearch、Cassandra、Zookeeper、ActiveMQ 等基础中间件都是 Java 写的。Quarkus / Micronaut 针对云原生场景优化了启动时间和内存占用，配合 GraalVM 原生编译可达到 Go 级别的冷启速度。
        </div>
      </div>
    </div>`;

  const stackRows = [
    ['Spring Boot',         'Express / Fastify / NestJS', '后端 Web 框架'],
    ['Maven / Gradle',      'npm / pnpm',                  '包管理 + 构建工具'],
    ['MyBatis / JPA',       'Prisma / Drizzle',            'ORM / 数据访问层'],
    ['Spring Security',     'NextAuth / Passport.js',      '认证 & 授权'],
    ['RabbitMQ / Kafka',    'BullMQ',                      '消息队列'],
    ['JUnit + Mockito',     'Vitest / Jest',               '单元测试框架'],
    ['Logback / SLF4J',     'winston / pino',              '日志框架'],
    ['Docker + K8s',        'Docker + K8s',                '容器化部署（相同）'],
  ];

  const stackTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell java">Java 生态</div>
        <div class="compare-card-header-cell frontend">前端/Node 对应</div>
        <div class="compare-card-header-cell desc">说明</div>
      </div>
      ${stackRows.map(([java, fe, desc]) => `
      <div class="compare-card-row">
        <div class="compare-card-cell java">${java}</div>
        <div class="compare-card-cell frontend">${fe}</div>
        <div class="compare-card-cell desc">${desc}</div>
      </div>`).join('')}
    </div>`;

  const jvmNote = ruleBox('info',
    `<strong>JVM（Java 虚拟机）</strong>：Java 源码编译为字节码（<code>.class</code>），由 JVM 解释执行或 JIT 编译为机器码。这使得同一份字节码可以运行在 Windows / Linux / macOS 上，无需重新编译。JVM 还承载了 Kotlin、Scala、Groovy 等语言——它们编译出的字节码与 Java 完全互通。`);

  const notForHtml = `
    <p>Java 相比其他语言的弱势场景：</p>
    <ul>
      <li><strong>快速脚本 / 原型</strong>：启动慢、样板代码多，不如 Python / Node.js 灵活，但 Java 21 的 JShell 和虚拟线程已大幅改善</li>
      <li><strong>前端 UI</strong>：同 Python，浏览器只认 JavaScript，Java 不能直接跑在浏览器中</li>
      <li><strong>系统级编程</strong>：不能直接操作内存，GC 停顿不可控，极低延迟场景（HFT、驱动）更多用 C/C++/Rust</li>
      <li><strong>AI/ML 模型训练</strong>：Python 的 PyTorch/TF 生态统治了这个领域，Java 的 DJL 是后来者</li>
    </ul>`;

  return articleShell(t, `
    ${section('Java 是什么', conclusion)}
    ${section('主要应用场景', scenariosHtml)}
    ${section('Java 生态 vs 前端/Node 生态', stackTable)}
    ${section('Java 不擅长的领域', `<div class="section-body">${notForHtml}</div>`)}
    ${section('核心概念：JVM', jvmNote)}`);
}
