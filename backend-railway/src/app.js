const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const deviceRoutes = require('./routes/devices');
const profileRoutes = require('./routes/profile');
const readingRoutes = require('./routes/readings');
const ingestRoutes = require('./routes/ingest');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rutas de autenticación (sin cambios)
app.use('/api/auth', authRoutes);

// Rutas de perfil y contraseña (montadas en /api/auth para compartir prefijo)
app.use('/api/auth', profileRoutes);

// Rutas de dispositivos
app.use('/api/devices', deviceRoutes);

// Rutas de lecturas (temperatura del ESP32)
app.use('/api/readings', readingRoutes);

// Ruta de ingesta HTTP para ESP32 (pública, sin JWT)
app.use('/api/ingest', ingestRoutes);

app.get('/', (req, res) => {
  res.json({ mensaje: "API Monitoreo funcionando 🔥" });
});

module.exports = app;
