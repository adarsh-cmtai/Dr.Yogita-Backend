const express = require('express');
const router = express.Router();
const {
  getAllPrograms,
  getProgramBySlug,
  getProgramById,
  createProgram,
  updateProgram,
  deleteProgram,
} = require('../controllers/programController'); // Adjust path

const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'thumbnailFile' && file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type or fieldname for program thumbnail.'), false);
        }
    }
});

// Middleware to handle single file upload specifically named 'thumbnailFile'
const uploadMemoryForFields = (fieldsConfig) => (req, res, next) => {
    upload.fields(fieldsConfig)(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                 return res.status(400).json({ success: false, error: `Multer error: ${err.message}` });
            }
            return res.status(400).json({ success: false, error: err.message });
        }
        next();
    });
};

// Public routes
router.get('/', getAllPrograms);
router.get('/id/:id', getProgramById); // Route to get by ID, e.g., for editing
router.get('/:slug', getProgramBySlug); // Keep slug route for public frontend if used

// Protected routes
router.post('/', uploadMemoryForFields([{ name: 'thumbnailFile', maxCount: 1 }]), createProgram);
router.put('/:id', uploadMemoryForFields([{ name: 'thumbnailFile', maxCount: 1 }]), updateProgram);
router.delete('/:id', deleteProgram);

module.exports = router;