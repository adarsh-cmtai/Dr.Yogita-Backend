// backend/middlewares/uploadMiddleware.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// --- SHARED HELPER FUNCTIONS ---
function checkImageFileType(file, cb) {
  if (!file.originalname || typeof file.originalname !== 'string') {
    const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname); 
    err.message = 'File name is missing or invalid for image type check.'; return cb(err);
  }
  const filetypes = /jpeg|jpg|png|gif|webp/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);
  if (mimetype && extname) { return cb(null, true); } 
  else { const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname); err.message = 'Invalid file type. Only images (jpeg, jpg, png, gif, webp) are allowed.'; cb(err); }
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

// --- STORAGE CONFIGURATIONS ---
const memoryStorage = multer.memoryStorage(); // For Cloudinary (Ebooks, Blog Covers, New Podcast System)

const baseUploadsDir = path.join(__dirname, '..', 'public', 'uploads');
fs.mkdirSync(baseUploadsDir, { recursive: true }); // Ensure base uploads dir exists

// Helper to create multer.diskStorage configuration
const createDiskStorageForEntity = (entitySubfolder, filePrefix = '') => {
  const destinationDir = path.join(baseUploadsDir, entitySubfolder);
  fs.mkdirSync(destinationDir, { recursive: true }); // Ensure specific entity subfolder exists

  return multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, destinationDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname);
      // Sanitize original name part to prevent path traversal or invalid characters
      const safeOriginalNamePart = path.basename(file.originalname, extension).substring(0, 40).replace(/[^a-zA-Z0-9_.-]/g, '_');
      cb(null, `${filePrefix}${safeOriginalNamePart}-${uniqueSuffix}${extension}`);
    }
  });
};

// Specific disk storages for entities that save locally
const nutritionThumbnailsStorage = createDiskStorageForEntity('nutrition-thumbnails', 'thumb-');
const nutritionPdfsStorage = createDiskStorageForEntity('nutrition-pdfs', 'plan-');
const podcastThumbnailsStorage = createDiskStorageForEntity('podcast-thumbnails', 'podcast-'); // For old/other podcast disk storage
const programThumbnailsStorage = createDiskStorageForEntity('program-thumbnails', 'program-');
const genericThumbnailsStorage = createDiskStorageForEntity('generic-thumbnails', 'generic-');


// --- MULTER UPLOAD INSTANCES (Existing functionality) ---

// 1. For Ebooks (Thumbnail + PDF, to Memory for Cloudinary)
// Assumes frontend sends field names "thumbnail" and "pdfFile" for Ebooks
const uploadEbookFiles = multer({
  storage: memoryStorage, 
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: function (req, file, cb) {
    if (file.fieldname === "thumbnail") checkImageFileType(file, cb); // Ebook thumbnail
    else if (file.fieldname === "pdfFile") checkPdfFileType(file, cb);   // Ebook PDF
    else cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
  },
}).fields([
  { name: 'thumbnail', maxCount: 1 }, 
  { name: 'pdfFile', maxCount: 1 }    
]);

// 2. For Blog Post Cover Image (Single Image, to Memory for Cloudinary)
// Assumes frontend sends field name "coverImageFile" (as per AdminDashboardPage.tsx)
const uploadBlogCoverImage = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: function (req, file, cb) {
    if (file.fieldname === "coverImageFile") checkImageFileType(file, cb); // Blog cover image
    else cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname + '. Expected coverImageFile.'));
  }
}).single('coverImageFile'); // Matches AdminDashboardPage.tsx FormData key

// 3. For Nutrition Plans (Thumbnail AND PDF to Disk)
// UPDATED to use "thumbnailFile" and "pdfFileNew" to match frontend and controller/routes
const uploadNutritionPlanAssets = multer({
    storage: multer.diskStorage({ 
        destination: function(req, file, cb) {
            let destPath;
            // Field names match AdminDashboardPage.tsx FormData for Nutrition Plans
            if (file.fieldname === 'thumbnailFile') destPath = path.join(baseUploadsDir, 'nutrition-thumbnails');
            else if (file.fieldname === 'pdfFileNew') destPath = path.join(baseUploadsDir, 'nutrition-pdfs');
            else return cb(new Error('Invalid fieldname for nutrition plan asset. Expected "thumbnailFile" or "pdfFileNew".'), null);
            
            fs.mkdirSync(destPath, { recursive: true });
            cb(null, destPath);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const extension = path.extname(file.originalname);
            const originalNamePart = path.basename(file.originalname, extension).substring(0, 50).replace(/[^a-zA-Z0-9_.-]/g, '_');
            cb(null, `${file.fieldname}-${originalNamePart}-${uniqueSuffix}${extension}`);
        }
    }),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    fileFilter: function (req, file, cb) {
        // Field names match AdminDashboardPage.tsx FormData for Nutrition Plans
        if (file.fieldname === "thumbnailFile") checkImageFileType(file, cb);
        else if (file.fieldname === "pdfFileNew") checkPdfFileType(file, cb);
        else cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', `Unexpected field: ${file.fieldname}. Expected "thumbnailFile" or "pdfFileNew".`));
    }
}).fields([
    // Field names match AdminDashboardPage.tsx FormData for Nutrition Plans
    { name: 'thumbnailFile', maxCount: 1 },
    { name: 'pdfFileNew', maxCount: 1 } 
]);

