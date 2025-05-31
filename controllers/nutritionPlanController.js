// backend/controllers/nutritionPlanController.js
const NutritionPlan = require('../models/NutritionPlan');
const asyncHandler = require('express-async-handler');
const fs = require('fs');
const path = require('path');
const slugify = require('slugify');

// Base directory for serving public files (adjust if your structure is different)
// server.js should have `app.use(express.static(path.join(__dirname, '..', 'public')));`
const basePublicDir = path.join(__dirname, '..', 'public');

// @desc    Create a new nutrition plan
// @route   POST /api/nutrition-plans
// @access  Private/Admin
exports.createNutritionPlan = asyncHandler(async (req, res) => {
    const { title, description, price, pages, category, razorpayPaymentLink } = req.body;
    const thumbnailFile = req.files?.thumbnailFile ? req.files.thumbnailFile[0] : null;
    const pdfFileNew = req.files?.pdfFileNew ? req.files.pdfFileNew[0] : null;

    if (!title || !description || !price || !category) {
      return res.status(400).json({ success: false, error: "Title, Description, Price, and Category are required." });
    }
    if (!thumbnailFile || !pdfFileNew) {
        return res.status(400).json({ success: false, error: "Thumbnail and PDF document are required for new plan." });
    }

    const planData = {
        title, description,
        price: Number(price),
        pages: pages ? Number(pages) : undefined,
        category,
        razorpayPaymentLink: razorpayPaymentLink || '' // Add razorpayPaymentLink, default to empty string if not provided
    };

    // Paths for URLs should be relative to the 'public' folder
    if (thumbnailFile) {
        planData.thumbnail = {
            url: `/uploads/nutrition-thumbnails/${thumbnailFile.filename}`, // Relative path for serving
            key: thumbnailFile.filename // Store filename as key for deletion
        };
    }
    if (pdfFileNew) {
        planData.pdfDocument = {
            url: `/uploads/nutrition-pdfs/${pdfFileNew.filename}`,
            key: pdfFileNew.filename
        };
    }
    
    const nutritionPlan = await NutritionPlan.create(planData);
    res.status(201).json({ success: true, data: nutritionPlan });
});

// @desc    Update a nutrition plan
// @route   PUT /api/nutrition-plans/:id
// @access  Private/Admin
exports.updateNutritionPlan = asyncHandler(async (req, res) => {
    let plan = await NutritionPlan.findById(req.params.id);
    if (!plan) { 
        res.status(404); 
        throw new Error('Nutrition plan not found'); 
    }

    const { 
        title, 
        description, 
        price, 
        pages, 
        category, 
        thumbnail: thumbnailUrlFromForm, // Existing thumbnail URL string if no new file
        pdfFile: pdfFileUrlFromForm,     // Existing PDF URL string if no new file
        razorpayPaymentLink              // Razorpay link from form
    } = req.body;

    const thumbnailFile = req.files?.thumbnailFile ? req.files.thumbnailFile[0] : null;
    const pdfFileNew = req.files?.pdfFileNew ? req.files.pdfFileNew[0] : null;

    // Update text fields
    if (title) plan.title = title; // Slug will be updated by pre-save hook if title changes
    if (description) plan.description = description;
    if (price !== undefined) plan.price = Number(price);
    if (pages !== undefined) plan.pages = pages === '' || pages === null ? undefined : Number(pages); // Set to undefined if empty to allow optional removal
    if (category) plan.category = category;
    
    // Update razorpayPaymentLink. Allow setting to empty string to clear it.
    if (razorpayPaymentLink !== undefined) {
        plan.razorpayPaymentLink = razorpayPaymentLink;
    }

    // Handle Thumbnail (Local Storage Logic)
    if (thumbnailFile) { // New thumbnail uploaded
        if (plan.thumbnail && plan.thumbnail.key) { // Delete old local file
            const oldThumbPath = path.join(basePublicDir, 'uploads', 'nutrition-thumbnails', plan.thumbnail.key);
            if (fs.existsSync(oldThumbPath)) try { fs.unlinkSync(oldThumbPath); } catch(e){ console.warn("Old local thumb delete failed:", e.message); }
        }
        plan.thumbnail = { url: `/uploads/nutrition-thumbnails/${thumbnailFile.filename}`, key: thumbnailFile.filename };
    } else if ((thumbnailUrlFromForm === '' || thumbnailUrlFromForm === null) && plan.thumbnail) { // Thumbnail explicitly cleared from form
         if (plan.thumbnail.key) {
            const oldThumbPath = path.join(basePublicDir, 'uploads', 'nutrition-thumbnails', plan.thumbnail.key);
            if (fs.existsSync(oldThumbPath)) try { fs.unlinkSync(oldThumbPath); } catch(e){ console.warn("Old local thumb delete failed (clear):", e.message); }
        }
        plan.thumbnail = undefined; // Or null, depending on schema
    }
    // If thumbnailUrlFromForm contains the existing URL and no new file, no action needed for thumbnail field itself,
    // unless you want to handle cases where the URL string changes without a new file (less common for local uploads).

    // Handle PDF (Local Storage Logic)
    if (pdfFileNew) { // New PDF uploaded
        if (plan.pdfDocument && plan.pdfDocument.key) { // Delete old local PDF
            const oldPdfPath = path.join(basePublicDir, 'uploads', 'nutrition-pdfs', plan.pdfDocument.key);
            if (fs.existsSync(oldPdfPath)) try { fs.unlinkSync(oldPdfPath); } catch(e){ console.warn("Old local pdf delete failed:", e.message); }
        }
        plan.pdfDocument = { url: `/uploads/nutrition-pdfs/${pdfFileNew.filename}`, key: pdfFileNew.filename };
    } else if ((pdfFileUrlFromForm === '' || pdfFileUrlFromForm === null) && plan.pdfDocument) { // PDF explicitly cleared
        if (plan.pdfDocument.key) {
            const oldPdfPath = path.join(basePublicDir, 'uploads', 'nutrition-pdfs', plan.pdfDocument.key);
            if (fs.existsSync(oldPdfPath)) try { fs.unlinkSync(oldPdfPath); } catch(e){ console.warn("Old local pdf delete failed (clear):", e.message); }
        }
        plan.pdfDocument = undefined; // If PDF can be optional on update
    }
    
    const updatedPlan = await plan.save();
    res.status(200).json({ success: true, data: updatedPlan });
});

