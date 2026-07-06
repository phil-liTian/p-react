// ── Lazy script loader ────────────────────────────────────────────────────────

// 'rag-principle' → 'renderRagPrinciple'
function getRendererName(id) {
  return 'render' + id.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join('');
}

const renderedTopics = new Set();

function loadScript(id) {
  return new Promise((resolve, reject) => {
    if (typeof window[getRendererName(id)] === 'function') { resolve(); return; }
    const s = document.createElement('script');
    s.src = '/ai-app/' + id + '.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load: ' + id));
    document.head.appendChild(s);
  });
}

async function renderArticleOnDemand(t) {
  if (renderedTopics.has(t.id)) return;
  await loadScript(t.id);
  const el = document.createElement('div');
  el.className = 'article';
  el.id = 'article-' + t.id;
  el.innerHTML = window[getRendererName(t.id)](t);
  document.getElementById('article-wrapper').appendChild(el);
  el.querySelectorAll('pre code').forEach(code => hljs.highlightElement(code));
  renderedTopics.add(t.id);
}

// ── Build sidebar nav ─────────────────────────────────────────────────────────

const sidebarNav = document.getElementById('sidebar-nav');
const groups = [...new Set(topics.map(t => t.group))];

groups.forEach(group => {
  const groupEl = document.createElement('div');
  groupEl.className = 'nav-group';

  const label = document.createElement('div');
  label.className = 'nav-group-label';
  label.textContent = group;
  groupEl.appendChild(label);

  topics.filter(t => t.group === group).forEach(t => {
    const item = document.createElement('div');
    item.className = 'nav-item';
    item.dataset.id = t.id;
    item.innerHTML = `<span class="nav-item-icon">${t.icon}</span>${t.name}`;
    item.addEventListener('click', () => selectTopic(t.id));
    groupEl.appendChild(item);
  });

  sidebarNav.appendChild(groupEl);
});

// ── Navigation ────────────────────────────────────────────────────────────────

async function selectTopic(id) {
  const t = topics.find(x => x.id === id);
  if (!t) return;

  await renderArticleOnDemand(t);

  document.querySelectorAll('.nav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.id === id));
  document.querySelectorAll('.article').forEach(el =>
    el.classList.toggle('active', el.id === 'article-' + id));

  document.getElementById('content-header-name').textContent = t.name;
  document.getElementById('content-header-badge').textContent = t.group;
  document.getElementById('mobile-topbar-title').textContent = t.name;
  document.getElementById('article-wrapper').scrollTop = 0;
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

// Init: select first topic
const _urlTopic = new URLSearchParams(location.search).get('topic');
selectTopic(_urlTopic || topics[0].id);

initFilterModal('ai-app', selectTopic);
