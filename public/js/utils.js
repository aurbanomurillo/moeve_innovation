/* ── SENTINEL · Shared Utilities ── */

// ── Shared State ──
export const state = {
  currentUser: null,
  workerCode: 'JL',
  isAdmin: false,
  currentPos: { lat: 36.1963, lng: -5.3848 },
  mapZoom: 1,
  mapPanX: 0,
  mapPanY: 0,
  escapeRouteActive: false,
  escapeWaypoints: [],
  musterPoint: null,
  navigateTarget: null,
  simMode: true,
  simOrigin: null,
  chatTarget: 'SENTINEL_AI',
  chatHistory: {},
  chatWorkers: [],
  mapLayers: { workers: true, hazards: true, incidents: false },
  activePopup: null,
  notifReadIds: new Set(JSON.parse(localStorage.getItem('sentinel_notif_read') || '[]')),
  notifCache: [],
  hazardPhotos: {},
  lastIncidentCount: 0,
  gpsWatchId: null,
  radioChannel: 7,
};

// ── Constants ──
export const MAP_BOUNDS = { north: 36.1982, south: 36.1918, west: -5.3886, east: -5.3774 };
export const AVATAR_COLORS = {
  JL: '#0c8de7', AR: '#e67e22', PS: '#8e44ad', ML: '#27ae60',
  FC: '#c0392b', IG: '#2980b9', MG: '#16a085', AI: 'linear-gradient(135deg,#0c8de7,#88eeb9,#d289ff)'
};

// ── GPS Math ──
export function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000, toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function gpsToPercent(lat, lng) {
  const x = ((lng - MAP_BOUNDS.west) / (MAP_BOUNDS.east - MAP_BOUNDS.west)) * 100;
  const y = ((MAP_BOUNDS.north - lat) / (MAP_BOUNDS.north - MAP_BOUNDS.south)) * 100;
  return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
}

export function percentToGps(x, y) {
  const lng = MAP_BOUNDS.west + (x / 100) * (MAP_BOUNDS.east - MAP_BOUNDS.west);
  const lat = MAP_BOUNDS.north - (y / 100) * (MAP_BOUNDS.north - MAP_BOUNDS.south);
  return { lat, lng };
}

// ── Toast ──
let toastTimer;
export function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

// ── Time helpers ──
export function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

export function formatCountdown(ms) {
  if (ms <= 0) return 'Disponible';
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h > 0) return `${h}h ${min}min`;
  return `${min}min`;
}

// ── Notification banner ──
export function showBanner(icon, text, duration = 4000) {
  const b = document.getElementById('notifBanner');
  if (!b) return;
  b.querySelector('.notif-icon').textContent = icon;
  b.querySelector('.notif-text').textContent = text;
  b.classList.add('show');
  setTimeout(() => b.classList.remove('show'), duration);
}

// ── Safe JSON parse ──
export function safeParse(str, fallback = []) {
  try { return JSON.parse(str); } catch { return fallback; }
}
