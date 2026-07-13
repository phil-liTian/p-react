/**
 * demo/17_lane_schedule.ts — Lane 优先级调度演示
 *
 * 演示要点：
 * 1. 四个按钮分别触发 SyncLane / DefaultLane / TransitionLane / IdleLane 更新
 * 2. 每个按钮点击时记录"点击时刻"和"DOM 更新时刻"的时间戳，直观看出延迟梯度
 * 3. SyncLane 在 microtask 内渲染（几乎立即）；DefaultLane 走 setTimeout(0)；
 *    TransitionLane 延迟 50ms；IdleLane 延迟 200ms
 * 4. 批处理验证：连续三次点击同一按钮，控制台应只看到一次 performSyncWorkOnRoot
 */
import { createElement, useStateWithLane } from '@p-react/react';
import { createRoot } from '@p-react/react-dom';
import { SyncLane, DefaultLane, TransitionLane, IdleLane } from '@p-react/shared';

interface LaneRecord {
  name: string;
  lane: typeof SyncLane;
  clickTs: number;
  renderTs: number;
}

function LaneScheduleDemo() {
  // 四个独立 state，各绑定一个 Lane，便于观察不同优先级的渲染时机
  const [syncCount, setSyncCount] = useStateWithLane(0, SyncLane);
  const [defaultCount, setDefaultCount] = useStateWithLane(0, DefaultLane);
  const [transitionCount, setTransitionCount] = useStateWithLane(0, TransitionLane);
  const [idleCount, setIdleCount] = useStateWithLane(0, IdleLane);

  // 记录每次点击 → 渲染的时间戳，最新一条放最前
  const [records, setRecords] = useStateWithLane<LaneRecord[]>([], SyncLane);

  function makeClick(name: string, lane: typeof SyncLane, setter: (n: number) => void, count: number) {
    return () => {
      const clickTs = performance.now();
      setter(count + 1);
      // 用 SyncLane 记录本次点击 + 渲染时机，渲染完成后追加一条 record
      // 注意：records 本身走 SyncLane，会比非 sync 的目标更新先渲染，能即时显示
      setRecords((prev) => {
        const renderTs = performance.now();
        return [{ name, lane, clickTs, renderTs }, ...prev].slice(0, 8);
      });
      console.log(`[demo17] click ${name} at ${clickTs.toFixed(2)}ms`);
    };
  }

  return createElement(
    'div',
    { style: { padding: '24px', fontFamily: 'monospace' } },
    createElement('h2', null, 'Lane 优先级调度演示'),
    createElement(
      'p',
      { style: { color: '#666', marginBottom: '16px' } },
      '打开控制台观察 [Lane] 日志。点击不同按钮，记录会显示从点击到 DOM 更新的延迟。'
    ),

    // 四个 Lane 按钮
    createElement(
      'div',
      { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' } },
      createElement('button', {
        onClick: makeClick('SyncLane', SyncLane, setSyncCount, syncCount),
        style: btnStyle('#e8f4fd'),
      }, `SyncLane 点击次数: ${syncCount}`),
      createElement('button', {
        onClick: makeClick('DefaultLane', DefaultLane, setDefaultCount, defaultCount),
        style: btnStyle('#fdf3e8'),
      }, `DefaultLane 点击次数: ${defaultCount}`),
      createElement('button', {
        onClick: makeClick('TransitionLane', TransitionLane, setTransitionCount, transitionCount),
        style: btnStyle('#f5e8fd'),
      }, `TransitionLane 点击次数: ${transitionCount}`),
      createElement('button', {
        onClick: makeClick('IdleLane', IdleLane, setIdleCount, idleCount),
        style: btnStyle('#e8fdf3'),
      }, `IdleLane 点击次数: ${idleCount}`)
    ),

    // 批处理验证按钮：一次点击触发三次 setState
    createElement('button', {
      onClick: () => {
        const t = performance.now();
        console.log(`[demo17] batch click at ${t.toFixed(2)}ms, expect only ONE render log below`);
        setSyncCount((n) => n + 1);
        setSyncCount((n) => n + 1);
        setSyncCount((n) => n + 1);
      },
      style: { ...btnStyle('#ffe8e8'), marginBottom: '20px', display: 'block' },
    }, '批处理：连续三次 SyncLane setState（应只渲染一次）'),

    // 点击记录列表
    createElement('h3', null, '点击 → 渲染 延迟记录'),
    createElement(
      'div',
      { style: { fontSize: '13px', background: '#f5f5f5', padding: '12px', borderRadius: '6px' } },
      records.length === 0
        ? '（暂无记录，点击上方按钮）'
        : records.map((r, i) =>
            createElement(
              'div',
              { key: i, style: { padding: '4px 0', borderBottom: '1px solid #eee' } },
              `${r.name.padEnd(16)} | 点击 ${r.clickTs.toFixed(1).padStart(8)}ms → 渲染 ${r.renderTs.toFixed(1).padStart(8)}ms | 延迟 ${(r.renderTs - r.clickTs).toFixed(2)}ms`
            )
          )
    )
  );
}

function btnStyle(bg: string) {
  return {
    padding: '10px 14px',
    background: bg,
    border: '1px solid #ccc',
    borderRadius: '6px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: '13px',
  };
}

const root = createRoot(document.getElementById('root')!);
root.render(createElement(LaneScheduleDemo, null));
