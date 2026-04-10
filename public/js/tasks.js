/* ── SENTINEL · Tasks Module ── */
import { state, safeParse, formatCountdown, toast } from './utils.js';
import { apiGet, apiPost, apiPut } from './api.js';

let unlockTimers = [];
let elapsedTimers = [];

export async function loadTaskScreen() {
  await Promise.all([loadCanIStart(), loadTasks(), loadEpiCards()]);
}

async function loadCanIStart() {
  const data = await apiGet(`/api/can-i-start/${state.workerCode}`);
  if (!data) return;
  const el = document.getElementById('canIStart');
  if (!el) return;
  el.className = `can-i-start ${data.status}`;
  el.innerHTML = `
    <div class="cis-icon">${data.icon}</div>
    <div>
      <div class="cis-title ${data.status}">${data.status === 'ready' ? '¿PUEDO EMPEZAR? — SÍ' : data.status === 'wait' ? '¿PUEDO EMPEZAR? — ESPERA' : '¿PUEDO EMPEZAR? — NO'}</div>
      <div class="cis-reason">${data.reason}</div>
    </div>`;
}

async function loadTasks() {
  const tasks = await apiGet(`/api/tasks/${state.workerCode}`);
  if (!tasks) return;
  const container = document.getElementById('taskList');
  if (!container) return;

  // Clear old timers
  unlockTimers.forEach(t => clearInterval(t));
  unlockTimers = [];
  elapsedTimers.forEach(t => clearInterval(t));
  elapsedTimers = [];

  container.innerHTML = '';
  tasks.forEach(t => {
    const epi = safeParse(t.epi_required);
    const controls = safeParse(t.critical_controls);
    const colorMap = { low: 'var(--success)', medium: 'var(--amber)', high: 'var(--danger)' };
    const statusLabel = { 'in-progress': '🔄 En curso', scheduled: '📋 Programada', completed: '✅ Completada' };
    const totalChecks = controls.length;

    // Build action buttons based on status
    let actionButtons = '';
    if (!t.locked && t.status === 'scheduled') {
      actionButtons = `<div class="tp-actions"><button class="task-action-btn start" id="startBtn-${t.id}" onclick="window.startTask(${t.id})" ${totalChecks > 0 ? 'disabled style="opacity:.4;pointer-events:none"' : ''}>▶️ Iniciar Tarea</button>${totalChecks > 0 ? `<div class="tp-check-hint" id="checkHint-${t.id}">Marca todos los controles para iniciar</div>` : ''}</div>`;
    } else if (t.status === 'in-progress') {
      actionButtons = `
        <div class="task-elapsed" id="elapsed-${t.id}">⏱️ 00:00:00</div>
        <div class="tp-actions"><button class="task-action-btn complete" onclick="window.completeTask(${t.id})">✅ Finalizar Tarea</button></div>`;
    } else if (t.status === 'completed') {
      const elapsedSec = t.elapsed_seconds || 0;
      const eh = Math.floor(elapsedSec / 3600).toString().padStart(2, '0');
      const em = Math.floor((elapsedSec % 3600) / 60).toString().padStart(2, '0');
      const es = (elapsedSec % 60).toString().padStart(2, '0');
      actionButtons = `
        <div class="task-elapsed" style="color:var(--success)">✅ Tiempo total: ${eh}:${em}:${es}</div>
        <div class="tp-actions"><button class="task-action-btn delete" onclick="window.deleteTask(${t.id})">🗑️ Eliminar Tarea</button></div>`;
    }

    const panel = document.createElement('div');
    panel.className = `task-detail`;
    panel.innerHTML = `
      <div class="task-panel ${t.locked ? 'locked' : ''} ${t.status === 'in-progress' ? 'active-task' : ''}" style="position:relative" data-task-id="${t.id}">
        <div class="tp-header">
          <div class="tp-color" style="background:${colorMap[t.risk_level] || 'var(--blue)'}"></div>
          <div class="tp-info">
            <div class="tp-title">${t.title}</div>
            <div class="tp-loc">📍 ${t.zone_name || 'Zona'} · ${t.permit_code ? 'PT ' + t.permit_code : 'Sin permiso'}</div>
            <div class="tp-time">🕒 ${t.start_time} — ${t.end_time} · ${statusLabel[t.status] || t.status}</div>
            ${t.locked ? `<div class="tp-unlock-badge" id="unlock-${t.id}">🔒 Disponible en ${formatCountdown(t.unlock_remaining_ms)}</div>` : ''}
          </div>
        </div>
        ${!t.locked && epi.length ? `
        <div class="tp-section">
          <div class="tp-section-title">🦺 EPI Requerido</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${epi.map(e => `<span style="padding:4px 10px;border-radius:8px;background:var(--panel-2);font-size:11px;font-weight:700;border:1px solid var(--line)">${e}</span>`).join('')}
          </div>
        </div>` : ''}
        ${!t.locked && controls.length && t.status !== 'completed' ? `
        <div class="tp-section tp-checks" data-task-id="${t.id}" data-total="${totalChecks}">
          <div class="tp-section-title">🔒 Controles Críticos</div>
          ${controls.map(c => `
            <div class="check-item" onclick="this.classList.toggle('checked'); window.checkTaskControls(${t.id})">
              <div class="check-box">✓</div>
              <span>${c}</span>
            </div>`).join('')}
        </div>` : ''}
        ${!t.locked && t.description ? `
        <div class="tp-section">
          <div style="font-size:12px;color:var(--ink-soft);line-height:1.6">${t.description}</div>
        </div>` : ''}
        ${actionButtons || ''}
      </div>`;
    container.appendChild(panel);

    // Elapsed timer for in-progress tasks
    if (t.status === 'in-progress' && t.started_at) {
      const elapsedEl = panel.querySelector(`#elapsed-${t.id}`);
      if (elapsedEl) {
        const startTime = new Date(t.started_at + 'Z').getTime();
        const updateElapsed = () => {
          const diff = Date.now() - startTime;
          const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
          const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
          const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
          elapsedEl.textContent = `⏱️ ${h}:${m}:${s}`;
        };
        updateElapsed();
        elapsedTimers.push(setInterval(updateElapsed, 1000));
      }
    }

    // Countdown timer for locked tasks
    if (t.locked && t.unlock_remaining_ms > 0) {
      const badge = panel.querySelector(`#unlock-${t.id}`);
      const taskPanel = panel.querySelector('.task-panel');
      let remaining = t.unlock_remaining_ms;
      const timer = setInterval(() => {
        remaining -= 1000;
        if (remaining <= 0) {
          clearInterval(timer);
          if (taskPanel) taskPanel.classList.remove('locked');
          if (badge) badge.remove();
          toast('🔓 Nueva tarea disponible');
          loadTasks(); // Refresh
        } else if (badge) {
          badge.textContent = `🔒 Disponible en ${formatCountdown(remaining)}`;
        }
      }, 1000);
      unlockTimers.push(timer);
    }
  });
}

