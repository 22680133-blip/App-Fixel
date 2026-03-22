const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Device = sequelize.define(
  'Device',
  {
    // Dueño del dispositivo
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Users', key: 'id' },
    },

    // Nombre descriptivo (el usuario puede editarlo en Configuración)
    nombre: {
      type: DataTypes.STRING,
      defaultValue: 'Mi Refrigerador',
      set(value) {
        this.setDataValue('nombre', value ? value.trim() : 'Mi Refrigerador');
      },
    },

    // Configuración de temperatura (guardada desde pantalla5 y Configuración)
    tempMin: { type: DataTypes.FLOAT, defaultValue: 2 },
    tempMax: { type: DataTypes.FLOAT, defaultValue: 8 },
    unidad: {
      type: DataTypes.ENUM('C', 'F'),
      defaultValue: 'C',
    },
    alertas: { type: DataTypes.BOOLEAN, defaultValue: true },

    // Categorías de alimentos seleccionadas en pantalla4
    alimentos: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },

    // Estado actual del dispositivo (actualizado por el servidor MQTT)
    status: {
      type: DataTypes.ENUM('activo', 'desconectado', 'alerta'),
      defaultValue: 'desconectado',
    },

    // ============================================================
    // Variables para la integración ESP32 / MQTT-TLS
    // Estas variables se rellenan cuando el sensor físico esté listo
    // ============================================================

    // ID único del ESP32 (se configura en el firmware del ESP32)
    mqttClientId: { type: DataTypes.STRING, defaultValue: null },

    // Tópico MQTT donde el ESP32 publica sus datos
    // Formato esperado: fixel/{mqttClientId}/data
    mqttTopic: { type: DataTypes.STRING, defaultValue: null },
  },
  { timestamps: true }
);

module.exports = Device;
