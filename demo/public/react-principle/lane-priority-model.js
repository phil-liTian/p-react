// ── 渲染器: Lane 优先级位掩码模型 ─────────────────────────────────────────────
(function (global) {
  const { renderArticle } = global.PrincipleUtils;

  const blocks = [
    { kind: 'text', title: '一句话结论',
      body: '<strong>Lane 是 React 18 引入的优先级位掩码模型，用 32 位整数的每一位表示一种优先级</strong>，支持"多优先级共存 + 位运算合并/移除/最高位提取"。它彻底替代了 React 17 的 ExpirationTime 单一过期时间模型，<strong>核心目的是支持并发模式下的批处理、批量更新和优先级抢占</strong>。' },

    { kind: 'compare', title: 'ExpirationTime vs Lane',
      left: { label: 'React 17：ExpirationTime', dot: 'accent', lines: [
        '<strong>设计</strong>：每个 update 携带一个过期时间戳（ms），<code>render</code> 时取"最早过期时间"作为整棵树的截止时间',
        '<strong>表达力</strong>：<strong>只能表达一个数</strong>（过期时间），无法直接表示"输入 vs 过渡 vs 空闲"等多种语义',
        '<strong>批处理</strong>：靠 <code>unstable_batchedUpdates</code> 手动指定，<strong>事件处理器外不自动批</strong>',
        '<strong>优先级</strong>：数值越小优先级越高；多个不同优先级更新会<strong>相互覆盖</strong>，无法同时存在',
        '<strong>位运算</strong>：<strong>完全用不到</strong>，加减法和比较运算为主',
      ]},
      right: { label: 'React 18：Lane', dot: 'green', lines: [
        '<strong>设计</strong>：用 32 位整数的<strong>位</strong>表示优先级，每一位叫一条 Lane，<strong>整棵树的状态是 lanes 集合</strong>',
        '<strong>表达力</strong>：<strong>可同时表示 31 种优先级</strong>（去掉符号位），通过位掩码任意组合',
        '<strong>批处理</strong>：<strong>所有更新自动批</strong>（包括 setTimeout / Promise.then / native event handler）',
        '<strong>优先级</strong>：<strong>多优先级可同时存在</strong>（通过 OR 操作合并），互不覆盖',
        '<strong>位运算</strong>：<code>mergeLanes</code> / <code>removeLanes</code> / <code>intersectLanes</code> / <code>getHighestPriorityLane</code>，全是 O(1)',
      ]}
    },

    { kind: 'text', title: 'Lane 常量与 32 位掩码',
      body: 'React 把 32 位无符号整数每一位赋予一个语义化常量，按优先级从高到低排列：' },

    { kind: 'code', title: 'Lane 常量定义',
      code: `// React 18 Lane 常量（react-reconciler/src/ReactFiberLane.js）
export const NoLanes: Lanes = 0b0000000000000000000000000000000;
export const NoLane: Lane = 0;

export const SyncHydrationLane: Lane = 0b0000000000000000000000000000001;
export const SyncLane: Lane =         0b0000000000000000000000000000010;
export const InputContinuousHydrationLane: Lane = 0b0000000000000000000000000000100;
export const InputContinuousLane: Lane =      0b0000000000000000000000000001000;
export const DefaultHydrationLane: Lane =     0b0000000000000000000000000010000;
export const DefaultLane: Lane =              0b0000000000000000000000000100000;
export const SyncUpdateLanes: Lanes =         SyncLane | InputContinuousLane | DefaultLane;
export const GestureLane: Lane =              0b0000000000000000000000001000000;
export const TransitionLanes: Lanes =         0b0000000000000001111111110000000;  // 8 条
export const RetryLanes: Lanes =              0b0000011111111110000000000000000;  // 12 条
export const SelectiveHydrationLane: Lane =   0b0000100000000000000000000000000;
export const IdleHydrationLane: Lane =        0b0010000000000000000000000000000;
export const IdleLane: Lane =                 0b0100000000000000000000000000000;
export const OffscreenLane: Lane =            0b1000000000000000000000000000000;

// 总共 31 条可用 Lane + 1 个 NoLane 占位 = 32 位` },

    { kind: 'text', title: '三类 Lane 的语义分组',
      body: '虽然 31 条 Lane 看起来很多，但按业务语义只分三组：' },

    { kind: 'compareTable', title: '三类 Lane',
      columns: ['分类', 'Lane', '触发场景', '过期时间'],
      rows: [
        ['Discrete（离散）',   'SyncLane',                                    '同步事件（discrete events）：点击、键盘、change 事件等',           '−1（立即过期）'],
        ['Continuous（连续）', 'InputContinuousLane / DefaultLane',           '连续事件（continuous events）：拖拽、滚动、mouse move 等',        '250ms / 5s'],
        ['Default（默认）',   'DefaultLane',                                 'setState、useState、useReducer 等普通更新',                         '5s'],
        ['Transition',        'TransitionLanes（8 条）',                     'useTransition / startTransition 标记的更新',                      '5s'],
        ['Retry',             'RetryLanes（12 条）',                         'Suspense 重试，每条对应一个嵌套级别',                              '5s'],
        ['Idle',              'IdleLane / OffscreenLane',                    '空闲时执行的更新（preload / offscreen 渲染）',                     '∞（永不过期）'],
      ]
    },

    { kind: 'code', title: '位运算三件套',
      code: `// 1. 合并：把多个 Lane 合成一个集合（OR 操作）
export function mergeLanes(a: Lanes, b: Lanes): Lanes {
  return a | b;
}
// 用法：mergeLanes(SyncLane, DefaultLane) = 0b...1010（同时有两个优先级）

// 2. 移除：从集合中删除某些 Lane（AND NOT 操作）
export function removeLanes(set: Lanes, subset: Lanes): Lanes {
  return set & ~subset;
}
// 用法：removeLanes(0b1010, 0b0010) = 0b1000（删掉 DefaultLane）

// 3. 包含判断：检查集合中是否有交集（AND 操作）
export function includesSomeLane(set: Lanes, subset: Lanes): boolean {
  return (set & subset) !== 0;
}
// 用法：includesSomeLane(0b1010, 0b1000) = true（集合中有 InputContinuous）

// 4. 提取最高优先级 Lane（lanes & -lanes 是经典二进制技巧）
export function getHighestPriorityLane(lanes: Lanes): Lane {
  return lanes & -lanes;
}
// 用法：getHighestPriorityLane(0b1010) = 0b0010（最低位 = 最高优先级 SyncLane）` },

    { kind: 'rule', ruleType: 'accent',
      text: '<strong>getHighestPriorityLane 的魔法：<code>lanes & -lanes</code></strong>。这是二进制补码的经典技巧 ——<code>-lanes</code> 在补码表示下等于 <code>~lanes + 1</code>，最高有效位之前的位全部取反、最高有效位所在的位是 1、低位全部 0。<code>lanes & (-lanes)</code> 保留最低位的 1，其余全清零，<strong>正好得到"集合中数值最小的 Lane"（= 优先级最高的 Lane）</strong>。一步位运算完成"取最高优先级"，<strong>比循环遍历快一个数量级</strong>。' },

    { kind: 'rule', ruleType: 'info',
      text: '<strong>批处理（Batching）</strong>：React 18 把所有更新（<code>setTimeout</code> / <code>Promise.then</code> / native event handler / <code>flushSync</code> 之外）<strong>自动合并到一次 render</strong>。底层机制是 <code>scheduleUpdateOnFiber</code> 在调用时把当前 Lane 合并到 <code>root.pendingLanes</code>，<strong>不立即触发 render</strong>，而是通过 <code>ensureRootIsScheduled</code> 把渲染任务交给 Scheduler，由 Scheduler 在合适时机统一调用一次 render。React 17 只在 React 事件处理器中自动批，其他场景需要手动 <code>unstable_batchedUpdates</code>。' },

    { kind: 'text', title: 'childLanes 与 bailout 优化',
      body: 'Lane 不只在根节点上，还在<strong>每个 fiber 节点上</strong>维护 <code>childLanes</code> 字段，<strong>记录子树中待处理的 Lane 集合</strong>。' },

    { kind: 'code', title: 'childLanes 冒泡 + bailout',
      code: `// completeWork 阶段：子节点把自己的 lanes 累加到父节点的 childLanes
function bubbleProperties(completedWork) {
  let newChildLanes = NoLanes;
  let subtreeFlags = NoFlags;
  // 遍历 child 和 sibling
  let child = completedWork.child;
  while (child !== null) {
    newChildLanes |= child.lanes | child.childLanes;       // 累加子树的 Lane
    subtreeFlags |= child.subtreeFlags | child.flags;     // 累加子树的 Flag
    child = child.sibling;
  }
  completedWork.childLanes = newChildLanes;
  completedWork.subtreeFlags = subtreeFlags;
}

// beginWork 阶段：bailout 优化（整棵子树没活干，直接跳过）
function beginWork(current, workInProgress, renderLanes) {
  if (current !== null) {
    const oldProps = current.memoizedProps;
    const newProps = workInProgress.pendingProps;
    // 关键判断：当前节点的 props 没变，且子树没有匹配的 Lane
    if (oldProps !== newProps && current.lanes === NoLanes
        && (workInProgress.childLanes & renderLanes) === NoLanes) {
      // 整棵子树都没活干 → 完全跳过（bailout），连 reconcile 都不做
      return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
    }
  }
  // ... 正常 reconcile 逻辑
}` },

    { kind: 'rule', ruleType: 'success',
      text: '<strong>childLanes 的核心价值</strong>：<code>(workInProgress.childLanes & renderLanes) === NoLanes</code> 这个判断能<strong>在 O(1) 内确认整棵子树是否需要处理</strong>。如果不需要，直接 <code>bailout</code> 跳到下一个有活的分支，<strong>避免遍历整棵子树</strong>。React 18 的 <code>useMemo</code> / <code>React.memo</code> 之所以能显著提升性能，正是因为 <code>memoizedProps</code> 命中后会把当前 fiber 的 <code>lanes</code> 清零，下游自然 bailout。这是<strong>位运算 + 树结构协同的经典工程案例</strong>。' },

    { kind: 'rule', ruleType: 'warning',
      text: '<strong>Lane 模型的使用注意</strong>：<br>① <strong>位运算优先级</strong>：<code>a | b & c</code> 的求值顺序是 <code>a | (b & c)</code>，建议所有位运算显式加括号；<br>② <strong>Lane 不可比较大小</strong>：Lane 数值大小只表示"位的位置"，不代表"优先级数值"，所有比较都应通过 <code>getHighestPriorityLane</code>；<br>③ <strong>符号位</strong>：JS 的 <code>|</code> 运算是 32 位<strong>有符号</strong>，最高位为 1 时变负数。React 用 31 位 Lane 避免符号位污染；<br>④ <strong>TransitionLanes / RetryLanes 复用位</strong>：8 条 Transition 共用一段位，12 条 Retry 共用一段，<strong>提取最高优先级时要配合偏移量</strong>；<br>⑤ <strong>NoLane 是 0</strong>，不是单独一条 Lane，所有 Lane 运算都要显式判断 <code>=== NoLane</code> 而非 <code>=== 0</code>。' },
  ];

  global.renderLanePriorityModel = function (p) {
    return renderArticle(Object.assign({}, p, { blocks }));
  };
})(window);