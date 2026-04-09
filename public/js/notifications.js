/* ── SENTINEL · Notifications Module ── */
import { state, timeAgo } from './utils.js';
import { apiGet } from './api.js';

let pollTimer;

export function startNotifPolling() {
  fetchNotifications();
  pollTimer = setInterval(fetchNotifications, 15000);
}

export function stopNotifPolling() {
  clearInterval(pollTimer);
}

async function fetchNotifications() {
  const notifs = await apiGet('/api/notifications');
  if (!notifs) return;
  state.notifCache = notifs;

  // Update bell dot
  const unread = notifs.filter(n => !state.notifReadIds.has(n.id));
  const dot = document.querySelector('#notifBtn .dot');
  if (dot) dot.style.display = unread.length > 0 ? 'block' : 'none';
}

export function openNotifInbox() {
  const sheet = document.getElementById('notifInbox');
  if (!sheet) return;
  sheet.classList.add('active');
  renderNotifList();
}

export function closeNotifInbox() {
  const sheet = document.getElementById('notifInbox');
  if (sheet) sheet.classList.remove('active');
}

function renderNotifList() {
  const body = document.getElementById('notifInboxBody');
  if (!body) return;

  const notifs = state.notifCache;
  body.innerHTML = '';

  if (notifs.length === 0) {
    body.innerHTML = '<div style="text-align:center;padding:40px;color:var(--ink-faint);font-size:13px">Sin notificaciones</div>';
    return;
  }

  notifs.forEach(n => {
    const isUnread = !state.notifReadIds.has(n.id);
    const iconClass = n.type === 'hazard' ? 'hazard' : n.type === 'conflict' ? 'conflict' : n.type === 'workers' ? 'workers' : 'report';
    const item = document.createElement('div');
    item.className = `notif-inbox-item ${isUnread ? 'unread' : ''}`;
    item.onclick = () => markRead(n.id, item);
    item.innerHTML = `
      <div class="ni-icon ${iconClass}">${n.icon || '📋'}</div>
      <div class="ni-content">
        <div class="ni-title">${n.title}</div>
        <div class="ni-detail">${n.detail || ''}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <div class="ni-time">${n.time ? timeAgo(n.time) : ''}</div>
        ${isUnread ? '<div class="ni-unread-dot"></div>' : ''}
      </div>`;
    body.appendChild(item);
  });
}

function markRead(id, el) {
  state.notifReadIds.add(id);
  localStorage.setItem('sentinel_notif_read', JSON.stringify([...state.notifReadIds]));
  if (el) {
    el.classList.remove('unread');
    const dot = el.querySelector('.ni-unread-dot');
    if (dot) dot.remove();
  }
  // Update bell dot
  const unread = state.notifCache.filter(n => !state.notifReadIds.has(n.id));
  const bellDot = document.querySelector('#notifBtn .dot');
  if (bellDot) bellDot.style.display = unread.length > 0 ? 'block' : 'none';
}

export function markAllRead() {
  state.notifCache.forEach(n => state.notifReadIds.add(n.id));
  localStorage.setItem('sentinel_notif_read', JSON.stringify([...state.notifReadIds]));
  renderNotifList();
  const bellDot = document.querySelector('#notifBtn .dot');
  if (bellDot) bellDot.style.display = 'none';
}
