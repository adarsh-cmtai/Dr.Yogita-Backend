// backend/routes/podcastEpisodeRoutes.js
const express = require('express');
const router = express.Router();
const {
  createPodcastEpisode,
  getAllPodcastEpisodesBySeries,
  getPodcastEpisodeById,
  updatePodcastEpisode,
  deletePodcastEpisode,
} = require('../controllers/podcastEpisodeController'); // Ensure controller name matches
const { uploadPodcastEpisodeThumbnail } = require('../middlewares/uploadMiddleware'); // Middleware for episode thumbnail

// Public routes
router.get('/series/:seriesId', getAllPodcastEpisodesBySeries);
router.get('/:id', getPodcastEpisodeById);

// Protected routes (add authentication middleware here eventually)
router.post('/', uploadPodcastEpisodeThumbnail, createPodcastEpisode); // Use multer for thumbnail
router.put('/:id', uploadPodcastEpisodeThumbnail, updatePodcastEpisode); // Use multer for thumbnail update
router.delete('/:id', deletePodcastEpisode);

module.exports = router;