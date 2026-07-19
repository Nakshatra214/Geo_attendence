const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    locationName: {
      type: String,
      required: [true, 'Location name is required'],
      trim: true,
      unique: true,
    },
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90,  'Latitude must be between -90 and 90'],
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180,  'Longitude must be between -180 and 180'],
    },
    radius: {
      type: Number,
      required: [true, 'Radius is required'],
      min: [10,   'Radius must be at least 10 meters'],
      max: [5000, 'Radius cannot exceed 5000 meters'],
      default: 100,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Location', locationSchema);
