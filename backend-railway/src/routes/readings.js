const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const readingController = require('../controllers/reading.controller');

// Todas las rutas de lecturas requieren autenticación
router.use(auth);

router.get('/latest/:deviceId', readingController.getLatest);
router.get('/history/:deviceId', readingController.getHistory);

module.exports = router;
