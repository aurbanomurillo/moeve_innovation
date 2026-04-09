/* ── SENTINEL · Map Module ── */
import { state, MAP_BOUNDS, gpsToPercent, haversine, toast, showBanner } from './utils.js';
import { apiGet, apiPut } from './api.js';

let mapContainer, mapInner, mapImg, mapSvg, userDot;
let isPanning = false, panStart = { x: 0, y: 0 }, panOffset = { x: 0, y: 0 };
let pinchStartDist = 0, pinchStartZoom = 1;

export function initMap() {
  mapContainer = document.getElementById('plantMapContainer');
  mapInner = document.getElementById('mapInnerWrap');
  mapImg = document.getElementById('plantMapImg');
  mapSvg = document.getElementById('mapSvg');
  userDot = document.getElementById('userGpsDot');

  if (!mapContainer) return;

  // Touch events for pan/zoom
  mapContainer.addEventListener('touchstart', onTouchStart, { passive: false });
  mapContainer.addEventListener('touchmove', onTouchMove, { passive: false });
  mapContainer.addEventListener('touchend', onTouchEnd);

  // Mouse events for pan
  mapContainer.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);

  // Zoom buttons
  document.getElementById('zoomIn')?.addEventListener('click', () => zoomMap(1));
  document.getElementById('zoomOut')?.addEventListener('click', () => zoomMap(-1));

  // Start GPS
  startGPS();
}

function onTouchStart(e) {
  if (e.touches.length === 2) {
    e.preventDefault();
    pinchStartDist = getTouchDist(e);
    pinchStartZoom = state.mapZoom;
  } else if (e.touches.length === 1) {
    isPanning = true;
    panStart = { x: e.touches[0].clientX - state.mapPanX, y: e.touches[0].clientY - state.mapPanY };
  }
}

function onTouchMove(e) {
  if (e.touches.length === 2) {
    e.preventDefault();
    const dist = getTouchDist(e);
    const newZoom = Math.max(1, Math.min(4, pinchStartZoom * (dist / pinchStartDist)));
    state.mapZoom = newZoom;
    applyMapTransform();
  } else if (isPanning && e.touches.length === 1) {
    e.preventDefault();
    state.mapPanX = e.touches[0].clientX - panStart.x;
    state.mapPanY = e.touches[0].clientY - panStart.y;
    clampPan();
    applyMapTransform();
  }
}

function onTouchEnd() { isPanning = false; }

function onMouseDown(e) {
  if (e.target.closest('.worker-map-dot, .hazard-blip, .map-layer-btn, .map-zoom-btn')) return;
  isPanning = true;
  panStart = { x: e.clientX - state.mapPanX, y: e.clientY - state.mapPanY };
  mapContainer.style.cursor = 'grabbing';
}

function onMouseMove(e) {
  if (!isPanning) return;
  state.mapPanX = e.clientX - panStart.x;
  state.mapPanY = e.clientY - panStart.y;
  clampPan();
  applyMapTransform();
}

function onMouseUp() {
  isPanning = false;
  if (mapContainer) mapContainer.style.cursor = '';
}

