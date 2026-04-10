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

// ── Chat voice input (speech-to-text → send as message) ──
window.startChatVoice = function() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { toast('Reconocimiento de voz no disponible'); return; }
  const recognition = new SpeechRecognition();
  recognition.lang = 'es-ES';
  recognition.continuous = false;
  recognition.interimResults = false;
  const btn = document.getElementById('chatMicBtn');
  if (btn) { btn.style.background = 'var(--danger)'; btn.style.color = 'white'; }
  recognition.onresult = (e) => {
    const text = e.results[0][0].transcript;
    const input = document.getElementById('chatInput');
    if (input) input.value = text;
    if (btn) { btn.style.background = ''; btn.style.color = ''; }
    sendMessage();
  };
  recognition.onerror = () => {
    if (btn) { btn.style.background = ''; btn.style.color = ''; }
    toast('No se detectó voz');
  };
  recognition.onend = () => {
    if (btn) { btn.style.background = ''; btn.style.color = ''; }
  };
  recognition.start();
  toast('🎙️ Escuchando...');
};
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
  const startTime = document.getElementById('adminTaskStartTime')?.value || '09:00';
  const endTime = document.getElementById('adminTaskEndTime')?.value || '17:00';
  if (!title) { toast('Introduce un título'); return; }

  const { apiPost } = await import('./api.js');
  const data = await apiPost('/api/admin/tasks', {
    worker_code: worker, title, zone_code: zone,
    start_time: startTime, end_time: endTime, risk_level: 'low'
  });
  if (data?.ok) {
    toast('✅ Tarea creada');
    document.getElementById('adminTaskTitle').value = '';
  }
};

// ── Admin: manage hazards ──
window.loadAdminHazards = async function() {
  const { apiGet } = await import('./api.js');
  const hazards = await apiGet('/api/hazards');
  if (!hazards) return;
  const list = document.getElementById('adminHazardList');
  if (!list) return;

  const icons = { hot_work: '🔥', crane: '🏗️', confined_space: '⛔', electrical: '⚡' };
  list.innerHTML = hazards.length === 0 ? '<div style="font-size:12px;color:var(--ink-faint)">Sin riesgos registrados</div>' : '';

  hazards.forEach(h => {
    const item = document.createElement('div');
    item.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px;border-radius:8px;background:var(--panel-2);border:1px solid var(--line)';
    item.innerHTML = `
      <span style="font-size:16px">${icons[h.type] || '⚠️'}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h.title}</div>
        <div style="font-size:9px;color:var(--ink-faint)">${h.severity} · ${h.start_time || ''}-${h.end_time || ''}</div>
      </div>
      <button class="admin-btn ${h.active ? 'danger' : 'secondary'}" style="padding:4px 10px;font-size:10px;min-width:auto"
        onclick="window.toggleHazard(${h.id}, this)">${h.active ? '🔴 Desactivar' : '🟢 Activar'}</button>`;
    list.appendChild(item);
  });
};

window.toggleHazard = async function(id, btn) {
  const { apiPut } = await import('./api.js');
  const data = await apiPut(`/api/admin/hazards/${id}/toggle`, {});
  if (data?.ok) {
    toast(data.active ? '⚠️ Riesgo activado' : '✅ Riesgo desactivado');
    window.loadAdminHazards();
    // Refresh zone screen
    const { loadZoneScreen } = await import('./zone.js');
    loadZoneScreen();
  }
};

// ── Admin: complete task from task list ──
window.adminCompleteTask = async function(id) {
  const { apiPut } = await import('./api.js');
  const data = await apiPut(`/api/admin/tasks/${id}/status`, { status: 'completed' });
  if (data?.ok) {
    toast('✅ Tarea marcada como completada');
    const { loadTaskScreen } = await import('./tasks.js');
    loadTaskScreen();
  }
};

