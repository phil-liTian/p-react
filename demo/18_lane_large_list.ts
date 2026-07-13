/**
 * demo/18_lane_large_list.ts — Lane 模型实战：大数据列表渲染卡顿问题
 *
 * 演示要点：
 * 1. 渲染 3000 项列表，每次输入触发全量重渲染（重计算 + 重建 fiber + 重写 DOM 文本）
 * 2. 对比两种策略：
 *    - ❌ 全部 SyncLane：输入值与列表在同一 microtask 内一起渲染，列表重渲染阻塞下一次按键
 *    - ✅ 输入 Sync + 列表 Transition：输入值立即在 microtask 渲染，列表延迟 50ms（TransitionLane）渲染
 * 3. 量化指标：
 *    - 输入响应延迟 = 按键 → 输入框值更新到 DOM 的时间
 *    - 列表更新延迟 = 按键 → 列表重渲染完成的时间
 * 4. 切换策略时通过 key 强制重挂载，使 useStateWithLane 重新固化 lane
 *
 * 对应源码思路：
 * - ReactFiberWorkLoop.js → ensureRootIsScheduled：按 pendingLanes 优先级调度
 * - ReactFiberLane.js → SyncLane / TransitionLane 区分紧急与可延迟更新
 * - 真实 React 还会用 Scheduler 时间切片让 TransitionLane 渲染可中断，p-react 简化为延迟 50ms
 */
import {
  createElement,
  useState,
  useLayoutEffect,
  useRef,
  useStateWithLane,
} from '@p-react/react';
import { createRoot } from '@p-react/react-dom';
import { SyncLane, TransitionLane } from '@p-react/shared';

// 列表长度：3000 项足够让单次重渲染耗时 20~40ms，能明显感知卡顿
const LIST_SIZE = 3000;

/**
 * 生成 LIST_SIZE 项数据，每项内容依赖 query，迫使每次按键都重建整棵 li 子树
 * 对应源码场景：过滤 / 排序大数据源后重新渲染
 */
function makeItems(query: string): string[] {
  const items = new Array(LIST_SIZE);
  for (let i = 0; i < LIST_SIZE; i++) {
    items[i] = `${query} - item ${i}`;
  }
  return items;
}

/**
 * 列表应用本体
 * mode 决定 items 状态绑定的 Lane：
 * - 'sync'  → SyncLane，与 query 同批在 microtask 内渲染
 * - 'lane'  → TransitionLane，setTimeout(50) 延迟渲染，不阻塞输入
 *
 * key={mode} 由父组件强制重挂载，使 useStateWithLane 在 mount 时重新固化 lane
 */
