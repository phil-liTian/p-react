# Java 学习路径思维导图 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `demo/java.html` 侧边栏新增"学习路径总览"条目，点击后展示放射状 SVG 思维导图，包含全部 22 个 topics，节点可点击跳转。

**Architecture:** 在 `data.js` 最前面插入 `learning-map` topic 条目；新建 `learning-map.js` 渲染器，通过算法计算 6 个分组和 22 个叶节点的 SVG 坐标，输出内嵌 SVG 的 HTML 字符串；`app.js` 动态加载机制无需修改即可自动识别新渲染器。

**Tech Stack:** 纯 HTML/SVG/JavaScript（ES6），无外部依赖；读取全局 `topics` 数组（由 `data.js` 注入）动态生成分组。

---

## 文件清单

| 操作 | 文件 |
|------|------|
| 修改 | `demo/public/java/data.js`（第 1 行，插入新 topic） |
| 新建 | `demo/public/java/learning-map.js` |

---

## Task 1：在 data.js 中注册新 topic

**Files:**
- Modify: `demo/public/java/data.js:1`

- [ ] **Step 1：在 `topics` 数组最前面插入条目**

打开 `demo/public/java/data.js`，在第 1 行 `const topics = [` 后、`spring-bean-ioc` 条目之前，插入：

```js
const topics = [
  {
    id: 'learning-map',
    name: '学习路径总览',
    group: '🗺️ 学习路径',
    type: 'accent',
    icon: '🗺️',
    tags: [
      { label: '思维导图', type: 'accent' },
      { label: '总览', type: 'info' },
      { label: '路径', type: 'success' },
    ],
  },
  // ... 原有条目保持不变
```

- [ ] **Step 2：在浏览器中验证侧边栏**

启动本地服务（或直接打开 `demo/java.html`），确认：
1. 侧边栏第一个分组是 `🗺️ 学习路径`，下面有 `🗺️ 学习路径总览`
2. 点击该条目后控制台报错 `Failed to load: learning-map`（正常，渲染器尚未创建）
3. 其他所有原有条目仍然可以正常加载

---

## Task 2：创建 learning-map.js 渲染器

**Files:**
- Create: `demo/public/java/learning-map.js`

### 布局算法说明

SVG 画布 1000×1000，中心 (500, 500)。

6 个分组节点均匀分布在半径 240px 的圆上（角度从 12 点顺时针）：

| 分组 | 角度 | 颜色 |
|------|------|------|
| 🌱 Spring 通识 | 0° | `#3fb950` |
| 📦 工具链 | 60° | `#f59e42` |
| 🏗️ 项目结构 | 120° | `#58a6ff` |
| 🗄️ 数据库 | 180° | `#f85149` |
| 🧵 并发 | 240° | `#d29922` |
| ☕ Java 基础 | 300° | `#e8590c` |

叶节点坐标公式（以分组节点为基准，沿径向方向延伸 160px，沿垂直方向散开）：

```
sinA = sin(angle_rad)
cosA = cos(angle_rad)

// 分组节点
gx = 500 + 240 * sinA
gy = 500 - 240 * cosA

// 第 i 个叶节点（N 个叶共 i ∈ [0, N-1]）
perp = (i - (N-1)/2) * 36   // 垂直方向偏移，间距 36px
lx = gx + sinA * 160 + cosA * perp
ly = gy - cosA * 160 + sinA * perp
```

- [ ] **Step 1：创建 `demo/public/java/learning-map.js`，写入完整渲染器**

