// backend/routes/programSeriesRoutes.js
const express = require('express');
const router = express.Router();
const {
    getAllProgramSeries,
    getProgramSeriesById,
    getProgramSeriesBySlug,
    createProgramSeries,
    updateProgramSeries,
    deleteProgramSeries
} = require('../controllers/programSeriesController');
const { M_uploadProgramSeriesCoverForCloudinary } = require('../middlewares/uploadMiddleware');
// const { protect, admin } = require('../middlewares/authMiddleware'); // TODO: Add auth

// Public routes
router.get('/', getAllProgramSeries);
router.get('/id/:id', getProgramSeriesById);
router.get('/:slug', getProgramSeriesBySlug); // Keep slug route simple for frontend

// Protected/Admin routes (TODO: uncomment protect/admin once auth is set up)
router.post('/', /* protect, admin, */ M_uploadProgramSeriesCoverForCloudinary, createProgramSeries);
router.put('/:id', /* protect, admin, */ M_uploadProgramSeriesCoverForCloudinary, updateProgramSeries);
router.delete('/:id', /* protect, admin, */ deleteProgramSeries);

module.exports = router;