// @desc    Get a single nutrition plan by ID (for editing)
// @route   GET /api/nutrition-plans/id/:id
// @access  Public (can be admin only if needed)
exports.getNutritionPlanById = asyncHandler(async (req, res) => {
    const plan = await NutritionPlan.findById(req.params.id);
    console.log("this is plan",plan);
    if (!plan) {
        res.status(404);
        throw new Error('Nutrition plan not found');
    }
    res.status(200).json({ success: true, data: plan }); // Return raw data for form population
});

// @desc    Get all nutrition plans
// @route   GET /api/nutrition-plans
// @access  Public
exports.getNutritionPlans = asyncHandler(async (req, res) => {
    const { category: queryCategory, search, page = 1, limit = 10 } = req.query; // Added pagination
    let query = {};

    if (queryCategory) query.category = queryCategory;
    if (search) {
        query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
        ];
    }
    
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const totalPlans = await NutritionPlan.countDocuments(query);
    const nutritionPlans = await NutritionPlan.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);
    
    const categories = await NutritionPlan.distinct('category'); // Get all unique categories
    
    res.status(200).json({ 
        success: true, 
        count: nutritionPlans.length,
        total: totalPlans,
        pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil(totalPlans / limitNum),
            hasNextPage: pageNum * limitNum < totalPlans,
            hasPrevPage: pageNum > 1
        },
        data: nutritionPlans, 
        categories: categories 
    });
});

// @desc    Get single nutrition plan by slug
// @route   GET /api/nutrition-plans/:slug
// @access  Public
exports.getNutritionPlanBySlug = asyncHandler(async (req, res) => {
    const nutritionPlan = await NutritionPlan.findOne({ slug: req.params.slug });
    if (!nutritionPlan) { 
        res.status(404); 
        throw new Error('Nutrition plan not found'); 
    }
    res.status(200).json({ success: true, data: nutritionPlan });
});

// @desc    Delete a nutrition plan
// @route   DELETE /api/nutrition-plans/:id
// @access  Private/Admin
exports.deleteNutritionPlan = asyncHandler(async (req, res) => {
    const plan = await NutritionPlan.findById(req.params.id);
    if (!plan) { 
        res.status(404); 
        throw new Error('Nutrition plan not found'); 
    }

    // Delete local files if they exist
    if (plan.thumbnail && plan.thumbnail.key) {
        const thumbPath = path.join(basePublicDir, 'uploads', 'nutrition-thumbnails', plan.thumbnail.key);
        if (fs.existsSync(thumbPath)) try {fs.unlinkSync(thumbPath);} catch(e){console.warn("unlink thumb failed on delete:", e.message)}
    }
    if (plan.pdfDocument && plan.pdfDocument.key) {
        const pdfPath = path.join(basePublicDir, 'uploads', 'nutrition-pdfs', plan.pdfDocument.key);
        if (fs.existsSync(pdfPath)) try {fs.unlinkSync(pdfPath);} catch(e){console.warn("unlink pdf failed on delete:", e.message)}
    }
    
    await plan.deleteOne(); // Mongoose v6+
    res.status(200).json({ success: true, message: 'Nutrition plan removed' });
});

// @desc    Download a nutrition plan PDF
// @route   GET /api/nutrition-plans/download/:id
// @access  Public (can be secured if needed)
exports.downloadNutritionPlanPdf = asyncHandler(async (req, res) => {
    const plan = await NutritionPlan.findById(req.params.id).select('+pdfDocument.key +title'); // Ensure key and title are selected
    if (!plan || !plan.pdfDocument || !plan.pdfDocument.key) {
        res.status(404); 
        throw new Error('PDF not found for this nutrition plan.');
    }

    const pdfPath = path.join(basePublicDir, 'uploads', 'nutrition-pdfs', plan.pdfDocument.key);

    if (fs.existsSync(pdfPath)) {
        const downloadFilename = `${slugify(plan.title, { lower: true, strict: true, replacement: '_' }) || 'nutrition-plan'}.pdf`;
        res.download(pdfPath, downloadFilename, (err) => {
            if (err) {
                console.error("Error during file download (Nutrition Plan):", err);
                if (!res.headersSent) { // Avoid sending headers if already sent
                    res.status(500).send('Could not download the file.');
                }
            }
        });
    } else {
        console.error("File not found for download (Nutrition Plan):", pdfPath);
        res.status(404); 
        throw new Error('File not found on server.');
    }
});