// backend/routes/programRoutes.js
const express = require('express');
const router = express.Router();
const {
  getAllPrograms,
  getProgramsBySeriesId, // New
  getProgramBySlug,
  getProgramById,
  createProgram,
  updateProgram,
  deleteProgram,
} = require('../controllers/programController');
const { M_uploadProgramThumbnailForCloudinary } = require('../middlewares/uploadMiddleware');
// const { protect, admin } = require('../middlewares/authMiddleware'); // TODO: Add auth

// Public routes
router.get('/', getAllPrograms); // Can be used for general listing or admin
router.get('/series/:seriesId', getProgramsBySeriesId); // NEW: For fetching programs for a specific series
router.get('/id/:id', getProgramById);
router.get('/:slug', getProgramBySlug); // For individual program pages

// Protected/Admin routes (TODO: uncomment protect/admin)
router.post('/', /* protect, admin, */ M_uploadProgramThumbnailForCloudinary, createProgram);
router.put('/:id', /* protect, admin, */ M_uploadProgramThumbnailForCloudinary, updateProgram);
router.delete('/:id', /* protect, admin, */ deleteProgram);

module.exports = router;
