// backend/models/NutritionPlan.js
const mongoose = require('mongoose');
const slugify = require('slugify');

const NutritionPlanSchema = new mongoose.Schema({
    title: { type: String, required: [true, "Title is required"], trim: true, maxlength: [100, "Title cannot be more than 100 characters"] },
    description: { type: String, required: [true, "Description is required"], trim: true },
    price: { type: Number, required: [true, "Price is required"], min: [0, "Price cannot be negative"] },
    pages: { type: Number, min: [1, "Pages must be at least 1"] },
    thumbnail: {
        key: String, // Filename on disk
        url: String  // Relative public URL (e.g., /uploads/nutrition-thumbnails/filename.jpg)
    },
    pdfDocument: {
        key: String, // Filename on disk
        url: String  // Relative public URL (e.g., /uploads/nutrition-pdfs/filename.pdf)
    },
    category: { type: String, required: [true, "Category is required"], trim: true },
    slug: { type: String, unique: true, trim: true },
    razorpayPaymentLink: { type: String, trim: true, default: '' }, // ADDED razorpayPaymentLink
}, { timestamps: true });

NutritionPlanSchema.pre('save', async function(next) {
    if (this.isModified('title') || this.isNew) {
        try {
            let baseSlug = slugify(this.title, { lower: true, strict: true, replacement: '-' });
            let slug = baseSlug;
            let count = 0;
            // Ensure unique slug
            while (true) {
                const existingPlan = await this.constructor.findOne({ slug: slug });
                if (!existingPlan || existingPlan._id.equals(this._id)) { // If no plan with this slug, or if it's the same plan being updated
                    break;
                }
                count++;
                slug = `${baseSlug}-${count}`;
            }
            this.slug = slug;
            next();
        } catch (err) {
            console.error("Error in pre-save slug generation (NutritionPlan):", err);
            next(err); 
        }
    } else {
        return next();
    }
});

module.exports = mongoose.model('NutritionPlan', NutritionPlanSchema);