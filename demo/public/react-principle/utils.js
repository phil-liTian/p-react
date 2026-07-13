// ── 共享工具函数 ────────────────────────────────────────────────────────────
// 所有 {id}.js 渲染器都通过 window.PrincipleUtils 访问这些函数。

(function (global) {
  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&', '<': '<', '>': '>', '"': '"', "'": '&#39;'
    }[c]));
  }

  function tagBadges(tags) {
    if (!tags || !tags.length) return '';
    return tags.map(t => `<span class="tag tag-${escHtml(t.type)}">${escHtml(t.label)}</span>`).join('');
  }

  function textBlock(b) {
    return `
        <div class="section">
          <div class="section-title">${escHtml(b.title)}</div>
          <div class="section-body"><p>${b.body}</p></div>
        </div>`;
  }

  function codeBlock(p, b) {
    return `
        <div class="section">
          <div class="section-title">${escHtml(b.title || '代码')}</div>
          <div class="code-block-wrap">
            <div class="code-block-label">
              <span class="code-block-label-dot dot-${escHtml(b.dot || 'accent')}"></span>
              <span class="code-block-label-text">${escHtml(b.label)}</span>
            </div>
            <pre><code class="language-${escHtml(b.lang || 'tsx')}">${escHtml(b.code)}</code></pre>
          </div>
        </div>`;
  }

  function ruleBlock(b) {
    return `
        <div class="section">
          <div class="section-title">${escHtml(b.title || '要点')}</div>
          <div class="rule-box rule-box-${escHtml(b.ruleType || 'info')}">${b.text}</div>
        </div>`;
  }

  function compareBlock(b) {
    const leftLines = (b.left.lines || []).map(l => `<p>${l}</p>`).join('');
    const rightLines = (b.right.lines || []).map(l => `<p>${l}</p>`).join('');
    return `
        <div class="section">
          <div class="section-title">${escHtml(b.title)}</div>
          <div class="compare-grid">
            <div class="compare-col">
              <div class="compare-col-header">
                <span class="compare-col-dot dot-${escHtml(b.left.dot || 'accent')}"></span>
                ${b.left.label}
              </div>
              <div class="compare-col-body">${leftLines}</div>
            </div>
            <div class="compare-col">
              <div class="compare-col-header">
                <span class="compare-col-dot dot-${escHtml(b.right.dot || 'green')}"></span>
                ${b.right.label}
              </div>
              <div class="compare-col-body">${rightLines}</div>
            </div>
          </div>
        </div>`;
  }

  function compareTableBlock(b) {
    const header = `
        <div class="compare-table-row header">
          <div class="compare-table-cell">${b.columns[0]}</div>
          <div class="compare-table-cell">${b.columns[1]}</div>
          <div class="compare-table-cell">${b.columns[2]}</div>
        </div>`;
    const rows = b.rows.map(r => `
        <div class="compare-table-row">
          <div class="compare-table-cell dim">${r[0]}</div>
          <div class="compare-table-cell">${r[1]}</div>
          <div class="compare-table-cell">${r[2]}</div>
        </div>`).join('');
    return `
        <div class="section">
          <div class="section-title">${escHtml(b.title)}</div>
          <div class="compare-table">${header}${rows}</div>
        </div>`;
  }

  // 根据 block.kind 分发
  function renderBlock(p, b) {
    if (b.kind === 'text')         return textBlock(b);
    if (b.kind === 'code')         return codeBlock(p, b);
    if (b.kind === 'rule')         return ruleBlock(b);
    if (b.kind === 'compare')      return compareBlock(b);
    if (b.kind === 'compareTable') return compareTableBlock(b);
    return '';
  }

  // 渲染整篇 article 的 HTML 字符串
  function renderArticle(p) {
    const tagsHtml = tagBadges(p.tags);
    const blocksHtml = p.blocks.map(b => renderBlock(p, b)).join('');
    return `
    <div class="principle-header">
      <div class="principle-icon">${p.icon}</div>
      <div class="principle-meta">
        <div class="principle-title">${p.name}</div>
        <div class="principle-tags">${tagsHtml}</div>
      </div>
    </div>
    <div class="principle-divider"></div>

    <div class="section">
      <div class="section-title">概述</div>
      <div class="section-body"><p>${p.summary}</p></div>
    </div>

    ${blocksHtml}
  `;
  }

  global.PrincipleUtils = {
    escHtml, tagBadges, renderBlock, renderArticle,
    textBlock, codeBlock, ruleBlock, compareBlock, compareTableBlock,
  };
})(window);