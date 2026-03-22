/**
 * Backend - Rutas de Autenticación Social (Google y Facebook)
 * Archivo: backend/src/routes/auth.js
 * 
 * Este es un ejemplo para tu backend Node.js/Express
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const User = require('../models/User'); // Tu modelo de usuario

const router = express.Router();

// Inicializar cliente de Google
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ============================================
// 🔵 GOOGLE SIGN-IN
// ============================================

/**
 * POST /api/auth/google-login
 * Verifica token de Google y crea/actualiza usuario
 */
router.post('/google-login', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ mensaje: 'Token requerido' });
    }

    // Verificar token con Google
    const ticket = await googleClient.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub, email, name, picture } = payload;

    // Buscar usuario existente
    let user = await User.findOne({ email });

    if (!user) {
      // Crear nuevo usuario
      user = await User.create({
        email,
        name: name || email.split('@')[0],
        picture: picture || null,
        googleId: sub,
        password: null, // Sin contraseña para usuarios sociales
      });
      console.log(`✅ Nuevo usuario Google creado: ${email}`);
    } else if (!user.googleId) {
      // Si existe pero no tiene Google ID, agregarlo
      user.googleId = sub;
      await user.save();
      console.log(`✅ Google ID agregado al usuario: ${email}`);
    }

    // Generar JWT
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`✅ Login exitoso: ${email}`);

    return res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    });
  } catch (error) {
    console.error('❌ Error Google Login:', error.message);
    return res.status(401).json({
      mensaje: 'Token inválido o expirado',
      error: error.message,
    });
  }
});

// ============================================
// 🔵 FACEBOOK LOGIN
// ============================================

/**
 * POST /api/auth/facebook-login
 * Verifica token de Facebook y crea/actualiza usuario
 */
router.post('/facebook-login', async (req, res) => {
  try {
    const { accessToken, userID } = req.body;

    if (!accessToken || !userID) {
      return res.status(400).json({ mensaje: 'Token y userID requeridos' });
    }

    // Verificar token con Facebook Graph API
    const graphResponse = await axios.get(
      `https://graph.facebook.com/v18.0/${userID}`,
      {
        params: {
          access_token: accessToken,
          fields: 'id,email,name,picture',
        },
      }
    );

    const facebookData = graphResponse.data;

    if (!facebookData.email) {
      return res.status(400).json({
        mensaje: 'Email no disponible en tu cuenta de Facebook',
      });
    }

    // Buscar usuario existente por email
    let user = await User.findOne({ email: facebookData.email });

    if (!user) {
      // Crear nuevo usuario
      user = await User.create({
        email: facebookData.email,
        name: facebookData.name || facebookData.email.split('@')[0],
        picture: facebookData.picture?.data?.url || null,
        facebookId: facebookData.id,
        password: null, // Sin contraseña para usuarios sociales
      });
      console.log(`✅ Nuevo usuario Facebook creado: ${facebookData.email}`);
    } else if (!user.facebookId) {
      // Si existe pero no tiene Facebook ID, agregarlo
      user.facebookId = facebookData.id;
      await user.save();
      console.log(`✅ Facebook ID agregado al usuario: ${facebookData.email}`);
    }

    // Generar JWT
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`✅ Login exitoso: ${facebookData.email}`);

    return res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    });
  } catch (error) {
    console.error('❌ Error Facebook Login:', error.message);
    return res.status(401).json({
      mensaje: 'Error al validar token de Facebook',
      error: error.message,
    });
  }
});

// ============================================
// Exportar rutas
// ============================================

module.exports = router;

/**
 * 📝 CÓMO USAR EN TU APP PRINCIPAL (app.js):
 * 
 * const authRoutes = require('./routes/auth');
 * app.use('/api/auth', authRoutes);
 */

/**
 * 🔐 VARIABLES DE ENTORNO REQUERIDAS (.env):
 * 
 * GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
 * JWT_SECRET=tu_secret_muy_seguro
 * MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/bd
 */
