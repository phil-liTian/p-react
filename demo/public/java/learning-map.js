function renderLearningMap(t) {
  const SVG_ID = 'lm-map-svg';
  const GROUP_COLORS = ['#3fb950', '#f59e42', '#58a6ff', '#f85149', '#d29922', '#e8590c'];

  function buildTree() {
    const all = typeof topics !== 'undefined' ? topics : [];
    const gMap = {}, gOrder = [];
    all.forEach(tp => {
      if (tp.id === 'learning-map') return;
      if (!gMap[tp.group]) { gMap[tp.group] = []; gOrder.push(tp.group); }
      gMap[tp.group].push(tp);
    });
    return {
      total: gOrder.reduce((s, g) => s + gMap[g].length, 0),
      root: {
        content: 'Java 视角',
        children: gOrder.map((g, i) => ({
          content: g,
          payload: { color: GROUP_COLORS[i % 6], fold: 0 },
          children: (gMap[g] || []).map(tp => ({
            content: `<span data-tid="${tp.id}">${tp.name}</span>`,
            payload: { color: GROUP_COLORS[i % 6], fold: 0 },
            children: [],
          })),
        })),
      },
    };
  }

  function injectDarkStyles() {
    if (document.getElementById('lm-dark-css')) return;
    const s = document.createElement('style');
    s.id = 'lm-dark-css';
    s.textContent = `
      #${SVG_ID} { background: transparent; }
      #${SVG_ID} text { fill: #e6edf3 !important; font-family: Inter, sans-serif; }
      #${SVG_ID} foreignObject div,
      #${SVG_ID} foreignObject span {
        color: #c9d1d9;
        font-size: 12px;
        font-family: Inter, -apple-system, sans-serif;
        white-space: nowrap;
      }
      #${SVG_ID} [data-tid] { cursor: pointer; }
      #${SVG_ID} [data-tid]:hover { color: #f59e42; text-decoration: underline; }
      #${SVG_ID} .markmap-link { stroke: #30363d !important; }
    `;
    document.head.appendChild(s);
  }

  function initMarkmap() {
    const svg = document.getElementById(SVG_ID);
    if (!svg || !window.markmap?.Markmap) return;

    injectDarkStyles();

    const { root } = buildTree();
    const mm = window.markmap.Markmap.create(svg, {
      maxWidth: 240,
      spacingHorizontal: 70,
      spacingVertical: 5,
      duration: 400,
      pan: true,
      zoom: true,
      color: node => node.payload?.color || '#8b949e',
    }, root);

    // 叶节点点击跳转
    svg.addEventListener('click', e => {
      const el = e.target.closest('[data-tid]');
      if (el) selectTopic(el.dataset.tid);
    });

    setTimeout(() => mm.fit(), 200);
  }

  // 串行加载 D3 → markmap-view（markmap-view 依赖全局 d3，不自带打包）
  function ensureScript(src, id, isLoaded) {
    return new Promise(resolve => {
      if (isLoaded()) { resolve(); return; }
      const existing = document.getElementById(id);
      if (existing) { existing.addEventListener('load', resolve); return; }
      const s = document.createElement('script');
      s.id = id;
      s.src = src;
      s.onload = resolve;
      document.head.appendChild(s);
    });
  }

  requestAnimationFrame(async () => {
    await ensureScript(
      'https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js',
      'lm-d3-script',
      () => !!window.d3
    );
    await ensureScript(
      'https://cdn.jsdelivr.net/npm/markmap-view@0.16/dist/browser/index.js',
      'lm-markmap-script',
      () => !!(window.markmap?.Markmap)
    );
    initMarkmap();
  });

  const { total } = buildTree();

  return articleShell(t, `
    ${section('知识图谱 · 全部 ' + total + ' 个 Topic',
      '<p>点击叶节点跳转到对应文章；可拖拽平移、滚轮缩放。</p>')}
    <div style="width:100%;height:640px;background:var(--bg-base);border-radius:8px;border:1px solid var(--border);overflow:hidden">
      <svg id="${SVG_ID}" style="width:100%;height:100%"></svg>
    </div>
  `);
}
