let allRouters = [];
let toastTimer = null;

async function fetchRouters() {
  const loading  = document.getElementById('loading');
  const errorMsg = document.getElementById('error-msg');
  const tableWrap = document.getElementById('table-wrap');

  loading.classList.remove('hidden');
  tableWrap.classList.add('hidden');
  errorMsg.classList.add('hidden');

  try {
    const res = await fetch('/api/http/routers?per_page=1000&page=1');
    if (!res.ok) throw new Error(`API returned ${res.status} ${res.statusText}`);
    allRouters = await res.json();
    allRouters.sort((a, b) => a.name.localeCompare(b.name));

    const query = document.getElementById('search').value;
    applyFilter(query);

    loading.classList.add('hidden');
    tableWrap.classList.remove('hidden');
  } catch (err) {
    loading.classList.add('hidden');
    errorMsg.classList.remove('hidden');
    errorMsg.textContent = `Failed to load routers: ${err.message}`;
  }
}

function extractUrl(router) {
  const rule = router.rule || '';
  const hostMatch = rule.match(/Host\(`([^`]+)`\)/);
  const pathMatch  = rule.match(/PathPrefix\(`([^`]+)`\)/);
  if (!hostMatch) return null;

  const protocol = (router.entryPoints || []).includes('web') ? 'http' : 'https';
  const path = pathMatch ? pathMatch[1] : '';
  return `${protocol}://${hostMatch[1]}${path}`;
}

function updateStats(routers) {
  document.getElementById('total-count').textContent   = routers.length;
  document.getElementById('enabled-count').textContent = routers.filter(r => r.status === 'enabled').length;
  document.getElementById('warning-count').textContent = routers.filter(r => r.status === 'warning').length;
  document.getElementById('error-count').textContent   = routers.filter(r => r.status === 'disabled').length;
}

function renderRouters(routers) {
  const tbody = document.getElementById('routers-body');
  tbody.innerHTML = '';

  if (routers.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="4" class="state-msg">No routers match</td>`;
    tbody.appendChild(tr);
    return;
  }

  routers.forEach(router => {
    const url = extractUrl(router);

    const statusClass = router.status === 'enabled'  ? 'status-enabled'
                      : router.status === 'warning'  ? 'status-warning'
                      : 'status-disabled';

    const epBadges = (router.entryPoints || [])
      .map(ep => `<span class="ep-badge">${ep}</span>`)
      .join('');

    const urlCell = url
      ? `<a class="url-link" href="${url}" target="_blank" rel="noopener">${url}</a>`
      : `<span style="color:var(--text-muted)">—</span>`;

    const actions = url ? `
      <div class="actions">
        <button class="btn-sm btn-copy"     onclick="copyUrl('${url}')">Copy URL</button>
        <button class="btn-sm btn-designer" onclick="openDesigner('${url}')">Open Designer</button>
      </div>` : '—';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="service-text">${router.service || '—'}</span></td>
      <td>${urlCell}</td>
      <td><span class="status-badge ${statusClass}">${router.status || 'unknown'}</span></td>
      <td>${actions}</td>
    `;
    tbody.appendChild(tr);
  });
}

function applyFilter(query) {
  const q = (query || '').toLowerCase();
  const filtered = q
    ? allRouters.filter(r =>
        r.name.toLowerCase().includes(q) ||
        (r.rule    || '').toLowerCase().includes(q) ||
        (r.service || '').toLowerCase().includes(q)
      )
    : allRouters;
  updateStats(filtered);
  renderRouters(filtered);
}

function copyUrl(url) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(url).then(() => showToast('URL copied to clipboard'));
  } else {
    const ta = document.createElement('textarea');
    ta.value = url;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('URL copied to clipboard');
  }
}

function openDesigner(url) {
  const isHttp = url.startsWith('http://');
  const base = url.replace(/^https?:\/\//, 'designer://');
  window.location.href = isHttp ? `${base}?insecure=true` : base;
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 2200);
}

document.getElementById('search').addEventListener('input', e => applyFilter(e.target.value));
document.getElementById('refresh-btn').addEventListener('click', fetchRouters);

fetchRouters();
