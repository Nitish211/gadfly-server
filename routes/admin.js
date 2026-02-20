const express = require('express');
const router = express.Router();
const { getPayouts, getReports, getGifts } = require('../controllers/adminController');

router.get('/payouts', getPayouts);
router.get('/reports', getReports);
router.get('/gifts', getGifts);

module.exports = router;
