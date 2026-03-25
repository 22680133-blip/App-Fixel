/**
 * Controlador de lecturas — raw pg
 *
 * Tabla readings en PostgreSQL:
 *   id            SERIAL PRIMARY KEY
 *   device_id     INTEGER REFERENCES devices(id)
 *   temperatura   FLOAT
 *   humedad       FLOAT
 *   compresor     BOOLEAN DEFAULT true
 *   energia       VARCHAR DEFAULT 'Normal'
 *   timestamp     TIMESTAMP DEFAULT NOW()
 */
const pool = require('../config/db');

const HISTORY_HOURS = 24;

// ============================================================
// Helper: obtener userId del request
// ============================================================
function getUserId(req) {
  return req.userId || req.user?.id;
}

// ============================================================
// GET /api/readings/latest/:deviceId
// Última lectura de temperatura del dispositivo
// ============================================================
exports.getLatest = async (req, res) => {
  try {
    const userId = getUserId(req);
    const deviceId = req.params.deviceId;

    // Verificar que el dispositivo pertenece al usuario
    const deviceCheck = await pool.query(
      'SELECT id FROM devices WHERE id = $1 AND user_id = $2',
      [deviceId, userId]
    );
    if (deviceCheck.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Dispositivo no encontrado' });
    }

    const result = await pool.query(
      'SELECT * FROM readings WHERE device_id = $1 ORDER BY timestamp DESC LIMIT 1',
      [deviceId]
    );

    const reading = result.rows.length > 0 ? formatReading(result.rows[0]) : null;
    res.json({ reading });
  } catch (error) {
    console.error('Error al obtener última lectura:', error);
    res.status(500).json({ mensaje: 'Error al obtener lectura' });
  }
};

// ============================================================
// GET /api/readings/history/:deviceId
// Historial de lecturas de las últimas 24 horas
// ============================================================
exports.getHistory = async (req, res) => {
  try {
    const userId = getUserId(req);
    const deviceId = req.params.deviceId;

    // Verificar que el dispositivo pertenece al usuario
    const deviceCheck = await pool.query(
      'SELECT id FROM devices WHERE id = $1 AND user_id = $2',
      [deviceId, userId]
    );
    if (deviceCheck.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Dispositivo no encontrado' });
    }

    const since = new Date(Date.now() - HISTORY_HOURS * 60 * 60 * 1000);
    const result = await pool.query(
      'SELECT * FROM readings WHERE device_id = $1 AND timestamp >= $2 ORDER BY timestamp ASC',
      [deviceId, since]
    );

    const readings = result.rows.map(formatReading);
    res.json({ readings });
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ mensaje: 'Error al obtener historial' });
  }
};

// ============================================================
// Helper: convierte fila de DB a formato JSON del frontend
// ============================================================
function formatReading(row) {
  return {
    id: row.id,
    deviceId: row.device_id,
    temperatura: parseFloat(row.temperatura),
    humedad: row.humedad != null ? parseFloat(row.humedad) : null,
    compresor: row.compresor ?? true,
    energia: row.energia || 'Normal',
    timestamp: row.timestamp || row.created_at,
  };
}
