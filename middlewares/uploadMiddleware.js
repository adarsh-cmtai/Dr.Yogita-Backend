const multer = require('multer');
const path = require('path');
const fs = require('fs');

// --- SHARED HELPER FUNCTIONS ---
function checkImageFileType(file, cb) {
  if (!file.originalname || typeof file.originalname !== 'string') {
    const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname);
    err.message = 'File name is missing or invalid for image type check.'; return cb(err);
  }
  const filetypes = /jpeg|jpg|png|gif|webp|avif/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);
  if (mimetype && extname) { return cb(null, true); }
  else { const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname); err.message = 'Invalid file type. Only images (jpeg, jpg, png, gif, webp, avif) are allowed.'; cb(err); }
}

function checkPdfFileType(file, cb) {
  if (!file.originalname || typeof file.originalname !== 'string') {
    const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname);
    err.message = 'File name is missing or invalid for PDF type check.'; return cb(err);
  }
  const filetypes = /pdf/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = file.mimetype === 'application/pdf';
  if (mimetype && extname) { return cb(null, true); }
  else { const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname); err.message = 'Invalid file type. Only PDF files are allowed.'; cb(err); }
}

// ++ NEW HELPER FUNCTION FOR VIDEO FILES ++
function checkVideoFileType(file, cb) {
  if (!file.originalname || typeof file.originalname !== 'string') {
    const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname);
    err.message = 'File name is missing or invalid for video type check.'; return cb(err);
  }
  // Common video types; adjust as needed
  const filetypes = /mp4|mov|avi|wmv|flv|mkv|webm|mpeg/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetypePrefix = /^video\//; // Check if mimetype starts with "video/"
  if (mimetypePrefix.test(file.mimetype) && extname) { return cb(null, true); }
  else { const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname); err.message = 'Invalid file type. Only common video formats (MP4, MOV, AVI, WebM, MPEG etc.) are allowed.'; cb(err); }
}

// --- STORAGE CONFIGURATIONS ---
const memoryStorage = multer.memoryStorage(); // For Cloudinary

const baseUploadsDir = path.join(__dirname, '..', 'public', 'uploads');
fs.mkdirSync(baseUploadsDir, { recursive: true }); // Ensure base uploads dir exists

// Helper to create multer.diskStorage configuration
const createDiskStorageForEntity = (entitySubfolder, filePrefix = '') => {
  const destinationDir = path.join(baseUploadsDir, entitySubfolder);
  fs.mkdirSync(destinationDir, { recursive: true });

  return multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, destinationDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname);
      const safeOriginalNamePart = path.basename(file.originalname, extension).substring(0, 40).replace(/[^a-zA-Z0-9_.-]/g, '_');
      cb(null, `${filePrefix}${safeOriginalNamePart}-${uniqueSuffix}${extension}`);
    }
  });
};

// Specific disk storages for entities that save locally
const nutritionThumbnailsStorage = createDiskStorageForEntity('nutrition-thumbnails', 'thumb-');
const nutritionPdfsStorage = createDiskStorageForEntity('nutrition-pdfs', 'plan-');
const podcastThumbnailsStorage = createDiskStorageForEntity('podcast-thumbnails', 'podcast-');
const programThumbnailsStorage = createDiskStorageForEntity('program-thumbnails', 'program-');
const genericThumbnailsStorage = createDiskStorageForEntity('generic-thumbnails', 'generic-');


// --- EXISTING MULTER UPLOAD INSTANCES (UNCHANGED or assumed correct) ---
// These are kept as they are from your provided code.
const uploadEbookFiles = multer({ storage: memoryStorage, limits: { fileSize: 20 * 1024 * 1024 }, fileFilter: function (req, file, cb) { if (file.fieldname === "thumbnail") checkImageFileType(file, cb); else if (file.fieldname === "pdfFile") checkPdfFileType(file, cb); else cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname)); }, }).fields([ { name: 'thumbnail', maxCount: 1 }, { name: 'pdfFile', maxCount: 1 } ]);
const uploadBlogCoverImage = multer({ storage: memoryStorage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: function (req, file, cb) { if (file.fieldname === "coverImageFile") checkImageFileType(file, cb); else cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname + '. Expected coverImageFile.')); } }).single('coverImageFile');

// THIS IS THE ONLY MODIFIED SECTION
const uploadNutritionPlanAssets = multer({
    storage: memoryStorage, // Changed from diskStorage to memoryStorage for Cloudinary
    limits: { fileSize: 25 * 1024 * 1024 }, // Increased limit slightly for memory handling
    fileFilter: function (req, file, cb) {
        if (file.fieldname === "thumbnailFile") {
            checkImageFileType(file, cb);
        } else if (file.fieldname === "pdfFileNew") {
            checkPdfFileType(file, cb);
        } else {
            cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', `Unexpected field: ${file.fieldname}. Expected "thumbnailFile" or "pdfFileNew".`));
        }
    }
}).fields([
    { name: 'thumbnailFile', maxCount: 1 },
    { name: 'pdfFileNew', maxCount: 1 }
]);

