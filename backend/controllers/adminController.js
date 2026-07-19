const User       = require('../models/User');
const Attendance = require('../models/Attendance');
const Location   = require('../models/Location');

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const filter = { role: 'user' };
    if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await User.countDocuments(filter);
    const users = await User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));
    res.json({ success: true, data: { users, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PATCH /api/admin/users/:id/toggle ───────────────────────────────────────
exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}.`, data: { user } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/admin/location/create ─────────────────────────────────────────
exports.createLocation = async (req, res) => {
  try {
    const { locationName, latitude, longitude, radius, description } = req.body;
    if (!locationName || latitude == null || longitude == null) {
      return res.status(400).json({ success: false, message: 'locationName, latitude, longitude are required.' });
    }
    const location = await Location.create({
      locationName, latitude, longitude,
      radius: radius || 100,
      description: description || '',
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, message: 'Location created.', data: { location } });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'Location name already exists.' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/admin/locations ─────────────────────────────────────────────────
exports.getLocations = async (req, res) => {
  try {
    const locations = await Location.find().populate('createdBy', 'name email').sort({ createdAt: -1 });
    res.json({ success: true, data: { locations } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/admin/location/:id ──────────────────────────────────────────────
exports.updateLocation = async (req, res) => {
  try {
    const location = await Location.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!location) return res.status(404).json({ success: false, message: 'Location not found.' });
    res.json({ success: true, message: 'Location updated.', data: { location } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── DELETE /api/admin/location/:id ──────────────────────────────────────────
exports.deleteLocation = async (req, res) => {
  try {
    const location = await Location.findByIdAndDelete(req.params.id);
    if (!location) return res.status(404).json({ success: false, message: 'Location not found.' });
    res.json({ success: true, message: 'Location deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/admin/attendance/all ───────────────────────────────────────────
exports.getAllAttendance = async (req, res) => {
  try {
    const { page = 1, limit = 50, date, userId } = req.query;
    const filter = {};
    if (date)   filter.date   = date;
    if (userId) filter.userId = userId;
    const skip    = (parseInt(page) - 1) * parseInt(limit);
    const total   = await Attendance.countDocuments(filter);
    const records = await Attendance.find(filter)
      .populate('userId',     'name email department employeeId')
      .populate('locationId', 'locationName')
      .sort({ date: -1, checkInTime: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    res.json({ success: true, data: { records, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/admin/analytics ─────────────────────────────────────────────────
exports.getAnalytics = async (req, res) => {
  try {
    const totalUsers      = await User.countDocuments({ role: 'user' });
    const totalLocations  = await Location.countDocuments({ isActive: true });
    const today           = new Date().toISOString().split('T')[0];
    const todayAttendance = await Attendance.countDocuments({ date: today });
    const totalAttendance = await Attendance.countDocuments();

    // Last 7 days attendance counts
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d  = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const count = await Attendance.countDocuments({ date: ds });
      last7.push({ date: ds, count });
    }

    // Status breakdown
    const statusBreakdown = await Attendance.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        totalUsers, totalLocations, todayAttendance, totalAttendance,
        last7DaysAttendance: last7,
        statusBreakdown,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/admin/reports/export ───────────────────────────────────────────
exports.exportReport = async (req, res) => {
  try {
    const { format = 'json', month, year } = req.query;
    const filter = {};
    if (month && year) {
      const m = String(month).padStart(2, '0');
      filter.date = { $regex: `^${year}-${m}` };
    }

    const records = await Attendance.find(filter)
      .populate('userId',     'name email department employeeId')
      .populate('locationId', 'locationName')
      .sort({ date: -1 });

    const data = records.map(r => ({
      Name:        r.userId?.name        || '',
      Email:       r.userId?.email       || '',
      Department:  r.userId?.department  || '',
      EmployeeID:  r.userId?.employeeId  || '',
      Date:        r.date,
      Status:      r.status,
      CheckIn:     r.checkInTime  ? new Date(r.checkInTime).toLocaleTimeString()  : '',
      CheckOut:    r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : '',
      WorkingHrs:  r.workingHours || '',
      Location:    r.locationId?.locationName || '',
      Distance:    r.distanceAtCheckIn != null ? `${r.distanceAtCheckIn}m` : '',
    }));

    if (format === 'xlsx') {
      const XLSX = require('xlsx');
      const ws   = XLSX.utils.json_to_sheet(data);
      const wb   = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=attendance_${year || 'all'}_${month || 'all'}.xlsx`,
      });
      return res.send(buffer);
    }

    // Default: JSON
    res.json({ success: true, data: { records: data, total: data.length } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
