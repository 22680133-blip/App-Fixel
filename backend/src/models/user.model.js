const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/db');

const User = sequelize.define(
  'User',
  {
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
      set(value) {
        this.setDataValue('nombre', value.trim());
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      set(value) {
        this.setDataValue('email', value.toLowerCase().trim());
      },
    },
    password: { type: DataTypes.STRING, defaultValue: null },
    googleId: { type: DataTypes.STRING, defaultValue: null },
    facebookId: { type: DataTypes.STRING, defaultValue: null },
    picture: { type: DataTypes.TEXT, defaultValue: null },
  },
  {
    timestamps: true,
    hooks: {
      // Hash de contraseña antes de guardar
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password') && user.password) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
    },
  }
);

// Comparar contraseña en texto plano contra el hash
User.prototype.comparePassword = async function (password) {
  if (!this.password) return false;
  return bcrypt.compare(password, this.password);
};

// Nunca exponer contraseña en respuestas JSON
User.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.password;
  return values;
};

module.exports = User;
