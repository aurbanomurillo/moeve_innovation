/* ── SENTINEL · Chat Module ── */
import { state, timeAgo, toast, AVATAR_COLORS } from './utils.js';
import { apiGet, apiPost } from './api.js';
import { navigateTo } from './map.js';

let typingTimer;

export async function initChat() {
  await loadChatContacts();
  loadChatHistory();
}

async function loadChatContacts() {
  const workers = await apiGet('/api/workers');
  if (!workers) return;
  state.chatWorkers = workers.filter(w => w.code !== state.workerCode);

  const strip = document.getElementById('chatContacts');
  if (!strip) return;

  strip.innerHTML = '';

  // AI contact first
  const ai = document.createElement('div');
  ai.className = `chat-contact ${state.chatTarget === 'SENTINEL_AI' ? 'active' : ''}`;
  ai.onclick = () => switchChatTarget('SENTINEL_AI');
  ai.innerHTML = `
    <div class="cc-avatar ai">🤖</div>
    <div class="cc-name">SENTINEL</div>`;
  strip.appendChild(ai);

  state.chatWorkers.forEach(w => {
    const c = document.createElement('div');
    c.className = `chat-contact ${state.chatTarget === w.code ? 'active' : ''}`;
    c.onclick = () => {
      if (state.chatTarget === w.code) {
        openContactDetail(w);
      } else {
        switchChatTarget(w.code);
      }
    };
    c.innerHTML = `
      <div class="cc-avatar" style="background:${AVATAR_COLORS[w.code] || 'var(--blue)'}">
        ${w.code}
        <span class="cc-online"></span>
      </div>
      <div class="cc-name">${w.name.split(' ')[0]}</div>`;
    strip.appendChild(c);
  });
}

function switchChatTarget(code) {
  state.chatTarget = code;
  // Update UI
  document.querySelectorAll('.chat-contact').forEach(c => c.classList.remove('active'));
  const contacts = document.querySelectorAll('.chat-contact');
  contacts.forEach(c => {
    const name = c.querySelector('.cc-name');
    if ((code === 'SENTINEL_AI' && name?.textContent === 'SENTINEL') ||
        (code !== 'SENTINEL_AI' && c.querySelector('.cc-avatar')?.textContent.trim().startsWith(code))) {
      c.classList.add('active');
    }
  });
  loadChatHistory();
}

function loadChatHistory() {
  const msgs = document.getElementById('chatMessages');
  if (!msgs) return;
  msgs.innerHTML = '';

  const history = state.chatHistory[state.chatTarget] || [];
  history.forEach(m => appendMessage(m.text, m.sent, m.time));
  msgs.scrollTop = msgs.scrollHeight;
}

function appendMessage(text, isSent, time) {
  const msgs = document.getElementById('chatMessages');
  if (!msgs) return;
  const msg = document.createElement('div');
  msg.className = `chat-msg ${isSent ? 'sent' : 'received'}`;
  msg.innerHTML = `
    <div class="chat-msg-bubble">${text}</div>
    <div class="chat-msg-meta">${time || 'ahora'}</div>`;
  msgs.appendChild(msg);
  msgs.scrollTop = msgs.scrollHeight;
}

function showTyping() {
  const msgs = document.getElementById('chatMessages');
  if (!msgs) return;
  let typing = msgs.querySelector('.chat-typing');
  if (!typing) {
    typing = document.createElement('div');
    typing.className = 'chat-typing';
    typing.innerHTML = '<div class="chat-typing-dot"></div><div class="chat-typing-dot"></div><div class="chat-typing-dot"></div>';
    msgs.appendChild(typing);
    msgs.scrollTop = msgs.scrollHeight;
  }
}

function hideTyping() {
  document.querySelectorAll('.chat-typing').forEach(t => t.remove());
}

export async function sendMessage() {
  const input = document.getElementById('chatInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';

  const now = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

  if (!state.chatHistory[state.chatTarget]) state.chatHistory[state.chatTarget] = [];
  state.chatHistory[state.chatTarget].push({ text, sent: true, time: now });
  appendMessage(text, true, now);

  if (state.chatTarget === 'SENTINEL_AI') {
    showTyping();
    try {
      const data = await apiPost('/api/chat', { worker_code: state.workerCode, message: text });
      hideTyping();
      if (data?.response) {
        state.chatHistory[state.chatTarget].push({ text: data.response, sent: false, time: now });
        appendMessage(data.response, false, now);

        // Handle navigation response
        if (data.navigate) {
          navigateTo(data.navigate.lat, data.navigate.lng, data.navigate.name);
        }
      }
    } catch {
      hideTyping();
      appendMessage('Error de conexión', false, now);
    }
  } else {
    // Worker-to-worker message
    await apiPost('/api/messages', { from_code: state.workerCode, to_code: state.chatTarget, message: text });
  }
}

export function sendQuickAction(action) {
  const input = document.getElementById('chatInput');
  if (input) input.value = action;
  sendMessage();
}

function openContactDetail(worker) {
  const sheet = document.getElementById('contactDetailSheet');
  if (!sheet) return;
  sheet.classList.add('active');

  const body = sheet.querySelector('.bottom-sheet-body');
  body.innerHTML = `
    <div class="contact-detail-header">
      <div class="cd-avatar" style="background:${AVATAR_COLORS[worker.code] || 'var(--blue)'}">${worker.code}</div>
      <div class="cd-info">
        <div class="cd-name">${worker.name}</div>
        <div class="cd-role">${worker.role} · ${worker.company}</div>
      </div>
    </div>
    <div class="cd-actions">
      <div class="cd-action-btn primary" onclick="window.switchScreen('chat'); window.closeBSheet('contactDetailSheet')">💬 Chat</div>
      <div class="cd-action-btn" onclick="alert('📞 Llamando a ${worker.name}...')">📞 Llamar</div>
      <div class="cd-action-btn" onclick="window.switchScreen('zone'); window.closeBSheet('contactDetailSheet')">📍 Ubicar</div>
    </div>
    <div class="cd-history-title">Historial de contribuciones</div>
    <div id="contactHistory">Cargando...</div>`;

  // Load history
  apiGet(`/api/worker-history/${worker.code}`).then(data => {
    const hist = document.getElementById('contactHistory');
    if (!hist || !data) return;
    const items = [];
    (data.reports || []).forEach(r => items.push({
      type: '📋 Reporte', desc: r.description || r.category, time: r.created_at
    }));
    (data.tasks || []).forEach(t => items.push({
      type: '📌 Tarea', desc: t.title, time: t.created_at
    }));
    if (data.message_count) items.push({
      type: '💬 Mensajes', desc: `${data.message_count} mensajes enviados`, time: ''
    });

    hist.innerHTML = items.length ? items.slice(0, 8).map(i => `
      <div class="cd-history-item">
        <div class="cd-history-type">${i.type}</div>
        <div class="cd-history-desc">${i.desc || ''}</div>
        ${i.time ? `<div class="cd-history-time">${timeAgo(i.time)}</div>` : ''}
      </div>`).join('') : '<div style="color:var(--ink-faint);font-size:12px">Sin historial</div>';
  });
}
