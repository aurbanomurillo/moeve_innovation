/* ── SENTINEL · Radio Module ── */
import { state, toast } from './utils.js';
import { apiGet } from './api.js';

export async function openRadioMenu() {
  const sheet = document.getElementById('radioSheet');
  if (!sheet) return;
  sheet.classList.add('active');

  const body = sheet.querySelector('.bottom-sheet-body');
  body.innerHTML = '<div style="text-align:center;padding:20px;color:var(--ink-faint)">Cargando canales...</div>';

  const channels = await apiGet('/api/radio-channels');
  if (!channels) return;

  body.innerHTML = '';
  channels.forEach(ch => {
    const item = document.createElement('div');
    item.className = 'radio-channel-item';
    item.onclick = () => selectChannel(ch);
    const isActive = state.radioChannel === ch.channel_number;
    item.innerHTML = `
      <div class="rc-freq" style="${isActive ? 'background:var(--gradient-brand)' : ''}">${ch.channel_number}</div>
      <div class="rc-info">
        <div class="rc-name">${ch.name} ${isActive ? '📡' : ''}</div>
        <div class="rc-desc">${ch.description || ''}</div>
        ${ch.supervisor ? `<div class="rc-supervisor">👤 ${ch.supervisor}</div>` : ''}
      </div>`;
    body.appendChild(item);
  });
}

function selectChannel(ch) {
  state.radioChannel = ch.channel_number;
  toast(`📻 Canal ${ch.channel_number} — ${ch.name}`);
  const sheet = document.getElementById('radioSheet');
  if (sheet) sheet.classList.remove('active');
}

export function closeRadioMenu() {
  const sheet = document.getElementById('radioSheet');
  if (sheet) sheet.classList.remove('active');
}