function ListApp({ mode }: { mode: 'sync' | 'lane' }) {
  const listLane = mode === 'sync' ? SyncLane : TransitionLane;

  // 输入值走 SyncLane：按键后 microtask 内立即更新到 DOM
  const [query, setQuery] = useStateWithLane('', SyncLane);
  // 列表数据走 listLane：sync 模式与 query 同批渲染；lane 模式延迟 50ms 渲染
  const [items, setItems] = useStateWithLane<string[]>(
    () => makeItems(''),
    listLane
  );

  // 量化指标，全部走 SyncLane 以保证它们即时显示，不被列表渲染拖慢
  const [inputLatency, setInputLatency] = useStateWithLane(0, SyncLane);
  const [listLatency, setListLatency] = useStateWithLane(0, SyncLane);
  const [pending, setPending] = useStateWithLane(false, SyncLane);

  // 按键时间戳，在 useLayoutEffect 中算延迟
  const inputTsRef = useRef(0);
  // 上一轮渲染时的值，用于判断本次提交是否包含 query / items 的变更
  const prevQueryRef = useRef(query);
  const prevItemsRef = useRef(items);

  // useLayoutEffect 在 DOM 提交后同步触发（paint 前），可精确测出"按键 → DOM 更新"的延迟
  useLayoutEffect(() => {
    const now = performance.now();
    if (query !== prevQueryRef.current) {
      // 本次提交更新了输入框值
      setInputLatency(now - inputTsRef.current);
      prevQueryRef.current = query;
    }
    if (items !== prevItemsRef.current) {
      // 本次提交更新了列表
      setListLatency(now - inputTsRef.current);
      setPending(false);
      prevItemsRef.current = items;
    }
  });

  function onInput(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    // 记录按键时刻，供后续 useLayoutEffect 计算延迟
    inputTsRef.current = performance.now();

    // SyncLane：输入值立即进入 microtask 渲染
    setQuery(v);
    // 标记列表更新进行中（同步模式下也会被同批渲染立刻清掉）
    setPending(true);

    // 重活：生成 LIST_SIZE 项新数据，迫使 reconciler 重建 li 子树
    const newItems = makeItems(v);
    // listLane：sync 模式与 query 同批；lane 模式延迟 50ms
    setItems(newItems);
  }

  return createElement(
    'div',
    { style: { fontFamily: 'monospace' } },
    // 输入框：value 绑定 query，onInput 触发更新
    createElement('input', {
      type: 'text',
      value: query,
      onInput,
      placeholder: '输入文字触发 3000 项列表重渲染...',
      style: {
        padding: '8px',
        width: '100%',
        fontSize: '14px',
        boxSizing: 'border-box',
        outline: 'none',
        border: '1px solid #bbb',
        borderRadius: '4px',
      },
    }),
    // 状态栏：实时显示两个延迟指标 + 当前策略 + pending
    createElement(
      'div',
      {
        style: {
          display: 'flex',
          gap: '16px',
          margin: '12px 0',
          fontSize: '13px',
          alignItems: 'center',
        },
      },
      createElement(
        'span',
        { style: { color: '#374151' } },
        `输入响应延迟: ${inputLatency.toFixed(1)}ms`
      ),
      createElement(
        'span',
        { style: { color: pending ? '#d97706' : '#374151' } },
        `列表更新延迟: ${listLatency.toFixed(1)}ms${
          pending ? '  ⏳ 更新中...' : ''
        }`
      ),
      createElement(
        'span',
        {
          style: {
            color: mode === 'sync' ? '#dc2626' : '#16a34a',
            marginLeft: 'auto',
          },
        },
        mode === 'sync' ? '● 全部 SyncLane' : '● 输入 Sync / 列表 Transition'
      )
    ),
    // 列表：显示前 30 项，避免 DOM 过大；但每次重渲染仍重建全部 3000 项 fiber
    createElement(
      'ul',
      {
        style: {
          height: '260px',
          overflowY: 'auto',
          border: '1px solid #ddd',
          margin: 0,
          padding: '8px 8px 8px 28px',
          background: '#fafafa',
          borderRadius: '4px',
        },
      },
      ...items.slice(0, 30).map((item, i) =>
        createElement('li', { key: i, style: { padding: '2px 0' } }, item)
      ),
      items.length > 30
        ? createElement(
            'li',
            { style: { color: '#999', listStyle: 'none' } },
            `...还有 ${items.length - 30} 项（仅展示前 30）`
          )
        : null
    ),
    // 说明文字
    createElement(
      'p',
      { style: { color: '#888', fontSize: '12px', marginTop: '12px' } },
      mode === 'sync'
        ? '同步模式：每次按键，输入框值与 3000 项列表在同一 microtask 内一起渲染，列表重渲染阻塞下一次按键 → 输入卡顿'
        : 'Lane 模式：按键后输入框值立即在 microtask 渲染（同步），3000 项列表延迟 50ms 渲染（Transition），输入框保持流畅'
    )
  );
}

/**
 * 外层容器：策略切换 + 重挂载 ListApp
 */
function LaneLargeListDemo() {
  const [mode, setMode] = useState<'sync' | 'lane'>('lane');

  return createElement(
    'div',
    {
      style: {
        padding: '24px',
        fontFamily: 'monospace',
        maxWidth: '820px',
        margin: '0 auto',
      },
    },
    createElement('h2', null, 'Lane 模型实战：大数据列表渲染卡顿'),
    createElement(
      'p',
      { style: { color: '#666', marginBottom: '16px', lineHeight: '1.6' } },
      '列表共 ',
      createElement('strong', null, '3000 项'),
      '，每次输入触发全量重渲染。对比两种 Lane 策略：把列表更新降级到 TransitionLane，让输入值走 SyncLane 立即响应，从而避免大数据列表渲染阻塞用户输入。'
    ),
    // 策略切换：单选按钮
    createElement(
      'div',
      {
        style: {
          display: 'flex',
          gap: '24px',
          marginBottom: '16px',
          fontSize: '14px',
        },
      },
      createElement(
        'label',
        { style: { cursor: 'pointer' } },
        createElement('input', {
          type: 'radio',
          name: 'lane-mode',
          checked: mode === 'sync',
          onChange: () => setMode('sync'),
          style: { marginRight: '6px' },
        }),
        '❌ 全部 SyncLane（输入卡顿）'
      ),
      createElement(
        'label',
        { style: { cursor: 'pointer' } },
        createElement('input', {
          type: 'radio',
          name: 'lane-mode',
          checked: mode === 'lane',
          onChange: () => setMode('lane'),
          style: { marginRight: '6px' },
        }),
        '✅ 输入 Sync + 列表 Transition'
      )
    ),
    // key={mode}：切换策略时强制重挂载，使 useStateWithLane 重新固化 lane
    createElement(ListApp, { key: mode, mode })
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(createElement(LaneLargeListDemo, null));
