const { Sequelize } = require('sequelize');

const isProduction = process.env.NODE_ENV === 'production';

// Railway internal connections (postgres.railway.internal) don't use SSL.
// External/proxy connections (*.proxy.rlwy.net) require SSL.
const databaseUrl = process.env.DATABASE_URL || '';
const isInternalRailway = databaseUrl.includes('.railway.internal');
const needsSSL = isProduction && !isInternalRailway;

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: isProduction ? false : console.log,
  dialectOptions: needsSSL
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : {},
});

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

const connectDB = async () => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await sequelize.authenticate();
      console.log('✅ PostgreSQL conectado');

      // Importar modelos para registrarlos antes de sincronizar
      require('../models/user.model');
      require('../models/device.model');
      require('../models/reading.model');

      await sequelize.sync();
      console.log('✅ Modelos sincronizados');
      return;
    } catch (err) {
      console.error(`❌ Error conectando a PostgreSQL (intento ${attempt}/${MAX_RETRIES}):`, err.message);
      if (attempt < MAX_RETRIES) {
        console.log(`🔄 Reintentando en ${RETRY_DELAY_MS / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      } else {
        console.error('❌ No se pudo conectar a PostgreSQL después de todos los intentos');
        process.exit(1);
      }
    }
  }
};

module.exports = { sequelize, connectDB };
