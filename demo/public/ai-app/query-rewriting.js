function renderQueryRewriting(t) {

  // ── Section 1: 核心结论 ──────────────────────────────────────────────────────

  const conclusion = ruleBox('accent',
    `<strong>核心结论：查询改写 = 把用户的原始查询改写成更适合检索的形式</strong><br><br>
    查询改写是 RAG 的<strong>"翻译官"</strong> —— 用户说"大白话"，知识库说"专业术语"，改写器在中间做翻译。<br><br>
    工程上一句话：<code>用户原始 query → 改写器 → 改写后 query（或多个 query）→ embedding 检索 → 拼成上下文</code>。<br><br>
    检索质量的上限由查询质量决定 —— 改写错了，后面 rerank 做得再好也救不回来。`);

  // ── Section 2: 场景切入 + 贯穿示例 ───────────────────────────────────────────

  const scenarioBox = ruleBox('info',
    `<strong>场景切入：一个 RAG 系统的"翻译"问题</strong><br><br>
    ① <strong>用户问</strong>：「GPT-4 怎么收费」<br>
    ② <strong>知识库里写的是</strong>：「OpenAI API 定价」「token 价格」「输入输出费用」<br>
    ③ <strong>直接 embedding 检索</strong>：query 和文档<strong>语义对不上</strong>（口语 vs 术语），召回率低<br><br>
    <strong>查询改写</strong>就是把「GPT-4 怎么收费」改写成「OpenAI API 定价」—— 翻译完，检索才能命中。`);

  const scenarioWarnBox = ruleBox('warning',
    `<strong>三种典型失败场景</strong><br><br>
    ① <strong>口语化</strong>：「GPT-4 怎么收费」「这个多少钱」—— 术语对不上<br>
    ② <strong>指代不清</strong>：「它支持函数调用吗」（"它"指什么？）—— 缺上下文<br>
    ③ <strong>过短 / 过长</strong>：「价格」（太短信号弱）、「我想要了解一下你们公司最新发布的产品在市场中的销售情况」（太长噪声多）<br><br>
    三种场景都需要改写器把查询<strong>"翻译"成检索友好的形式</strong>。`);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('场景切入 + 贯穿示例', scenarioBox + scenarioWarnBox)}`);
}
