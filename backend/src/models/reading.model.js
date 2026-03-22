const mongoose = require('mongoose');

/**
 * Lectura de temperatura enviada por el sensor ESP32 vía MQTT/TLS.
 *
 * El ESP32 publicará un mensaje JSON al tópico:
 *   fixel/{mqttClientId}/data
 *
 * Formato del mensaje:
 *   {
 *     "temperatura": 3.5,
 *     "humedad": 65,
 *     "compresor": true,
 *     "energia": "Normal"
 *   }
 *
 * El servidor MQTT recibe el mensaje y lo guarda aquí.
 */
const readingSchema = new mongoose.Schema(
  {
    deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },

    // ============================================================
    // Datos del sensor ESP32
    // ============================================================

    // Temperatura en grados Celsius (sensor DS18B20 o similar)
    temperatura: { type: Number, required: true },

    // Humedad relativa % (sensor DHT22, opcional)
    humedad: { type: Number, default: null },

    // Estado del compresor (true = funcionando)
    compresor: { type: Boolean, default: true },

    // Estado del suministro eléctrico
    energia: { type: String, enum: ['Normal', 'Falla'], default: 'Normal' },

    // Marca de tiempo de la lectura (enviada por el ESP32 o asignada al recibirla)
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Índice para consultas rápidas por dispositivo y tiempo
readingSchema.index({ deviceId: 1, timestamp: -1 });

module.exports = mongoose.model('Reading', readingSchema);
