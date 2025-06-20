const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'Setting key is required.'],
      unique: true,
      trim: true,
      index: true,
    },
    value: {
      type: String,
      required: [true, 'Setting value is required.'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Setting = mongoose.model('Setting', settingSchema);

module.exports = Setting;
