/* ── SENTINEL · Main Entry Point ── */
import { state, toast } from './utils.js';
import { isLoggedIn, handleLogin, checkSession, logout, applyUser, getStoredUser } from './auth.js';
import { initMap, zoomMap, toggleMapLayer, clearEscapeRoute } from './map.js';
import { loadZoneScreen } from './zone.js';
import { loadTaskScreen, preloadDemoTasks } from './tasks.js';
import { loadAlertScreen, submitReport, stopVoiceRecording } from './alerts.js';
import { initChat, sendMessage, sendQuickAction } from './chat.js';
import { startNotifPolling, openNotifInbox, closeNotifInbox, markAllRead } from './notifications.js';
import { openRadioMenu, closeRadioMenu } from './radio.js';
import { loadWorkerDots, loadIncidentDots } from './workers.js';

let currentScreen = 'zone';

// ── Expose to window for onclick handlers ──
window.switchScreen = switchScreen;
window.closeModal = closeModal;
window.closeBSheet = closeBSheet;
window.sendMessage = sendMessage;
window.sendQuickAction = sendQuickAction;
window.submitReport = submitReport;
window.stopVoiceRecording = stopVoiceRecording;
window.toggleMapLayer = toggleMapLayer;
window.zoomMap = zoomMap;
window.preloadDemoTasks = preloadDemoTasks;
window.openNotifInbox = openNotifInbox;
window.closeNotifInbox = closeNotifInbox;
window.markAllRead = markAllRead;
window.openRadioMenu = openRadioMenu;
window.closeRadioMenu = closeRadioMenu;
window.logout = logout;

// ── Init ──
document.addEventListener('DOMContentLoaded', async () => {
  if (isLoggedIn()) {
    const ok = await checkSession();
    if (ok) {
      showApp();
    } else {
      showLogin();
    }
  } else {
    showLogin();
  }
});

function showLogin() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('appContainer').style.display = 'none';

  const form = document.getElementById('loginForm');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value.trim();
    const ok = await handleLogin(user, pass);
    if (ok) showApp();
  });
}

async function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appContainer').style.display = 'block';

  // Apply user data
  const user = getStoredUser();
  if (user) applyUser(user);

  // Init modules
  initMap();
  startNotifPolling();

  // Load initial screen
  await switchScreen('zone');

  // Load map overlays
  setTimeout(async () => {
    await loadWorkerDots();
    await loadIncidentDots();
  }, 500);

  // Chat input enter key
  const chatInput = document.getElementById('chatInput');
  chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}

async function switchScreen(name) {
  currentScreen = name;

  // Hide all screens
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

  // Show target
  const screen = document.getElementById(`screen-${name}`);
  if (screen) screen.classList.add('active');

  // Update nav
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`.nav-item[data-screen="${name}"]`)?.classList.add('active');

  // Load screen data
  switch (name) {
    case 'zone':
      await loadZoneScreen();
      break;
    case 'task':
      await loadTaskScreen();
      break;
    case 'alert':
      await loadAlertScreen();
      break;
    case 'chat':
      await initChat();
      break;
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}

function closeBSheet(id) {
  const sheet = document.getElementById(id);
  if (sheet) sheet.classList.remove('active');
}

// ── Admin: create task form ──
window.adminCreateTask = async function() {
  const title = document.getElementById('adminTaskTitle')?.value;
  const worker = document.getElementById('adminTaskWorker')?.value || 'JL';
  const zone = document.getElementById('adminTaskZone')?.value || 'H-100';
  if (!title) { toast('Introduce un título'); return; }

  const { apiPost } = await import('./api.js');
  const data = await apiPost('/api/admin/tasks', {
    worker_code: worker, title, zone_code: zone,
    start_time: '09:00', end_time: '17:00', risk_level: 'low'
  });
  if (data?.ok) {
    toast('✅ Tarea creada');
    document.getElementById('adminTaskTitle').value = '';
  }
};

window.adminAlarm = async function() {
  const title = prompt('Título de la alarma:') || 'Alarma del supervisor';
  const detail = prompt('Detalle:') || '';
  const { apiPost } = await import('./api.js');
  await apiPost('/api/admin/alarm', { title, detail, severity: 'critical' });
  toast('🚨 Alarma emitida');
};
