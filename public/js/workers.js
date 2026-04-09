/* ── SENTINEL · Workers Module ── */
import { state, gpsToPercent, AVATAR_COLORS, timeAgo } from './utils.js';
import { apiGet } from './api.js';

export async function loadWorkerDots() {
  const workers = await apiGet('/api/workers-map');
  if (!workers) return;
  const overlay = document.getElementById('workerOverlay');
  if (!overlay) return;
  overlay.innerHTML = '';

  workers.forEach(w => {
    if (w.code === state.workerCode) return; // Skip self
    if (!w.lat || !w.lng) return;
    const p = gpsToPercent(w.lat, w.lng);
    const dot = document.createElement('div');
    dot.className = 'worker-map-dot';
    dot.style.left = p.x + '%';
    dot.style.top = p.y + '%';
    dot.style.display = state.mapLayers.workers ? '' : 'none';
    dot.onclick = (e) => {
      e.stopPropagation();
      toggleWorkerPopup(dot, w);
    };
    dot.innerHTML = `
      <div class="wmd-circle" style="background:${AVATAR_COLORS[w.code] || 'var(--blue)'}">${w.code}</div>
      <div class="wmd-name">${w.name.split(' ')[0]}</div>`;
    overlay.appendChild(dot);
  });
}

function toggleWorkerPopup(dotEl, worker) {
  // Close any existing popup
  closeAllPopups();

  const popup = document.createElement('div');
  popup.className = 'worker-popup';
  popup.innerHTML = `
    <div class="wp-name">${worker.name}</div>
    <div class="wp-role">${worker.role} · ${worker.company || ''}</div>
    <div class="wp-actions">
      <div class="wp-action chat-action" onclick="window.openWorkerChat('${worker.code}')">💬 Chat</div>
      <div class="wp-action" onclick="window.openWorkerDetail('${worker.code}')">👤 Ver</div>
    </div>`;
  dotEl.appendChild(popup);
  state.activePopup = popup;

  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', closePopupOnOutside, { once: true });
  }, 10);
}

function closePopupOnOutside(e) {
  if (state.activePopup && !state.activePopup.contains(e.target)) {
    closeAllPopups();
  }
}

function closeAllPopups() {
  document.querySelectorAll('.worker-popup').forEach(p => p.remove());
  state.activePopup = null;
}

export async function loadIncidentDots() {
  const incidents = await apiGet('/api/incidents-map');
  if (!incidents) return;
  const overlay = document.getElementById('incidentOverlay');
  if (!overlay) return;
  overlay.innerHTML = '';

  incidents.forEach(inc => {
    if (!inc.lat || !inc.lng) return;
    const p = gpsToPercent(inc.lat, inc.lng);
    const dot = document.createElement('div');
    dot.className = 'incident-map-dot';
    dot.style.left = p.x + '%';
    dot.style.top = p.y + '%';
    dot.style.display = state.mapLayers.incidents ? '' : 'none';
    dot.innerHTML = `
      <div class="imd-circle">⚠</div>
      <div class="imd-label">${inc.category || inc.type}</div>`;
    overlay.appendChild(dot);
  });
}

// Global handlers for popups
window.openWorkerChat = function(code) {
  closeAllPopups();
  state.chatTarget = code;
  if (window.switchScreen) window.switchScreen('chat');
};

window.openWorkerDetail = async function(code) {
  closeAllPopups();
  const worker = await apiGet(`/api/worker/${code}`);
  if (!worker) return;

  const sheet = document.getElementById('contactDetailSheet');
  if (!sheet) return;
  sheet.classList.add('active');

  const body = sheet.querySelector('.bottom-sheet-body');
  body.innerHTML = `
    <div class="contact-detail-header">
      <div class="cd-avatar" style="background:${AVATAR_COLORS[code] || 'var(--blue)'}">${code}</div>
      <div class="cd-info">
        <div class="cd-name">${worker.name}</div>
        <div class="cd-role">${worker.role} · ${worker.company}</div>
      </div>
    </div>
    <div class="cd-actions">
      <div class="cd-action-btn primary" onclick="window.openWorkerChat('${code}'); window.closeBSheet('contactDetailSheet')">💬 Chat</div>
      <div class="cd-action-btn" onclick="alert('📞 Llamando...')">📞 Llamar</div>
      <div class="cd-action-btn" onclick="window.closeBSheet('contactDetailSheet')">📍 Ubicar</div>
    </div>
    <div class="cd-history-title">Historial de contribuciones</div>
    <div id="contactHistory2">Cargando...</div>`;

  const data = await apiGet(`/api/worker-history/${code}`);
  const hist = document.getElementById('contactHistory2');
  if (!hist || !data) return;
  const items = [];
  (data.reports || []).forEach(r => items.push({ type: '📋 Reporte', desc: r.description || r.category, time: r.created_at }));
  (data.tasks || []).forEach(t => items.push({ type: '📌 Tarea', desc: t.title, time: t.created_at }));
  if (data.message_count) items.push({ type: '💬 Mensajes', desc: `${data.message_count} mensajes`, time: '' });
  hist.innerHTML = items.length ? items.slice(0, 8).map(i => `
    <div class="cd-history-item">
      <div class="cd-history-type">${i.type}</div>
      <div class="cd-history-desc">${i.desc || ''}</div>
      ${i.time ? `<div class="cd-history-time">${timeAgo(i.time)}</div>` : ''}
    </div>`).join('') : '<div style="color:var(--ink-faint);font-size:12px">Sin historial</div>';
};
