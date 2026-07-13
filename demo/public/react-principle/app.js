// ── Lazy script loader ────────────────────────────────────────────────────────

// 'jsx-createelement-reactelement' → 'renderJsxCreateelementReactelement'
function getRendererName(id) {
  return 'render' + id.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join('');
}

const renderedPrinciples = new Set();
const principles1 = window.PrincipleData.principles;

function loadScript(id) {
  return new Promise((resolve, reject) => {
    if (typeof window[getRendererName(id)] === 'function') { resolve(); return; }
    const s = document.createElement('script');
    s.src = '/react-principle/' + id + '.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load: ' + id));
    document.head.appendChild(s);
  });
}

async function renderPrincipleOnDemand(p) {
  if (renderedPrinciples.has(p.id)) return;
  await loadScript(p.id);
  const el = document.createElement('div');
  el.className = 'principle';
  el.id = 'principle-' + p.id;
  el.innerHTML = window[getRendererName(p.id)](p);
  document.getElementById('article-wrapper').appendChild(el);
  el.querySelectorAll('pre code').forEach(code => hljs.highlightElement(code));
  renderedPrinciples.add(p.id);
}

// ── Build sidebar nav ─────────────────────────────────────────────────────────

const sidebarNav = document.getElementById('sidebar-nav');
const groups = [...new Set(principles1.map(p => p.group))];

groups.forEach(group => {
  const groupEl = document.createElement('div');
  groupEl.className = 'nav-group';

  const label = document.createElement('div');
  label.className = 'nav-group-label';
  label.textContent = group;
  groupEl.appendChild(label);

  principles1.filter(p => p.group === group).forEach(p => {
    const item = document.createElement('div');
    item.className = 'nav-item';
    item.dataset.id = p.id;
    item.innerHTML = `<span class="nav-icon">${p.icon}</span>${p.name}`;
    item.addEventListener('click', () => selectPrinciple(p.id));
    groupEl.appendChild(item);
  });

  sidebarNav.appendChild(groupEl);
});

// ── Navigation ────────────────────────────────────────────────────────────────

async function selectPrinciple(id) {
  const p = principles1.find(x => x.id === id);
  if (!p) return;

  await renderPrincipleOnDemand(p);

  document.querySelectorAll('.nav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.id === id));
  document.querySelectorAll('.principle').forEach(el =>
    el.classList.toggle('active', el.id === 'principle-' + id));

  document.getElementById('content-header-name').textContent = p.name;
  const badge = document.getElementById('content-header-badge');
  badge.textContent = p.group;
  badge.style.color = 'var(--accent-light)';
  badge.style.borderColor = 'rgba(124,58,237,0.3)';

  document.getElementById('article-wrapper').scrollTop = 0;
  document.getElementById('mobile-topbar-title').textContent = p.name;
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

// Init: select first principle (or ?topic=xxx)
const _urlTopic = new URLSearchParams(location.search).get('topic');
selectPrinciple(_urlTopic || principles1[0].id);

initFilterModal('react-principle', selectPrinciple);