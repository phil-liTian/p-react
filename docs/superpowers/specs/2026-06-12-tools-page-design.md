# Tools Page Design — demo/tools.html

## Overview

A new page at `demo/tools.html` introducing daily development tools, styled identically to `demo/pitfalls.html`. Two sidebar nav groups separate daily and AI tools.

## Layout

Reuses the exact CSS variable system and HTML structure from pitfalls.html:
- Left sidebar (260px) with logo, nav groups, back-to-hub footer link
- Right content panel with a fixed header breadcrumb + scrollable article area
- Mobile responsive: hamburger menu, overlay, 700px breakpoint

No new CSS abstractions — copy the same stylesheet, update the badge label in the logo area.

## Sidebar Groups & Nav Items

| Group label | Nav item | Badge color |
|---|---|---|
| 日常工具 | whistle 抓包 | blue (info) |
| AI 工具 | cc-switch | accent/purple |
| AI 工具 | Superpowers | accent/purple |

## Article Content Per Tool

### whistle 抓包

Sections:
1. **工具简介** — 一句话定义 + 核心能力
2. **快速上手** — 安装命令 (npm i -g whistle) → 启动 (w2 start) → 浏览器设置代理 → 安装 HTTPS 根证书
3. **常用规则速查** — code block 展示 mock / redirect / inspectResponseBody / reqHeaders 等规则语法，每条附一行注释
4. **注意事项** — rule-box (info/warning) 关于 HTTPS 抓包、移动端配置的 tips

### cc-switch

Sections:
1. **工具简介** — 用于切换 Claude Code 配置文件 / 不同 API 账号
2. **安装与使用** — step-list 格式：安装 → 新增 profile → 切换 profile → 查看当前
3. **典型场景** — rule-box 展示：个人 vs 公司账号切换、团队共享配置
4. **命令速查** — code block 列出核心命令

### Superpowers

Sections:
1. **是什么** — skills 系统概念，一句话 + 工作原理
2. **如何触发** — 两种方式：Skill tool (agent 自动) / `/skill-name` (用户显式调用)
3. **核心 Skill 速查** — 表格：skill 名 + 触发时机 + 一句话描述（brainstorming / TDD / debugging / writing-plans / verification-before-completion 等）
4. **使用原则** — rule-box (success/info) 关键注意事项

## Data Model

Tools are stored as a JS array (same pattern as `pitfalls` in pitfalls.html):

```js
const tools = [
  {
    id: 'whistle',
    name: 'whistle 抓包',
    group: '日常工具',
    type: 'info',   // controls badge color
    icon: '🔍',
    tags: [...],
    sections: [...]  // flexible structure, rendered per-tool
  },
  ...
]
```

Each tool renders its own HTML via `renderTool(t)` — no shared template since content structure varies per tool.

## Hub Integration

Add a card to `demo/hub.html` linking to `tools.html` alongside the existing pitfalls card.

## Files Changed

- `demo/tools.html` — new file
- `demo/hub.html` — add tools card (minor edit)
