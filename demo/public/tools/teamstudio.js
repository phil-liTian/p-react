function renderTeamstudio(t) {
  const principleCode = `# TeamStudio 的工作原理
#
# 维护者侧：把内容按目录约定放进 Git → 平台注册为"包" → 项目里勾选
# 开发者侧：装一次 CLI → 启动 Claude Code / Cursor 时自动拉取勾选的包
#
# 平台只读同步，不写回 Git 仓库 —— 改内容去源仓库 push，平台定期探测同步

# 一次配置后的日常流程
1. 开发者打开已接入 TeamStudio 的项目，启动 Claude Code / Cursor
2. 客户端自动拉取该项目勾选的上下文包
3. AGENTS.md 规则始终注入、技能按需触发、文档按需阅读、资源搜索拉取
4. 切分支时，若项目按分支配了不同包，会跟着切

# 例：你在订单服务仓库开 Claude Code
# → 它会先读到公司安全红线与本服务计费规则，再动手改代码
# → 不用你每次口头重复这些约束`;

  const installCode = `# ① 安装客户端（必做）
# 去「客户端下载」页，点「复制」，把整段提示词贴给 AI 助手
# 让 Claude Code / Cursor 按提示完成安装与登录 —— 通常一两分钟
# 装好后，本机启动助手时会自动同步，一般不用再敲命令

# ② 若提示未登录，在终端执行
ctx login
# 按屏幕指引用浏览器授权即可

# ③ 查看当前项目同步了哪些包、对应哪个源 Git 仓库
ctx status

# ④ 搜索并拉取外部资源（OpenAPI 等大文件，不常驻占窗口）
ctx resource <关键词>`;

  const contentTable = `
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px">
      <thead>
        <tr style="border-bottom:1px solid var(--border)">
          <th style="text-align:left;padding:6px 10px;color:var(--text-muted);font-weight:600;font-size:11px;letter-spacing:0.5px">类型</th>
          <th style="text-align:left;padding:6px 10px;color:var(--text-muted);font-weight:600;font-size:11px;letter-spacing:0.5px">注入方式</th>
          <th style="text-align:left;padding:6px 10px;color:var(--text-muted);font-weight:600;font-size:11px;letter-spacing:0.5px">典型场景</th>
        </tr>
      </thead>
      <tbody>
        ${[
          ['规则',   '始终注入（写进 AGENTS.md，每次都看到）', '编码规范、安全红线、技术栈约束'],
          ['技能',   '按需触发（匹配场景时自动启用）',          '发布、排查、代码审查等流程'],
          ['文档',   '按需阅读（助手按文件名 + 描述选篇）',     '业务规则、计费说明、系统手册'],
          ['外部资源', '搜索拉取（不常驻，用时再取）',          'OpenAPI、大块参考材料'],
        ].map(([type, inject, scene]) => `
          <tr style="border-bottom:1px solid var(--border)">
            <td style="padding:8px 10px;color:var(--text-secondary);font-weight:600">${escHtml(type)}</td>
            <td style="padding:8px 10px;font-family:var(--font-code);font-size:11.5px;color:var(--accent-light)">${escHtml(inject)}</td>
            <td style="padding:8px 10px;color:var(--text-muted)">${escHtml(scene)}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;

  const dirCode = `# 仓库目录约定（平台按目录位置识别内容类型）
my-context/              ← 整仓或其中若干子目录 = 一个包
├── AGENTS.md            ← 规则（始终注入）
├── rules/               ← 或放多条规则（也认 rule/）
│   └── security.md
├── skills/
│   └── deploy/
│       └── SKILL.md     ← 技能（所在目录整体算一个技能）
├── docs/
│   └── billing.md       ← 文档（不含 README / SKILL / AGENTS）
└── resources/
    └── openapi.yaml     ← 外部资源（可选，任意格式）`;

  const skillCode = `# 技能：文件最开头写 frontmatter（第一行必须是 ---）
# 用一句话说清「做什么、何时用」
---
name: deploy-service
description: 发布服务到测试/生产。用户说"发布""上线""部署"时使用。
---

# 发布服务
1. 确认环境（test / product）
2. 执行 mvn clean package -P<env>

# 文档：建议写 frontmatter 的 description，让文件名见名知意
# 助手靠「文件名 + 描述」选篇阅读
---
description: 订单计费与退款规则，改价格、对账、退款逻辑时阅读
---

# 计费规则
...`;

  const registerSteps = `
    <ol class="step-list">
      <li><span class="step-num">01</span><span>「上下文管理」→「注册上下文」：填 Git URL、分支（空则优先 main，其次 master）</span></li>
      <li><span class="step-num">02</span><span>范围可选整仓，或勾选多个子目录合并成一个包 →「扫描并识别」</span></li>
      <li><span class="step-num">03</span><span>确认包名后注册</span></li>
      <li><span class="step-num">04</span><span>「项目管理」进入对应项目 → 上下文配置 → 勾选需要的包（可按分支配不同包）→ 保存</span></li>
      <li><span class="step-num">05</span><span>开发者只要装过 CLI，在该项目启动 Coding Agent 就自动用上这些内容</span></li>
    </ol>`;

  const notes = [
    ruleBox('success', '<strong>对开发者几乎无感：</strong>装一次客户端后，启动 Claude Code / Cursor 时自动拉取勾选的上下文包。切分支时若项目按分支配了不同包，会跟着切。不用每次口头重复公司规范、红线、业务规则。'),
    ruleBox('info', '<strong>平台只读，不写回仓库：</strong>想改公共规范或文档？用 <code>ctx status</code> 看包对应的源 Git 仓库，在那边改并 push；平台定期探测并同步，无需逐仓配 Webhook。'),
    ruleBox('warning', '<strong>扫描不到内容时排查：</strong>① 对照目录约定（AGENTS.md / rules/ / skills/SKILL.md / docs/ / resources/）② 查分支是否写对 ③ 查平台是否有该仓库只读权限。'),
    ruleBox('info', '<strong>纯资源包不必勾进项目依赖：</strong>大块参考材料（OpenAPI 等）放 <code>resources/</code>，助手用 <code>ctx resource</code> 全平台搜索拉取即可，不常驻占上下文窗口。'),
  ];

  return articleShell(t, `
    ${section('是什么', `<p>${t.summary}</p><p style="margin-top:8px">平台只读同步，不写回 Git 仓库 —— 改内容去源仓库 push，平台定期探测同步。对开发者几乎无感：装一次客户端，之后启动 Coding Agent 时自动同步勾选的上下文。</p>`)}
    ${section('工作原理', codeBlock('两端协作模型', 'dot-cyan', 'bash', principleCode))}
    ${section('安装与 CLI 命令', codeBlock('开发者侧使用步骤', 'dot-green', 'bash', installCode))}
    ${section('四类内容', contentTable)}
    ${section('维护者：目录约定', codeBlock('仓库目录结构', 'dot-yellow', 'bash', dirCode))}
    ${section('维护者：技能与文档写法', codeBlock('SKILL.md 与文档 frontmatter', 'dot-orange', 'markdown', skillCode))}
    ${section('维护者：注册并挂到项目', registerSteps)}
    ${section('注意事项', notes.join(''))}`);
}
