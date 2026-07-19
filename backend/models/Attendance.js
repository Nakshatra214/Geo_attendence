const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: [true, 'Location ID is required'],
    },
    date: {
      type: String, // "YYYY-MM-DD" for easy duplicate checking
      required: true,
    },
    checkInTime: {
      type: Date,
      default: null,
    },
    checkOutTime: {
      type: Date,
      default: null,
    },
    checkInLatitude: {
      type: Number,
      default: null,
    },
    checkInLongitude: {
      type: Number,
      default: null,
    },
    checkOutLatitude: {
      type: Number,
      default: null,
    },
    checkOutLongitude: {
      type: Number,
      default: null,
    },
    distanceAtCheckIn: {
      type: Number, // meters from authorized location
      default: null,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'half-day'],
      default: 'present',
    },
    workingHours: {
      type: Number,  // computed in hours
      default: null,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// ─── Compound index to prevent duplicate attendance per user per day ───────────
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

// ─── Auto-calculate working hours on checkout ─────────────────────────────────
attendanceSchema.pre('save', function (next) {
  if (this.checkInTime && this.checkOutTime) {
    const diff = this.checkOutTime - this.checkInTime;
    this.workingHours = parseFloat((diff / (1000 * 60 * 60)).toFixed(2));
  }
  next();
});

module.exports = mongoose.model('Attendance', attendanceSchema);
