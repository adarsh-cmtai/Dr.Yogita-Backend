// backend/routes/nutritionPlanRoutes.js
const express = require('express');
const router = express.Router();
const fs = require('fs'); // For mkdirSync
const pathNode = require('path'); // Renamed to avoid conflict with frontend 'path'
const multer = require('multer');

// Adjust the path to your controller file
const {
    createNutritionPlan,
    getNutritionPlans,
    getNutritionPlanBySlug,
    getNutritionPlanById,
    updateNutritionPlan,
    deleteNutritionPlan,
    downloadNutritionPlanPdf
} = require('../controllers/nutritionPlanController'); // Path relative to this routes file

// Multer configuration for local disk storage for Nutrition Plans
const nutritionStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    let destFolder;
    // __dirname is the directory of the current module (i.e., backend/routes)
    if (file.fieldname === "thumbnailFile") {
      // Correct path: backend/public/uploads/nutrition-thumbnails
      destFolder = pathNode.join(__dirname, '..', 'public', 'uploads', 'nutrition-thumbnails');
    } else if (file.fieldname === "pdfFileNew") {
      // Correct path: backend/public/uploads/nutrition-pdfs
      destFolder = pathNode.join(__dirname, '..', 'public', 'uploads', 'nutrition-pdfs');
    } else {
      return cb(new Error('Invalid file fieldname specified for nutrition plan'), null);
    }
    // Ensure directory exists
    fs.mkdirSync(destFolder, { recursive: true });
    cb(null, destFolder);
  },
  filename: function (req, file, cb) {
    // Sanitize filename if needed, here using a simple timestamp approach
    // Adding original extension to the filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = pathNode.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

const nutritionFileFilter = (req, file, cb) => {
  if (file.fieldname === "thumbnailFile") {
    if (file.mimetype.startsWith('image/')) { // Accepts jpeg, png, gif, webp etc.
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image for thumbnail (nutrition).'), false);
    }
  } else if (file.fieldname === "pdfFileNew") {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Not a PDF! Please upload a PDF file for nutrition plan.'), false);
    }
  } else {
    cb(null, false); // Should not happen with defined fields
  }
};

const uploadNutritionPlanAssets = multer({
    storage: nutritionStorage,
    fileFilter: nutritionFileFilter,
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit, adjust as needed
}).fields([
    { name: 'thumbnailFile', maxCount: 1 }, // For new thumbnail, matches controller
    { name: 'pdfFileNew', maxCount: 1 }      // For new PDF, matches controller
]);


// Public routes
router.get('/', getNutritionPlans); // Get all plans (with optional filters)
router.get('/download/:id', downloadNutritionPlanPdf); // Download PDF for a plan
router.get('/id/:id', getNutritionPlanById); // Get by ID (typically for editing on admin)
router.get('/:slug', getNutritionPlanBySlug); // Get by slug (for public client-side page)

// Admin/Protected routes - You'd add authentication/authorization middleware here
// e.g., router.post('/', protect, admin, uploadNutritionPlanAssets, createNutritionPlan);
router.post('/', uploadNutritionPlanAssets, createNutritionPlan);
router.put('/:id', uploadNutritionPlanAssets, updateNutritionPlan);
router.delete('/:id', deleteNutritionPlan);

module.exports = router;