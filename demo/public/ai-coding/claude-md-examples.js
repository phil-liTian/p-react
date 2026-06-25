function renderClaudeMdExamples(t) {

  // ── 后端示例 ──────────────────────────────────────────────────────────────────

  const backendFullExample = `# AI Interview Platform

Spring Boot 4.0 + Java 21 + Spring AI 2.0 + React 面试平台。

## 行为准则

权衡说明：以下准则偏向谨慎而非速度，对简单任务可自行判断。

### 先想后写
- 明确说出你的假设。不确定时先问，不要猜。
- 存在多种理解方式时，列出来，不要默默选一个。
- 发现更简单的方案时，说出来，可以拒绝过度设计。
- 遇到不清楚的地方，停下来，说明哪里不清楚，然后问。

### 简洁优先
- 写最少的代码解决问题，不写没有被要求的功能和抽象。
- 200 行能写成 50 行，就重写成 50 行。
- 问自己："高级工程师会说这过度设计吗？"如果是，就简化。

### 外科手术式修改
- 只动必须改的代码，不顺手"优化"相邻代码或注释。
- 保持已有风格，哪怕你有更好的写法。
- 发现无关死代码，提一句，不要删。
- 自己的改动产生了孤儿 import / 变量 / 函数，自己清理。
- 检验标准：每一行改动都能追溯到用户需求。

### 目标驱动执行
- 把任务转化为可验证的目标，再开始执行。
  - "加校验" → "先写边界测试，再让它通过"
  - "修 bug" → "先写能复现 bug 的测试，再修"
- 多步骤任务先列执行计划，每步附上验证方式。

## Tech Stack

- Backend: Spring Boot 4.0 / Java 21 / Gradle / Spring AI 2.0
- Database: PostgreSQL + pgvector（1024 维 COSINE）
- Cache & MQ: Redis / Redisson / Redis Stream
- Frontend: React 18 + TypeScript + Vite + TailwindCSS 4（\`frontend/\`）
- Mapping & Docs: MapStruct / OpenAPI / iText 8 / Apache Tika

## Commands

- 构建：\`./gradlew build\`
- 测试：\`./gradlew test\`
- 后端启动：\`./gradlew bootRun\`
- 前端启动：\`cd frontend && npm run dev\`
- 前端检查：\`cd frontend && npm run lint\`

## Architecture

- 单模块 Gradle 项目，按功能分包。
- 后端遵循 \`Controller -> Service -> Repository\` 分层。
- 基础设施能力放在 \`common/\`，包括限流、AI 调用、异步任务、配置、异常、统一响应。
- 前端代码放在 \`frontend/\`。
- 详细项目结构见 \`docs/architecture.md\`。`;

  const backendAnnotations = [
    {
      anchor: '## 行为准则',
      type: 'accent',
      text: '<strong>行为准则是写给 Claude 的默认工作方式，而不是具体规则。</strong>它回答的是"当需求不清晰时怎么办""写多少代码算合适""改代码的边界在哪里"——这些问题在每个任务里都会遇到，但项目规则文件不会逐一覆盖。把它放在主文件最前面，比任何具体规则优先级都高。注意首行的权衡说明：偏谨慎而非偏速度，让 Claude 明白这不是死板规定，而是在做判断时的取向。',
    },
    {
      anchor: '## Tech Stack',
      type: 'success',
      text: '<strong>版本必须明确到 major。</strong>Spring Boot 4.0 与 3.x 在 Jakarta EE、虚拟线程上差异巨大；pgvector 的维度和距离类型直接影响索引生成；不标注则 Claude 按训练数据中最常见版本推断，出错概率很高。',
    },
    {
      anchor: '## Commands',
      type: 'info',
      text: '<strong>命令全部用代码块而非散文。</strong>Claude 对代码块里的命令倾向原样执行，对自然语言描述的命令有时会根据自己理解改写（如把 <code>-pl module-name</code> 省掉）。多入口项目尤其需要把前后端启动命令都列出来。',
    },
    {
      anchor: '## Architecture',
      type: 'info',
      text: '<strong>只写 Claude 读代码猜不到的信息。</strong>分层结构（Controller→Service→Repository）Claude 能从包名推断，但"基础设施能力放在 common/"这类约定它读不出来。<code>docs/architecture.md</code> 的引用让它知道去哪里找更多细节，而不是把文档整段贴进来浪费上下文。Rules 和 docs 的加载声明移到 <code>.claude/settings.json</code>，主文件只保留项目上下文。',
    },
  ];

  const backendAnnotatedHtml = `
    <p style="margin-bottom:12px;color:var(--gray-dark);font-size:13px;">以下是一份真实后端项目的 CLAUDE.md。<strong>行为准则</strong>（先想后写 / 简洁优先 / 外科手术式修改 / 目标驱动执行）放在主文件最前面，项目业务规则拆到 <code>.claude/rules/</code> 独立文件通过 <code>@</code> 按需引用。</p>
    <div class="annotated-example">
      <pre><code class="language-markdown">${escHtml(backendFullExample)}</code></pre>
    </div>
    <div style="margin-top:16px;">
      ${backendAnnotations.map(a => ruleBox(a.type, `<strong><code>${escHtml(a.anchor)}</code></strong> — ${a.text}`)).join('')}
    </div>`;

  // ── 前端示例 ──────────────────────────────────────────────────────────────────

  const frontendFullExample = `# Frontend（\`frontend/\`）

React 18 + TypeScript + Vite + TailwindCSS 4 前端规范。

## 行为准则

权衡说明：以下准则偏向谨慎而非速度，对简单任务可自行判断。

### 先想后写
- 不清楚 UI 行为或交互细节，停下来问，不要自行发挥。
- 存在多种组件划分方式时，列出来，不要默默选一个。
- 发现更简单的结构时，说出来，不要过度封装。

### 简洁优先
- 单次使用的组件不抽象成通用组件。
- 没有被要求的动效、懒加载、状态管理不加。
- Props drilling 两层以内不引入 Context / Zustand。

### 外科手术式修改
- 只动涉及需求的组件，不顺手重构其他文件。
- 保持已有命名和文件结构风格。
- 自己的改动产生了孤儿 import，自己清理。
- 检验标准：每一行改动都能追溯到用户需求。

### 目标驱动执行
- UI 改动前列出成功标准：布局、交互、边界态各自验证方式。
- "修样式问题" → "截图对比改前改后，确认一致再提交"。

## Commands

- 启动：\`npm run dev\`
- 构建：\`npm run build\`
- 类型检查：\`npm run typecheck\`
- Lint：\`npm run lint\`
- 预览：\`npm run preview\`

## Tech Stack

- React 18（不升 19，useDeferredValue 行为有差异）
- TypeScript 5.5（strict 模式）
- Vite 6 + TailwindCSS 4
- Zustand 5（UI 状态）+ React Query 5（服务端数据，不用 useEffect + fetch）
- React Hook Form + Zod（表单校验）
- shadcn/ui（基础组件库，不引入其他 UI 框架）

## Project Structure

\`\`\`
frontend/src/
  components/   # 通用 UI 组件（无业务逻辑）
  features/     # 按功能分组：每个 feature 包含 components/hooks/api
  hooks/        # 全局通用 hooks
  stores/       # Zustand store
  lib/          # 工具函数、常量、类型定义
  api/          # React Query queryFn、接口类型
\`\`\``;

  const frontendAnnotations = [
    {
      anchor: '## 行为准则',
      type: 'accent',
      text: '<strong>行为准则可以前后端各写一份，也可以提取到全局 <code>~/.claude/CLAUDE.md</code> 统一生效。</strong>如果团队所有项目都用同一套工作方式，放全局更省事；如果前后端对某条准则有细微差异（比如前端的"目标驱动"要求截图对比），就分开写。这里前端版本对 4 条准则各做了 UI 场景的具体化，而不是原样复制。',
    },
    {
      anchor: '## Tech Stack',
      type: 'warning',
      text: '<strong>显式标注"不升 19"比只写"用 18"信息量更大。</strong>Claude 知道 React 19 已发布，如果只写"React 18"它可能认为可以升级。"不升 19，useDeferredValue 行为有差异"给了明确的版本锁定理由。同理 shadcn/ui 后面跟"不引入其他 UI 框架"，防止它顺手加 Ant Design 或 MUI。',
    },
    {
      anchor: '## Project Structure',
      type: 'info',
      text: '<strong>目录结构用代码块，不用散文描述。</strong>Claude 对树形结构的理解比散文段落稳定得多，能直接推断新文件该放哪里。<code>features/</code> 按功能聚合这种约定 Claude 不会自动猜，需要明确写出来；否则它倾向于按类型分层（components/hooks/pages）。Rules 和 docs 的加载声明移到 <code>.claude/settings.json</code>，主文件不再有 <code>## Rules</code> 节。',
    },
  ];

  const frontendAnnotatedHtml = `
    <p style="margin-bottom:12px;color:var(--gray-dark);font-size:13px;">前端 CLAUDE.md 放在 <code>frontend/CLAUDE.md</code>。<strong>行为准则</strong>针对 UI 场景做了具体化，Must Follow / Never Do / Naming 全部拆到 <code>.claude/rules/</code> 独立文件。</p>
    <div class="annotated-example">
      <pre><code class="language-markdown">${escHtml(frontendFullExample)}</code></pre>
    </div>
    <div style="margin-top:16px;">
      ${frontendAnnotations.map(a => ruleBox(a.type, `<strong><code>${escHtml(a.anchor)}</code></strong> — ${a.text}`)).join('')}
    </div>`;

  // ── rules 目录示例 ────────────────────────────────────────────────────────────

  const settingsJsonExample = `# .claude/settings.json — 只配置硬约束
{
  "permissions": {
    "allow": [
      "Bash(./gradlew *)",
      "Bash(cd frontend && npm *)"
    ]
  }
}`;

  const rulesGlobalExample = `# .claude/rules/backend.md
# （无 paths 字段 → 每次会话全局加载）

## Must Follow
- Controller 只做参数校验和响应包装，不写业务逻辑。
- @Transactional 只放 Service 层，不放 Controller 或 Repository。
- 对外响应统一使用 Result<T>。
- 业务异常必须使用 BusinessException(ErrorCode.XXX, "描述信息")。
- Entity 映射使用 MapStruct，禁止手写重复转换逻辑。

## Never Do
- 不要 throw new RuntimeException(...)，必须用 BusinessException。
- 不要直接返回 Entity 给前端。
- 不要事务内调用 LLM、S3 或外部 HTTP。
- 不要循环调用 DB，优先批量操作。`;

  const rulesPathScopedExample = `# .claude/rules/frontend.md
# （有 paths 字段 → 仅在 Claude 读取 frontend/ 下的文件时注入）

---
paths:
  - "frontend/**"
---

## Must Follow
- 组件只负责渲染，业务逻辑放在 hooks/ 或 features/*/hooks/。
- 服务端数据统一用 React Query，禁止 useEffect + useState 自管 loading/error。
- 样式只用 TailwindCSS，禁止内联 style 和额外 CSS 文件。

## Never Do
- 不要在组件顶层以外调用 Hook（Rules of Hooks）。
- 不要跨 feature 直接 import 内部组件，通过 feature 的 index.ts 导出。
- 不要在 Zustand store 里存接口返回数据。`;

  const settingsAnnotations = [
    {
      anchor: 'settings.json',
      type: 'warning',
      text: '<strong>settings.json 只配置硬约束（permissions / hooks / env），不管规则加载。</strong>之前示例里写的 <code>"rules"</code>、<code>"docs"</code>、<code>"pathScoped"</code> 字段是不存在的——Claude Code 没有这套 API。规则文件的加载由 <code>.claude/rules/</code> 目录本身的机制决定，不需要在 settings.json 里声明。',
    },
    {
      anchor: 'backend.md（无 paths）',
      type: 'accent',
      text: '<strong>无 frontmatter paths 的规则文件每次会话全局加载，只放真正全局的规则。</strong>后端分层规范、统一异常处理——无论改哪个文件都适用，适合全局加载。反例：数据库规范只在写 Repository 时相关，加 paths 限定，避免浪费每次会话的上下文。',
    },
    {
      anchor: 'frontend.md（有 paths）',
      type: 'purple',
      text: '<strong>frontmatter <code>paths:</code> 字段控制按需注入：Claude 读取匹配路径的文件时才把该规则注入上下文。</strong>改 <code>frontend/</code> 下的文件时才加载前端命名规范；改后端代码时完全不加载，上下文干净。这是 Claude Code 真实支持的 path-scoped rules 机制——不是 settings.json 的字段，而是规则文件自己声明作用范围。',
    },
  ];

  const dirStructureHtml = `
    <div style="margin-bottom:16px;">
      ${ruleBox('info', `<strong>完整目录结构：</strong>${codeBlock('', 'dot-cyan', 'text', `.claude/
  settings.json          # 硬约束：permissions / hooks / env
  rules/
    backend.md           # 无 paths → 全局加载（每次会话）
    error-handling.md    # 无 paths → 全局加载
    frontend.md          # paths: frontend/** → 按需加载
    database.md          # paths: src/**/repository/** → 按需加载
    ai-service.md        # paths: src/**/service/** → 按需加载
docs/
  architecture.md        # 在 CLAUDE.md 里用自然语言引用路径即可
  api-conventions.md`)}`)}
    </div>`;

  const settingsAnnotatedHtml = `
    <p style="margin-bottom:12px;color:var(--gray-dark);font-size:13px;">规则文件放在 <code>.claude/rules/</code>，用 frontmatter <code>paths:</code> 字段控制是否全局加载或按需注入。<code>settings.json</code> 只管硬约束，不负责规则加载。</p>
    ${dirStructureHtml}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
      <div>
        <div style="font-size:12px;color:var(--gray-dark);margin-bottom:6px;">backend.md — 全局规则（无 paths）</div>
        <div class="annotated-example" style="margin:0;">
          <pre><code class="language-markdown">${escHtml(rulesGlobalExample)}</code></pre>
        </div>
      </div>
      <div>
        <div style="font-size:12px;color:var(--gray-dark);margin-bottom:6px;">frontend.md — 路径限定规则（有 paths）</div>
        <div class="annotated-example" style="margin:0;">
          <pre><code class="language-markdown">${escHtml(rulesPathScopedExample)}</code></pre>
        </div>
      </div>
    </div>
    <div style="margin-bottom:16px;">
      <div style="font-size:12px;color:var(--gray-dark);margin-bottom:6px;">settings.json — 只放硬约束</div>
      <div class="annotated-example">
        <pre><code class="language-json">${escHtml(settingsJsonExample)}</code></pre>
      </div>
    </div>
    <div>
      ${settingsAnnotations.map(a => ruleBox(a.type, `<strong>${escHtml(a.anchor)}</strong> — ${a.text}`)).join('')}
    </div>`;

  // ── 写法对比总结 ──────────────────────────────────────────────────────────────

  const diffHtml = compareCard([
    ['行为准则',          '4 条通用准则放 CLAUDE.md 最前面，写权衡说明',              'Claude 每次任务都先读到它，比具体规则优先级更高；权衡说明防止机械执行'],
    ['Tech Stack',        '版本精确到 major，写出"不用 XX"的理由',                    '让 Claude 锁定版本，不自作主张升级或混用'],
    ['Commands',          '全部代码块，前后端分开列',                                  'Claude 倾向原样执行代码块，散文命令会被改写'],
    ['Architecture',      '只写 Claude 猜不到的约定，大文件用自然语言引用路径',        '节省上下文，细节让 Claude 需要时自己读'],
    ['Rules（全局）',     '放 .claude/rules/，无 frontmatter paths → 每次会话全局加载',  '只放真正全局的规则；CLAUDE.md 不再需要 @import 长列表'],
    ['Rules（路径限定）', 'frontmatter paths: 声明匹配 glob → 仅在读取对应文件时注入',  'Claude 改前端代码时不加载后端规则，上下文干净精准'],
    ['settings.json',     '只放 permissions / hooks / env 等硬约束',                    'settings.json 无 rules/docs 加载 API；规则加载由 .claude/rules/ 机制本身决定'],
  ], ['配置项', '放哪里 / 怎么写', '原因']);

  return articleShell(t, `
    ${section('后端 CLAUDE.md 完整示例与批注', backendAnnotatedHtml)}
    ${section('前端 CLAUDE.md 完整示例与批注', frontendAnnotatedHtml)}
    ${section('.claude/rules/ — 规则文件目录与路径限定机制', settingsAnnotatedHtml)}
    ${section('写法差异总结', diffHtml)}
  `);
}