```js
function renderLearningMap(t) {
  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // 读取全局 topics，排除自身
  const allTopics = typeof topics !== 'undefined' ? topics : [];
  const groupMap = {};
  const groupOrder = [];
  allTopics.forEach(topic => {
    if (topic.id === 'learning-map') return;
    if (!groupMap[topic.group]) {
      groupMap[topic.group] = [];
      groupOrder.push(topic.group);
    }
    groupMap[topic.group].push(topic);
  });

  const CX = 500, CY = 500;
  const GROUP_R = 240;   // 分组节点距中心距离
  const LEAF_DIST = 160; // 叶节点距分组节点距离
  const LEAF_GAP = 36;   // 叶节点垂直间距

  const groupMeta = {
    '🌱 Spring 通识': { angle: 0,   color: '#3fb950' },
    '📦 工具链':      { angle: 60,  color: '#f59e42' },
    '🏗️ 项目结构':   { angle: 120, color: '#58a6ff' },
    '🗄️ 数据库':     { angle: 180, color: '#f85149' },
    '🧵 并发':       { angle: 240, color: '#d29922' },
    '☕ Java 基础':  { angle: 300, color: '#e8590c' },
  };

  const toRad = deg => (deg * Math.PI) / 180;
  const fix = n => n.toFixed(1);

  let lines = '';
  let nodes = '';

  groupOrder.forEach(groupName => {
    const meta = groupMeta[groupName];
    if (!meta) return;

    const { angle, color } = meta;
    const rad = toRad(angle);
    const sinA = Math.sin(rad);
    const cosA = Math.cos(rad);

    const gx = CX + GROUP_R * sinA;
    const gy = CY - GROUP_R * cosA;

    // 中心 → 分组节点连线
    lines += `<line x1="${CX}" y1="${CY}" x2="${fix(gx)}" y2="${fix(gy)}"
      stroke="${color}" stroke-width="2" stroke-opacity="0.4"/>`;

    // 分组节点
    nodes += `<g>
      <rect x="${fix(gx - 58)}" y="${fix(gy - 16)}" width="116" height="32" rx="7"
        fill="${color}22" stroke="${color}" stroke-width="1.5"/>
      <text x="${fix(gx)}" y="${fix(gy + 5)}" text-anchor="middle"
        fill="${color}" font-size="11" font-weight="600">${esc(groupName)}</text>
    </g>`;

    // 叶节点
    const topicList = groupMap[groupName] || [];
    const N = topicList.length;

    topicList.forEach((topic, i) => {
      const perp = (i - (N - 1) / 2) * LEAF_GAP;
      const lx = gx + sinA * LEAF_DIST + cosA * perp;
      const ly = gy - cosA * LEAF_DIST + sinA * perp;

      // 分组节点 → 叶节点连线（贝塞尔曲线）
      const mx = (gx + lx) / 2;
      const my = (gy + ly) / 2;
      lines += `<path d="M ${fix(gx)} ${fix(gy)} Q ${fix(mx)} ${fix(my)} ${fix(lx)} ${fix(ly)}"
        stroke="#30363d" stroke-width="1.5" fill="none"/>`;

      // 叶节点（可点击）
      nodes += `<g class="topic-node" onclick="selectTopic('${esc(topic.id)}')"
          style="cursor:pointer">
        <rect x="${fix(lx - 70)}" y="${fix(ly - 13)}" width="140" height="26" rx="5"
          fill="#161b22" stroke="#21262d" stroke-width="1"/>
        <text x="${fix(lx)}" y="${fix(ly + 4)}" text-anchor="middle"
          fill="#8b949e" font-size="9.5">${esc(topic.name)}</text>
      </g>`;
    });
  });

  // 中心节点（最后绘制，确保在最上层）
  nodes += `<circle cx="${CX}" cy="${CY}" r="50" fill="url(#centerGrad)"/>
    <text x="${CX}" y="${CY - 6}" text-anchor="middle"
      fill="white" font-size="13" font-weight="700">Java 视角</text>
    <text x="${CX}" y="${CY + 12}" text-anchor="middle"
      fill="rgba(255,255,255,0.7)" font-size="11">学习总览</text>`;

  const topicCount = allTopics.length - 1;

  const svg = `<svg viewBox="0 0 1000 1000" width="100%"
      style="max-width:900px;display:block;margin:0 auto"
      xmlns="http://www.w3.org/2000/svg"
      font-family="Inter,-apple-system,sans-serif">
    <defs>
      <radialGradient id="centerGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#f59e42"/>
        <stop offset="100%" stop-color="#e8590c"/>
      </radialGradient>
    </defs>
    <style>
      .topic-node:hover rect { stroke: #f59e42; fill: rgba(232,89,12,0.08); }
      .topic-node:hover text { fill: #e6edf3; }
    </style>
    ${lines}
    ${nodes}
  </svg>`;

  return articleShell(t, `
    ${section('知识图谱 · 全部 ' + topicCount + ' 个 Topic',
      '<p>点击任意节点可跳转到对应文章。</p>')}
    ${svg}
  `);
}
```

- [ ] **Step 2：在浏览器中验证思维导图**

打开 `demo/java.html`，点击"学习路径总览"，确认：
1. 显示 SVG 思维导图，中心节点"Java 视角"可见
2. 6 个分组节点围绕中心分布，颜色与各分组对应
3. 22 个 topic 叶节点均可见，标签文字可读
4. hover 叶节点时有橙色高亮和文字变亮效果
5. 点击任意叶节点，页面切换到对应 topic 文章，侧边栏高亮也跟随变化

- [ ] **Step 3：检查边界情况**

在浏览器中逐项确认：
- 数据库分组（8 个 topic）叶节点无重叠，全部在画布内
- Spring 通识分组（5 个 topic）叶节点位于画布上方，无截断
- 窗口缩小到 700px 以下时 SVG 自适应缩放，不出现横向滚动条

---

## 自检清单

完成所有 Task 后确认：

- [ ] 侧边栏第一条是"🗺️ 学习路径总览"
- [ ] 点击后 SVG 正确显示，无 JS 报错（F12 控制台）
- [ ] 全部 22 个叶节点可点击且跳转正确
- [ ] hover 效果正常
- [ ] 原有所有 topic 仍可正常加载，无回归
