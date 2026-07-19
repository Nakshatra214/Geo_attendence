const express = require('express');
const router  = express.Router();
const { checkIn, checkOut, getHistory, getTodayStatus } = require('../controllers/attendanceController');
const { protect } = require('../middleware/auth');

router.use(protect); // All attendance routes require auth

router.post('/checkin',           checkIn);
router.post('/checkout',          checkOut);
router.get('/today',              getTodayStatus);
router.get('/history/:userId',    getHistory);

module.exports = router;
