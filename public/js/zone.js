/* ── SENTINEL · Zone Screen Module ── */
import { state, gpsToPercent, haversine, safeParse, timeAgo, toast } from './utils.js';
import { apiGet, apiPut } from './api.js';
import { drawEscapeRoute, clearEscapeRoute, refreshMapOverlays, toggleMapLayer } from './map.js';

export async function loadZoneScreen() {
  await Promise.all([loadSemaphore(), loadHazards(), loadEscapeRoute(), loadMapHazards()]);
}

async function loadSemaphore() {
  const data = await apiGet('/api/semaphore');
  if (!data) return;
  const el = document.getElementById('semaphore');
  if (!el) return;
  el.className = `semaphore ${data.level}`;
  el.querySelector('.sem-light').textContent = data.level === 'green' ? '🟢' : data.level === 'yellow' ? '🟡' : '🔴';
  el.querySelector('.sem-title').textContent = data.title || '';
  el.querySelector('.sem-sub').textContent = data.subtitle || '';
}

async function loadHazards() {
  const zone = await apiGet('/api/worker/' + state.workerCode);
  const hazards = await apiGet('/api/hazards?active=true');
  if (!hazards) return;
  const list = document.getElementById('hazardList');
  if (!list) return;

  list.innerHTML = '';
  const zoneHazards = hazards.filter(h => !zone || h.zone_code === zone.current_zone);

  zoneHazards.forEach(h => {
    const iconType = h.type === 'hot_work' ? 'hot' : h.type === 'crane' ? 'crane' : h.type === 'confined_space' ? 'confined' : 'hot';
    const icons = { hot_work: '🔥', crane: '🏗️', confined_space: '⛔', electrical: '⚡' };
    const distClass = h.distance_m < 10 ? 'close' : h.distance_m < 20 ? 'medium' : 'far';
    const actionClass = h.severity === 'high' || h.severity === 'critical' ? 'caution' : h.severity === 'info' ? 'ok' : 'caution';

    const card = document.createElement('div');
    card.className = 'hazard-card';
    card.onclick = () => openHazardModal(h);
    card.innerHTML = `
      <div class="h-icon-box ${iconType}">${icons[h.type] || '⚠️'}</div>
      <div class="h-content">
        <div class="h-title">${h.title}</div>
        <div class="h-meta">${h.distance_m}m ${h.direction} · ${h.company || ''}</div>
        <span class="h-action-pill ${actionClass}">${h.severity === 'info' ? '✅ Sin interferencia' : '⚠️ Precaución requerida'}</span>
      </div>
      <div class="h-dist ${distClass}">
        ${h.distance_m}<small>metros</small>
      </div>`;
    list.appendChild(card);
  });
}

function openHazardModal(h) {
  const modal = document.getElementById('hazardModal');
  if (!modal) return;
  const icons = { hot_work: '🔥', crane: '🏗️', confined_space: '⛔', electrical: '⚡' };
  const body = modal.querySelector('.modal-sheet');
  body.innerHTML = `
    <div class="modal-handle"></div>
    <h3>${icons[h.type] || '⚠️'} ${h.title}</h3>
    <p style="font-size:13px;color:var(--ink-soft);line-height:1.6;margin-bottom:16px">${h.description || ''}</p>
    <div style="background:var(--panel-2);border-radius:var(--radius-sm);padding:14px;margin-bottom:12px">
      <div style="font-size:11px;font-weight:800;color:var(--ink-faint);text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px">INFORMACIÓN</div>
      <div style="font-size:12px;line-height:1.8;color:var(--ink-soft)">
        📍 Distancia: <strong>${h.distance_m}m ${h.direction}</strong><br>
        🏢 Empresa: <strong>${h.company || '—'}</strong><br>
        🕒 Horario: <strong>${h.start_time || '—'} — ${h.end_time || '—'}</strong><br>
        ⚡ Severidad: <strong>${h.severity}</strong>
      </div>
    </div>
    <div style="background:rgba(255,178,74,.06);border:1px solid rgba(255,178,74,.15);border-radius:var(--radius-sm);padding:14px;margin-bottom:12px">
      <div style="font-size:11px;font-weight:800;color:#b8860b;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px">⚠️ ACCIÓN REQUERIDA</div>
      <div style="font-size:12px;color:var(--ink);line-height:1.6">${h.action_required || 'Sin acción requerida.'}</div>
    </div>
    <div class="hazard-photos" id="hazardPhotos-${h.id}">
      <div class="hazard-photos-title">📸 Fotos del riesgo</div>
      <div class="hazard-photo-grid" id="hazardPhotoGrid-${h.id}"></div>
      <label class="hazard-photo-upload">
        📷 Subir foto
        <input type="file" accept="image/*" capture="environment" onchange="window.uploadHazardPhoto(${h.id}, this)">
      </label>
    </div>
    <button class="modal-close" onclick="window.closeModal('hazardModal')">Cerrar</button>`;

  // Load cached photos
  const photos = state.hazardPhotos[h.id] || [];
  renderHazardPhotos(h.id, photos);

  modal.classList.add('active');
}