async function loadEpiCards() {
  const epiData = await apiGet('/api/epi');
  if (!epiData) return;
  const grid = document.getElementById('epiGrid');
  if (!grid) return;

  // Get required EPI from current task
  const tasks = await apiGet(`/api/tasks/${state.workerCode}`);
  const activeTasks = (tasks || []).filter(t => !t.locked && t.status !== 'completed');
  const required = new Set();
  activeTasks.forEach(t => {
    safeParse(t.epi_required).forEach(e => required.add(e.toLowerCase()));
  });

  grid.innerHTML = '';
  epiData.forEach(epi => {
    const isRequired = required.has(epi.epi_name.toLowerCase());
    const card = document.createElement('div');
    card.className = `epi-card-v2 ${isRequired ? 'critical' : ''}`;
    card.onclick = () => openEpiDetail(epi);
    card.innerHTML = `
      <div class="epi-v2-img">
        <img src="${epi.image}" alt="${epi.epi_name}" onerror="this.parentElement.textContent='🦺'">
      </div>
      <div class="epi-v2-body">
        <div class="epi-v2-label">${epi.epi_name}</div>
        ${isRequired ? '<div class="epi-v2-tag">REQUERIDO</div>' : ''}
      </div>`;
    grid.appendChild(card);
  });
}

function openEpiDetail(epi) {
  const modal = document.getElementById('epiDetailModal');
  if (!modal) return;
  const body = modal.querySelector('.modal-sheet');
  body.innerHTML = `
    <div class="modal-handle"></div>
    <div style="text-align:center;margin-bottom:16px">
      <div style="width:80px;height:80px;margin:0 auto 12px;border-radius:20px;background:var(--panel-2);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;overflow:hidden">
        <img src="${epi.image}" alt="${epi.epi_name}" style="width:70%;height:70%;object-fit:contain" onerror="this.parentElement.textContent='🦺'">
      </div>
      <h3 style="margin-bottom:4px">${epi.epi_name}</h3>
    </div>
    <div style="background:var(--panel-2);border-radius:var(--radius-sm);padding:14px;margin-bottom:14px">
      <div style="font-size:11px;font-weight:800;color:var(--ink-faint);text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px">📍 DÓNDE ENCONTRARLO</div>
      <div style="font-size:13px;font-weight:700;color:var(--ink);margin-bottom:4px">${epi.location}</div>
      <div style="font-size:11px;color:var(--ink-soft)">Zona: ${epi.zone_code || '—'}</div>
    </div>
    <div style="background:var(--panel-2);border-radius:var(--radius-sm);padding:14px;margin-bottom:14px">
      <div style="font-size:11px;font-weight:800;color:var(--ink-faint);text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px">ℹ️ INFORMACIÓN</div>
      <div style="font-size:12px;color:var(--ink-soft);line-height:1.6">
        Última actualización: ${epi.updated_at || '—'}<br>
        ID: ${epi.id}
      </div>
    </div>
    <label class="hazard-photo-upload" style="margin-bottom:14px">
      📷 Subir foto del EPI
      <input type="file" accept="image/*" capture="environment" onchange="window.uploadEpiPhoto(${epi.id}, this)">
    </label>
    <button class="modal-close" onclick="window.closeModal('epiDetailModal')">Cerrar</button>`;
  modal.classList.add('active');
}

window.uploadEpiPhoto = function(epiId, input) {
  const file = input.files[0];
  if (!file) return;
  toast('Foto de EPI guardada');
};

// ── Admin: preload demo tasks ──
export async function preloadDemoTasks() {
  const data = await apiPost('/api/admin/preload-demo', { worker_code: 'JL' });
  if (data?.ok) {
    toast('✅ 3 tareas demo creadas (1min, 2h, 4h)');
    loadTasks();
  }
}
