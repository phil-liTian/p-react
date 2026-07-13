// ── 渲染器: React Diff 算法（对比 Vue） ────────────────────────────────────────
(function (global) {
  const { renderArticle } = global.PrincipleUtils;

  const blocks = [
    { kind: 'text', title: '一句话结论',
      body: '<strong>React 和 Vue 的 diff 在"骨架"上几乎一致，差异只在多节点移动策略。</strong>两者都靠"同层比较 + 同类型复用 + key 标识"把理论 O(n³) 的树编辑距离降到 O(n)。多节点 diff 上，React 用 <code>lastPlacedIndex</code> 贪心判定（不保证最少移动），Vue3 用<strong>最长递增子序列（LIS）</strong>精确求解（保证最少移动）。React 放弃 LIS 不是不会算，而是 Fiber 可中断渲染 + 优先级调度下的<strong>架构权衡</strong>。' },

    { kind: 'text', title: '联系：三大共同假设',
      body: 'Vue 和 React 在 diff 入口处遵循同一组工程契约，把"找最少 DOM 操作"问题简化为"线性扫描"：<br>① <strong>同层比较</strong>：只在新旧 fiber/vnode 的同级兄弟间 diff，不跨层移动节点 —— 跨层移动一律销毁重建；<br>② <strong>同类型才复用</strong>：<code>&lt;div&gt;</code> 换 <code>&lt;span&gt;</code>、<code>&lt;Input/&gt;</code> 换 <code>&lt;Textarea/&gt;</code> 都卸载重建，内部 state 丢失；<br>③ <strong>key 标识同级节点</strong>：key 不稳定（用 index / random）会让复用错位、state 串台。这三条是 React/Vue 共有的"diff 契约"，违反任意一条 diff 就退化或出错。' },

    { kind: 'compareTable', title: '维度对比',
      columns: ['维度', 'React', 'Vue'],
      rows: [
        ['数据结构',          'Fiber 树 + 链表（child/sibling/return）',    'VNode 树 + children 数组'],
        ['双缓存',            'current/wip 双树，alternate 互指',           '无，直接 patch 真实 DOM'],
        ['触发时机',          'setState 后异步调度 reconcile',              '响应式 setter 同步触发 patch'],
        ['可中断',            '是（Fiber + Scheduler 时间切片）',           '否（同步一气呵成）'],
        ['多节点算法',        '四轮匹配 + lastPlacedIndex（贪心）',         '头尾同步 + 最长递增子序列（LIS）'],
        ['移动判定',          'oldIndex &lt; lastPlacedIndex → 移动',       '不在 LIS 中 → 移动'],
        ['最优性',            '不保证最少移动',                              '保证最少移动（LIS）'],
        ['副作用落地',        'flags 冒泡，commit 阶段统一执行',            'patch 过程中直接操作 DOM'],
        ['Vue 2 vs Vue 3',    '——',                                          'Vue 2 双端比较；Vue 3 头尾同步 + LIS'],
      ]
    },

    { kind: 'compare', title: '多节点 diff 算法对比',
      left: { label: 'React：四轮匹配 + lastPlacedIndex', dot: 'accent', lines: [
        '<strong>第一轮</strong>：顺序同步遍历新旧，按 key 用 <code>updateSlot</code> 匹配，key 不匹配立即 <code>break</code>',
        '<strong>第二轮</strong>：新节点遍历完 → <code>deleteRemainingChildren</code> 删剩余旧节点',
        '<strong>第三轮</strong>：旧节点遍历完 → 剩余新节点 <code>createChildFiber</code> 全部新建插入',
        '<strong>第四轮</strong>：新旧都剩余 → 剩余旧节点建 <code>Map&lt;key, fiber&gt;</code>，新节点按 key O(1) 查找复用',
        '<strong>移动判定</strong>：维护 <code>lastPlacedIndex</code>，复用节点的 <code>oldIndex &lt; lastPlacedIndex</code> 就打 <code>Placement</code> flag',
        '<strong>复杂度</strong>：O(n)，单次线性扫描，<strong>贪心不回溯</strong>',
      ]},
      right: { label: 'Vue3：头尾同步 + LIS', dot: 'green', lines: [
        '<strong>头同步</strong>：从头遍历，新旧头部 key 相同就 <code>patch</code> + 双双前进，不匹配停止',
        '<strong>尾同步</strong>：从尾遍历，新旧尾部 key 相同就 <code>patch</code> + 双双后退，不匹配停止',
        '<strong>中间处理</strong>：剩余旧节点建 <code>key → index</code> Map，新节点按 key 查找；找不到 → 新建',
        '<strong>移动判定</strong>：对"新节点在旧节点中的索引序列"求<strong>最长递增子序列（LIS）</strong>，LIS 中的节点不动，其余按序 <code>insertBefore</code>',
        '<strong>最优性</strong>：LIS 保证移动次数最少（patience sorting，O(n log n)）',
        '<strong>复杂度</strong>：O(n log n)，二分查找维护 LIS 递增序列',
      ]}
    },

    { kind: 'compare', title: '实例：旧 [A,B,C,D] → 新 [C,B,A,D]',
      left: { label: 'React 的处理', dot: 'accent', lines: [
        '处理 C：oldIndex=2 ≥ lastPlacedIndex=0 → 不动，lastPlacedIndex=2',
        '处理 B：oldIndex=1 &lt; 2 → 打 Placement，移动',
        '处理 A：oldIndex=0 &lt; 2 → 打 Placement，移动',
        '处理 D：oldIndex=3 ≥ 2 → 不动',
        '<strong>结果</strong>：B、A 各移动一次，共 <strong>2 次</strong> DOM 移动',
        '<strong>评价</strong>：恰好最优，但这是巧合 —— 反转 [D,C,B,A] 时会全部移动',
      ]},
      right: { label: 'Vue3 的处理', dot: 'green', lines: [
        '新旧头部 A ≠ C → 头同步停止',
        '新旧尾部 D = D → patch + 双双后退',
        '剩余新节点 [C,B,A] 对应旧索引序列 [2,1,0]',
        '对 [2,1,0] 求 LIS → 任一长度为 1 的子序列（如 [2]）',
        '<strong>结果</strong>：LIS 中的 1 个节点不动，其余 2 个 <code>insertBefore</code> → 共 <strong>2 次</strong> DOM 操作',
        '<strong>评价</strong>：数学最优，任意排列都给出最少移动',
      ]}
    },

    { kind: 'rule', ruleType: 'info',
      text: '<strong>这个例子为什么两边结果一样？</strong>因为 [A,B,C,D] → [C,B,A,D] 的"最少移动次数"本身就是 2，React 的贪心恰好命中了最优解。差异体现在<strong>极端场景</strong>：旧 [A,B,C,D] → 新 [D,C,B,A]（完全反转），React 会判定 A/B/C/D 都需要移动（4 次），而 Vue3 的 LIS 能找出 [C,B] 或 [B,A] 等长度 2 的子序列不动（只需 2 次移动）。但实际业务中"完全反转"很少见，<strong>头部插入 / 尾部追加 / 局部更新</strong>才是高频场景，React 的贪心在这些场景下已经接近最优。' },

    { kind: 'text', title: '为什么 React 不用最长递增子序列？',
      body: '这是<strong>设计目标与架构约束共同决定</strong>的，不是算法能力问题。React 追求"可中断、可恢复、可抢占"的并发渲染，LIS 的"最少移动"在这种语义下并不成立 —— 或者说，付出了代价却换不到收益。具体原因有五条。' },

    { kind: 'rule', ruleType: 'warning',
      text: '<strong>① Fiber 是链表，LIS 需要数组随机访问</strong>。React 的 fiber 通过 <code>child/sibling/return</code> 链表组织，遍历是线性的；LIS 的 patience sorting 依赖数组下标随机访问和二分查找。在链表上做 LIS 不自然 —— 要么先转数组（额外 O(n) 内存），要么放弃二分（复杂度退化到 O(n²)）。Vue 的 children 是数组，LIS 直接可用，无额外开销。' },

    { kind: 'rule', ruleType: 'warning',
      text: '<strong>② 可中断渲染下"最少移动"语义不成立</strong>。React 的 <code>workLoopConcurrent</code> 可以被 <code>shouldYield()</code> 打断、被更高优先级任务抢占。如果用 LIS 计算了一组"最少移动"方案，中断恢复后<strong>新列表可能已被高优先级更新改变</strong>，原 LIS 方案作废、必须重算。<code>lastPlacedIndex</code> 是流式贪心 —— 每个节点独立判定，中断恢复后从 <code>workInProgress</code> 指针继续即可，不需要全局重算。' },

    { kind: 'rule', ruleType: 'warning',
      text: '<strong>③ 双缓存 + flags 模型无处安放 LIS 的"精确位置"</strong>。React 在 wip 树上<strong>只计算 flags</strong>（Placement / Update / ChildDeletion），真正写 DOM 推迟到 commit 阶段统一执行。flags 是"是否需要移动"的布尔判定，commit 时按 fiber 顺序 <code>appendChild</code> 即可，<strong>不需要知道"移动到哪个精确位置"</strong>。LIS 算出的"精确插入点"在 flags 模型下无处安放，反而增加协调成本。Vue 直接 patch DOM，"移动到哪"是即时决策，LIS 信息能被直接消费。' },

    { kind: 'rule', ruleType: 'warning',
      text: '<strong>④ Lane 优先级模型下的语义冲突</strong>。React 的 Lane 模型允许多个优先级的更新并发存在（SyncLane / DefaultLane / TransitionLane / IdleLane）。一个低优先级渲染算出的 LIS 移动方案，可能被高优先级更新覆盖；重渲染时旧方案不仅没用，还可能因为基于过期数据而误导。<code>lastPlacedIndex</code> 的"贪心"语义对重渲染友好 —— 每次都基于当前 current 重新判定，不积累历史状态。' },

    { kind: 'rule', ruleType: 'warning',
      text: '<strong>⑤ 实际场景下 LIS 收益有限</strong>。LIS 的优势集中在"反转列表""大规模重排序"等极端场景，但这些在实际业务中很少见。常见场景是"头部插入""尾部追加""局部更新"，<code>lastPlacedIndex</code> 已经能给出接近最优的方案。React 用 O(n) 换 O(n log n) 的算法复杂度，在大多数场景下是<strong>更划算的工程选择</strong> —— 节省的 log n 因子在常见数据规模下（百到千级列表）几乎不可感知。' },

    { kind: 'rule', ruleType: 'accent',
      text: '<strong>总结：算法服务于架构</strong>。LIS 在"同步、一次性、数组结构"下是最优解 —— 这就是 Vue3 的选择。React 的 Fiber 架构（链表 + 双缓存 + 可中断 + 多优先级）改变了前提条件：LIS 的"最少移动"优势无法兑现，反而引入链表转换、中断重算、flags 模型适配、优先级冲突等额外复杂度。<code>lastPlacedIndex</code> 看似"次优"，实则是 React 架构下的<strong>正确解</strong> —— 这是"为什么 React 不学 Vue"的标准答案。' },

    { kind: 'rule', ruleType: 'success',
      text: '<strong>给开发者的共同忠告（React / Vue 通用）</strong>：<br>① <strong>key 必须稳定</strong>：不能用 <code>Math.random()</code> / <code>Date.now()</code>，否则每次渲染 key 全变，diff 退化为全量重建；<br>② <strong>不要用 index 当 key</strong>（在列表可能增删 / 排序时）：头部插入会让所有 index 错位，state 串台；<br>③ <strong>key 在同级兄弟中唯一即可</strong>，跨级可重复；<br>④ <strong>用业务 ID 当 key</strong>（如 <code>item.id</code>）是最稳妥的选择 —— 这条建议对 React 和 Vue 完全一致，diff 算法再先进也救不了不稳定的 key。' },
  ];

  global.renderDiffAlgorithm = function (p) {
    return renderArticle(Object.assign({}, p, { blocks }));
  };
})(window);