// backend/controllers/appointmentController.js
const Appointment = require('../models/Appointment');

// @desc    Create a new appointment request
// @route   POST /api/appointments
// @access  Public
exports.createAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.create(req.body);
    res.status(201).json({ success: true, data: appointment });
  } catch (error) {
    console.error("Error creating appointment:", error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ success: false, error: messages.join(', ') });
    }
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Get all appointment requests
// @route   GET /api/appointments
// @access  Private (you should add auth middleware for this)
exports.getAllAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find().sort({ createdAt: -1 });
    res.json({ success: true, count: appointments.length, data: appointments });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Get a single appointment by ID
// @route   GET /api/appointments/:id
// @access  Private
exports.getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }
    res.json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Update an appointment's status
// @route   PUT /api/appointments/:id/status
// @access  Private
exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['New', 'Contacted', 'Completed', 'Cancelled'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status value' });
    }

    let appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    appointment.status = status;
    await appointment.save();
    
    res.json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};


// @desc    Delete an appointment request
// @route   DELETE /api/appointments/:id
// @access  Private
exports.deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }
    await appointment.deleteOne();
    res.json({ success: true, message: 'Appointment removed' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