function renderHazardPhotos(hazardId, photos) {
  const grid = document.getElementById(`hazardPhotoGrid-${hazardId}`);
  if (!grid) return;
  grid.innerHTML = photos.map(p => `
    <div class="hazard-photo-item">
      <img class="hazard-photo-img" src="${p.data}" alt="Foto">
      <div class="hazard-photo-meta">
        <div class="hazard-photo-avatar" style="background:${p.color || 'var(--blue)'}">${p.code || 'JL'}</div>
        ${p.time || 'ahora'}
      </div>
    </div>`).join('');
}

window.uploadHazardPhoto = function(hazardId, input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    if (!state.hazardPhotos[hazardId]) state.hazardPhotos[hazardId] = [];
    state.hazardPhotos[hazardId].push({
      data: e.target.result,
      code: state.workerCode,
      color: 'var(--blue)',
      time: 'ahora'
    });
    renderHazardPhotos(hazardId, state.hazardPhotos[hazardId]);
    toast('Foto añadida');
  };
  reader.readAsDataURL(file);
};

async function loadEscapeRoute() {
  const worker = await apiGet('/api/worker/' + state.workerCode);
  if (!worker) return;
  const zones = await apiGet('/api/zones');
  const zone = zones?.find(z => z.code === worker.current_zone);
  if (!zone) return;

  const routes = await apiGet(`/api/escape/${zone.id}`);
  const bar = document.getElementById('escapeBar');
  if (!bar || !routes?.length) return;

  const route = routes[0];
  bar.querySelector('.esc-title').textContent = route.muster_point;
  bar.querySelector('.esc-sub').textContent = `${route.distance_m}m · ${route.route_description}`;
  bar.onclick = () => {
    if (state.escapeRouteActive) {
      clearEscapeRoute();
      bar.parentElement.classList.remove('escape-active');
    } else {
      const wp = safeParse(route.waypoints);
      drawEscapeRoute(wp, route.dest_lat, route.dest_lng);
      bar.parentElement.classList.add('escape-active');
    }
  };
}

async function loadMapHazards() {
  const hazards = await apiGet('/api/hazards?active=true');
  if (!hazards) return;
  const overlay = document.getElementById('hazardOverlay');
  if (!overlay) return;
  overlay.innerHTML = '';

  hazards.forEach(h => {
    if (!h.lat || !h.lng) return;
    const p = gpsToPercent(h.lat, h.lng);
    const iconMap = { hot_work: 'hot', crane: 'crane', confined_space: 'confined' };
    const emojiMap = { hot_work: '🔥', crane: '🏗️', confined_space: '⛔', electrical: '⚡' };
    const blip = document.createElement('div');
    blip.className = 'hazard-blip';
    blip.style.left = p.x + '%';
    blip.style.top = p.y + '%';
    blip.style.display = state.mapLayers.hazards ? '' : 'none';
    blip.onclick = () => openHazardModal(h);
    blip.innerHTML = `
      <div class="blip-icon ${iconMap[h.type] || 'hot'}">${emojiMap[h.type] || '⚠️'}</div>
      <div class="blip-label">${h.title.split('—')[0].trim()}</div>`;
    overlay.appendChild(blip);
  });
}
