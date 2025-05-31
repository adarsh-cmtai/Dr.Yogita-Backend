// backend/routes/podcastSeriesRoutes.js
const express = require('express');
const router = express.Router();
const {
  createPodcastSeries,
  getAllPodcastSeries,
  getPodcastSeriesByIdentifier,
  updatePodcastSeries,
  deletePodcastSeries,
} = require('../controllers/podcastSeriesController');
const { uploadPodcastSeriesCover } = require('../middlewares/uploadMiddleware'); // Middleware for cover image

// Public routes
router.get('/', getAllPodcastSeries);
router.get('/:identifier', getPodcastSeriesByIdentifier); // Can be ID or slug

// Protected routes (add authentication middleware here eventually)
router.post('/', uploadPodcastSeriesCover, createPodcastSeries); // Use multer middleware for cover image
router.put('/:id', uploadPodcastSeriesCover, updatePodcastSeries); // Use multer for cover image update
router.delete('/:id', deletePodcastSeries);

module.exports = router;