// ── User: start / complete task ──
window.startTask = async function(id) {
  const { apiPut } = await import('./api.js');
  const data = await apiPut(`/api/tasks/${id}/status`, { status: 'in-progress' });
  if (data?.ok) {
    toast('▶️ Tarea iniciada');
    const { loadTaskScreen } = await import('./tasks.js');
    loadTaskScreen();
  }
};

window.completeTask = async function(id) {
  if (!confirm('¿Marcar esta tarea como completada?')) return;
  const { apiPut } = await import('./api.js');
  const data = await apiPut(`/api/tasks/${id}/status`, { status: 'completed' });
  if (data?.ok) {
    toast('✅ Tarea completada');
    const { loadTaskScreen } = await import('./tasks.js');
    loadTaskScreen();
  }
};

window.adminAlarm = async function() {
  const title = prompt('Título de la alarma:') || 'Alarma del supervisor';
  const detail = prompt('Detalle:') || '';
  const { apiPost } = await import('./api.js');
  await apiPost('/api/admin/alarm', { title, detail, severity: 'critical' });
  toast('🚨 Alarma emitida');
  const { loadZoneScreen } = await import('./zone.js');
  loadZoneScreen();
};

window.adminResetAlarm = async function() {
  const { apiPut } = await import('./api.js');
  const data = await apiPut('/api/semaphore', { level: 'yellow', title: 'PRECAUCIÓN — Supervisión activa', subtitle: 'Alarma desactivada por supervisor' });
  if (data?.ok) {
    toast('✅ Alarma desactivada');
    const { loadZoneScreen } = await import('./zone.js');
    loadZoneScreen();
  } else {
    toast('❌ Error al desactivar alarma');
  }
};

// ── Admin: load incidents panel ──
window.loadAdminIncidents = async function() {
  const { apiGet } = await import('./api.js');
  const incidents = await apiGet('/api/admin/incidents');
  if (!incidents) return;
  const list = document.getElementById('adminIncidentList');
  if (!list) return;

  const typeIcons = { near_miss: '⚠️', photo: '📸', voice: '🎙️', observation: '👁️', emergency: '🆘' };
  list.innerHTML = incidents.length === 0 ? '<div style="font-size:12px;color:var(--ink-faint);text-align:center;padding:12px">Sin reportes</div>' : '';

  incidents.slice(0, 15).forEach(r => {
    const item = document.createElement('div');
    item.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px;border-radius:8px;background:var(--panel-2);border:1px solid var(--line)';
    item.innerHTML = `
      <span style="font-size:18px">${typeIcons[r.type] || '📋'}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.description || r.ai_summary || r.type}</div>
        <div style="font-size:9px;color:var(--ink-faint)">${r.worker_name || ''} · ${r.zone_name || ''} · ${r.category || ''}</div>
        <div style="font-size:9px;color:var(--ink-faint)">${r.created_at || ''}</div>
      </div>
      <span style="font-size:9px;font-weight:800;padding:3px 8px;border-radius:6px;background:${r.status === 'resolved' ? 'rgba(31,155,111,.1)' : 'rgba(255,178,74,.1)'};color:${r.status === 'resolved' ? 'var(--success)' : '#b8860b'}">${r.status === 'resolved' ? 'Resuelto' : r.status === 'sent' ? 'Pendiente' : r.status}</span>`;
    list.appendChild(item);
  });
};

// ── Checkbox validation for starting tasks ──
window.checkTaskControls = function(taskId) {
  const section = document.querySelector(`.tp-checks[data-task-id="${taskId}"]`);
  if (!section) return;
  const total = parseInt(section.dataset.total) || 0;
  const checked = section.querySelectorAll('.check-item.checked').length;
  const btn = document.getElementById(`startBtn-${taskId}`);
  const hint = document.getElementById(`checkHint-${taskId}`);
  if (btn) {
    if (checked >= total) {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    } else {
      btn.disabled = true;
      btn.style.opacity = '.4';
      btn.style.pointerEvents = 'none';
    }
  }
  if (hint) {
    hint.textContent = checked >= total ? '✅ Todos los controles verificados' : `Marca todos los controles (${checked}/${total})`;
    hint.style.color = checked >= total ? 'var(--success)' : '';
  }
};

