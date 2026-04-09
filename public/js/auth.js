/* ── SENTINEL · Auth Module ── */
import { apiPost, apiGet } from './api.js';
import { state, toast } from './utils.js';

export function getStoredUser() {
  try {
    const u = localStorage.getItem('sentinel_user');
    return u ? JSON.parse(u) : null;
  } catch { return null; }
}

export function isLoggedIn() {
  return !!localStorage.getItem('sentinel_token') && !!getStoredUser();
}

export async function handleLogin(username, password) {
  const errEl = document.getElementById('loginError');
  if (errEl) errEl.textContent = '';
  
  if (!username || !password) {
    if (errEl) errEl.textContent = 'Introduce usuario y contraseña';
    return false;
  }
  
  try {
    const data = await apiPost('/api/login', { username, password });
    if (!data || data.error) {
      if (errEl) errEl.textContent = data?.error || 'Credenciales inválidas';
      return false;
    }
    
    localStorage.setItem('sentinel_token', data.token);
    localStorage.setItem('sentinel_user', JSON.stringify(data.user));
    applyUser(data.user);
    return true;
  } catch (e) {
    if (errEl) errEl.textContent = 'Error de conexión';
    return false;
  }
}

export function applyUser(user) {
  state.currentUser = user;
  state.workerCode = user.worker_code;
  state.isAdmin = user.role === 'admin';
  
  // Update worker card
  const nameEl = document.getElementById('workerName');
  const roleEl = document.getElementById('workerRole');
  if (nameEl) nameEl.textContent = user.name;
  if (roleEl) roleEl.textContent = state.isAdmin ? 'Supervisor · Moeve Energy' : 'Tubero · MASA Industrial S.L.';
  
  // Show/hide admin elements
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = state.isAdmin ? '' : 'none';
  });
  
  // Update avatar
  const avatarEl = document.getElementById('workerAvatar');
  if (avatarEl) avatarEl.textContent = user.worker_code;
  
  // Admin badge
  const badge = document.getElementById('adminBadge');
  if (badge) badge.style.display = state.isAdmin ? 'inline-flex' : 'none';
}

export function logout() {
  localStorage.removeItem('sentinel_token');
  localStorage.removeItem('sentinel_user');
  state.currentUser = null;
  state.isAdmin = false;
  window.location.reload();
}

export async function checkSession() {
  const user = getStoredUser();
  if (!user) return false;
  try {
    const data = await apiGet('/api/auth/me');
    if (data && !data.error) {
      applyUser(data);
      return true;
    }
    localStorage.removeItem('sentinel_token');
    localStorage.removeItem('sentinel_user');
    return false;
  } catch {
    // Offline: trust local storage
    applyUser(user);
    return true;
  }
}
