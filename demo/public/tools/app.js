// ── Lazy script loader ────────────────────────────────────────────────────────

// 'switch-hosts' → 'renderSwitchHosts'
function getRendererName(id) {
  return 'render' + id.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join('');
}

const renderedTools = new Set();

function loadScript(id) {
  return new Promise((resolve, reject) => {
    if (typeof window[getRendererName(id)] === 'function') { resolve(); return; }
    const s = document.createElement('script');
    s.src = '/tools/' + id + '.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load: ' + id));
    document.head.appendChild(s);
  });
}

async function renderToolOnDemand(t) {
  if (renderedTools.has(t.id)) return;
  await loadScript(t.id);
  const el = document.createElement('div');
  el.className = 'pitfall';
  el.id = 'tool-' + t.id;
  el.innerHTML = window[getRendererName(t.id)](t);
  document.getElementById('article-wrapper').appendChild(el);
  el.querySelectorAll('pre code').forEach(code => hljs.highlightElement(code));
  renderedTools.add(t.id);
}

// ── Build sidebar nav ─────────────────────────────────────────────────────────

const sidebarNav = document.getElementById('sidebar-nav');
const groups = [...new Set(tools.map(t => t.group))];
const typeIcon = { info: '🔵', accent: '🟣' };

groups.forEach(group => {
  const groupEl = document.createElement('div');
  groupEl.className = 'nav-group';

  const label = document.createElement('div');
  label.className = 'nav-group-label';
  label.textContent = group;
  groupEl.appendChild(label);

  tools.filter(t => t.group === group).forEach(t => {
    const item = document.createElement('div');
    item.className = 'nav-item';
    item.dataset.id = t.id;
    item.innerHTML = `<span class="nav-sev">${typeIcon[t.type] || ''}</span>${t.name}`;
    item.addEventListener('click', () => selectTool(t.id));
    groupEl.appendChild(item);
  });

  sidebarNav.appendChild(groupEl);
});

// ── Navigation ────────────────────────────────────────────────────────────────

async function selectTool(id) {
  const t = tools.find(x => x.id === id);
  if (!t) return;

  await renderToolOnDemand(t);

  document.querySelectorAll('.nav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.id === id));
  document.querySelectorAll('.pitfall').forEach(el =>
    el.classList.toggle('active', el.id === 'tool-' + id));

  document.getElementById('content-header-name').textContent = t.name;

  const badge = document.getElementById('content-header-badge');
  const badgeMap = { info: { text: '日常', color: 'var(--blue)' }, accent: { text: 'AI 工具', color: 'var(--accent-light)' } };
  const b = badgeMap[t.type] || {};
  badge.textContent = b.text || '';
  badge.style.color = b.color || '';
  badge.style.borderColor = b.color || '';

  document.getElementById('article-wrapper').scrollTop = 0;
  document.getElementById('mobile-topbar-title').textContent = t.name;
  closeSidebar();
}

// ── Mobile sidebar ────────────────────────────────────────────────────────────

const sidebarEl = document.getElementById('sidebar-el');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const mobileTopbar = document.getElementById('mobile-topbar');
const menuToggleTop = document.getElementById('menu-toggle-top');
const sidebarClose = document.getElementById('sidebar-close');
const mq = window.matchMedia('(max-width: 700px)');

function openSidebar()  { sidebarEl.classList.add('open');    sidebarOverlay.classList.add('visible'); }
function closeSidebar() { sidebarEl.classList.remove('open'); sidebarOverlay.classList.remove('visible'); }

menuToggleTop.addEventListener('click', openSidebar);
sidebarClose.addEventListener('click', closeSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

function applyMobileLayout(isMobile) {
  mobileTopbar.style.display = isMobile ? 'flex' : 'none';
  sidebarClose.style.display = isMobile ? 'flex' : 'none';
  if (!isMobile) closeSidebar();
}

mq.addEventListener('change', e => applyMobileLayout(e.matches));
applyMobileLayout(mq.matches);

// Init: select first tool
selectTool(tools[0].id);
