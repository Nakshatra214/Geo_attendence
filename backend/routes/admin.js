const express = require('express');
const router  = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  getAllUsers, toggleUserStatus,
  createLocation, getLocations, updateLocation, deleteLocation,
  getAllAttendance, getAnalytics, exportReport,
} = require('../controllers/adminController');

router.use(protect); // All routes require authentication

router.get('/users',                  adminOnly, getAllUsers);
router.patch('/users/:id/toggle',     adminOnly, toggleUserStatus);

router.post('/location/create',       adminOnly, createLocation);
router.get('/locations',              getLocations); // Anyone logged in can view locations
router.put('/location/:id',           adminOnly, updateLocation);
router.delete('/location/:id',        adminOnly, deleteLocation);

router.get('/attendance/all',         adminOnly, getAllAttendance);
router.get('/analytics',              adminOnly, getAnalytics);
router.get('/reports/export',         adminOnly, exportReport);

module.exports = router;
