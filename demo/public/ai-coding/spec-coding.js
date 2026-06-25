function renderSpecCoding(t) {
  const whatIsHtml = `
    <p>Spec Coding 是一种以 <strong>规格文档（Specification）为核心驱动</strong> 的 AI 编程方式：在动手写代码之前，先把目标、约束、接口、验收标准写成一份明确的 Spec，然后让 AI 严格按照 Spec 实现，自己负责验收和迭代。</p>
    <p>与其说是一种技术方法，不如说是一种纪律：<strong>先想清楚，再让 AI 做事</strong>。Spec 既是给 AI 的施工图，也是你自己的清单。</p>
    ${ruleBox('accent', `<strong>核心理念：</strong>AI 负责执行，你负责定义。Spec 写得越清晰，AI 偏离的概率越低，返工成本越小。不写 Spec 直接让 AI 猜，省下来的 5 分钟往往要用 3 轮修改来补。`)}`;

  const vsVibeHtml = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell" style="color:var(--accent-light)">对比维度</div>
        <div class="compare-card-header-cell" style="color:var(--blue)">Vibe Coding</div>
        <div class="compare-card-header-cell" style="color:var(--purple)">Spec Coding</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell" style="color:var(--accent-light)">起点</div>
        <div class="compare-card-cell" style="color:var(--blue)">感觉 / 模糊意图</div>
        <div class="compare-card-cell desc" style="color:var(--purple)">明确的 Spec 文档</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell" style="color:var(--accent-light)">Prompt 风格</div>
        <div class="compare-card-cell" style="color:var(--blue)">"做一个能搜索的下拉框"</div>
        <div class="compare-card-cell desc" style="color:var(--purple)">"按 spec.md 第 2 节实现 SearchDropdown"</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell" style="color:var(--accent-light)">验收方式</div>
        <div class="compare-card-cell" style="color:var(--blue)">感觉对了就行</div>
        <div class="compare-card-cell desc" style="color:var(--purple)">逐条对照 Spec 验收标准</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell" style="color:var(--accent-light)">适合规模</div>
        <div class="compare-card-cell" style="color:var(--blue)">原型 / 脚本 / 小功能</div>
        <div class="compare-card-cell desc" style="color:var(--purple)">中大型功能 / 团队协作</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell" style="color:var(--accent-light)">可维护性</div>
        <div class="compare-card-cell" style="color:var(--blue)">低（AI 产出难以预期）</div>
        <div class="compare-card-cell desc" style="color:var(--purple)">高（Spec 是长期资产）</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell" style="color:var(--accent-light)">上手成本</div>
        <div class="compare-card-cell" style="color:var(--blue)">极低，立刻开始</div>
        <div class="compare-card-cell desc" style="color:var(--purple)">需要写 Spec 的时间投入</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell" style="color:var(--accent-light)">迭代节奏</div>
        <div class="compare-card-cell" style="color:var(--blue)">随意，对话驱动</div>
        <div class="compare-card-cell desc" style="color:var(--purple)">先改 Spec，再改代码</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell" style="color:var(--accent-light)">典型风险</div>
        <div class="compare-card-cell" style="color:var(--blue)">方向跑偏，越改越乱</div>
        <div class="compare-card-cell desc" style="color:var(--purple)">前期投入大，Spec 写烂了同样跑偏</div>
      </div>
    </div>
    ${ruleBox('info', `<strong>两者不互斥：</strong>Vibe Coding 是 Spec Coding 的快速草稿模式。先 Vibe 跑通，有 POC 后回头补 Spec，再按 Spec 重构——这是很多实战项目的实际节奏。`)}`;

  const fourStepsHtml = stepList([
    {
      title: '写 Spec（30 分钟，不写代码）',
      desc: `用自然语言写清楚四件事：<br>
        <ul style="margin-top:6px">
          <li><strong>目标</strong>：这个功能解决什么问题，用户故事是什么</li>
          <li><strong>接口 / 边界</strong>：输入输出是什么，依赖哪些外部模块</li>
          <li><strong>约束</strong>：不能引入新依赖、必须兼容哪个版本、性能要求</li>
          <li><strong>验收标准</strong>：可以逐条 checkbox 的列表，每条都能"是/否"验证</li>
        </ul>
        <br>不需要写实现细节，Spec 是 <em>what</em>，不是 <em>how</em>。`,
    },
    {
      title: '让 AI 评审 Spec，暴露歧义（10 分钟）',
      desc: `把 Spec 给 AI，说："你来实现这个，在开始之前，指出所有歧义点、缺失的约束和可能的 edge case。"<br><br>
        AI 会列出它不确定的地方，你来澄清或补充。这一步的价值是：<strong>用 AI 的"执行视角"反向检验你的 Spec 是否足够清晰</strong>。修完歧义后，Spec 才真正可以交付执行。`,
    },
    {
      title: 'AI 按 Spec 实现，每次只做一个 Task',
      desc: `把 Spec 拆成独立的小 Task，每次 Prompt 明确引用 Spec 的对应章节：<br>
        <br>"按照 spec 中的第 3 节验收标准，实现 <code>UserSearchDropdown</code> 组件，只做这一个，其余先不动。"<br>
        <br>Task 越小越好——上下文干净，Review 容易，出错了影响范围小。<strong>不要一次把整个 Spec 都扔给 AI 让它全部实现。</strong>`,
    },
    {
      title: '对照 Spec 验收，更新 Spec，再循环',
      desc: `每个 Task 完成后，逐条检查 Spec 中的验收标准。<strong>发现偏差先改 Spec，再让 AI 修代码</strong>，而不是直接在对话里口头说"这里改一下"——口头修改会让 Spec 和代码慢慢脱节。<br><br>
        Spec 是活文档，每次迭代都更新它。最终 Spec 也是这段代码最好的文档。`,
    },
  ]);

  const specTemplateHtml = `
    ${codeBlock('spec.md 模板', 'dot-cyan', 'markdown',
`# [功能名称] Spec

## 背景与目标
<!-- 一句话：解决什么问题，为谁解决 -->

## 用户故事
- 作为 [角色]，我希望 [行为]，以便 [价值]

## 接口定义
<!-- 函数签名、组件 Props、API 端点 -->
\`\`\`typescript
// 示例
interface SearchDropdownProps {
  options: Option[];
  onSelect: (value: string) => void;
  placeholder?: string;
}
\`\`\`

## 约束
- [ ] 不引入新的第三方 UI 库
- [ ] 支持键盘导航（↑↓回车）
- [ ] 搜索防抖 300ms

## 验收标准
- [ ] 输入时实时过滤选项列表
- [ ] 无匹配时显示"暂无结果"
- [ ] 选中后输入框回填选中值
- [ ] 点击外部区域关闭下拉
- [ ] 空 options 时组件不报错

## 范围外（Out of Scope）
- 不需要支持异步远程搜索（v2 再做）
- 不需要多选`)}
    ${ruleBox('warning', `<strong>Out of Scope 这一栏很重要</strong>——明确说"这次不做什么"，防止 AI 自作主张加功能，也防止你自己 scope creep。`)}`;

  const largeProjectHtml = `
    <p>项目变大后，Spec 不再是单个文件，而是一套分层的文档体系。关键原则：<strong>Spec 要和代码库一起版本管理</strong>，改需求先改 Spec，代码跟着 Spec 走。</p>

    ${cardGrid([
      {
        icon: '📁',
        title: 'specs/ 目录结构',
        body: '按功能模块拆分，每个模块一个 Spec 文件。大模块拆子 Spec，用 index.md 做目录。',
      },
      {
        icon: '🗺',
        title: 'ARCHITECTURE.md',
        body: '全局架构决策记录（ADR）：为什么用这个状态管理、为什么这样分层。不变的放这里，变的放模块 Spec。',
      },
      {
        icon: '📋',
        title: 'TASKS.md',
        body: '当前 Sprint 的任务列表，每个 Task 引用对应的 Spec 章节。完成后打勾，方便 AI 知道什么已做什么没做。',
      },
      {
        icon: '🤖',
        title: 'CLAUDE.md / AGENTS.md',
        body: '项目级 AI 规则：技术栈版本、命名规范、禁止引入的依赖、代码风格。每次对话自动注入，不用重复说明。',
      },
    ])}

    ${codeBlock('推荐目录结构', 'dot-blue', 'text',
`my-project/
├── CLAUDE.md              # AI 行为规则（自动注入）
├── ARCHITECTURE.md        # 架构决策记录
├── specs/
│   ├── index.md           # Spec 目录总览
│   ├── auth/
│   │   ├── login.md
│   │   └── permission.md
│   ├── search/
│   │   └── dropdown.md
│   └── payments/
│       └── checkout.md
├── TASKS.md               # 当前任务列表
└── src/`)}

    ${ruleBox('purple', `<strong>Spec Review 是团队协作的杠杆</strong><br>
    在写代码之前做 Spec Review，比在代码 PR 上争论设计便宜 10 倍。Spec 改一行 = 可能少写 100 行代码。团队里推行"先合 Spec PR，再动代码"的习惯，能大幅减少返工。`)}

    ${ruleBox('danger', `<strong>Spec 腐化比没有 Spec 更危险</strong><br>
    代码改了但 Spec 没更新，比没有 Spec 更糟——新成员和 AI 会按旧 Spec 做事，然后一脸困惑地发现代码和文档对不上。Spec 作为代码一部分进 PR，不单独维护。`)}

    ${section('AI 在大项目 Spec 管理中的角色', `
      ${stepList([
        {
          title: '让 AI 帮你从需求生成 Spec 草稿',
          desc: '把 PRD 或口头需求描述给 AI，要求按模板生成 Spec 草稿。你来审阅和修正，不是从零写。',
        },
        {
          title: '让 AI 检查 Spec 和代码的一致性',
          desc: '"阅读 specs/search/dropdown.md 和 src/components/SearchDropdown.tsx，列出所有不一致的地方。" 这是 AI 最擅长的：对比两份文档找差异。',
        },
        {
          title: '让 AI 维护 TASKS.md',
          desc: '每次完成一个 Task，让 AI 更新 TASKS.md 的状态，并根据 Spec 建议下一个合理的 Task。把"项目经理"的杂活交出去。',
        },
        {
          title: 'Spec 作为长期记忆',
          desc: '对话上下文会消失，Spec 不会。新对话开头引用相关 Spec，AI 立刻有完整背景，不需要重新解释项目。Spec 是跨对话的持久记忆。',
        },
      ])}
    `)}`;

  return articleShell(t, `
    ${section('什么是 Spec Coding', whatIsHtml)}
    ${section('Spec Coding vs Vibe Coding', vsVibeHtml)}
    ${section('四步落地：从零到 Spec 驱动开发', fourStepsHtml)}
    ${section('一份可直接使用的 Spec 模板', specTemplateHtml)}
    ${section('大项目：Spec 体系管理', largeProjectHtml)}
  `);
}
