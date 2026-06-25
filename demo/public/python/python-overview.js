function renderPythonOverview(t) {
  const intro = ruleBox('accent',
    `Python 是一门以<strong>简洁可读</strong>著称的通用编程语言，凭借庞大的生态和极低的上手成本，成为<strong>数据科学、AI/ML、后端 API、自动化脚本</strong>四大场景的主流选择。对前端开发者而言，Python 的语法比 Java 更接近 JavaScript，学习曲线平缓。`);

  const scenariosHtml = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:4px">
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:22px;margin-bottom:8px">🤖</div>
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:6px">AI / 机器学习</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          Python 是 AI 领域的<strong style="color:var(--text-primary)">事实标准</strong>。PyTorch、TensorFlow、scikit-learn、Hugging Face Transformers 等核心框架全部以 Python 为第一语言。训练模型、微调 LLM、跑推理、写 RAG pipeline，几乎都在 Python 环境中完成。
        </div>
      </div>
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:22px;margin-bottom:8px">📊</div>
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:6px">数据科学 / 数据分析</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          Pandas（表格处理）、NumPy（矩阵运算）、Matplotlib/Seaborn（可视化）构成数据分析三件套。Jupyter Notebook 让"代码 + 图表 + 说明"混排成为可能，是数据工程师和分析师的日常工作环境。
        </div>
      </div>
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:22px;margin-bottom:8px">🌐</div>
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:6px">后端 Web API</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          <strong style="color:var(--text-primary)">FastAPI</strong> 是目前最流行的 Python Web 框架，基于类型注解自动生成 OpenAPI 文档，性能接近 Node.js（底层 Starlette + uvicorn 异步引擎）。Django 适合功能完整的大型项目，自带 ORM、Admin 后台、认证系统。
        </div>
      </div>
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:22px;margin-bottom:8px">⚙️</div>
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:6px">自动化 / 脚本 / 爬虫</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          Python 是写运维脚本、批量数据处理、文件操作最顺手的语言之一。Selenium / Playwright（Python 绑定）做 UI 自动化测试；requests + BeautifulSoup / Scrapy 做网页爬取；Ansible 用 Python 写的 playbook 管理服务器集群。
        </div>
      </div>
    </div>`;

  const stackRows = [
    ['FastAPI + uvicorn', 'Express / Fastify',   '轻量异步 API 框架'],
    ['Django',            'Next.js（全栈）',       '全功能 Web 框架，自带 ORM、Admin'],
    ['SQLAlchemy',        'Prisma / Drizzle',      'ORM / 查询构造器'],
    ['Celery',            'BullMQ / pg-boss',      '任务队列 / 后台 Job'],
    ['pytest',            'Vitest / Jest',         '测试框架'],
    ['Pydantic',          'Zod / Valibot',         '运行时数据校验 + 类型推导'],
    ['Alembic',           'Prisma Migrate',        '数据库迁移工具'],
    ['Gunicorn / uvicorn','PM2 / Node cluster',   '生产进程管理'],
  ];

  const stackTable = compareCard(stackRows, ['Python 生态', '前端/Node 对应']);

  const notForHtml = `
    <p>Python 不适合的场景同样值得了解：</p>
    <ul>
      <li><strong>移动端开发</strong>：iOS/Android 原生开发用 Swift/Kotlin，跨端用 React Native / Flutter</li>
      <li><strong>前端 UI</strong>：浏览器只认 JavaScript，Python 无法直接运行在浏览器中（PyScript 是实验性的）</li>
      <li><strong>高并发 CPU 密集型服务</strong>：受 GIL（全局解释器锁）限制，多线程并行能力弱，通常用 Go / Rust / Java 替代</li>
      <li><strong>嵌入式 / 实时系统</strong>：内存占用较大，启动慢，不适合资源受限场景</li>
    </ul>`;

  const gilNote = ruleBox('warning',
    `<strong>GIL（全局解释器锁）</strong>：CPython（标准 Python）同一时刻只有一个线程执行 Python 字节码。I/O 密集型任务（网络请求、文件读写）可用多线程或 <code>asyncio</code> 绕过 GIL；CPU 密集型任务（图像处理、数值计算）通常用多进程（<code>multiprocessing</code>）或直接交给 NumPy/PyTorch 底层的 C 扩展。Python 3.13 已引入实验性的"无 GIL 模式"。`);

  return articleShell(t, `
    ${section('Python 是什么', intro)}
    ${section('主要应用场景', scenariosHtml)}
    ${section('Python 生态 vs 前端/Node 生态', stackTable)}
    ${section('Python 不擅长的领域', `<div class="section-body">${notForHtml}</div>`)}
    ${section('性能关键：GIL', gilNote)}`);
}
