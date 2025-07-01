// backend/models/Appointment.js
const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please fill a valid email address'
    ]
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
  },
  age: {
    type: Number,
    required: [true, 'Age is required'],
  },
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: ['Male', 'Female', 'Other'],
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
  },
  consultationMode: {
    type: String,
    required: [true, 'Consultation mode is required'],
    enum: ['Online', 'Offline (In-Clinic)'],
  },
  message: {
    type: String,
    required: [true, 'Health concern message is required'],
    trim: true,
  },
  status: {
    type: String,
    enum: ['New', 'Contacted', 'Completed', 'Cancelled'],
    default: 'New',
  }
}, { timestamps: true });

module.exports = mongoose.model('Appointment', AppointmentSchema);
