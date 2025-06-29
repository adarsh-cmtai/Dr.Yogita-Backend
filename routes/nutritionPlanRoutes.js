const express = require('express');
const router = express.Router();

// 1. Import the controller functions that actually exist.
// downloadNutritionPlanPdf is removed because it's handled by Cloudinary URLs now.
const {
    createNutritionPlan,
    getNutritionPlans,
    getNutritionPlanBySlug,
    getNutritionPlanById,
    updateNutritionPlan,
    deleteNutritionPlan
} = require('../controllers/nutritionPlanController');

// 2. Import the correct, centralized middleware.
// This middleware is already configured for memory storage for Cloudinary.
const { uploadNutritionPlanAssets } = require('../middlewares/uploadMiddleware');

// 3. Define the routes cleanly.

// GET all plans and CREATE a new plan
router.route('/')
    .get(getNutritionPlans)
    .post(uploadNutritionPlanAssets, createNutritionPlan);

// GET a single plan by its unique ID (for admin editing)
router.route('/id/:id')
    .get(getNutritionPlanById);

// GET a single plan by its public-facing slug
router.route('/:slug')
    .get(getNutritionPlanBySlug);

// UPDATE and DELETE a specific plan by its unique ID
router.route('/:id')
    .put(uploadNutritionPlanAssets, updateNutritionPlan)
    .delete(deleteNutritionPlan);


// All local multer configuration has been removed from this file.
// The '/download/:id' route has been removed as it is no longer needed.

module.exports = router;
