const express = require('express');
const router = express.Router();
const {
  getAllEbooks,
  getEbookBySlug,
  getEbookById,
  createEbook,
  updateEbook,
  deleteEbook,
  downloadEbookPdf,
} = require('../controllers/ebookController'); // Adjust path

const multer = require('multer');
const storage = multer.memoryStorage(); // Use memory storage for Cloudinary
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit for PDF
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'thumbnailFile' && file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else if (file.fieldname === 'pdfFileNew' && file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type or fieldname. Thumbnail must be image, PDF must be application/pdf.'), false);
        }
    }
});

// Middleware to handle multiple distinct file uploads
const uploadMemoryForEbookFields = (req, res, next) => {
    upload.fields([
        { name: 'thumbnailFile', maxCount: 1 }, // New thumbnail upload
        { name: 'pdfFileNew', maxCount: 1 }     // New PDF upload
    ])(req, res, (err) => {
        if (err) {
             if (err instanceof multer.MulterError) {
                 return res.status(400).json({ success: false, error: `Multer error: ${err.message}` });
            }
            return res.status(400).json({ success: false, error: err.message });
        }
        next();
    });
};

router.route('/')
  .get(getAllEbooks)
  .post(uploadMemoryForEbookFields, createEbook);

router.route('/id/:id').get(getEbookById); // Get by ID for editing
router.route('/:slug').get(getEbookBySlug); // Public access by slug
router.route('/download/:id').get(downloadEbookPdf);

router.route('/:id')
  .put(uploadMemoryForEbookFields, updateEbook)
  .delete(deleteEbook);

module.exports = router;