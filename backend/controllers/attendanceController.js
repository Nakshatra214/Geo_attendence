const Attendance = require('../models/Attendance');
const Location   = require('../models/Location');
const { checkGeofence } = require('../utils/geofence');

// Helper: get today's date string "YYYY-MM-DD"
const todayString = () => new Date().toISOString().split('T')[0];

// ─── POST /api/attendance/checkin ─────────────────────────────────────────────
exports.checkIn = async (req, res) => {
  try {
    const { latitude, longitude, locationId } = req.body;
    const userId = req.user._id;

    if (latitude == null || longitude == null || !locationId) {
      return res.status(400).json({
        success: false,
        message: 'latitude, longitude, and locationId are required.',
      });
    }

    // Validate GPS range
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      return res.status(400).json({ success: false, message: 'Invalid GPS coordinates.' });
    }

    // Find authorized location
    const location = await Location.findById(locationId);
    if (!location || !location.isActive) {
      return res.status(404).json({ success: false, message: 'Authorized location not found.' });
    }

    // ── Server-side geofence check ────────────────────────────────────────────
    const { isInside, distance } = checkGeofence(
      parseFloat(latitude),
      parseFloat(longitude),
      location.latitude,
      location.longitude,
      location.radius
    );

    if (!isInside) {
      return res.status(403).json({
        success: false,
        message: `You are ${distance}m away from "${location.locationName}". Must be within ${location.radius}m.`,
        data: { distance, allowedRadius: location.radius },
      });
    }

    // Check duplicate attendance today
    const today = todayString();
    const existing = await Attendance.findOne({ userId, date: today });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Attendance already marked for today.',
        data: { attendance: existing },
      });
    }

    // Determine if late (after 09:30)
    const now   = new Date();
    const hours = now.getHours();
    const mins  = now.getMinutes();
    const isLate = hours > 9 || (hours === 9 && mins > 30);

    const attendance = await Attendance.create({
      userId,
      locationId,
      date: today,
      checkInTime: now,
      checkInLatitude: latitude,
      checkInLongitude: longitude,
      distanceAtCheckIn: distance,
      status: isLate ? 'late' : 'present',
    });

    await attendance.populate('locationId', 'locationName latitude longitude radius');

    res.status(201).json({
      success: true,
      message: `Check-in successful at "${location.locationName}" (${distance}m away).`,
      data: { attendance },
    });
  } catch (err) {
    console.error('Check-in error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/attendance/checkout ───────────────────────────────────────────
exports.checkOut = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const userId = req.user._id;
    const today  = todayString();

    const attendance = await Attendance.findOne({ userId, date: today });
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'No check-in found for today.' });
    }

    if (attendance.checkOutTime) {
      return res.status(409).json({ success: false, message: 'Already checked out for today.' });
    }

    const now = new Date();
    attendance.checkOutTime      = now;
    attendance.checkOutLatitude  = latitude || null;
    attendance.checkOutLongitude = longitude || null;

    // Working hours
    const diffMs    = now - attendance.checkInTime;
    attendance.workingHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

    // If less than 4 hours, mark half-day
    if (attendance.workingHours < 4) {
      attendance.status = 'half-day';
    }

    await attendance.save();
    await attendance.populate('locationId', 'locationName');

    res.json({
      success: true,
      message: `Check-out successful. Total working hours: ${attendance.workingHours}h.`,
      data: { attendance },
    });
  } catch (err) {
    console.error('Check-out error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/attendance/history/:userId ──────────────────────────────────────
exports.getHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, month, year } = req.query;

    // Users can only see their own; admins can see anyone
    if (req.user.role !== 'admin' && req.user._id.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const filter = { userId };
    if (month && year) {
      const m = String(month).padStart(2, '0');
      filter.date = { $regex: `^${year}-${m}` };
    } else if (year) {
      filter.date = { $regex: `^${year}` };
    }

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Attendance.countDocuments(filter);
    const records = await Attendance.find(filter)
      .populate('locationId', 'locationName')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Calculate summary
    const allRecords  = await Attendance.find({ userId });
    const totalDays   = allRecords.length;
    const presentDays = allRecords.filter(r => ['present', 'late'].includes(r.status)).length;
    const percentage  = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        records,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
        summary: { totalDays, presentDays, attendancePercentage: `${percentage}%` },
      },
    });
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/attendance/today ────────────────────────────────────────────────
exports.getTodayStatus = async (req, res) => {
  try {
    const today      = todayString();
    const attendance = await Attendance.findOne({ userId: req.user._id, date: today })
      .populate('locationId', 'locationName');

    res.json({
      success: true,
      data: { attendance, date: today },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
