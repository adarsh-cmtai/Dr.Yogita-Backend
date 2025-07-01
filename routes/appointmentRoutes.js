// backend/routes/appointmentRoutes.js
const express = require('express');
const router = express.Router();
const {
  createAppointment,
  getAllAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  deleteAppointment
} = require('../controllers/appointmentController');

// This route is public for anyone to submit the form
router.post('/', createAppointment);

// These routes should be protected by an authentication middleware in a real app
router.get('/', getAllAppointments);
router.get('/:id', getAppointmentById);
router.put('/:id/status', updateAppointmentStatus);
router.delete('/:id', deleteAppointment);

module.exports = router;
