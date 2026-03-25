const express = require('express');
const router = express.Router();
const ingestController = require('../controllers/ingest.controller');

// Ruta pública — no requiere JWT
router.post('/:deviceCode', ingestController.ingest);

module.exports = router;
