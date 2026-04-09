const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const app = express();
const PORT = 3000;
const SALT = 'sentinel_moeve_2026';

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/logos', express.static(path.join(__dirname, 'logos')));

// ── Helpers ──
function hashPw(pw) { return crypto.createHash('sha256').update(pw + SALT).digest('hex'); }
function genToken() { return crypto.randomBytes(32).toString('hex'); }

// ── Database ──
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
const db = new Database(path.join(dataDir, 'sentinel.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ──
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    worker_code TEXT,
    name TEXT,
    token TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS workers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    company TEXT NOT NULL,
    team TEXT NOT NULL,
    photo_url TEXT,
    current_zone TEXT,
    pos_x REAL DEFAULT 50, pos_y REAL DEFAULT 50,
    lat REAL, lng REAL,
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
    lat REAL, lng REAL,
    pos_x REAL DEFAULT 50, pos_y REAL DEFAULT 50
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
    unlock_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS hazards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL, title TEXT NOT NULL, description TEXT,
    zone_id INTEGER REFERENCES zones(id),
    distance_m REAL, direction TEXT,
    severity TEXT DEFAULT 'medium',
    action_required TEXT, company TEXT,
    start_time TEXT, end_time TEXT,
    lat REAL, lng REAL,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id INTEGER REFERENCES workers(id),
    type TEXT NOT NULL, description TEXT,
    zone_id INTEGER REFERENCES zones(id),
    category TEXT, status TEXT DEFAULT 'sent',
    media_type TEXT, media_data TEXT,
    lat REAL, lng REAL, ai_summary TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS simops_conflicts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL, description TEXT,
    zone_id INTEGER REFERENCES zones(id),
    severity TEXT DEFAULT 'critical',
    status TEXT DEFAULT 'active',
    ai_suggestion TEXT, impact TEXT,
    affected_workers INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL, title TEXT NOT NULL, description TEXT,
    zone_code TEXT, risk_category TEXT, date_occurred TEXT,
    pattern_match TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS escape_routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    zone_id INTEGER REFERENCES zones(id),
    muster_point TEXT NOT NULL,
    distance_m INTEGER, route_description TEXT,
    route_clear INTEGER DEFAULT 1,
    dest_lat REAL, dest_lng REAL, waypoints TEXT
  );
  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_code TEXT NOT NULL, to_code TEXT NOT NULL,
    message TEXT NOT NULL, is_ai INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS semaphore_state (
    id INTEGER PRIMARY KEY,
    level TEXT DEFAULT 'yellow',
    title TEXT, subtitle TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS epi_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    epi_name TEXT NOT NULL,
    location TEXT NOT NULL,
    zone_code TEXT,
    image TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS app_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    detail TEXT,
    icon TEXT DEFAULT '📋',
    severity TEXT DEFAULT 'info',
    target_role TEXT DEFAULT 'all',
    read_by TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS radio_channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    supervisor TEXT
  );
`);

// ── Seed Data ──
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
if (userCount === 0) {
  // Users
  db.prepare('INSERT INTO users (username, password_hash, role, worker_code, name) VALUES (?,?,?,?,?)').run('USER1', hashPw('userpassword123'), 'user', 'JL', 'José Luis Martínez');
  db.prepare('INSERT INTO users (username, password_hash, role, worker_code, name) VALUES (?,?,?,?,?)').run('ADMIN1', hashPw('adminpassword123'), 'admin', 'MG', 'Miguel García');

  // Zones
  const iZ = db.prepare('INSERT INTO zones (code,name,description,max_capacity,current_people,risk_level,lat,lng,pos_x,pos_y) VALUES (?,?,?,?,?,?,?,?,?,?)');
  iZ.run('H-100','Horno H-100','Horno principal — Niveles 1-3',30,24,'critical',36.1965,-5.3848,34,27);
  iZ.run('RACK-N','Rack Eléctrico Norte','Subestación 66kV — Bahías 1-4',15,12,'warning',36.1970,-5.3817,62,18);
  iZ.run('TK-123','Tanque TK-123','Almacenamiento crudo — Interior y boquillas',10,8,'critical',36.1953,-5.3811,67,45);
  iZ.run('C-201','Columna C-201','Destilación atmosférica — Niveles 3-8',20,14,'low',36.1960,-5.3830,50,35);
  iZ.run('PIPE-S','Pipe Rack Sur','Líneas de proceso — Tramos 3-6',25,18,'warning',36.1940,-5.3839,42,65);
  iZ.run('TALLER','Taller Mecánico','Nave 2 — Prefabricación',40,6,'low',36.1951,-5.3852,30,48);

  // Workers
  const iW = db.prepare('INSERT INTO workers (code,name,role,company,team,current_zone,pos_x,pos_y,lat,lng,briefing_completed,epi_verified) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
  iW.run('JL','José Luis Martínez','Tubero','MASA Industrial S.L.','Equipo B3','H-100',50,50,36.1963,-5.3848,1,1);
  iW.run('AR','Ahmed Raza','Soldador','Técnicas Reunidas','Equipo A1','H-100',68,26,36.1967,-5.3843,1,1);
  iW.run('PS','Pedro Sánchez','Op. Grúa','Grúas del Sur','Grúas','H-100',44,14,36.1971,-5.3851,1,1);
  iW.run('ML','María López','Vigía','MASA Industrial S.L.','Equipo A2','TK-123',12,55,36.1954,-5.3813,1,1);
  iW.run('FC','Francisco Castro','Electricista','Eléctrica Sur','Equipo E1','RACK-N',60,20,36.1971,-5.3819,1,1);
  iW.run('IG','Isabel García','Inspectora','Bureau Veritas','Inspección','C-201',35,65,36.1960,-5.3831,1,1);
  iW.run('MG','Miguel García','Supervisor','Moeve Energy','Supervisión','H-100',40,30,36.1964,-5.3845,1,1);

  // Tasks for JL (with unlock_at for timed demo)
  const iT = db.prepare('INSERT INTO tasks (title,type,zone_id,worker_id,start_time,end_time,permit_code,risk_level,status,epi_required,critical_controls,description,unlock_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
  iT.run('Preparación andamio H-100 Nivel 2','mechanical',1,1,'06:30','08:00','PT-2026-04812','medium','in-progress',
    JSON.stringify(['Casco','Guantes','Botas S3','Arnés']),
    JSON.stringify(['Andamio certificado con tag verde','Arnés anclado a línea de vida']),
    'Montaje y verificación de plataforma de trabajo en cara norte del horno.', null);
  iT.run('Corte y preparación de spool','mechanical',1,1,'08:15','12:00','PT-2026-04815','high','scheduled',
    JSON.stringify(['Casco','Guantes anticorte','Botas S3','Arnés','Protección auditiva','Respirador ABE1','Gafas']),
    JSON.stringify(['Permiso de trabajo activo y firmado','LOTO verificado en línea 6" (tag #4812)','Malla anticaída de objetos instalada','Andamio certificado con tag verde','Arnés anclado a línea de vida','Zona despejada de izado (08:15)']),
    'Corte y preparación de spool en línea 6" de entrada al horno H-100.', null);
  iT.run('Prefabricación spool en taller','mechanical',6,1,'12:30','14:00',null,'low','scheduled',
    JSON.stringify(['Casco','Guantes','Gafas']),
    JSON.stringify([]),
    'Trabajo de taller sin riesgos especiales.', null);

  // Hazards
  const iH = db.prepare('INSERT INTO hazards (type,title,description,zone_id,distance_m,direction,severity,action_required,company,start_time,end_time,lat,lng) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
  iH.run('hot_work','Soldadura TIG — Carcasa horno','Gases Cr⁶⁺/Mn. Viento NE 12km/h → dispersión hacia posición de trabajo.',1,8,'NE ↗','high','Respirador ABE1 obligatorio entre 08:00–10:00. Si hueles gas → evacúa por escalera oeste, radio canal 7.','Técnicas Reunidas','08:00','10:00',36.1968,-5.3843);
  iH.run('crane','Izado tubos — Grúa 40T','Zona exclusión 15m activa. Nivel 3 bloqueado hasta finalización.',1,15,'N ↑','high','No subir a Nivel 3 ni usar escalera norte hasta 08:15.','Grúas del Sur','06:00','08:15',36.1972,-5.3848);
  iH.run('confined_space','Espacio confinado — Interior horno','Vigía activo. Atmósfera monitorizada: O₂ 20.9%, LEL 0%, H₂S 0 ppm.',1,22,'O ←','low','Sin interferencia con tu tarea. Si escuchas alarma de gas desde interior → no acercarte, radio canal 7.','MASA Industrial','08:00','12:00',36.1965,-5.3858);
  iH.run('electrical','Línea 6" aislada (LOTO #4812)','Bloqueo activo verificado.',1,0,'—','info','No retirar barrera.','MASA Industrial','06:00','14:00',36.1965,-5.3848);

  // Escape route
  db.prepare('INSERT INTO escape_routes (zone_id,muster_point,distance_m,route_description,route_clear,dest_lat,dest_lng,waypoints) VALUES (?,?,?,?,?,?,?,?)').run(
    1,'Punto de reunión 3',120,'Escalera Oeste → Pasarela B → Punto reunión 3',1,36.1929,-5.3843,
    JSON.stringify([[36.1961,-5.3852],[36.1953,-5.3852],[36.1945,-5.3850],[36.1938,-5.3845]]));

  // Semaphore
  db.prepare('INSERT INTO semaphore_state (id,level,title,subtitle) VALUES (1,?,?,?)').run('yellow','PRECAUCIÓN — 2 riesgos activos en tu zona','Hot work a 8m · Izado a 15m');

  // Reports
  const iR = db.prepare('INSERT INTO reports (worker_id,type,description,zone_id,category,status,media_type,ai_summary,created_at) VALUES (?,?,?,?,?,?,?,?,?)');
  iR.run(1,'near_miss','Malla anticaída suelta en esquina NE del Nivel 2',1,'Trabajo en altura','resolved','text',null,'2026-04-08 15:30:00');
  iR.run(1,'photo','Andamio sin tag de certificación visible',4,'Andamios','resolved','photo',null,'2026-04-07 11:20:00');
  iR.run(1,'voice',null,5,'Near Miss','processing','voice','He visto una fuga pequeña en la válvula del tramo 3 del pipe rack sur','2026-04-07 09:45:00');

  // SIMOPS Conflicts
  const iC = db.prepare('INSERT INTO simops_conflicts (title,description,zone_id,severity,status,ai_suggestion,impact,affected_workers) VALUES (?,?,?,?,?,?,?,?)');
  iC.run('H-100: Soldadura + Confinado','Soldadura TIG carcasa (Nivel 2) simultánea con inspección espacio confinado.',1,'critical','active','Mover soldadura al turno de tarde (14:00–16:00).','Riesgo: -62%',6);
  iC.run('TK-123: Hot work + Personal dentro','Restricción absoluta: soldadura boquilla N3 programada mientras equipo de limpieza dentro del tanque.',3,'critical','blocked','Secuenciar: primero salida limpieza (09:00), luego boquilla (10:00).','Riesgo ELIMINADO',4);
  iC.run('Pipe Rack: Densidad 38 personas','38 personas de 5 empresas en radio de 50m.',5,'warning','active','Reubicar insuladores al Tramo 6 (zona despejada).','Densidad: -40%',38);

  // Lessons
  const iL = db.prepare('INSERT INTO lessons (type,title,description,zone_code,risk_category,date_occurred,pattern_match) VALUES (?,?,?,?,?,?,?)');
  iL.run('incident','Exposición a gases de soldadura en espacio confinado','Dos insuladores sin protección respiratoria compartieron plataforma con soldadores 45 min.','H-100','coactivity','2024-03-15','PATRÓN DETECTADO');
  iL.run('near_miss','Caída de herramienta desde Nivel 3 del horno','Llave de 2kg cayó 8m impactando zona donde minutos antes había personal.','H-100','height','2024-03-17','LECCIÓN INCORPORADA');
  iL.run('near_miss','Soldadura en boquilla con personal dentro del tanque','Se inició soldadura en boquilla N3 sin verificar salida del equipo interior.','TK-123','confined_space','2024-03-21','PATRÓN DETECTADO');

  // EPI Locations
  const iE = db.prepare('INSERT INTO epi_locations (epi_name,location,zone_code,image) VALUES (?,?,?,?)');
  iE.run('Casco','Almacén principal — Estante A3','TALLER','/images/epi/casco.svg');
  iE.run('Guantes','Almacén principal — Estante A5','TALLER','/images/epi/guantes.svg');
  iE.run('Guantes anticorte','Almacén EPI especial — Armario B2','TALLER','/images/epi/guantes-anticorte.svg');
  iE.run('Botas S3','Vestuario principal — Taquillas','TALLER','/images/epi/botas.svg');
  iE.run('Arnés','Almacén altura — Zona dedicada C1','H-100','/images/epi/arnes.svg');
  iE.run('Arnés + línea vida','Almacén altura — Zona dedicada C1','H-100','/images/epi/arnes.svg');
  iE.run('Protección auditiva','Dispensador en entrada zona — Nivel 0','H-100','/images/epi/proteccion-auditiva.svg');
  iE.run('Respirador ABE1','Almacén EPI especial — Armario B1 (control supervisor)','H-100','/images/epi/respirador.svg');
  iE.run('Gafas','Dispensador en entrada zona — Nivel 0','H-100','/images/epi/gafas.svg');

  // Radio channels
  const iRC = db.prepare('INSERT INTO radio_channels (channel_number,name,description,supervisor) VALUES (?,?,?,?)');
  iRC.run(1,'Emergencias','Canal prioritario — Solo emergencias y evacuación','Control de Planta');
  iRC.run(3,'Turno Mañana','Coordinación general turno de mañana','Miguel García');
  iRC.run(5,'Grúas','Coordinación de izados y maniobras','Pedro Sánchez');
  iRC.run(7,'Supervisión H-100','Canal de zona Horno H-100','Miguel García');
  iRC.run(9,'Eléctrica','Trabajos eléctricos y LOTO','Francisco Castro');
  iRC.run(11,'General','Avisos importantes para toda la planta','Control de Planta');
}

// ── Auth Middleware ──
function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  const user = db.prepare('SELECT * FROM users WHERE token = ?').get(token);
  if (!user) return res.status(401).json({ error: 'Invalid token' });
  req.user = user;
  next();
}
function adminAuth(req, res, next) {
  auth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    next();
  });
}

// ════════════════════════════════
// AUTH ROUTES
// ════════════════════════════════
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Credentials required' });
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || user.password_hash !== hashPw(password)) return res.status(401).json({ error: 'Invalid credentials' });
  const token = genToken();
  db.prepare('UPDATE users SET token = ? WHERE id = ?').run(token, user.id);
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, worker_code: user.worker_code, name: user.name } });
});

app.get('/api/auth/me', auth, (req, res) => {
  res.json({ id: req.user.id, username: req.user.username, role: req.user.role, worker_code: req.user.worker_code, name: req.user.name });
});

// ════════════════════════════════
// WORKER ROUTES
// ════════════════════════════════
app.get('/api/worker/:code', (req, res) => {
  const w = db.prepare('SELECT * FROM workers WHERE code = ?').get(req.params.code);
  if (!w) return res.status(404).json({ error: 'Not found' });
  res.json(w);
});

app.get('/api/workers', (req, res) => {
  res.json(db.prepare('SELECT w.*, z.name as zone_name, z.risk_level as zone_risk FROM workers w LEFT JOIN zones z ON w.current_zone = z.code').all());
});

app.get('/api/workers-map', (req, res) => {
  res.json(db.prepare("SELECT w.code,w.name,w.role,w.company,w.lat,w.lng,w.current_zone,w.status,z.name as zone_name FROM workers w LEFT JOIN zones z ON w.current_zone = z.code WHERE w.status = 'active'").all());
});

app.get('/api/workers-critical', (req, res) => {
  res.json(db.prepare("SELECT w.*, z.name as zone_name, z.risk_level as zone_risk FROM workers w JOIN zones z ON w.current_zone = z.code WHERE z.risk_level IN ('critical','warning') ORDER BY z.risk_level DESC").all());
});

app.put('/api/worker/:code/position', (req, res) => {
  const { lat, lng } = req.body;
  db.prepare('UPDATE workers SET lat = ?, lng = ? WHERE code = ?').run(lat, lng, req.params.code);
  res.json({ ok: true });
});

// ════════════════════════════════
// ZONE / SEMAPHORE / HAZARDS
// ════════════════════════════════
app.get('/api/zones', (req, res) => {
  res.json(db.prepare('SELECT * FROM zones ORDER BY risk_level DESC').all());
});

app.get('/api/semaphore', (req, res) => {
  const state = db.prepare('SELECT * FROM semaphore_state WHERE id = 1').get();
  const cnt = db.prepare("SELECT COUNT(*) as c FROM hazards WHERE active = 1 AND severity IN ('high','critical')").get().c;
  res.json({ ...state, active_hazard_count: cnt });
});

app.put('/api/semaphore', (req, res) => {
  const { level, title, subtitle } = req.body;
  db.prepare('UPDATE semaphore_state SET level=?, title=?, subtitle=?, updated_at=datetime("now") WHERE id=1').run(level, title, subtitle);
  res.json({ ok: true });
});

app.get('/api/hazards', (req, res) => {
  const { zone_id, active } = req.query;
  let q = 'SELECT h.*, z.code as zone_code, z.name as zone_name FROM hazards h LEFT JOIN zones z ON h.zone_id = z.id WHERE 1=1';
  const p = [];
  if (zone_id) { q += ' AND h.zone_id = ?'; p.push(zone_id); }
  if (active !== undefined) { q += ' AND h.active = ?'; p.push(active === 'true' ? 1 : 0); }
  q += ' ORDER BY h.severity DESC, h.distance_m ASC';
  res.json(db.prepare(q).all(...p));
});

// ════════════════════════════════
// TASKS (with unlock_at support)
// ════════════════════════════════
app.get('/api/tasks/:worker_code', (req, res) => {
  const w = db.prepare('SELECT id FROM workers WHERE code = ?').get(req.params.worker_code);
  if (!w) return res.status(404).json({ error: 'Not found' });
  const tasks = db.prepare('SELECT t.*, z.code as zone_code, z.name as zone_name FROM tasks t LEFT JOIN zones z ON t.zone_id = z.id WHERE t.worker_id = ? ORDER BY t.start_time').all(w.id);
  const now = new Date().toISOString();
  tasks.forEach(t => {
    t.locked = t.unlock_at ? t.unlock_at > now : false;
    if (t.locked) {
      t.unlock_remaining_ms = new Date(t.unlock_at).getTime() - Date.now();
    }
  });
  res.json(tasks);
});

app.put('/api/tasks/:id/status', (req, res) => {
  db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(req.body.status, req.params.id);
  res.json({ ok: true });
});

// ════════════════════════════════
// CAN I START
// ════════════════════════════════
app.get('/api/can-i-start/:worker_code', (req, res) => {
  const w = db.prepare('SELECT * FROM workers WHERE code = ?').get(req.params.worker_code);
  if (!w) return res.status(404).json({ error: 'Not found' });
  const hazards = db.prepare("SELECT * FROM hazards WHERE zone_id = (SELECT id FROM zones WHERE code = ?) AND active = 1 AND severity IN ('high','critical')").all(w.current_zone);
  const conflicts = db.prepare("SELECT * FROM simops_conflicts WHERE zone_id = (SELECT id FROM zones WHERE code = ?) AND status IN ('active','blocked')").all(w.current_zone);
  let status = 'ready', reason = 'Todos los controles verificados. Puedes comenzar tu tarea.', icon = '✅';
  if (conflicts.some(c => c.status === 'blocked')) {
    status = 'blocked'; reason = 'Existe una restricción absoluta activa en tu zona. Contacta con tu supervisor.'; icon = '🛑';
  } else if (hazards.length > 0) {
    const crane = hazards.find(h => h.type === 'crane');
    if (crane) { status = 'wait'; reason = `Izado activo hasta ${crane.end_time}. Zona de exclusión de ${crane.distance_m}m.`; icon = '⏳'; }
    else { status = 'ready'; reason = `Puedes empezar con precaución. ${hazards.length} riesgo(s) activo(s).`; icon = '✅'; }
  }
  res.json({ status, reason, icon, hazard_count: hazards.length, conflict_count: conflicts.length });
});

// ════════════════════════════════
// REPORTS / INCIDENTS
// ════════════════════════════════
app.get('/api/reports/:worker_code', (req, res) => {
  const w = db.prepare('SELECT id FROM workers WHERE code = ?').get(req.params.worker_code);
  if (!w) return res.status(404).json({ error: 'Not found' });
  res.json(db.prepare('SELECT r.*, z.name as zone_name FROM reports r LEFT JOIN zones z ON r.zone_id = z.id WHERE r.worker_id = ? ORDER BY r.created_at DESC').all(w.id));
});

app.post('/api/reports', (req, res) => {
  const { worker_code, type, description, zone_id, media_type, media_data, lat, lng } = req.body;
  if (!worker_code || !type) return res.status(400).json({ error: 'worker_code and type required' });
  const w = db.prepare('SELECT id FROM workers WHERE code = ?').get(worker_code);
  if (!w) return res.status(404).json({ error: 'Not found' });
  const desc = (description || '').toLowerCase();
  let category = 'General';
  if (desc.includes('altura') || desc.includes('andamio')) category = 'Trabajo en altura';
  else if (desc.includes('gas') || desc.includes('fuga')) category = 'Exposición química';
  else if (desc.includes('fuego') || desc.includes('soldadura')) category = 'Trabajo en caliente';
  else if (desc.includes('eléctric')) category = 'Riesgo eléctrico';
  else if (type === 'near_miss') category = 'Near Miss';
  const r = db.prepare('INSERT INTO reports (worker_id,type,description,zone_id,category,status,media_type,media_data,lat,lng,ai_summary,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime("now"))').run(w.id,type,description,zone_id||null,category,'sent',media_type||'text',media_data||null,lat||null,lng||null,description);
  // Create notification for admin
  db.prepare('INSERT INTO app_notifications (type,title,detail,icon,severity,target_role) VALUES (?,?,?,?,?,?)').run('report','Nuevo reporte: '+category,(description||'').substring(0,100),'📋','info','admin');
  res.json({ ok: true, id: r.lastInsertRowid, category });
});

app.get('/api/incidents-map', (req, res) => {
  const inc = db.prepare('SELECT r.*, w.name as worker_name, w.code as worker_code, z.name as zone_name, z.lat as zone_lat, z.lng as zone_lng FROM reports r LEFT JOIN workers w ON r.worker_id = w.id LEFT JOIN zones z ON r.zone_id = z.id ORDER BY r.created_at DESC LIMIT 20').all();
  res.json(inc.map(i => ({ ...i, lat: i.lat || i.zone_lat, lng: i.lng || i.zone_lng })));
});

// ════════════════════════════════
// SIMOPS / ESCAPE / MAP
// ════════════════════════════════
app.get('/api/simops', (req, res) => {
  res.json(db.prepare("SELECT s.*, z.name as zone_name FROM simops_conflicts s LEFT JOIN zones z ON s.zone_id = z.id ORDER BY CASE s.severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END").all());
});

app.put('/api/simops/:id/resolve', (req, res) => {
  db.prepare("UPDATE simops_conflicts SET status = 'resolved' WHERE id = ?").run(req.params.id);
  const cnt = db.prepare("SELECT COUNT(*) as c FROM simops_conflicts WHERE status IN ('active','blocked')").get().c;
  if (cnt === 0) db.prepare("UPDATE semaphore_state SET level='green', title='ZONA SEGURA', subtitle='Todos los conflictos resueltos' WHERE id=1").run();
  res.json({ ok: true, remaining: cnt });
});

app.get('/api/escape/:zone_id', (req, res) => {
  res.json(db.prepare('SELECT * FROM escape_routes WHERE zone_id = ?').all(req.params.zone_id));
});

app.get('/api/map-config', (req, res) => {
  res.json({ bounds: { north: 36.1982, south: 36.1918, west: -5.3886, east: -5.3774 }, defaultPosition: { lat: 36.1963, lng: -5.3848 }, image: '/map/planta.png' });
});

app.get('/api/dashboard', (req, res) => {
  res.json({
    active_conflicts: db.prepare("SELECT COUNT(*) as c FROM simops_conflicts WHERE status IN ('active','blocked')").get().c,
    total_workers: db.prepare('SELECT SUM(current_people) as c FROM zones').get().c,
    active_tasks: db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status IN ('scheduled','in-progress')").get().c,
    workers_in_critical: db.prepare("SELECT COUNT(*) as c FROM workers w JOIN zones z ON w.current_zone = z.code WHERE z.risk_level = 'critical'").get().c,
    zones: db.prepare('SELECT * FROM zones').all()
  });
});

// ════════════════════════════════
// EPI LOCATIONS
// ════════════════════════════════
app.get('/api/epi', (req, res) => {
  res.json(db.prepare('SELECT * FROM epi_locations ORDER BY epi_name').all());
});

app.put('/api/epi/:id', (req, res) => {
  const { location, zone_code } = req.body;
  const old = db.prepare('SELECT * FROM epi_locations WHERE id = ?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE epi_locations SET location = ?, zone_code = ?, updated_at = datetime("now") WHERE id = ?').run(location || old.location, zone_code || old.zone_code, req.params.id);
  // Create notification about the change
  db.prepare('INSERT INTO app_notifications (type,title,detail,icon,severity) VALUES (?,?,?,?,?)').run('epi_change', `Ubicación EPI actualizada: ${old.epi_name}`, `Nueva ubicación: ${location || old.location}`, '🦺', 'info');
  res.json({ ok: true });
});

// ════════════════════════════════
// RADIO CHANNELS
// ════════════════════════════════
app.get('/api/radio-channels', (req, res) => {
  res.json(db.prepare('SELECT * FROM radio_channels ORDER BY channel_number').all());
});

// ════════════════════════════════
// EMERGENCY
// ════════════════════════════════
app.post('/api/emergency', (req, res) => {
  const { worker_code } = req.body;
  db.prepare("UPDATE semaphore_state SET level='red', title='EMERGENCIA ACTIVADA', subtitle='Ubicación enviada · Supervisores notificados', updated_at=datetime('now') WHERE id=1").run();
  db.prepare('INSERT INTO app_notifications (type,title,detail,icon,severity,target_role) VALUES (?,?,?,?,?,?)').run('emergency', 'EMERGENCIA activada', `Trabajador ${worker_code} ha activado emergencia`, '🆘', 'critical', 'admin');
  setTimeout(() => {
    const c = db.prepare("SELECT level FROM semaphore_state WHERE id=1").get();
    if (c && c.level === 'red') db.prepare("UPDATE semaphore_state SET level='yellow', title='PRECAUCIÓN — 2 riesgos activos', subtitle='Hot work a 8m · Izado a 15m' WHERE id=1").run();
  }, 30000);
  res.json({ ok: true });
});

// ════════════════════════════════
// CHAT WITH SENTINEL AI
// ════════════════════════════════
app.post('/api/chat', (req, res) => {
  const { worker_code, message } = req.body;
  if (!worker_code || !message) return res.status(400).json({ error: 'Required fields missing' });
  const worker = db.prepare('SELECT * FROM workers WHERE code = ?').get(worker_code);
  if (!worker) return res.status(404).json({ error: 'Not found' });
  const zone = db.prepare('SELECT * FROM zones WHERE code = ?').get(worker.current_zone);
  const hazards = zone ? db.prepare('SELECT * FROM hazards WHERE zone_id = ? AND active = 1').all(zone.id) : [];
  const name = worker.name.split(' ')[0];
  const msg = message.toLowerCase();
  let response = '';

  if (msg.includes('empezar') || msg.includes('puedo') || msg.includes('comenzar')) {
    const conflicts = zone ? db.prepare("SELECT * FROM simops_conflicts WHERE zone_id = ? AND status IN ('active','blocked')").all(zone.id) : [];
    const activeH = hazards.filter(h => h.severity === 'high' || h.severity === 'critical');
    if (conflicts.some(c => c.status === 'blocked')) response = `${name}, ⛔ NO puedes empezar ahora. Restricción activa en ${zone.name}.`;
    else if (activeH.find(h => h.type === 'crane')) { const cr = activeH.find(h => h.type === 'crane'); response = `${name}, ⏳ Espera. Izado activo hasta las ${cr.end_time}.`; }
    else if (activeH.length > 0) response = `${name}, ✅ Puedes empezar con precaución. ${activeH.length} riesgo(s).`;
    else response = `${name}, ✅ Puedes empezar. Zona despejada.`;
  } else if (msg.includes('riesgo') || msg.includes('peligro') || msg.includes('zona')) {
    if (hazards.length === 0) response = `${name}, ✅ Sin riesgos activos.`;
    else { const icons = {hot_work:'🔥',crane:'🏗️',confined_space:'⛔',electrical:'⚡'}; response = `${name}, ${hazards.length} riesgo(s):\n\n`; hazards.forEach(h => { response += `${icons[h.type]||'⚠'} ${h.title} — ${h.distance_m}m ${h.direction}\n→ ${h.action_required}\n\n`; }); }
  } else if (msg.includes('evacuación') || msg.includes('evacuar') || msg.includes('escape') || msg.includes('ruta')) {
    const route = zone ? db.prepare('SELECT * FROM escape_routes WHERE zone_id = ?').get(zone.id) : null;
    response = route ? `${name}, tu ruta:\n\n🏁 ${route.muster_point} (~${route.distance_m}m)\n📍 ${route.route_description}` : `${name}, sin ruta configurada.`;
  } else if (msg.includes('supervisor') || msg.includes('contactar')) {
    response = `${name}, tu supervisor: M. García 📻 Canal radio 7.`;
  } else if (msg.includes('epi') || msg.includes('protección') || msg.includes('equipo')) {
    const tasks = db.prepare("SELECT * FROM tasks WHERE worker_id = ? AND status IN ('scheduled','in-progress') LIMIT 1").all(worker.id);
    if (tasks.length > 0 && tasks[0].epi_required) { const epi = JSON.parse(tasks[0].epi_required); response = `${name}, necesitas:\n\n${epi.map(e => '🦺 ' + e).join('\n')}`; }
    else response = `${name}, sin requisitos EPI específicos.`;
  } else if (msg.includes('tiempo') || msg.includes('viento')) {
    response = `${name}, San Roque:\n\n🌡️ 19°C | 💨 NE 12 km/h | ☀️ Despejado`;
  } else if (msg.includes('hola') || msg.includes('buenos') || msg.includes('hey')) {
    response = `¡Buenos días, ${name}! 👋 Soy SENTINEL.\n\n¿En qué puedo ayudarte?\n• Riesgos en tu zona\n• ¿Puedo empezar?\n• Ruta de evacuación\n• EPI requerido`;
  } else if (msg.includes('gracias')) {
    response = `De nada, ${name}. ¡Trabaja seguro! 💪`;
  } else if (msg.includes('llévame') || msg.includes('ir a') || msg.includes('cómo llego') || msg.includes('navegar') || msg.includes('camino a') || msg.includes('guíame') || msg.includes('llegar a')) {
    const allZones = db.prepare('SELECT * FROM zones').all();
    let target = null;
    for (const z of allZones) {
      const words = z.name.toLowerCase().split(/\s+/);
      if (msg.includes(z.code.toLowerCase()) || msg.includes(z.name.toLowerCase()) || words.some(w => w.length > 2 && msg.includes(w))) { target = z; break; }
    }
    if (!target) {
      const allW = db.prepare('SELECT w.code as wcode, w.name as wname, w.lat as wlat, w.lng as wlng, w.current_zone FROM workers w WHERE w.code != ?').all(worker_code);
      for (const w of allW) { if (msg.includes(w.wname.toLowerCase().split(' ')[0]) || msg.includes(w.wcode.toLowerCase())) { target = { code: w.current_zone, name: w.wname, lat: w.wlat, lng: w.wlng }; break; } }
    }
    if (target && target.lat && target.lng) {
      response = `${name}, te guío hasta ${target.name}.\n\n🗺️ Ruta activada en tu mapa. Sigue la línea azul.\n⚠️ Verifica riesgos en el camino.`;
      db.prepare('INSERT INTO chat_messages (from_code,to_code,message,is_ai) VALUES (?,?,?,?)').run(worker_code,'SENTINEL_AI',message,0);
      db.prepare('INSERT INTO chat_messages (from_code,to_code,message,is_ai) VALUES (?,?,?,?)').run('SENTINEL_AI',worker_code,response,1);
      return res.json({ response, timestamp: new Date().toISOString(), navigate: { lat: target.lat, lng: target.lng, name: target.name } });
    } else {
      response = `${name}, no identifiqué el destino. Zonas:\n\n${allZones.map(z => '📍 '+z.code+' — '+z.name).join('\n')}`;
    }
  } else {
    response = `${name}, estás en ${zone?zone.name:'planta'} con ${hazards.length} riesgo(s).\n\n¿Puedo ayudarte con algo?\n• Riesgos en tu zona\n• ¿Puedo empezar?\n• Ruta de evacuación`;
  }
  db.prepare('INSERT INTO chat_messages (from_code,to_code,message,is_ai) VALUES (?,?,?,?)').run(worker_code,'SENTINEL_AI',message,0);
  db.prepare('INSERT INTO chat_messages (from_code,to_code,message,is_ai) VALUES (?,?,?,?)').run('SENTINEL_AI',worker_code,response,1);
  res.json({ response, timestamp: new Date().toISOString() });
});

// ════════════════════════════════
// NOTIFICATIONS
// ════════════════════════════════
app.get('/api/notifications', (req, res) => {
  const notifs = [];
  db.prepare("SELECT * FROM hazards WHERE active = 1 ORDER BY severity DESC").all().forEach(h =>
    notifs.push({ id:'h-'+h.id, type:'hazard', icon:'⚠️', title:h.title, detail:`${h.distance_m}m ${h.direction} · Severidad: ${h.severity}`, time:h.start_time, severity:h.severity }));
  db.prepare("SELECT s.*, z.name as zone_name FROM simops_conflicts s LEFT JOIN zones z ON s.zone_id = z.id WHERE s.status IN ('active','blocked')").all().forEach(c =>
    notifs.push({ id:'c-'+c.id, type:'conflict', icon:'🔴', title:'SIMOPS: '+c.title, detail:c.ai_suggestion, time:c.created_at, severity:c.severity }));
  const crit = db.prepare("SELECT w.name, z.name as zone_name FROM workers w JOIN zones z ON w.current_zone = z.code WHERE z.risk_level IN ('critical','warning')").all();
  if (crit.length) notifs.push({ id:'wc-1', type:'workers', icon:'👷', title:`${crit.length} trabajadores en zonas de riesgo`, detail:crit.map(w=>w.name.split(' ')[0]+' → '+w.zone_name).join(', '), time:new Date().toISOString(), severity:'warning' });
  db.prepare("SELECT r.*, w.name as worker_name FROM reports r LEFT JOIN workers w ON r.worker_id = w.id ORDER BY r.created_at DESC LIMIT 5").all().forEach(r =>
    notifs.push({ id:'r-'+r.id, type:'report', icon:'📋', title:'Reporte: '+(r.category||r.type), detail:r.description||r.ai_summary||'', time:r.created_at, severity:'info' }));
  // App notifications (EPI changes, etc.)
  db.prepare("SELECT * FROM app_notifications ORDER BY created_at DESC LIMIT 10").all().forEach(n =>
    notifs.push({ id:'an-'+n.id, type:n.type, icon:n.icon, title:n.title, detail:n.detail||'', time:n.created_at, severity:n.severity }));
  res.json(notifs);
});

// ════════════════════════════════
// ADMIN ROUTES
// ════════════════════════════════
app.post('/api/admin/tasks', adminAuth, (req, res) => {
  const { worker_code, title, description, zone_code, start_time, end_time, risk_level, epi_required, unlock_at } = req.body;
  if (!worker_code || !title) return res.status(400).json({ error: 'worker_code and title required' });
  const w = db.prepare('SELECT id FROM workers WHERE code = ?').get(worker_code);
  const z = zone_code ? db.prepare('SELECT id FROM zones WHERE code = ?').get(zone_code) : null;
  if (!w) return res.status(404).json({ error: 'Worker not found' });
  const r = db.prepare('INSERT INTO tasks (title,type,zone_id,worker_id,start_time,end_time,risk_level,status,epi_required,description,unlock_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(
    title, 'custom', z ? z.id : 1, w.id, start_time || '09:00', end_time || '17:00', risk_level || 'low', 'scheduled',
    JSON.stringify(epi_required || ['Casco','Gafas']), description || '', unlock_at || null);
  res.json({ ok: true, id: r.lastInsertRowid });
});

app.post('/api/admin/preload-demo', adminAuth, (req, res) => {
  const { worker_code } = req.body;
  const wCode = worker_code || 'JL';
  const w = db.prepare('SELECT id FROM workers WHERE code = ?').get(wCode);
  if (!w) return res.status(404).json({ error: 'Worker not found' });
  const now = Date.now();
  const iT = db.prepare('INSERT INTO tasks (title,type,zone_id,worker_id,start_time,end_time,risk_level,status,epi_required,critical_controls,description,unlock_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
  iT.run('Inspección visual de soldaduras','inspection',1,w.id,'09:00','10:00','low','scheduled',
    JSON.stringify(['Casco','Gafas','Guantes']),JSON.stringify(['Verificar certificados soldador','Comprobar gas de protección']),
    'Inspección visual de cordones de soldadura en carcasa horno.', new Date(now + 60*1000).toISOString());
  iT.run('Montaje de brida en línea 4"','mechanical',1,w.id,'10:00','12:00','medium','scheduled',
    JSON.stringify(['Casco','Guantes anticorte','Botas S3','Gafas']),JSON.stringify(['LOTO verificado','Presión línea = 0']),
    'Montaje y apriete de brida según procedimiento.', new Date(now + 2*60*60*1000).toISOString());
  iT.run('Limpieza y cierre de permiso','general',6,w.id,'14:00','15:00','low','scheduled',
    JSON.stringify(['Casco','Guantes']),JSON.stringify([]),
    'Recogida de herramientas y cierre administrativo.', new Date(now + 4*60*60*1000).toISOString());
  res.json({ ok: true, message: 'Demo tasks created: unlock in 1min, 2h, 4h' });
});

app.post('/api/admin/alarm', adminAuth, (req, res) => {
  const { title, detail, severity } = req.body;
  db.prepare("UPDATE semaphore_state SET level=?, title=?, subtitle=?, updated_at=datetime('now') WHERE id=1").run(severity === 'critical' ? 'red' : 'yellow', title || 'ALERTA', detail || '');
  db.prepare('INSERT INTO app_notifications (type,title,detail,icon,severity,target_role) VALUES (?,?,?,?,?,?)').run('alarm', title || 'Alarma del supervisor', detail || '', '🚨', severity || 'warning', 'all');
  res.json({ ok: true });
});

app.get('/api/admin/incidents', adminAuth, (req, res) => {
  res.json(db.prepare('SELECT r.*, w.name as worker_name, w.code as worker_code, z.name as zone_name FROM reports r LEFT JOIN workers w ON r.worker_id = w.id LEFT JOIN zones z ON r.zone_id = z.id ORDER BY r.created_at DESC').all());
});

app.get('/api/admin/messages', adminAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM chat_messages ORDER BY created_at DESC LIMIT 100').all());
});

// Store chat messages between workers
app.post('/api/messages', (req, res) => {
  const { from_code, to_code, message } = req.body;
  if (!from_code || !to_code || !message) return res.status(400).json({ error: 'Missing fields' });
  db.prepare('INSERT INTO chat_messages (from_code,to_code,message,is_ai) VALUES (?,?,?,0)').run(from_code, to_code, message);
  res.json({ ok: true });
});

app.get('/api/messages/:code', (req, res) => {
  const code = req.params.code;
  res.json(db.prepare('SELECT * FROM chat_messages WHERE from_code = ? OR to_code = ? ORDER BY created_at DESC LIMIT 50').all(code, code));
});

// Worker contribution history
app.get('/api/worker-history/:code', (req, res) => {
  const code = req.params.code;
  const w = db.prepare('SELECT * FROM workers WHERE code = ?').get(code);
  if (!w) return res.status(404).json({ error: 'Not found' });
  const reports = db.prepare('SELECT * FROM reports WHERE worker_id = ? ORDER BY created_at DESC').all(w.id);
  const tasks = db.prepare('SELECT t.*, z.name as zone_name FROM tasks t LEFT JOIN zones z ON t.zone_id = z.id WHERE t.worker_id = ? ORDER BY t.created_at DESC').all(w.id);
  const messages = db.prepare('SELECT COUNT(*) as c FROM chat_messages WHERE from_code = ?').get(code);
  res.json({ worker: w, reports, tasks, message_count: messages.c });
});

// ── Serve app ──
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

app.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════════════╗`);
  console.log(`  ║  SENTINEL — Copiloto de Seguridad en Campo   ║`);
  console.log(`  ║  http://localhost:${PORT}                       ║`);
  console.log(`  ╚══════════════════════════════════════════════╝\n`);
});
