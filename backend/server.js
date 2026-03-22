require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require('./src/config/db');
const mqttClient = require('./src/mqtt/mqtt.client');

const authRoutes = require('./src/routes/auth.routes');
const deviceRoutes = require('./src/routes/device.routes');
const readingRoutes = require('./src/routes/reading.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS: en producción, restringe los orígenes permitidos con la variable ALLOWED_ORIGINS
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim())
    : '*',
};

// Rate limiting para rutas de autenticación (más restrictivo)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max: 20,                    // máximo 20 intentos por ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: { mensaje: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' },
});

// Rate limiting general para rutas protegidas
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { mensaje: 'Demasiadas solicitudes. Intenta de nuevo en 15 minutos.' },
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Rutas
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/devices', apiLimiter, deviceRoutes);
app.use('/api/readings', apiLimiter, readingRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', app: 'App-Fixel Backend', version: '1.0.0' });
});

// Iniciar servidor
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
    mqttClient.connect();
  });
});