// 4. For single Nutrition Plan Thumbnail (to Disk, if needed separately)
// This uploader expects the field name "thumbnail". If AdminDashboardPage.tsx uses "nutritionThumbnailFile"
// then this specific uploader might need adjustment or might not be directly used by that form.
// For now, keeping as "thumbnail" as it's a separate, potentially generic uploader.
const uploadSingleNutritionThumbnail = multer({
  storage: nutritionThumbnailsStorage, // Uses the pre-configured storage for nutrition thumbnails
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: function(req, file, cb) {
    if (file.fieldname === "thumbnail") checkImageFileType(file, cb);
    else cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname + '. Expected thumbnail.'));
  }
}).single('thumbnail'); 

// 5. For Podcast Thumbnail (Single Image, to Disk - Kept for compatibility if used elsewhere)
// This expects "thumbnail". The newer podcast system in AdminDashboardPage.tsx uses "thumbnailFile" for episodes.
const uploadSinglePodcastThumbnail = multer({
  storage: podcastThumbnailsStorage, 
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: function(req, file, cb) {
    if (file.fieldname === "thumbnail") checkImageFileType(file, cb);
    else cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname + '. Expected thumbnail.'));
  }
}).single('thumbnail'); 

// 6. For Program Thumbnail (Single Image, to Disk)
// AdminDashboardPage.tsx sends "programThumbnailFile", so this expects "thumbnail".
// If this uploader is used by the Program form, the form needs to send "thumbnail" or this needs update.
const uploadSingleProgramThumbnail = multer({
  storage: programThumbnailsStorage, 
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: function(req, file, cb) { // Explicit field check
    if (file.fieldname === "thumbnail") checkImageFileType(file, cb); // Expects "thumbnail"
    else cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname + '. Expected thumbnail.'));
  }
}).single('thumbnail'); // Expects "thumbnail"

// 7. A very generic single thumbnail uploader (to Disk)
const uploadSingleThumbnail = multer({
  storage: genericThumbnailsStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: function(req, file, cb) { // Explicit field check
    if (file.fieldname === "thumbnail") checkImageFileType(file, cb);
    else cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname + '. Expected thumbnail.'));
  }
}).single('thumbnail');


// --- NEW UPLOADERS FOR REFACTORED PODCAST SYSTEM (using Memory Storage for Cloudinary) ---

// 8. For Podcast Series Cover Image (Single Image, to Memory for Cloudinary)
// AdminDashboardPage.tsx sends "podcastSeriesCoverFile"
const uploadPodcastSeriesCover = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: function(req, file, cb) {
    if (file.fieldname === "coverImageFile") checkImageFileType(file, cb); // Matches AdminDashboardPage.tsx
    else cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname + '. Expected coverImageFile.'));
  }
}).single('coverImageFile'); // Matches AdminDashboardPage.tsx

// 9. For Podcast Episode Thumbnail (Single Image, to Memory for Cloudinary)
// AdminDashboardPage.tsx sends "podcastEpisodeThumbnailFile"
const uploadPodcastEpisodeThumbnail = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: function(req, file, cb) {
    if (file.fieldname === "thumbnailFile") checkImageFileType(file, cb); // Matches AdminDashboardPage.tsx
    else cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname + '. Expected thumbnailFile.'));
  }
}).single('thumbnailFile'); // Matches AdminDashboardPage.tsx


module.exports = {
    uploadEbookFiles,
    uploadBlogCoverImage,
    uploadNutritionPlanAssets, // This is the updated one
    uploadSingleNutritionThumbnail, 
    uploadSinglePodcastThumbnail,
    uploadSingleProgramThumbnail,
    uploadSingleThumbnail,        
    uploadPodcastSeriesCover,
    uploadPodcastEpisodeThumbnail,
};