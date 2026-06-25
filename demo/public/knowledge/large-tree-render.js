function renderLargeTreeRender(t) {
  const conclusion = ruleBox('danger',
    `<strong>核心问题：</strong>10 万条树形数据一次性渲染会产生 10 万个 DOM 节点，浏览器 Layout → Paint 耗尽主线程，页面直接卡死。解决思路分三层：<strong>① 数据改造</strong>——降低构建成本、转移计算；<strong>② 渲染优化</strong>——只渲染可见节点；<strong>③ 交互卡顿</strong>——展开/折叠/搜索的响应速度。`);

  // ── 一、数据改造 ──────────────────────────────────────────────────────

  const dataRootCause = `
    <p>后端返回的树形数据通常有两种形态，各自有不同的处理瓶颈：</p>
    <ul>
      <li><strong>扁平数组</strong>（<code>[{ id, parentId, name }]</code>）：需要前端构建树，递归 find 是 O(n²)，10 万条会跑几十秒</li>
      <li><strong>树形结构</strong>（嵌套 JSON）：<code>JSON.parse</code> 10 万节点约 200–400ms，仍会阻塞主线程</li>
    </ul>`;

  const flatToTreeCode = `// ❌ 错误做法：递归 find，O(n²)，10 万条卡几十秒
function buildTreeSlow(list) {
  return list
    .filter(n => !n.parentId)
    .map(n => ({ ...n, children: buildChildren(n.id, list) }));
}
function buildChildren(parentId, list) {
  return list
    .filter(n => n.parentId === parentId)       // 每次 O(n)，共调用 n 次
    .map(n => ({ ...n, children: buildChildren(n.id, list) }));
}

// ✅ 正确做法：Map 索引，O(n)，10 万条约 50ms
function buildTree(flatList) {
  const map = new Map();
  const roots = [];

  flatList.forEach(item => map.set(item.id, { ...item, children: [] }));

  flatList.forEach(item => {
    const node = map.get(item.id);
    if (item.parentId == null) {
      roots.push(node);
    } else {
      map.get(item.parentId)?.children.push(node);
    }
  });

  return roots;
}`;

  const workerCode = `// 把 JSON 解析 + 树构建移到 Web Worker，不阻塞主线程

// tree-worker.js
self.onmessage = ({ data }) => {
  const flatList = JSON.parse(data.raw);   // Worker 里解析 JSON
  const tree = buildTree(flatList);        // Worker 里建树
  self.postMessage(tree);                  // 结果传回主线程
};

// main.js
const worker = new Worker('/tree-worker.js');
worker.postMessage({ raw: responseText }); // 传原始字符串，避免结构化克隆大对象
worker.onmessage = ({ data }) => {
  setTreeData(data); // 主线程只做 setState，UI 不阻塞
};

// 注意：postMessage 会结构化克隆数据（深拷贝），10 万节点的树本身也较慢
// 优化：Worker 里只传"拍平后的可见节点列表"而非整棵树`;

  // ── 二、渲染优化 ──────────────────────────────────────────────────────

  const renderCore = `
    <p><strong>Virtual Tree = 虚拟列表 + 拍平可见节点</strong></p>
    <p>树形渲染的本质是：把树按当前展开状态"拍平"成一个<strong>一维有序数组</strong>，每个元素记录自身的 <code>depth</code>（层级），用缩进表示层级关系。这个一维数组就是虚拟列表的数据源，只渲染视口内可见的行。</p>
    <ul>
      <li>初始展开第一层：可见节点可能只有几十条，DOM 轻如鸿毛</li>
      <li>展开一个节点：重新拍平，插入该节点的子节点，虚拟列表自动处理渲染</li>
      <li>折叠一个节点：从拍平列表中移除其所有后代</li>
    </ul>`;

  const flattenCode = `// 核心函数：将树按展开状态拍平为一维列表
function flattenVisibleNodes(tree, expandedIds) {
  const result = [];

  function walk(nodes, depth) {
    for (const node of nodes) {
      result.push({ ...node, depth });
      if (expandedIds.has(node.id) && node.children?.length) {
        walk(node.children, depth + 1);
      }
    }
  }

  walk(tree, 0);
  return result;
  // 展开 = expandedIds.add(id) → 重新调用此函数
  // 折叠 = expandedIds.delete(id) → 重新调用此函数
}

// React 用法：放在 useMemo，避免每次渲染重跑
const flatNodes = useMemo(
  () => flattenVisibleNodes(treeData, expandedIds),
  [treeData, expandedIds]
);`;

  const virtualCode = `// 配合 @tanstack/virtual 渲染可见行
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualTree({ flatNodes, expandedIds, onToggle }) {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: flatNodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,   // 行高（可变行高用 measureElement）
    overscan: 5,              // 视口外额外渲染 5 行，防止白屏
  });

  return (
    <div ref={parentRef} style={{ height: 600, overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map(vItem => {
          const node = flatNodes[vItem.index];
          return (
            <div
              key={node.id}
              style={{
                position: 'absolute',
                top: vItem.start,
                height: vItem.size,
                paddingLeft: node.depth * 16,  // 缩进 = 层级 × 16px
              }}
            >
              <span onClick={() => onToggle(node.id)}>
                {expandedIds.has(node.id) ? '▾' : node.children?.length ? '▸' : ' '}
              </span>
              {node.name}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 生产推荐组件库（有 Virtual Tree 支持）：
// - antd Tree：配置 virtual 属性即可开启虚拟滚动
// - rc-tree：antd 底层，可单独使用
// - @tanstack/virtual：框架无关，需自行组合`;

  const lazyCode = `// 懒加载：最适合真正的超大树或节点需权限控制的场景
// 初始只加载根节点，点击展开时按需请求子节点

async function handleExpand(node) {
  if (node.childrenLoaded) return;  // 已加载过

  node.loading = true;
  const children = await api.getChildren(node.id);  // 按需请求
  node.children = children;
  node.childrenLoaded = true;
  node.loading = false;
  setTree([...tree]);  // 触发更新
}

// 优势：
// - 首屏只渲染根节点，无需虚拟化也极快
// - 用户只请求实际展开的节点，节省流量
// - 结合搜索时返回"命中节点的完整祖先路径"，体验更好`;

  // ── 三、交互卡顿 ──────────────────────────────────────────────────────

  const interactionNote = `
    <p>即使渲染本身流畅，以下交互操作也可能引发卡顿：</p>`;

  const interactionCode = `// 问题一：展开节点时 flattenVisibleNodes 重跑
// 原因：10 万节点的树全量拍平一次约 20-50ms，连续展开时感受明显
// 解法：增量更新 flatList，只插入/删除该节点的直接子节点

function toggleNode(flatList, node, expandedIds) {
  const idx = flatList.findIndex(n => n.id === node.id);
  if (expandedIds.has(node.id)) {
    // 折叠：找到所有后代（depth > node.depth 的连续节点），切掉
    let end = idx + 1;
    while (end < flatList.length && flatList[end].depth > node.depth) end++;
    return [...flatList.slice(0, idx + 1), ...flatList.slice(end)];
  } else {
    // 展开：在 idx 后插入直接子节点（仅一级）
    const children = node.children?.map(c => ({ ...c, depth: node.depth + 1 })) ?? [];
    return [...flatList.slice(0, idx + 1), ...children, ...flatList.slice(idx + 1)];
  }
}`;

  const searchCode = `// 问题二：树搜索——10 万条全量过滤阻塞主线程
// 解法 A：Web Worker 里做搜索，结果传回主线程
// 解法 B：用 requestIdleCallback 分片处理

// 解法 B：分片搜索（不需要 Worker，简单场景足够）
function searchTree(flatList, keyword, callback) {
  const CHUNK = 5000;
  let i = 0;
  const result = [];

  function processChunk() {
    const end = Math.min(i + CHUNK, flatList.length);
    for (; i < end; i++) {
      if (flatList[i].name.includes(keyword)) result.push(flatList[i]);
    }
    if (i < flatList.length) {
      requestIdleCallback(processChunk); // 利用浏览器空闲时间继续
    } else {
      callback(result); // 搜索完成
    }
  }

  requestIdleCallback(processChunk);
}

// 解法 C：后端搜索（最优）
// 前端只传关键词，后端返回命中节点 + 其所有祖先节点
// 前端直接展开这条路径，无需全量数据`;

  const notes = [
    ruleBox('warning', `<strong>先质疑接口设计：</strong>真实场景中，一次性返回 10 万条树形数据通常是接口设计问题。优先和后端沟通能否改为<strong>按节点懒加载</strong>或<strong>搜索时返回全树路径</strong>，这是成本最低、收益最大的优化。`),
    ruleBox('info', `<strong>React 的额外注意点：</strong>① <code>expandedIds</code> 用 <code>Set</code>，展开/折叠要 <code>new Set(prev)</code> 创建新引用，否则 React 不重渲染；② <code>flattenVisibleNodes</code> 放 <code>useMemo</code>；③ 虚拟列表行组件用 <code>React.memo</code> 防止无关行重渲染。`),
    ruleBox('success', `<strong>实战组合拳（10 万条）：</strong>Web Worker 构建树 → postMessage 传回主线程 → 只展开第一层（flatNodes 几十条）→ @tanstack/virtual 渲染 → 展开时增量更新 flatList。初始渲染与 100 条数据体验完全一致。`),
  ];

  const decisionHtml = `
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:var(--bg-overlay)">
          <th style="padding:8px 12px;text-align:left;color:var(--text-muted);font-weight:600;font-size:11px;letter-spacing:.5px;border-bottom:1px solid var(--border)">规模</th>
          <th style="padding:8px 12px;text-align:left;color:var(--text-muted);font-weight:600;font-size:11px;letter-spacing:.5px;border-bottom:1px solid var(--border)">推荐方案</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom:1px solid var(--border)">
          <td style="padding:9px 12px;color:var(--green);font-family:var(--font-code);font-size:12px">&lt; 1000 条</td>
          <td style="padding:9px 12px;color:var(--text-secondary)">直接渲染，无需优化</td>
        </tr>
        <tr style="border-bottom:1px solid var(--border)">
          <td style="padding:9px 12px;color:var(--yellow);font-family:var(--font-code);font-size:12px">1000 ~ 1 万</td>
          <td style="padding:9px 12px;color:var(--text-secondary)">Virtual Tree（拍平 + 虚拟列表），antd Tree 的 <code>virtual</code> 属性最省事</td>
        </tr>
        <tr style="border-bottom:1px solid var(--border)">
          <td style="padding:9px 12px;color:var(--red);font-family:var(--font-code);font-size:12px">1 万 ~ 10 万</td>
          <td style="padding:9px 12px;color:var(--text-secondary)">Web Worker 建树 + Virtual Tree + 增量更新 flatList</td>
        </tr>
        <tr>
          <td style="padding:9px 12px;color:var(--red);font-family:var(--font-code);font-size:12px">&gt; 10 万</td>
          <td style="padding:9px 12px;color:var(--text-secondary)">先质疑接口设计；必须全量则改懒加载，后端分页/搜索</td>
        </tr>
      </tbody>
    </table>`;

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('一、数据改造', dataRootCause)}
    ${section('扁平数组转树：O(n) vs O(n²)', codeBlock('buildTree.js', 'dot-blue', 'javascript', flatToTreeCode))}
    ${section('Web Worker：把构建移出主线程', codeBlock('tree-worker.js', 'dot-yellow', 'javascript', workerCode))}
    ${section('二、渲染优化', renderCore)}
    ${section('Virtual Tree 核心：拍平可见节点', codeBlock('flattenVisibleNodes.js', 'dot-green', 'javascript', flattenCode))}
    ${section('配合 @tanstack/virtual 渲染', codeBlock('VirtualTree.tsx', 'dot-blue', 'javascript', virtualCode))}
    ${section('懒加载子节点（超大树首选）', codeBlock('lazyTree.js', 'dot-orange', 'javascript', lazyCode))}
    ${section('三、交互卡顿', interactionNote)}
    ${section('展开/折叠：增量更新 flatList', codeBlock('toggleNode.js', 'dot-green', 'javascript', interactionCode))}
    ${section('搜索：分片处理 / Worker / 后端搜索', codeBlock('searchTree.js', 'dot-yellow', 'javascript', searchCode))}
    ${section('选型决策', decisionHtml)}
    ${section('注意事项', notes.join(''))}`);
}
