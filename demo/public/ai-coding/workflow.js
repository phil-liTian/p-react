function renderWorkflow(t) {
  const newFeatureHtml = stepList([
    { title: '需求分析（自己完成）', desc: '在写任何代码之前，先用自然语言把需求写清楚，列出边界条件和 edge case。这一步不依赖 AI。' },
    { title: '方案探讨（AI 辅助）', desc: '把需求文档喂给 AI，讨论可能的实现方案和技术选型，重点是让 AI 暴露你没想到的问题。' },
    { title: '接口设计（自己主导）', desc: '确定模块边界、函数签名、数据结构。这是架构判断，AI 可以提建议，但决策权在你。' },
    { title: '代码实现（AI 主导）', desc: '在确定好的接口框架下，让 AI 填充实现。这部分效率提升最明显。' },
    { title: 'Review 与修正（自己完成）', desc: '逐行审阅 AI 生成的代码，确保理解每个部分，发现问题及时修正或要求重写。' },
    { title: '测试编写（AI 辅助）', desc: '描述边界条件，让 AI 生成测试用例框架，自己补充业务逻辑相关的断言。' },
  ]);

  const debugHtml = `
    <p>不要直接把报错粘贴给 AI 等答案。先自己尝试定位，形成假设，再用 AI 验证。这样即使 AI 的答案错了，你也有足够判断力识别。</p>
    ${ruleBox('success', `<strong>高效模式：</strong>把错误信息、相关代码片段、你的初步假设一起给 AI，并问："我的假设有什么遗漏？还有哪些可能的原因？" 而不是"这个 bug 怎么修？"`)}`;

  const refactorHtml = cardGrid([
    { icon: '📋', title: '先写重构目标', body: '明确"重构后的代码应该满足哪些质量标准"，而不是直接要求 AI 重构。' },
    { icon: '🔬', title: '小步重构', body: '每次只重构一个函数或一个模式，确保测试通过再继续。避免 AI 一次改动太多失去控制。' },
    { icon: '✅', title: '测试先行', body: '重构前确保有测试覆盖，重构后用同样的测试验证行为未变。' },
    { icon: '📝', title: '提交粒度', body: '每完成一个小步骤就提交一次，AI 造成的回归问题可以快速 git bisect 定位。' },
  ]);

  const claudeMdHtml = `
    <p>对于长期项目，把项目约定写入配置文件，包括：技术栈版本、命名规范、禁止用的库、架构约定等。这样每次对话 AI 都有一致的项目上下文，不需要重复说明。</p>
    ${codeBlock('CLAUDE.md 示例', 'dot-cyan', 'markdown', `# 项目约定

## 技术栈
- React 19 + TypeScript 5.5
- Zustand（状态管理）
- CSS Modules（样式）
- Vitest + Testing Library（测试）

## 命名规范
- 组件文件：PascalCase.tsx
- Hook 文件：use-camelCase.ts
- 工具函数：camelCase.ts

## 禁止
- 禁止使用 any 类型
- 禁止直接操作 DOM（除 ref 外）
- 禁止引入新的样式库（已有 CSS Modules）

## 架构约定
- 业务逻辑放在 hooks/，不放在组件里
- API 调用统一封装在 services/ 目录`)}`;

  return articleShell(t, `
    ${section('新功能开发流程', newFeatureHtml)}
    ${section('Bug 调试工作流', debugHtml)}
    ${section('代码重构工作流', refactorHtml)}
    ${section('使用 CLAUDE.md 固化上下文', claudeMdHtml)}
  `);
}
