const express = require('express');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/logos', express.static(path.join(__dirname, 'logos')));

// ── Database setup ──
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
const db = new Database(path.join(dataDir, 'sentinel.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ──
db.exec(`
  CREATE TABLE IF NOT EXISTS workers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    company TEXT NOT NULL,
    team TEXT NOT NULL,
    photo_url TEXT,
    current_zone TEXT,
    pos_x REAL DEFAULT 50,
    pos_y REAL DEFAULT 50,
    status TEXT DEFAULT 'active',
    briefing_completed INTEGER DEFAULT 0,
    epi_verified INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    max_capacity INTEGER DEFAULT 25,
    current_people INTEGER DEFAULT 0,
    risk_level TEXT DEFAULT 'low',
    lat REAL,
    lng REAL,
    pos_x REAL DEFAULT 50,
    pos_y REAL DEFAULT 50
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    zone_id INTEGER REFERENCES zones(id),
    worker_id INTEGER REFERENCES workers(id),
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    permit_code TEXT,
    risk_level TEXT DEFAULT 'low',
    status TEXT DEFAULT 'scheduled',
    epi_required TEXT,
    critical_controls TEXT,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS hazards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    zone_id INTEGER REFERENCES zones(id),
    distance_m REAL,
    direction TEXT,
    severity TEXT DEFAULT 'medium',
    action_required TEXT,
    company TEXT,
    start_time TEXT,
    end_time TEXT,
    lat REAL,
    lng REAL,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id INTEGER REFERENCES workers(id),
    type TEXT NOT NULL,
    description TEXT,
    zone_id INTEGER REFERENCES zones(id),
    category TEXT,
    status TEXT DEFAULT 'sent',
    media_type TEXT,
    ai_summary TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS simops_conflicts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    zone_id INTEGER REFERENCES zones(id),
    severity TEXT DEFAULT 'critical',
    status TEXT DEFAULT 'active',
    ai_suggestion TEXT,
    impact TEXT,
    affected_workers INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    zone_code TEXT,
    risk_category TEXT,
    date_occurred TEXT,
    pattern_match TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS escape_routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    zone_id INTEGER REFERENCES zones(id),
    muster_point TEXT NOT NULL,
    distance_m INTEGER,
    route_description TEXT,
    route_clear INTEGER DEFAULT 1,
    dest_lat REAL,
    dest_lng REAL,
    waypoints TEXT
  );

  CREATE TABLE IF NOT EXISTS semaphore_state (
    id INTEGER PRIMARY KEY,
    level TEXT DEFAULT 'yellow',
    title TEXT,
    subtitle TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

// ── Seed data ──
const workerCount = db.prepare('SELECT COUNT(*) as c FROM workers').get().c;
if (workerCount === 0) {
  // Zones (with GPS coords for San Roque refinery)
  const insertZone = db.prepare('INSERT INTO zones (code, name, description, max_capacity, current_people, risk_level, lat, lng, pos_x, pos_y) VALUES (?,?,?,?,?,?,?,?,?,?)');
  insertZone.run('H-100', 'Horno H-100', 'Horno principal — Niveles 1-3', 30, 24, 'critical', 36.1965, -5.3848, 34, 27);
  insertZone.run('RACK-N', 'Rack Eléctrico Norte', 'Subestación 66kV — Bahías 1-4', 15, 12, 'warning', 36.1970, -5.3817, 62, 18);
  insertZone.run('TK-123', 'Tanque TK-123', 'Almacenamiento crudo — Interior y boquillas', 10, 8, 'critical', 36.1953, -5.3811, 67, 45);
  insertZone.run('C-201', 'Columna C-201', 'Destilación atmosférica — Niveles 3-8', 20, 14, 'low', 36.1960, -5.3830, 50, 35);
  insertZone.run('PIPE-S', 'Pipe Rack Sur', 'Líneas de proceso — Tramos 3-6', 25, 18, 'warning', 36.1940, -5.3839, 42, 65);
  insertZone.run('TALLER', 'Taller Mecánico', 'Nave 2 — Prefabricación', 40, 6, 'low', 36.1951, -5.3852, 30, 48);

  // Workers
  const insertWorker = db.prepare('INSERT INTO workers (code, name, role, company, team, current_zone, pos_x, pos_y, briefing_completed, epi_verified) VALUES (?,?,?,?,?,?,?,?,?,?)');
  insertWorker.run('JL', 'José Luis Martínez', 'Tubero', 'MASA Industrial S.L.', 'Equipo B3', 'H-100', 50, 50, 1, 1);
  insertWorker.run('AR', 'Ahmed Raza', 'Soldador', 'Técnicas Reunidas', 'Equipo A1', 'H-100', 68, 26, 1, 1);
  insertWorker.run('PS', 'Pedro Sánchez', 'Op. Grúa', 'Grúas del Sur', 'Grúas', 'H-100', 44, 14, 1, 1);
  insertWorker.run('ML', 'María López', 'Vigía', 'MASA Industrial S.L.', 'Equipo A2', 'TK-123', 12, 55, 1, 1);
  insertWorker.run('FC', 'Francisco Castro', 'Electricista', 'Eléctrica Sur', 'Equipo E1', 'RACK-N', 60, 20, 1, 1);
  insertWorker.run('IG', 'Isabel García', 'Inspectora', 'Bureau Veritas', 'Inspección', 'C-201', 35, 65, 1, 1);

  // Tasks for JL
  const insertTask = db.prepare('INSERT INTO tasks (title, type, zone_id, worker_id, start_time, end_time, permit_code, risk_level, status, epi_required, critical_controls, description) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
  insertTask.run('Preparación andamio H-100 Nivel 2', 'mechanical', 1, 1, '06:30', '08:00', 'PT-2026-04812', 'medium', 'in-progress',
    JSON.stringify(['Casco','Guantes','Botas S3','Arnés']),
    JSON.stringify(['Andamio certificado con tag verde','Arnés anclado a línea de vida']),
    'Montaje y verificación de plataforma de trabajo en cara norte del horno.');
  insertTask.run('Corte y preparación de spool', 'mechanical', 1, 1, '08:15', '12:00', 'PT-2026-04815', 'high', 'scheduled',
    JSON.stringify(['Casco','Guantes anticorte','Botas S3','Arnés','Protección auditiva','Respirador ABE1']),
    JSON.stringify(['Permiso de trabajo activo y firmado','LOTO verificado en línea 6" (tag #4812)','Malla anticaída de objetos instalada','Andamio certificado con tag verde','Arnés anclado a línea de vida','Zona despejada de izado (08:15)']),
    'Corte y preparación de spool en línea 6" de entrada al horno H-100.');
  insertTask.run('Prefabricación spool en taller', 'mechanical', 6, 1, '12:30', '14:00', null, 'low', 'scheduled',
    JSON.stringify(['Casco','Guantes','Gafas']),
    JSON.stringify([]),
    'Trabajo de taller sin riesgos especiales.');

  // Hazards (with GPS positions)
  const insertHazard = db.prepare('INSERT INTO hazards (type, title, description, zone_id, distance_m, direction, severity, action_required, company, start_time, end_time, lat, lng) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
  insertHazard.run('hot_work', 'Soldadura TIG — Carcasa horno', 'Gases Cr⁶⁺/Mn. Viento NE 12km/h → dispersión hacia posición de trabajo. Radiación UV — no mirar arco sin protección.', 1, 8, 'NE ↗', 'high', 'Respirador ABE1 obligatorio entre 08:00–10:00. Si hueles gas → evacúa por escalera oeste, radio canal 7.', 'Técnicas Reunidas', '08:00', '10:00', 36.1968, -5.3843);
  insertHazard.run('crane', 'Izado tubos — Grúa 40T', 'Zona exclusión 15m activa. Nivel 3 bloqueado hasta finalización.', 1, 15, 'N ↑', 'high', 'No subir a Nivel 3 ni usar escalera norte hasta 08:15.', 'Grúas del Sur', '06:00', '08:15', 36.1972, -5.3848);
  insertHazard.run('confined_space', 'Espacio confinado — Interior horno', 'Vigía activo. Atmósfera monitorizada: O₂ 20.9%, LEL 0%, H₂S 0 ppm.', 1, 22, 'O ←', 'low', 'Sin interferencia con tu tarea. Si escuchas alarma de gas desde interior → no acercarte, radio canal 7.', 'MASA Industrial', '08:00', '12:00', 36.1965, -5.3858);
  insertHazard.run('electrical', 'Línea 6" aislada (LOTO #4812)', 'Bloqueo activo verificado. No retirar barrera ni candado bajo ningún concepto.', 1, 0, '—', 'info', 'No retirar barrera.', 'MASA Industrial', '06:00', '14:00', 36.1965, -5.3848);

  // Escape route (with GPS waypoints)
  db.prepare('INSERT INTO escape_routes (zone_id, muster_point, distance_m, route_description, route_clear, dest_lat, dest_lng, waypoints) VALUES (?,?,?,?,?,?,?,?)').run(
    1, 'Punto de reunión 3', 120, 'Escalera Oeste → Pasarela B → Punto reunión 3', 1,
    36.1929, -5.3843,
    JSON.stringify([[36.1961,-5.3852],[36.1953,-5.3852],[36.1945,-5.3850],[36.1938,-5.3845]])
  );

  // Semaphore
  db.prepare('INSERT INTO semaphore_state (id, level, title, subtitle) VALUES (1, ?, ?, ?)').run('yellow', 'PRECAUCIÓN — 2 riesgos activos en tu zona', 'Hot work a 8m · Izado a 15m');

  // Reports
  const insertReport = db.prepare('INSERT INTO reports (worker_id, type, description, zone_id, category, status, media_type, ai_summary, created_at) VALUES (?,?,?,?,?,?,?,?,?)');
  insertReport.run(1, 'near_miss', 'Malla anticaída suelta en esquina NE del Nivel 2', 1, 'Trabajo en altura', 'resolved', 'text', null, "2026-04-08 15:30:00");
  insertReport.run(1, 'photo', 'Andamio sin tag de certificación visible', 4, 'Andamios', 'resolved', 'photo', null, "2026-04-07 11:20:00");
  insertReport.run(1, 'voice', null, 5, 'Near Miss', 'processing', 'voice', 'He visto una fuga pequeña en la válvula del tramo 3 del pipe rack sur', "2026-04-07 09:45:00");

  // SIMOPS Conflicts
  const insertConflict = db.prepare('INSERT INTO simops_conflicts (title, description, zone_id, severity, status, ai_suggestion, impact, affected_workers) VALUES (?,?,?,?,?,?,?,?)');
  insertConflict.run('H-100: Soldadura + Confinado', 'Soldadura TIG carcasa (Nivel 2) simultánea con inspección espacio confinado (Interior). Gases de soldadura pueden acumularse en espacio confinado.', 1, 'critical', 'active', 'Mover soldadura al turno de tarde (14:00–16:00). Elimina exposición cruzada y anula patrón del incidente 2024.', 'Riesgo: -62%', 6);
  insertConflict.run('TK-123: Hot work + Personal dentro', 'Restricción absoluta: soldadura boquilla N3 programada mientras equipo de limpieza dentro del tanque. SENTINEL ha bloqueado automáticamente.', 3, 'critical', 'blocked', 'Secuenciar: primero salida limpieza (09:00), luego boquilla (10:00).', 'Riesgo ELIMINADO', 4);
  insertConflict.run('Pipe Rack: Densidad 38 personas', '38 personas de 5 empresas en radio de 50m durante corte + soldadura. Supera límite de 25 personas/zona con hot work activo.', 5, 'warning', 'active', 'Reubicar insuladores al Tramo 6 (zona despejada).', 'Densidad: -40%', 38);

  // Lessons
  const insertLesson = db.prepare('INSERT INTO lessons (type, title, description, zone_code, risk_category, date_occurred, pattern_match) VALUES (?,?,?,?,?,?,?)');
  insertLesson.run('incident', 'Exposición a gases de soldadura en espacio confinado', 'Dos insuladores sin protección respiratoria compartieron plataforma con soldadores 45 min. Uno evacuado por mareos. Causa raíz: permisos separados sin detección de coactividad.', 'H-100', 'coactivity', '2024-03-15', 'PATRÓN DETECTADO en plan 2026: H-100, Día 12, 08:00–10:00 — soldadura carcasa + espacio confinado simultáneos. SENTINEL ha propuesto reprogramación.');
  insertLesson.run('near_miss', 'Caída de herramienta desde Nivel 3 del horno', 'Llave de 2kg cayó 8m impactando zona donde minutos antes había personal. No existía malla anticaída de objetos.', 'H-100', 'height', '2024-03-17', 'LECCIÓN INCORPORADA en plan 2026: malla anticaída como tarea previa obligatoria.');
  insertLesson.run('near_miss', 'Soldadura en boquilla con personal dentro del tanque', 'Se inició soldadura en boquilla N3 sin verificar salida del equipo interior. Vigía detectó y paralizó. 4 personas dentro 8 min con soldadura activa.', 'TK-123', 'confined_space', '2024-03-21', 'PATRÓN DETECTADO en plan 2026: TK-123, Día 12, 09:00–10:00 — misma configuración. SENTINEL ha bloqueado como restricción absoluta.');
  insertLesson.run('incident', 'Sobrecarga de personal en zona de corte', '42 personas de 5 empresas en 30m radio. Conato de emergencia por fuga N₂ gestionado caóticamente.', 'PIPE-S', 'coactivity', '2024-03-25', 'PATRÓN DETECTADO en plan 2026: Pipe Rack Sur, Día 12, 07:00–09:00 — densidad de 38 personas prevista. SENTINEL propone redistribución.');
  insertLesson.run('improvement', 'Protocolo de control de densidad por zona', 'Máximo 25 personas/zona 50m radio con hot work. Implementado en procedimiento pero sin monitorización digital.', 'GENERAL', 'coactivity', '2024-04-01', 'SENTINEL integra este protocolo: monitorización automática de densidad vía tags UWB.');
}

// ─── API Routes ───

// Worker info
app.get('/api/worker/:code', (req, res) => {
  const worker = db.prepare('SELECT * FROM workers WHERE code = ?').get(req.params.code);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });
  res.json(worker);
});

// All workers with zone info
app.get('/api/workers', (req, res) => {
  const workers = db.prepare(`
    SELECT w.*, z.name as zone_name, z.risk_level as zone_risk
    FROM workers w LEFT JOIN zones z ON w.current_zone = z.code
  `).all();
  res.json(workers);
});

// Semaphore state
app.get('/api/semaphore', (req, res) => {
  const state = db.prepare('SELECT * FROM semaphore_state WHERE id = 1').get();
  const activeHazards = db.prepare('SELECT COUNT(*) as c FROM hazards WHERE active = 1 AND severity IN (?, ?)').get('high', 'critical');
  res.json({ ...state, active_hazard_count: activeHazards.c });
});

app.put('/api/semaphore', (req, res) => {
  const { level, title, subtitle } = req.body;
  if (!level) return res.status(400).json({ error: 'level required' });
  db.prepare('UPDATE semaphore_state SET level=?, title=?, subtitle=?, updated_at=datetime("now") WHERE id=1').run(level, title, subtitle);
  res.json({ ok: true });
});

// Hazards for a zone
app.get('/api/hazards', (req, res) => {
  const { zone_id, active } = req.query;
  let query = 'SELECT h.*, z.code as zone_code, z.name as zone_name FROM hazards h LEFT JOIN zones z ON h.zone_id = z.id WHERE 1=1';
  const params = [];
  if (zone_id) { query += ' AND h.zone_id = ?'; params.push(zone_id); }
  if (active !== undefined) { query += ' AND h.active = ?'; params.push(active === 'true' ? 1 : 0); }
  query += ' ORDER BY h.severity DESC, h.distance_m ASC';
  res.json(db.prepare(query).all(...params));
});

// Tasks for a worker
app.get('/api/tasks/:worker_code', (req, res) => {
  const worker = db.prepare('SELECT id FROM workers WHERE code = ?').get(req.params.worker_code);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });
  const tasks = db.prepare(`
    SELECT t.*, z.code as zone_code, z.name as zone_name
    FROM tasks t LEFT JOIN zones z ON t.zone_id = z.id
    WHERE t.worker_id = ? ORDER BY t.start_time
  `).all(worker.id);
  res.json(tasks);
});

app.put('/api/tasks/:id/status', (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'status required' });
  db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ ok: true });
});

// Zones
app.get('/api/zones', (req, res) => {
  const zones = db.prepare('SELECT * FROM zones ORDER BY risk_level DESC').all();
  res.json(zones);
});

app.put('/api/zones/:id/people', (req, res) => {
  const { count } = req.body;
  if (count === undefined) return res.status(400).json({ error: 'count required' });
  db.prepare('UPDATE zones SET current_people = ? WHERE id = ?').run(count, req.params.id);
  const zone = db.prepare('SELECT * FROM zones WHERE id = ?').get(req.params.id);
  // Auto-adjust risk level based on capacity
  let risk = 'low';
  if (zone.current_people > zone.max_capacity) risk = 'critical';
  else if (zone.current_people > zone.max_capacity * 0.7) risk = 'warning';
  db.prepare('UPDATE zones SET risk_level = ? WHERE id = ?').run(risk, req.params.id);
  res.json({ ok: true, risk_level: risk });
});

// Reports
app.get('/api/reports/:worker_code', (req, res) => {
  const worker = db.prepare('SELECT id FROM workers WHERE code = ?').get(req.params.worker_code);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });
  const reports = db.prepare(`
    SELECT r.*, z.code as zone_code, z.name as zone_name
    FROM reports r LEFT JOIN zones z ON r.zone_id = z.id
    WHERE r.worker_id = ? ORDER BY r.created_at DESC
  `).all(worker.id);
  res.json(reports);
});

app.post('/api/reports', (req, res) => {
  const { worker_code, type, description, zone_id, media_type } = req.body;
  if (!worker_code || !type) return res.status(400).json({ error: 'worker_code and type required' });
  const worker = db.prepare('SELECT id FROM workers WHERE code = ?').get(worker_code);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

  // Simulate AI categorization
  let category = 'General';
  const desc = (description || '').toLowerCase();
  if (desc.includes('altura') || desc.includes('caída') || desc.includes('andamio')) category = 'Trabajo en altura';
  else if (desc.includes('gas') || desc.includes('fuga') || desc.includes('químico')) category = 'Exposición química';
  else if (desc.includes('fuego') || desc.includes('soldadura') || desc.includes('caliente')) category = 'Trabajo en caliente';
  else if (desc.includes('eléctric') || desc.includes('cable')) category = 'Riesgo eléctrico';
  else if (type === 'near_miss') category = 'Near Miss';

  const result = db.prepare(
    'INSERT INTO reports (worker_id, type, description, zone_id, category, status, media_type, ai_summary, created_at) VALUES (?,?,?,?,?,?,?,?,datetime("now"))'
  ).run(worker.id, type, description, zone_id || null, category, 'sent', media_type || 'text', description);

  res.json({ ok: true, id: result.lastInsertRowid, category });
});

// SIMOPS Conflicts
app.get('/api/simops', (req, res) => {
  const conflicts = db.prepare(`
    SELECT s.*, z.code as zone_code, z.name as zone_name
    FROM simops_conflicts s LEFT JOIN zones z ON s.zone_id = z.id
    ORDER BY CASE s.severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END, s.created_at DESC
  `).all();
  res.json(conflicts);
});

app.put('/api/simops/:id/resolve', (req, res) => {
  db.prepare('UPDATE simops_conflicts SET status = ? WHERE id = ?').run('resolved', req.params.id);
  // Recalculate semaphore
  const activeCount = db.prepare("SELECT COUNT(*) as c FROM simops_conflicts WHERE status IN ('active','blocked')").get().c;
  if (activeCount === 0) {
    db.prepare("UPDATE semaphore_state SET level='green', title='ZONA SEGURA — Sin riesgos activos', subtitle='Todos los conflictos resueltos', updated_at=datetime('now') WHERE id=1").run();
  } else {
    const level = activeCount >= 2 ? 'yellow' : 'yellow';
    db.prepare("UPDATE semaphore_state SET level=?, title=?, subtitle=?, updated_at=datetime('now') WHERE id=1")
      .run(level, `PRECAUCIÓN — ${activeCount} riesgo(s) activo(s)`, 'Conflictos pendientes de resolución');
  }
  res.json({ ok: true, remaining: activeCount });
});

// Escape routes for a zone
app.get('/api/escape/:zone_id', (req, res) => {
  const routes = db.prepare('SELECT * FROM escape_routes WHERE zone_id = ?').all(req.params.zone_id);
  res.json(routes);
});

// Map configuration (GPS bounds for the plant image)
app.get('/api/map-config', (req, res) => {
  res.json({
    bounds: { north: 36.1982, south: 36.1918, west: -5.3886, east: -5.3774 },
    defaultPosition: { lat: 36.1963, lng: -5.3848 },
    image: '/map/planta.png'
  });
});

// Lessons learned
app.get('/api/lessons', (req, res) => {
  const { type, risk_category } = req.query;
  let query = 'SELECT * FROM lessons WHERE 1=1';
  const params = [];
  if (type) { query += ' AND type = ?'; params.push(type); }
  if (risk_category) { query += ' AND risk_category = ?'; params.push(risk_category); }
  query += ' ORDER BY date_occurred DESC';
  res.json(db.prepare(query).all(...params));
});

// Dashboard stats
app.get('/api/dashboard', (req, res) => {
  const activeConflicts = db.prepare("SELECT COUNT(*) as c FROM simops_conflicts WHERE status IN ('active','blocked')").get().c;
  const totalWorkers = db.prepare("SELECT SUM(current_people) as c FROM zones").get().c;
  const activeTasks = db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status IN ('scheduled','in-progress')").get().c;
  const expiredPermits = 0;
  const workersInCritical = db.prepare("SELECT COUNT(*) as c FROM workers w JOIN zones z ON w.current_zone = z.code WHERE z.risk_level = 'critical'").get().c;
  const zones = db.prepare('SELECT * FROM zones ORDER BY risk_level DESC').all();

  res.json({
    active_conflicts: activeConflicts,
    total_workers: totalWorkers,
    active_tasks: activeTasks,
    expired_permits: expiredPermits,
    workers_in_critical: workersInCritical,
    zones
  });
});

// Can I start? logic
app.get('/api/can-i-start/:worker_code', (req, res) => {
  const worker = db.prepare('SELECT * FROM workers WHERE code = ?').get(req.params.worker_code);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

  const tasks = db.prepare(`
    SELECT t.*, z.risk_level as zone_risk
    FROM tasks t LEFT JOIN zones z ON t.zone_id = z.id
    WHERE t.worker_id = ? AND t.status IN ('scheduled','in-progress')
    ORDER BY t.start_time LIMIT 1
  `).all(worker.id);

  const hazards = db.prepare(`
    SELECT * FROM hazards WHERE zone_id = (SELECT id FROM zones WHERE code = ?) AND active = 1 AND severity IN ('high','critical')
  `).all(worker.current_zone);

  const conflicts = db.prepare(`
    SELECT * FROM simops_conflicts WHERE zone_id = (SELECT id FROM zones WHERE code = ?) AND status IN ('active','blocked')
  `).all(worker.current_zone);

  let status = 'ready';
  let reason = 'Todos los controles verificados. Puedes comenzar tu tarea.';
  let icon = '✅';

  if (conflicts.some(c => c.status === 'blocked')) {
    status = 'blocked';
    reason = 'Existe una restricción absoluta activa en tu zona. Contacta con tu supervisor.';
    icon = '🛑';
  } else if (hazards.length > 0) {
    const craneHazard = hazards.find(h => h.type === 'crane');
    if (craneHazard) {
      status = 'wait';
      reason = `Izado activo hasta ${craneHazard.end_time}. Zona de exclusión de ${craneHazard.distance_m}m. Usa acceso alternativo.`;
      icon = '⏳';
    } else if (!worker.briefing_completed) {
      status = 'blocked';
      reason = 'Briefing de seguridad no completado. Completa el briefing antes de acceder a la zona.';
      icon = '🛑';
    } else {
      status = 'ready';
      reason = `Puedes empezar. Atención: ${hazards.length} riesgo(s) activo(s) en tu zona. Aplica medidas indicadas.`;
      icon = '✅';
    }
  }

  res.json({ status, reason, icon, hazard_count: hazards.length, conflict_count: conflicts.length });
});

// Emergency trigger
app.post('/api/emergency', (req, res) => {
  const { worker_code } = req.body;
  db.prepare("UPDATE semaphore_state SET level='red', title='EMERGENCIA ACTIVADA', subtitle='Ubicación enviada · Supervisores notificados', updated_at=datetime('now') WHERE id=1").run();
  // Reset after 30 seconds in production this would trigger real alerts
  setTimeout(() => {
    const current = db.prepare("SELECT level FROM semaphore_state WHERE id=1").get();
    if (current && current.level === 'red') {
      db.prepare("UPDATE semaphore_state SET level='yellow', title='PRECAUCIÓN — 2 riesgos activos en tu zona', subtitle='Hot work a 8m · Izado a 15m', updated_at=datetime('now') WHERE id=1").run();
    }
  }, 30000);
  res.json({ ok: true, message: 'Emergencia activada. Supervisores notificados.' });
});

// Workers in critical zones (for supervisor view)
app.get('/api/workers-critical', (req, res) => {
  const workers = db.prepare(`
    SELECT w.*, z.name as zone_name, z.risk_level as zone_risk, z.code as zone_code
    FROM workers w
    JOIN zones z ON w.current_zone = z.code
    WHERE z.risk_level IN ('critical','warning')
    ORDER BY z.risk_level DESC, w.name
  `).all();
  res.json(workers);
});

// Serve main app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════════════╗`);
  console.log(`  ║  SENTINEL — Copiloto de Seguridad en Campo   ║`);
  console.log(`  ║  http://localhost:${PORT}                       ║`);
  console.log(`  ╚══════════════════════════════════════════════╝\n`);
});
