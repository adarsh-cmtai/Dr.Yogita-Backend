const express = require('express');
const router = express.Router();
const {
  createPodcastEpisode,
  getAllPodcastEpisodes,
  getPodcastEpisodeById,
  updatePodcastEpisode,
  deletePodcastEpisode,
} = require('../controllers/podcastController'); // Adjust path

const multer = require('multer');
const storage = multer.memoryStorage(); // Use memoryStorage for Cloudinary
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Not an image! Please upload an image.'), false);
        }
    }
});

// Middleware to handle single file upload specifically named 'thumbnailFile'
// This expects the frontend to send the file under the key 'thumbnailFile'
const uploadMemoryForFields = (fieldsConfig) => (req, res, next) => {
    upload.fields(fieldsConfig)(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                 return res.status(400).json({ success: false, error: `Multer error: ${err.message}` });
            }
            return res.status(400).json({ success: false, error: err.message });
        }
        // Files are available in req.files (e.g., req.files.thumbnailFile[0])
        next();
    });
};

// Public routes
router.get('/', getAllPodcastEpisodes);
router.get('/:id', getPodcastEpisodeById); // For fetching item for edit AND public view by ID

// Protected routes (add authentication middleware here eventually)
router.post('/', uploadMemoryForFields([{ name: 'thumbnailFile', maxCount: 1 }]), createPodcastEpisode);
router.put('/:id', uploadMemoryForFields([{ name: 'thumbnailFile', maxCount: 1 }]), updatePodcastEpisode);
router.delete('/:id', deletePodcastEpisode);

module.exports = router;