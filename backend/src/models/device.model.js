const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema(
  {
    // Dueño del dispositivo
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Nombre descriptivo (el usuario puede editarlo en Configuración)
    nombre: { type: String, default: 'Mi Refrigerador', trim: true },

    // Configuración de temperatura (guardada desde pantalla5 y Configuración)
    tempMin: { type: Number, default: 2 },
    tempMax: { type: Number, default: 8 },
    unidad: { type: String, enum: ['C', 'F'], default: 'C' },
    alertas: { type: Boolean, default: true },

    // Categorías de alimentos seleccionadas en pantalla4
    alimentos: [{ type: String }],

    // Estado actual del dispositivo (actualizado por el servidor MQTT)
    status: {
      type: String,
      enum: ['activo', 'desconectado', 'alerta'],
      default: 'desconectado',
    },

    // ============================================================
    // Variables para la integración ESP32 / MQTT-TLS
    // Estas variables se rellenan cuando el sensor físico esté listo
    // ============================================================

    // ID único del ESP32 (se configura en el firmware del ESP32)
    mqttClientId: { type: String, default: null },

    // Tópico MQTT donde el ESP32 publica sus datos
    // Formato esperado: fixel/{mqttClientId}/data
    mqttTopic: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Device', deviceSchema);