const uploadSingleNutritionThumbnail = multer({ storage: nutritionThumbnailsStorage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: function(req, file, cb) { if (file.fieldname === "thumbnail") checkImageFileType(file, cb); else cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname + '. Expected thumbnail.')); } }).single('thumbnail');
const uploadSinglePodcastThumbnail = multer({ storage: podcastThumbnailsStorage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: function(req, file, cb) { if (file.fieldname === "thumbnail") checkImageFileType(file, cb); else cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname + '. Expected thumbnail.')); } }).single('thumbnail');
const uploadSingleProgramThumbnail = multer({ storage: programThumbnailsStorage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: function(req, file, cb) { if (file.fieldname === "thumbnail") checkImageFileType(file, cb); else cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname + '. Expected thumbnail.')); } }).single('thumbnail');
const uploadSingleThumbnail = multer({ storage: genericThumbnailsStorage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: function(req, file, cb) { if (file.fieldname === "thumbnail") checkImageFileType(file, cb); else cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname + '. Expected thumbnail.')); } }).single('thumbnail');
const uploadPodcastSeriesCover = multer({ storage: memoryStorage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: function(req, file, cb) { if (file.fieldname === "coverImageFile") checkImageFileType(file, cb); else cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname + '. Expected coverImageFile.')); } }).single('coverImageFile');
const uploadPodcastEpisodeThumbnail = multer({ storage: memoryStorage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: function(req, file, cb) { if (file.fieldname === "thumbnailFile") checkImageFileType(file, cb); else cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname + '. Expected thumbnailFile.')); } }).single('thumbnailFile');


// --- MODIFIED MIDDLEWARE SECTION FOR PROGRAM (Thumbnail AND Video) ---

// This multer instance will handle both thumbnail and video for 'Program' entities.
// The variable name _programThumbnailMemoryMulterInstance is kept from your original code,
// but its configuration is updated.
const _programThumbnailMemoryMulterInstance = multer({
    storage: memoryStorage,
    limits: {
        fileSize: 150 * 1024 * 1024, // 150MB limit, adjust for your video sizes
    },
    fileFilter: function (req, file, cb) {
        if (file.fieldname === "thumbnailFile") { // Field for program thumbnail (image)
            checkImageFileType(file, cb);
        } else if (file.fieldname === "videoFile") { // Field for program video
            checkVideoFileType(file, cb);
        } else {
            // If other unexpected files are sent for this route
            cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
        }
    }
});

// This is the exported middleware for program routes.
// It now uses the above configured multer instance to process BOTH thumbnail and video.
// IT IS DIRECTLY THE FUNCTION RETURNED BY .fields(), NOT A WRAPPER.
const M_uploadProgramThumbnailForCloudinary = _programThumbnailMemoryMulterInstance.fields([
    { name: 'thumbnailFile', maxCount: 1 }, // Expects a file input with name="thumbnailFile"
    { name: 'videoFile', maxCount: 1 }      // Expects a file input with name="videoFile"
]);


// Middleware for Program Series Cover Image (remains as it was, assuming it's for image only)
const _programSeriesCoverMemoryMulterInstance = multer({
    storage: memoryStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        checkImageFileType(file, cb); // Assumes this is always for an image
    }
});

// This wrapper structure is generally okay, but direct assignment is simpler if issues arise.
// If this also causes errors, it can be simplified like M_uploadProgramThumbnailForCloudinary.
const M_uploadProgramSeriesCoverForCloudinary = (req, res, next) => {
    const seriesCoverMiddleware = _programSeriesCoverMemoryMulterInstance.fields([
        { name: 'coverImageFile', maxCount: 1 }
    ]);
    seriesCoverMiddleware(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                 return res.status(400).json({ success: false, error: `Multer error (${err.field || 'coverImageFile'}): ${err.message}` });
            }
            return res.status(400).json({ success: false, error: err.message || 'Program series cover image upload error' });
        }
        next();
    });
};

module.exports = {
    // Existing exports
    uploadEbookFiles,
    uploadBlogCoverImage,
    uploadNutritionPlanAssets,
    uploadSingleNutritionThumbnail,
    uploadSinglePodcastThumbnail,
    uploadSingleProgramThumbnail,
    uploadSingleThumbnail,
    uploadPodcastSeriesCover,
    uploadPodcastEpisodeThumbnail,

    // Modified middleware for programs (handles thumbnail and video)
    M_uploadProgramThumbnailForCloudinary,

    // Middleware for program series (handles cover image)
    M_uploadProgramSeriesCoverForCloudinary,
};
