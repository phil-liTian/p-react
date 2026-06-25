function renderClaudeMdBestPractices(t) {
  const whatIsHtml = `
    <p>CLAUDE.md 是 Claude Code 的项目/用户级指令文件，本质是一份 <strong>AI 行为规范</strong>。它不是 README（README 是写给人看的，CLAUDE.md 是专门写给 Claude 看的）。把它理解为：在 Claude 开始干活之前，先坐在旁边提醒它几句——项目怎么启动、哪些文件别乱动、团队踩过哪些坑。</p>
    ${ruleBox('info', '<strong>判断标准：</strong>逐行问自己"删掉这行，Claude 会不会更容易犯错？"。会 → 保留；不会 → 删掉。CLAUDE.md 最怕的不是少写两条规则，而是正确废话太多把重要规则淹掉。')}`;

  const comparisonHtml = compareCard([
    ['CLAUDE.md',  'Claude Code 专属',  '会话开始时加载；子目录规则按需加载'],
    ['AGENTS.md',  '跨工具通用标准',    'OpenAI Codex、Cursor 等均支持；可被 CLAUDE.md 导入复用'],
    ['.claude/rules/', '局部规则目录', '带 paths 的规则在读取匹配文件时按需注入，否则等同全局'],
    ['SPEC.md',    '需求规格文件',      '定义这次做什么，属于 Spec Coding 流程；管当次约束'],
  ], ['文件', '定位', '加载方式']);

  const shouldWriteHtml = stepList([
    {
      title: '技术栈和版本信息',
      desc: '框架版本差异往往是 AI 犯错的根源。Spring Boot 2 vs 3 配置差别很大；选了 MyBatis-Plus 而不是 JPA，理由 Claude 读不出来。',
    },
    {
      title: '常用命令（用代码块）',
      desc: `代码块里的命令 Claude 更倾向照着跑，自然语言里的命令它有时会根据自己理解改写。${codeBlock('示例', 'dot-cyan', 'markdown', `# Commands\n- 构建：\`mvn clean package -DskipTests\`\n- 测试：\`mvn test -pl module-name\`\n- 启动：\`mvn spring-boot:run -pl bootstrap\``)}`,
    },
    {
      title: '架构决策和背后的理由',
      desc: '光写规则不够，写清楚"为什么"让 Claude 举一反三。"不要直接写 SQL，用 QueryWrapper，因为 SQL 审计系统依赖 Wrapper 解析来记录操作日志。"加上理由后，Claude 在所有需要生成查询的场景都会自觉用 Wrapper。',
    },
    {
      title: '团队约定和项目特有的坑',
      desc: '提交信息格式、分支命名规范、环境变量依赖。这些信息 Claude 从代码里读不出来——把 CLAUDE.md 当成给新人写的 onboarding 文档来写就对了。',
    },
    {
      title: '当前任务的关键信息（动态工作台）',
      desc: '任务描述、验收标准、优先级、截止时间、阻塞问题。可以作为 Agent 的持久化任务手册，即使跨会话也不会忘了该做什么。',
    },
  ]);

  const shouldNotWriteHtml = cardGrid([
    { icon: '🚫', title: '代码风格规则', body: '缩进、import 排序、尾分号——交给 Checkstyle / Prettier。没配工具的先配工具，别用自然语言干格式化的活。' },
    { icon: '🚫', title: '框架默认行为', body: '"Python 用 f-string 格式化字符串"这类在现代语言中理所当然的事写下来只是噪音。' },
    { icon: '🚫', title: '大段参考文档', body: '外部 API 文档、SDK 参数表不要整段塞进来。放链接就够了，Claude 真用到时再读。' },
  ]);

  const writingTipsHtml = `
    ${section('规则要具体可验证', `<p>"注意代码可读性"太虚。换成"函数名使用动词开头、单个函数不超过 40 行"就好很多——Claude 能照着做，你也能一眼看出有没有做到。</p>`)}
    ${section('禁令要搭配替代方案', `<p>只写"不要做 X"，Claude 容易绕出另一种奇怪写法。更稳的方式：</p>
    ${codeBlock('示例', 'dot-purple', 'markdown', `# 依赖注入\n- 不要使用 @Autowired 字段注入\n- 使用构造器注入，配合 Lombok 的 @RequiredArgsConstructor\n- 参考示例：UserController.java 中的写法`)}`)}
    ${section('善用标记词但别滥用', ruleBox('warning', '如果 Claude 反复忽略某条规则，不要急着加感叹号。更大的可能是文件太长了，规则被其他内容稀释了。<strong>解决方案是精简文件，不是加强调。</strong>'))}
    ${section('Hooks 是硬约束', `<p>能用工具强制执行的规则，不要写成自然语言。CLAUDE.md 是软约束，Linter/Hook/CI 才是硬约束。比如想阻止 Claude 修改敏感文件，写一百遍"不要改 .env"都不如加一个 PreToolUse Hook。</p>
    ${cardGrid([
      { icon: '🪝', title: '适合做 Hook', body: '编辑后自动格式化、会话结束前跑测试、禁止改 migrations/ 或 .github/workflows/、拦截 rm -rf 等危险命令。' },
      { icon: '📝', title: '适合写 CLAUDE.md', body: '架构约定、团队规范、命名规则、踩坑记录——只是希望 Claude 知道，但漏一次不会出大问题。' },
    ])}`)}`;

  const placementHtml = compareCard([
    ['组织级', '/etc/claude-code/CLAUDE.md', 'IT/DevOps 统一下发的合规要求，不能被个人配置排除'],
    ['用户级', '~/.claude/CLAUDE.md',        '个人偏好，对所有项目生效'],
    ['项目级', './CLAUDE.md',                '团队共享规范，提交至 Git'],
    ['本地级', './CLAUDE.local.md',          '个人的项目特定配置，加入 .gitignore'],
    ['子目录', './subdir/CLAUDE.md',         'Claude 访问该目录时按需加载，不在会话开始时注入'],
  ], ['层级', '路径', '用途']);

  const scalingHtml = stepList([
    { title: '起步：一份文件，几行核心规则', desc: '大部分中小项目停在这里就够了。保持精简，很少超过 50 行。' },
    { title: '拆分：主文件做路由', desc: `根目录 CLAUDE.md 只放项目概述和常用命令，规则分文件管理，用 @path/to/file 引用：${codeBlock('示例', 'dot-cyan', 'markdown', `## Rules\n- API 约定：@docs/api-conventions.md\n- 数据库规范：@docs/database-rules.md`)}` },
    { title: '按工作区域加载不同规则', desc: `在 .claude/rules/ 里用 frontmatter 做路径匹配，编辑 Controller 时只加载 Controller 规则：${codeBlock('示例', 'dot-purple', 'yaml', `---\npaths:\n  - "src/main/java/**/controller/**/*.java"\n---\n# Controller 规范\n- 统一使用 Result<T> 包装返回值`)}` },
  ]);

  const pitfallsHtml = cardGrid([
    { icon: '⚠️', title: 'CLAUDE.md 只进不出', body: '文件越写越长，Claude 反而开始漏规则。这时加粗、加叹号没用，真正有用的是删。' },
    { icon: '⚠️', title: '@ 导入巨型文件', body: '会话还没开始，就先烧掉一大块上下文。大文件改成自然语言引用，让 Claude 需要时自己读。' },
    { icon: '⚠️', title: '用 path-scoped rules 管新建文件', body: '新建文件时路径规则不一定会加载。创建期约束更适合放全局 rules、CLAUDE.md，或用 Hook。' },
    { icon: '⚠️', title: '为偶发事故加永久规则', body: '一次罕见事故就写一条长期规则，后面每个会话都要付上下文成本，通常不划算。' },
  ]);

  return articleShell(t, `
    ${section('什么是 CLAUDE.md？', whatIsHtml)}
    ${section('与其他规则文件的区别', comparisonHtml)}
    ${section('该写的东西（5 类）', shouldWriteHtml)}
    ${section('不该写的东西', shouldNotWriteHtml)}
    ${section('怎么写才能让 Claude 真正遵守', writingTipsHtml)}
    ${section('CLAUDE.md 放在哪里', placementHtml)}
    ${section('项目变大后怎么管', scalingHtml)}
    ${section('常见踩坑', pitfallsHtml)}
  `);
}