function getTouchDist(e) {
  const dx = e.touches[0].clientX - e.touches[1].clientX;
  const dy = e.touches[0].clientY - e.touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function clampPan() {
  if (!mapInner) return;
  const rect = mapContainer.getBoundingClientRect();
  const w = rect.width * state.mapZoom;
  const h = rect.height * state.mapZoom;
  const maxX = (w - rect.width) / 2;
  const maxY = (h - rect.height) / 2;
  state.mapPanX = Math.max(-maxX, Math.min(maxX, state.mapPanX));
  state.mapPanY = Math.max(-maxY, Math.min(maxY, state.mapPanY));
}

export function zoomMap(dir) {
  state.mapZoom = Math.max(1, Math.min(4, state.mapZoom + dir * 0.5));
  if (state.mapZoom === 1) { state.mapPanX = 0; state.mapPanY = 0; }
  clampPan();
  applyMapTransform();
}

function applyMapTransform() {
  if (!mapInner) return;
  mapInner.style.transform = `translate(${state.mapPanX}px, ${state.mapPanY}px) scale(${state.mapZoom})`;
}

// ── GPS Tracking ──
export function startGPS() {
  if (!navigator.geolocation) {
    state.simMode = true;
    return;
  }
  state.gpsWatchId = navigator.geolocation.watchPosition(
    pos => {
      const { latitude, longitude, accuracy } = pos.coords;
      // Room demo: scale movement × 100
      if (!state.simOrigin) {
        state.simOrigin = { lat: latitude, lng: longitude };
      }
      const dLat = (latitude - state.simOrigin.lat) * 100;
      const dLng = (longitude - state.simOrigin.lng) * 100;
      const baseLat = 36.1963, baseLng = -5.3848;
      state.currentPos = { lat: baseLat + dLat, lng: baseLng + dLng };
      state.simMode = false;
      updateUserDot();
      // Update server position
      apiPut(`/api/worker/${state.workerCode}/position`, state.currentPos);
    },
    err => {
      console.warn('GPS error:', err.message);
      state.simMode = true;
      updateUserDot();
    },
    { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
  );
  // Also set initial position
  updateUserDot();
}

export function updateUserDot() {
  if (!userDot) return;
  const { x, y } = gpsToPercent(state.currentPos.lat, state.currentPos.lng);
  userDot.style.left = x + '%';
  userDot.style.top = y + '%';
  userDot.style.display = 'flex';
  // Update GPS badge
  const badge = document.getElementById('gpsBadge');
  if (badge) badge.textContent = state.simMode ? 'DEMO' : `GPS ±${Math.round(5)}m`;
}

// ── Escape Route Rendering ──
export function drawEscapeRoute(waypoints, destLat, destLng) {
  if (!mapSvg) return;
  mapSvg.innerHTML = '';
  if (!waypoints || waypoints.length === 0) return;

  state.escapeRouteActive = true;
  state.escapeWaypoints = waypoints;

  const points = [gpsToPercent(state.currentPos.lat, state.currentPos.lng)];
  waypoints.forEach(([lat, lng]) => points.push(gpsToPercent(lat, lng)));
  if (destLat && destLng) points.push(gpsToPercent(destLat, destLng));

  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');

  // Outer glow
  const glow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  glow.setAttribute('d', d);
  glow.setAttribute('stroke', 'rgba(12,141,231,0.15)');
  glow.setAttribute('stroke-width', '6');
  glow.setAttribute('fill', 'none');
  glow.setAttribute('stroke-linecap', 'round');
  glow.setAttribute('vector-effect', 'non-scaling-stroke');
  mapSvg.appendChild(glow);

  // Main line
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  line.setAttribute('d', d);
  line.setAttribute('stroke', '#0c8de7');
  line.setAttribute('stroke-width', '3');
  line.setAttribute('fill', 'none');
  line.setAttribute('stroke-dasharray', '8 4');
  line.setAttribute('stroke-linecap', 'round');
  line.setAttribute('vector-effect', 'non-scaling-stroke');
  mapSvg.appendChild(line);

  // Distance badge
  const total = waypoints.reduce((acc, wp, i) => {
    const prev = i === 0 ? [state.currentPos.lat, state.currentPos.lng] : waypoints[i - 1];
    return acc + haversine(prev[0], prev[1], wp[0], wp[1]);
  }, 0);
  const distBadge = document.getElementById('escapeDistBadge');
  if (distBadge) {
    distBadge.textContent = `📍 ${Math.round(total)}m hasta destino`;
    distBadge.style.display = 'block';
  }

  // Muster marker
  const muster = document.getElementById('musterMarker');
  if (muster && destLat && destLng) {
    const mp = gpsToPercent(destLat, destLng);
    muster.style.left = mp.x + '%';
    muster.style.top = mp.y + '%';
    muster.style.display = 'flex';
  }
}

export function clearEscapeRoute() {
  state.escapeRouteActive = false;
  state.navigateTarget = null;
  if (mapSvg) mapSvg.innerHTML = '';
  const distBadge = document.getElementById('escapeDistBadge');
  if (distBadge) distBadge.style.display = 'none';
  const muster = document.getElementById('musterMarker');
  if (muster) muster.style.display = 'none';
}

// ── Navigate to location (from chat) ──
export function navigateTo(lat, lng, name) {
  state.navigateTarget = { lat, lng, name };
  const wp = generateSimpleWaypoints(state.currentPos.lat, state.currentPos.lng, lat, lng);
  drawEscapeRoute(wp, lat, lng);
  // Switch to map screen
  if (window.switchScreen) window.switchScreen('zone');
  toast(`Navegando a ${name}`);
}

function generateSimpleWaypoints(fromLat, fromLng, toLat, toLng) {
  const steps = 3;
  const waypoints = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / (steps + 1);
    waypoints.push([
      fromLat + (toLat - fromLat) * t + (Math.random() - 0.5) * 0.0002,
      fromLng + (toLng - fromLng) * t + (Math.random() - 0.5) * 0.0002
    ]);
  }
  return waypoints;
}

// ── Map Layers ──
export function toggleMapLayer(layer) {
  state.mapLayers[layer] = !state.mapLayers[layer];
  const btn = document.querySelector(`.map-layer-btn[data-layer="${layer}"]`);
  if (btn) btn.classList.toggle('active', state.mapLayers[layer]);
  refreshMapOverlays();
}

export function refreshMapOverlays() {
  document.querySelectorAll('.worker-map-dot').forEach(el => {
    el.style.display = state.mapLayers.workers ? '' : 'none';
  });
  document.querySelectorAll('.hazard-blip').forEach(el => {
    el.style.display = state.mapLayers.hazards ? '' : 'none';
  });
  document.querySelectorAll('.incident-map-dot').forEach(el => {
    el.style.display = state.mapLayers.incidents ? '' : 'none';
  });
}
