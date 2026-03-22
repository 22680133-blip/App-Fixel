const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, default: null },
    googleId: { type: String, default: null },
    facebookId: { type: String, default: null },
    picture: { type: String, default: null },
  },
  { timestamps: true }
);

// Hash de contraseña antes de guardar
userSchema.pre('save', async function (next) {
  if (this.password && this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Comparar contraseña en texto plano contra el hash
userSchema.methods.comparePassword = async function (password) {
  if (!this.password) return false;
  return bcrypt.compare(password, this.password);
};

// Nunca exponer contraseña en respuestas JSON
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
