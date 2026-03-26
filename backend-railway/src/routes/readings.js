const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const readingController = require('../controllers/reading.controller');

// Public endpoint — no auth required
router.get('/', readingController.getReadings);

// Auth-protected endpoints for device-specific queries
router.use(auth);

router.get('/latest/:deviceId', readingController.getLatest);
router.get('/history/:deviceId', readingController.getHistory);

module.exports = router;
