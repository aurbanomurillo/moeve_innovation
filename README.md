# SENTINEL — Copiloto de Seguridad en Campo

Herramienta de seguridad contextual para contratistas durante paradas técnicas en refinería. Cada trabajador ve en tiempo real los riesgos de **su** zona, sabe si puede empezar **su** tarea, y reporta incidencias con un toque.

Prototipo desarrollado para el **Hackathon Moeve 2026** (Refinería San Roque).

---

## Lanzar la app

```bash
npm install
npm start
```

Abre **http://localhost:3000** en el navegador (mejor en vista móvil ~430px).

---

## Qué hace

### 📡 Mi Zona — Qué hay a tu alrededor

- Semáforo de estado de zona (rojo / amarillo / verde)
- Radar visual con los riesgos activos (trabajos en caliente, grúas, espacios confinados)
- Distancia y dirección de cada riesgo
- Ruta de evacuación más cercana

### 📋 Mi Tarea — ¿Puedo empezar?

- Botón inteligente que cruza SIMOPS, riesgos activos y estado del briefing
- Respuesta clara: **SÍ** / **ESPERA** / **NO**, con la razón exacta
- Checklist de controles críticos
- EPI obligatorio por tarea

### 🚨 Alertar — Reporta en 3 segundos

- Near miss, foto, nota de voz, observación positiva
- Auto-categorización por IA al enviar
- Botón de emergencia (man down) con alerta inmediata

### 🗺️ Supervisor — Visión de planta

- KPIs en tiempo real (conflictos SIMOPS, personas en riesgo, permisos vencidos)
- Mapa de calor por zonas
- Resolución de conflictos SIMOPS con sugerencia de IA
- Listado de trabajadores en zonas críticas

---

## Estructura del proyecto

```
├── server.js              # Backend Express + SQLite
├── public/
│   └── index.html         # Frontend (mobile-first, single-page)
├── logos/                  # Logos Moeve (servidos como estáticos)
├── docs/
│   ├── mockups/            # Iteraciones anteriores del prototipo
│   ├── *.pdf               # Presentación y manual de marca
│   └── *.png               # Logos adicionales
├── Ideas.md               # Documento de ideación original
├── package.json
└── .gitignore
```

---

## Stack

- **Frontend**: HTML + CSS + vanilla JS (sin dependencias)
- **Backend**: Node.js + Express
- **Base de datos**: SQLite (better-sqlite3) — se crea automáticamente al arrancar
- **Diseño**: Sistema visual Moeve (Inter, gradient-brand, glass-morphism)
