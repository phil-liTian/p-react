function renderVirtualList(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>虚拟列表（Virtual List）只渲染视口内可见的列表项，
    将 DOM 节点数从 N（总数据量）降至 O（可见行数 + 缓冲区），
    使 10 万条数据与 20 条数据的渲染性能几乎相同。
    核心思路：<strong>滚动时动态替换 DOM 内容，用 CSS 撑开真实高度</strong>。`);

  const principle = `
    <p><strong>核心数据结构：</strong></p>
    <ul>
      <li><code>totalHeight</code>：所有列表项高度之和，用于撑开容器让滚动条正确显示</li>
      <li><code>startIndex</code>：当前可见区域第一条数据的索引</li>
      <li><code>endIndex</code>：当前可见区域最后一条数据的索引（含缓冲区）</li>
      <li><code>offsetY</code>：可见区域的 Y 轴偏移（<code>transform: translateY</code>），让渲染的 DOM 出现在正确位置</li>
    </ul>
    <p><strong>滚动处理流程：</strong></p>
    <ol style="padding-left:20px; line-height:2;">
      <li>监听容器 <code>scroll</code> 事件，获取 <code>scrollTop</code></li>
      <li>计算 <code>startIndex = Math.floor(scrollTop / itemHeight)</code></li>
      <li>计算 <code>endIndex = startIndex + visibleCount + bufferSize</code></li>
      <li>截取 <code>data.slice(startIndex, endIndex)</code> 渲染到 DOM</li>
      <li>用 <code>translateY(startIndex * itemHeight)</code> 将渲染区域定位到正确位置</li>
    </ol>
    <p><strong>不定高虚拟列表</strong>：需维护一个 <code>positions</code> 数组缓存每项的实际 top/bottom/height，并在渲染后用 <code>ResizeObserver</code> 更新缓存，二分搜索定位 startIndex。</p>`;

  const implCode = `// 固定行高虚拟列表（原生 JS 实现）
class VirtualList {
  constructor(container, options) {
    this.container = container;
    this.itemHeight = options.itemHeight; // 固定行高
    this.data = options.data;
    this.renderItem = options.renderItem;
    this.bufferSize = options.bufferSize ?? 3; // 上下各缓冲 N 行

    // 撑开容器到真实高度，让滚动条正确显示
    this.phantom = document.createElement('div');
    this.phantom.style.cssText = \`height:\${this.data.length * this.itemHeight}px;pointer-events:none\`;

    // 实际渲染区域，用 translateY 定位
    this.list = document.createElement('div');
    this.list.style.cssText = 'position:absolute;top:0;left:0;width:100%;will-change:transform';

    container.style.cssText = 'overflow-y:auto;position:relative';
    container.appendChild(this.phantom);
    container.appendChild(this.list);

    this._raf = null;
    container.addEventListener('scroll', () => {
      // 用 rAF 限制更新频率，避免每像素都触发重渲染
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => {
        this._raf = null;
        this.render();
      });
    });

    this.render();
  }

  render() {
    const scrollTop = this.container.scrollTop;
    const viewHeight = this.container.clientHeight;
    const { itemHeight, bufferSize, data } = this;

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize);
    const visibleCount = Math.ceil(viewHeight / itemHeight);
    const endIndex = Math.min(data.length, startIndex + visibleCount + bufferSize * 2);

    const offsetY = startIndex * itemHeight;
    this.list.style.transform = \`translateY(\${offsetY}px)\`;

    // 只有 startIndex/endIndex 变化时才重建 DOM
    if (this._startIndex === startIndex && this._endIndex === endIndex) return;
    this._startIndex = startIndex;
    this._endIndex = endIndex;

    this.list.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (let i = startIndex; i < endIndex; i++) {
      const el = this.renderItem(data[i], i);
      el.style.height = itemHeight + 'px';
      frag.appendChild(el);
    }
    this.list.appendChild(frag);
  }
}

// 使用示例
const list = new VirtualList(document.querySelector('#list'), {
  itemHeight: 48,
  data: Array.from({ length: 100000 }, (_, i) => ({ id: i, name: \`Item \${i}\` })),
  renderItem(item) {
    const el = document.createElement('div');
    el.className = 'list-item';
    el.textContent = item.name;
    return el;
  },
});`;

  const reactCode = `// React 虚拟列表（使用 react-window，生产推荐）
import { FixedSizeList } from 'react-window';

function Row({ index, style }) {
  return (
    // style 包含 position/top/height，必须透传！
    <div style={style} className="list-item">
      {data[index].name}
    </div>
  );
}

function VirtualizedList() {
  return (
    <FixedSizeList
      height={600}        // 容器高度
      itemCount={100000}  // 总数据量
      itemSize={48}       // 每行高度
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}

// 不定高：使用 react-window 的 VariableSizeList
// 或 @tanstack/virtual（更现代，支持 React/Vue/Svelte）`;

  const notes = [
    ruleBox('warning', `<strong>常见陷阱：</strong>① 忘记透传 <code>style</code> prop（包含 <code>position/top/height</code>），导致所有行堆叠在顶部；② 列表项内有异步加载内容（图片），实际高度与预设不符，需用 <code>VariableSizeList</code> + 实测后更新缓存；③ 频繁触发 scroll 没有节流，改用 rAF 防抖。`),
    ruleBox('info', `<strong>推荐库：</strong><code>react-window</code>（轻量，官方推荐，15KB）、<code>@tanstack/virtual</code>（框架无关，支持水平/网格虚拟化）、<code>vue-virtual-scroller</code>（Vue 生态）。避免使用已停维护的 <code>react-virtualized</code>。`),
    ruleBox('success', `<strong>何时需要虚拟列表：</strong>列表项超过 <strong>500 条</strong>时开始考虑；超过 <strong>1000 条</strong>时强烈建议使用。可在 Chrome DevTools → Performance 中录制滚动，若 "Recalculate Style" 或 "Layout" 占用超过 16ms，说明需要虚拟化。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle)}
    ${section('代码示例', codeBlock('原生 JS 实现（固定行高）', 'dot-blue', 'javascript', implCode) + codeBlock('React 生产用法（react-window）', 'dot-green', 'javascript', reactCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
