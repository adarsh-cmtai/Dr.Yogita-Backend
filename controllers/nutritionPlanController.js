const NutritionPlan = require('../models/NutritionPlan');
const asyncHandler = require('express-async-handler');
const slugify = require('slugify');
// Corrected import path based on your folder structure
const cloudinary = require('../config/cloudinary'); 
const streamifier = require('streamifier');

const uploadToCloudinary = (fileBuffer, options) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
            if (error) {
                return reject(error);
            }
            resolve(result);
        });
        streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    });
};

exports.createNutritionPlan = asyncHandler(async (req, res) => {
    const { title, description, price, pages, category, razorpayPaymentLink } = req.body;
    const thumbnailFile = req.files?.thumbnailFile?.[0];
    const pdfFileNew = req.files?.pdfFileNew?.[0];

    if (!title || !description || !price || !category) {
        return res.status(400).json({ success: false, error: "Title, Description, Price, and Category are required." });
    }
    if (!thumbnailFile || !pdfFileNew) {
        return res.status(400).json({ success: false, error: "Thumbnail and PDF document are required." });
    }

    const planData = { title, description, price: Number(price), category, razorpayPaymentLink: razorpayPaymentLink || '' };
    if (pages) planData.pages = Number(pages);

    const [thumbResult, pdfResult] = await Promise.all([
        uploadToCloudinary(thumbnailFile.buffer, { folder: 'nutrition-thumbnails' }),
        uploadToCloudinary(pdfFileNew.buffer, { folder: 'nutrition-pdfs', resource_type: 'raw' })
    ]);

    planData.thumbnail = { url: thumbResult.secure_url, key: thumbResult.public_id };
    planData.pdfDocument = { url: pdfResult.secure_url, key: pdfResult.public_id };
    
    const nutritionPlan = await NutritionPlan.create(planData);
    res.status(201).json({ success: true, data: nutritionPlan });
});

exports.updateNutritionPlan = asyncHandler(async (req, res) => {
    let plan = await NutritionPlan.findById(req.params.id);
    if (!plan) { 
        res.status(404); 
        throw new Error('Nutrition plan not found'); 
    }

    const { title, description, price, pages, category, thumbnail: thumbnailUrl, pdfUrl, razorpayPaymentLink } = req.body;
    const thumbnailFile = req.files?.thumbnailFile?.[0];
    const pdfFileNew = req.files?.pdfFileNew?.[0];

    if (title) plan.title = title;
    if (description) plan.description = description;
    if (price !== undefined) plan.price = Number(price);
    if (pages !== undefined) plan.pages = pages ? Number(pages) : undefined;
    if (category) plan.category = category;
    if (razorpayPaymentLink !== undefined) plan.razorpayPaymentLink = razorpayPaymentLink;

    if (thumbnailFile) {
        if (plan.thumbnail?.key) await cloudinary.uploader.destroy(plan.thumbnail.key);
        const result = await uploadToCloudinary(thumbnailFile.buffer, { folder: 'nutrition-thumbnails' });
        plan.thumbnail = { url: result.secure_url, key: result.public_id };
    } else if (!thumbnailUrl && plan.thumbnail?.key) {
        await cloudinary.uploader.destroy(plan.thumbnail.key);
        plan.thumbnail = undefined;
    }

    if (pdfFileNew) {
        if (plan.pdfDocument?.key) await cloudinary.uploader.destroy(plan.pdfDocument.key, { resource_type: 'raw' });
        const result = await uploadToCloudinary(pdfFileNew.buffer, { folder: 'nutrition-pdfs', resource_type: 'raw' });
        plan.pdfDocument = { url: result.secure_url, key: result.public_id };
    } else if (!pdfUrl && plan.pdfDocument?.key) {
        await cloudinary.uploader.destroy(plan.pdfDocument.key, { resource_type: 'raw' });
        plan.pdfDocument = undefined;
    }
    
    const updatedPlan = await plan.save();
    res.status(200).json({ success: true, data: updatedPlan });
});

exports.getNutritionPlanById = asyncHandler(async (req, res) => {
    const plan = await NutritionPlan.findById(req.params.id);
    if (!plan) {
        res.status(404);
        throw new Error('Nutrition plan not found');
    }
    res.status(200).json({ success: true, data: plan });
});

exports.getNutritionPlans = asyncHandler(async (req, res) => {
    const { category: queryCategory, search, page = 1, limit = 10 } = req.query;
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
    const nutritionPlans = await NutritionPlan.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum);
    const categories = await NutritionPlan.distinct('category');
    
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

exports.getNutritionPlanBySlug = asyncHandler(async (req, res) => {
    const nutritionPlan = await NutritionPlan.findOne({ slug: req.params.slug });
    if (!nutritionPlan) { 
        res.status(404); 
        throw new Error('Nutrition plan not found'); 
    }
    res.status(200).json({ success: true, data: nutritionPlan });
});

exports.deleteNutritionPlan = asyncHandler(async (req, res) => {
    const plan = await NutritionPlan.findById(req.params.id);
    if (!plan) { 
        res.status(404); 
        throw new Error('Nutrition plan not found'); 
    }

    const deletions = [];
    if (plan.thumbnail?.key) {
        deletions.push(cloudinary.uploader.destroy(plan.thumbnail.key));
    }
    if (plan.pdfDocument?.key) {
        deletions.push(cloudinary.uploader.destroy(plan.pdfDocument.key, { resource_type: 'raw' }));
    }
    
    if (deletions.length > 0) {
        await Promise.all(deletions);
    }
    
    await plan.deleteOne();
    res.status(200).json({ success: true, message: 'Nutrition plan removed' });
});
