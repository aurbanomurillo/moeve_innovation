/* ── SENTINEL · Alerts Module ── */
import { state, toast, showBanner } from './utils.js';
import { apiGet, apiPost } from './api.js';

let mediaRecorder, audioChunks = [], recordingTimer, recordSeconds = 0;
let speechRecognition, transcribedText = '';

export async function loadAlertScreen() {
  await loadRecentReports();
}

export function submitReport(type) {
  if (type === 'voice') {
    startVoiceRecording();
    return;
  }
  if (type === 'man_down') {
    triggerEmergency();
    return;
  }

  let desc = '';
  if (type === 'photo') {
    // Open camera
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = await apiPost('/api/reports', {
          worker_code: state.workerCode,
          type: 'photo',
          description: 'Foto reportada desde campo',
          media_type: 'photo',
          media_data: e.target.result,
          lat: state.currentPos.lat,
          lng: state.currentPos.lng
        });
        if (data?.ok) {
          toast('📸 Foto enviada');
          showBanner('📸', 'Foto de seguridad enviada a supervisión');
          loadRecentReports();
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
    return;
  }

  // Text report
  desc = prompt('Describe el hallazgo:') || '';
  if (!desc) return;

  apiPost('/api/reports', {
    worker_code: state.workerCode,
    type: type || 'observation',
    description: desc,
    lat: state.currentPos.lat,
    lng: state.currentPos.lng
  }).then(data => {
    if (data?.ok) {
      toast(`✅ Reporte enviado (${data.category})`);
      showBanner('📋', `Reporte enviado: ${data.category}`);
      loadRecentReports();
    }
  });
}

function startVoiceRecording() {
  const recorder = document.getElementById('voiceRecorder');
  if (!recorder) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    toast('Reconocimiento de voz no disponible en este navegador');
    return;
  }

  recorder.classList.add('active');
  transcribedText = '';
  recordSeconds = 0;

  // Start speech recognition
  speechRecognition = new SpeechRecognition();
  speechRecognition.lang = 'es-ES';
  speechRecognition.continuous = true;
  speechRecognition.interimResults = true;

  const hintEl = recorder.querySelector('.vr-hint');

  speechRecognition.onresult = (event) => {
    let interim = '', final = '';
    for (let i = 0; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        final += event.results[i][0].transcript + ' ';
      } else {
        interim += event.results[i][0].transcript;
      }
    }
    transcribedText = final.trim();
    if (hintEl) hintEl.textContent = transcribedText || interim || 'Escuchando...';
  };

  speechRecognition.onerror = (e) => {
    console.warn('Speech recognition error:', e.error);
    if (e.error === 'no-speech' && hintEl) hintEl.textContent = 'No se detecta voz... habla más fuerte';
  };

  speechRecognition.onend = () => {
    // Restart if still recording (browser may stop it automatically)
    if (recorder.classList.contains('active') && speechRecognition) {
      try { speechRecognition.start(); } catch {}
    }
  };

  speechRecognition.start();

  const timeEl = recorder.querySelector('.vr-time');
  if (hintEl) hintEl.textContent = 'Escuchando...';
  recordingTimer = setInterval(() => {
    recordSeconds++;
    const m = Math.floor(recordSeconds / 60).toString().padStart(2, '0');
    const s = (recordSeconds % 60).toString().padStart(2, '0');
    if (timeEl) timeEl.textContent = `${m}:${s}`;
  }, 1000);
}

export function stopVoiceRecording() {
  clearInterval(recordingTimer);

  if (speechRecognition) {
    speechRecognition.onend = null; // Prevent restart
    speechRecognition.stop();
    speechRecognition = null;
  }

  const recorder = document.getElementById('voiceRecorder');
  if (recorder) recorder.classList.remove('active');

  // Send transcribed text as a report
  const text = transcribedText.trim();
  if (!text) {
    toast('No se detectó texto. Intenta de nuevo.');
    return;
  }

  apiPost('/api/reports', {
    worker_code: state.workerCode,
    type: 'voice',
    description: text,
    media_type: 'voice',
    lat: state.currentPos.lat,
    lng: state.currentPos.lng
  }).then(data => {
    if (data?.ok) {
      toast('🎙️ Audio transcrito y enviado');
      showBanner('🎙️', `Mensaje de voz: "${text.substring(0, 60)}..."`);
      loadRecentReports();
    }
  });
}

async function triggerEmergency() {
  if (!confirm('⚠️ ¿Activar EMERGENCIA? Se notificará a todos los supervisores.')) return;
  const data = await apiPost('/api/emergency', { worker_code: state.workerCode });
  if (data?.ok) {
    showBanner('🆘', 'EMERGENCIA activada. Supervisores notificados.', 8000);
    // Vibrate
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
  }
}

async function loadRecentReports() {
  const reports = await apiGet(`/api/reports/${state.workerCode}`);
  if (!reports) return;
  const container = document.getElementById('recentReports');
  if (!container) return;

  container.innerHTML = '';
  const typeIcons = { near_miss: '⚠️', photo: '📸', voice: '🎙️', observation: '👁️', emergency: '🆘' };

  reports.slice(0, 5).forEach(r => {
    const item = document.createElement('div');
    item.className = 'rr-item';
    item.innerHTML = `
      <div class="rr-icon">${typeIcons[r.type] || '📋'}</div>
      <div class="rr-content">
        <div class="rr-text">${r.description || r.ai_summary || r.type}</div>
        <div class="rr-meta">${r.zone_name || ''} · ${r.category || ''}</div>
      </div>
      <span class="rr-status ${r.status}">${r.status === 'sent' ? 'Enviado' : r.status === 'resolved' ? 'Resuelto' : 'Procesando'}</span>`;
    container.appendChild(item);
  });
}
