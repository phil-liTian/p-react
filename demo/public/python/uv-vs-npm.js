function renderUvVsNpm(t) {
  const conclusion = ruleBox('accent',
    `uv 之于 Python，等同于 npm/pnpm 之于 Node.js。它是用 Rust 编写的极速 Python 包管理器，<strong>比 pip 快 10-100 倍</strong>，同时集成了虚拟环境管理、Python 版本管理和脚本运行，是目前最推荐的现代 Python 工具链。`);

  const rows = [
    ['package.json',          'pyproject.toml',           '项目元信息 + 依赖声明'],
    ['package-lock.json',     'uv.lock',                   '精确锁定依赖版本（自动生成）'],
    ['node_modules/',         '.venv/',                    '项目本地虚拟环境（在项目目录内）'],
    ['npm install',           'uv sync',                   '安装所有依赖到 .venv/'],
    ['npm install axios',     'uv add requests',           '添加依赖并写入 pyproject.toml'],
    ['npm install -D vitest', 'uv add --dev pytest',       '添加开发依赖'],
    ['npm run dev',           'uv run python main.py',     '在虚拟环境中运行脚本'],
    ['npx tsc',               'uv run mypy .',             '运行工具，无需手动激活 venv'],
    ['npm run build',         'uv build',                  '构建 wheel/sdist 发行包'],
    ['npx create-vite',       'uv init my-project',        '初始化新项目'],
    ['.nvmrc / .node-version','python = ">=3.11"（pyproject.toml）', '锁定 Python/Node 版本'],
    ['node_modules/.bin/',    '.venv/bin/',                '可执行文件目录'],
  ];

  const table = compareCard(rows);

  const diffsHtml = `
    <p><strong>1. 虚拟环境（venv）是 Python 的 node_modules</strong><br>
    Python 没有全局 <code>node_modules</code>——每个项目有自己的 <code>.venv/</code> 目录隔离依赖。<code>uv sync</code> 等同于 <code>npm install</code>，会在当前目录创建 <code>.venv/</code> 并安装依赖。和 <code>node_modules/</code> 一样，<code>.venv/</code> 要加入 <code>.gitignore</code>。</p>
    <p><strong>2. 不需要手动激活虚拟环境</strong><br>
    传统方式需要 <code>source .venv/bin/activate</code> 激活 venv 才能使用依赖。用 uv 只需 <code>uv run python script.py</code>，它会自动找到并使用 <code>.venv/</code>，就像 <code>npx</code> 自动使用本地安装的工具一样。</p>
    <p><strong>3. pyproject.toml 取代了 requirements.txt</strong><br>
    老项目常用 <code>requirements.txt</code>（相当于只有 <code>dependencies</code> 字段的 package.json）。现代 Python 项目用 <code>pyproject.toml</code>，可以声明 <code>[project.dependencies]</code>（运行时依赖）和 <code>[dependency-groups] dev</code>（开发依赖），更接近前端的项目结构。</p>
    <p><strong>4. uv 还管理 Python 版本（类似 nvm）</strong><br>
    <code>uv python install 3.12</code> 可以下载安装指定 Python 版本，<code>uv python pin 3.11</code> 锁定项目的 Python 版本，免去单独安装 pyenv 的麻烦。</p>`;

  const pkgJson = `{
  "name": "my-app",
  "version": "1.0.0",
  "dependencies": {
    "axios": "^1.6.0",
    "express": "^4.18.2"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest"
  }
}`;

  const pyprojectToml = `[project]
name = "my-app"
version = "1.0.0"
requires-python = ">=3.11"
dependencies = [
    "requests>=2.31.0",
    "fastapi>=0.110.0",
]

[dependency-groups]
dev = [
    "pytest>=8.0.0",
    "mypy>=1.9.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"`;

  const codePair = codeBlocksRow([
    codeBlock('package.json', 'dot-blue', 'json', pkgJson),
    codeBlock('pyproject.toml', 'dot-yellow', 'toml', pyprojectToml),
  ]);

  const workflowHtml = `
    <p><strong>新建项目</strong></p>`;

  const initCmds = `# npm
npm create vite@latest my-app
cd my-app && npm install

# uv（等价操作）
uv init my-app
cd my-app
uv add fastapi        # 自动创建 .venv 并安装`;

  const syncCmds = `# 克隆项目后恢复依赖
# npm
npm install           # 读 package-lock.json

# uv
uv sync               # 读 uv.lock，完全可复现`;

  const runCmds = `# 运行脚本 / 工具
npm run dev           →  uv run python main.py
npx jest              →  uv run pytest
npx tsc               →  uv run mypy .

# 也可以先进入虚拟环境 shell（类似 nvm use）
uv run bash           # 进入激活了 .venv 的 shell`;

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('对照表', table)}
    ${section('前端开发者需要注意的差异', `<div class="section-body">${diffsHtml}</div>`)}
    ${section('pyproject.toml vs package.json', codePair)}
    ${section('常用工作流对比', `
      <p style="margin-bottom:8px;font-size:13px;color:var(--text-secondary)"><strong>新建项目</strong></p>
      ${codeBlock('init', 'dot-blue', 'bash', initCmds)}
      <p style="margin-bottom:8px;margin-top:14px;font-size:13px;color:var(--text-secondary)"><strong>克隆项目后安装依赖</strong></p>
      ${codeBlock('sync', 'dot-green', 'bash', syncCmds)}
      <p style="margin-bottom:8px;margin-top:14px;font-size:13px;color:var(--text-secondary)"><strong>运行脚本 / 工具</strong></p>
      ${codeBlock('run', 'dot-yellow', 'bash', runCmds)}
    `)}`);
}