// ── Delete task (worker hides from own view) ──
window.deleteTask = async function(id) {
  if (!confirm('¿Eliminar esta tarea de tu lista?')) return;
  const { apiDelete } = await import('./api.js');
  const data = await apiDelete(`/api/tasks/${id}?target=worker`);
  if (data?.ok) {
    toast('🗑️ Tarea eliminada');
    const { loadTaskScreen } = await import('./tasks.js');
    loadTaskScreen();
  }
};

// ── Admin: delete task from worker view ──
window.adminDeleteTaskForWorker = async function(id) {
  if (!confirm('¿Eliminar esta tarea de la vista del trabajador?')) return;
  const { apiDelete } = await import('./api.js');
  const data = await apiDelete(`/api/admin/tasks/${id}/worker`);
  if (data?.ok) {
    toast('🗑️ Tarea eliminada del trabajador');
    if (window.loadAdminTasks) window.loadAdminTasks();
  }
};

// ── Admin: hide task from own admin view ──
window.adminHideTask = async function(id) {
  const { apiDelete } = await import('./api.js');
  const data = await apiDelete(`/api/tasks/${id}?target=admin`);
  if (data?.ok) {
    toast('✅ Tarea ocultada');
    if (window.loadAdminTasks) window.loadAdminTasks();
  }
};

// ── Admin: load all worker tasks ──
window.loadAdminTasks = async function() {
  const { apiGet } = await import('./api.js');
  const tasks = await apiGet('/api/admin/tasks');
  if (!tasks) return;
  const list = document.getElementById('adminTaskList');
  if (!list) return;

  const statusIcons = { 'in-progress': '🔄', scheduled: '📋', completed: '✅' };
  const statusColors = { 'in-progress': 'var(--blue)', scheduled: 'var(--ink-faint)', completed: 'var(--success)' };
  list.innerHTML = tasks.length === 0 ? '<div style="font-size:12px;color:var(--ink-faint);text-align:center;padding:12px">Sin tareas</div>' : '';

  tasks.forEach(t => {
    const elapsedSec = t.elapsed_seconds || 0;
    const eh = Math.floor(elapsedSec / 3600).toString().padStart(2, '0');
    const em = Math.floor((elapsedSec % 3600) / 60).toString().padStart(2, '0');
    const es = (elapsedSec % 60).toString().padStart(2, '0');
    const elapsedStr = elapsedSec > 0 ? ` · ⏱️ ${eh}:${em}:${es}` : '';

    const item = document.createElement('div');
    item.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px;border-radius:8px;background:var(--panel-2);border:1px solid var(--line)';
    item.innerHTML = `
      <span style="font-size:18px">${statusIcons[t.status] || '📋'}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.title}</div>
        <div style="font-size:9px;color:var(--ink-faint)">👷 ${t.worker_name || t.worker_code || '?'} · ${t.zone_name || ''} · ${t.start_time}–${t.end_time}${elapsedStr}</div>
      </div>
      <span style="font-size:9px;font-weight:800;padding:3px 8px;border-radius:6px;color:${statusColors[t.status] || 'var(--ink-faint)'}">${t.status}</span>
      <div style="display:flex;flex-direction:column;gap:2px">
        <button style="font-size:9px;padding:2px 6px;border:1px solid var(--line);border-radius:4px;background:var(--panel);cursor:pointer" onclick="window.adminDeleteTaskForWorker(${t.id})" title="Eliminar del trabajador">🗑️👷</button>
        <button style="font-size:9px;padding:2px 6px;border:1px solid var(--line);border-radius:4px;background:var(--panel);cursor:pointer" onclick="window.adminHideTask(${t.id})" title="Ocultar de mi vista">👁️‍🗨️</button>
      </div>`;
    list.appendChild(item);
  });
};
