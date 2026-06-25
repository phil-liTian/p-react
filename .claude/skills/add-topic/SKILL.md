---
name: add-topic
description: Use when adding a new topic to any demo page in this project — a new render file under demo/public/<page>/, a new entry in the page's data.js, or both. Ensures the global search registry stays in sync.
---

# add-topic：新增 topic 后同步全局注册表

## 概述

每个 demo 页面都有本地的 `data.js`（页面侧 topic 列表）和对应的渲染文件（`<id>.js`）。  
全局搜索依赖 `demo/public/global-topics.js` 中的 `globalTopics` 数组。  
**新增 topic 后必须同步这三处，缺一会导致全局搜索找不到该条目。**

## 三处需要同步的文件

| 文件 | 作用 | 必须同步？ |
|---|---|---|
| `demo/public/<page>/data.js` | 页面左侧导航列表 | ✅ |
| `demo/public/<page>/<id>.js` | 该 topic 的渲染内容 | ✅ |
| `demo/public/global-topics.js` | 全局搜索注册表 | ✅ **最容易漏掉** |

## global-topics.js 条目格式

```js
{ id: 'topic-id', name: '显示名称', group: '分组名', icon: '🔢', page: 'java' }
```

- `id`：与 `data.js` 和渲染文件名完全一致（用连字符）
- `group`：**纯文字**，不含 emoji（如 `'Spring'`，不是 `'🌱 Spring 通识'`）
- `page`：页面标识符，取值见下表

## page 标识符对照

| 页面 | page 值 |
|---|---|
| demo/java.html | `'java'` |
| demo/knowledge.html | `'knowledge'` |
| demo/tools.html | `'tools'` |
| demo/ai-coding.html | `'ai-coding'` |
| demo/deployment.html | `'deployment'` |
| demo/pitfalls.html | `'pitfalls'` |

## 插入位置规则

在 `global-topics.js` 中找到对应页面的注释块（如 `// ── Java 视角 ──`），将新条目追加到该块**末尾**，保持与同组已有条目的缩进和对齐风格一致。

## data.js 中的 group 字段差异

`data.js` 里的 `group` 通常包含 emoji 前缀（如 `'🌱 Spring 通识'`），  
`global-topics.js` 里的 `group` 去掉 emoji 只保留文字（如 `'Spring'`）。

## 检查清单

完成新 topic 后，逐项确认：

- [ ] `demo/public/<page>/<id>.js` 渲染函数已创建，函数名为 `render` + 驼峰 id
- [ ] `demo/public/<page>/data.js` 的 `topics` 数组已添加对应条目
- [ ] `demo/public/global-topics.js` 的 `globalTopics` 数组已添加条目，且 `group` 无 emoji
