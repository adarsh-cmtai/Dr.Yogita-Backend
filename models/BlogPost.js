// backend/models/BlogPost.js
const mongoose = require('mongoose');
const slugify = require('slugify');

const BlogPostSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a title'],
        trim: true,
        unique: true,
    },
    slug: {
        type: String,
        unique: true,
    },
    content: {
        type: String,
        required: [true, 'Please add content'],
    },
    excerpt: {
        type: String,
        required: [true, 'Please add an excerpt'],
        maxlength: [300, 'Excerpt cannot be more than 300 characters'],
    },
    coverImage: { // From Cloudinary
        url: { type: String, required: true },
        public_id: { type: String, required: true },
    },
    categories: [{
        type: String,
        trim: true,
        lowercase: true,
    }],
    author: {
        name: { type: String, default: 'Dr. Yogita Physiotherapy' },
        bio: { type: String },
        avatar: { url: String, public_id: String }, // If author has a specific avatar
        socialLinks: {
            instagram: String,
            facebook: String,
            linkedin: String,
        }
    },
    isFeatured: {
        type: Boolean,
        default: false,
    },
    status: {
        type: String,
        enum: ['draft', 'published'],
        default: 'draft',
    },
    metaTitle: { type: String, trim: true },
    metaDescription: { type: String, trim: true },
    readingTime: { // e.g., "5 min read"
        type: String,
    },
    // Make sure 'date' is handled by timestamps or explicitly if needed for display
}, { timestamps: true }); // `createdAt` and `updatedAt` will be added automatically

// Create slug from title before saving
BlogPostSchema.pre('save', function (next) {
    if (this.isModified('title') || this.isNew) {
        this.slug = slugify(this.title, { lower: true, strict: true, replacement: '-' });
    }
    next();
});

module.exports = mongoose.model('BlogPost', BlogPostSchema);