// backend/models/Ebook.js
const mongoose = require('mongoose');
const slugify = require('slugify');

const EbookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    // unique: true, // Typically, slug is used for uniqueness rather than title directly.
                  // If title must be absolutely unique, you can re-enable this,
                  // but it might be too restrictive (e.g. "Yoga Basics" vs "Yoga Basics Advanced")
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
  },
  pages: {
    type: Number,
    required: [true, 'Number of pages is required'],
    min: [1, 'Pages must be at least 1'],
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
  },
  slug: {
    type: String,
    unique: true, // Slug should be unique for URL identification
  },
  thumbnailUrl: {
    type: String,
    required: [true, 'Thumbnail URL is required'],
  },
  thumbnailPublicId: {
    type: String,
    required: [true, 'Thumbnail Cloudinary Public ID is required'],
  },
  pdfFileUrl: {
    type: String,
    required: [true, 'PDF File URL is required'],
  },
  pdfFilePublicId: {
    type: String,
    required: [true, 'PDF File Cloudinary Public ID is required'],
  },
  publishDate: {
    type: Date,
    default: Date.now,
  },
  razorpayPaymentLink: { // <<< NEW FIELD
    type: String,
    trim: true,
    default: null,
    // Optional: basic URL validation
    // match: [/^(https?:\/\/(?:www\.)?[a-zA-Z0-9\-_]+\.[a-zA-Z]{2,}(?:\/\S*)?)$/, 'Please enter a valid URL for Razorpay Payment Link']
  },
}, { timestamps: true }); // Adds createdAt and updatedAt automatically

// Middleware to create/update slug from title before saving
EbookSchema.pre('save', function (next) {
  // Only generate/update slug if the title is modified or it's a new document
  if (this.isModified('title') || this.isNew) {
    this.slug = slugify(this.title, {
      lower: true,      // convert to lower case
      strict: true,     // remove special characters except -
      remove: /[*+~.()'"!:@]/g // remove specific characters that strict might miss or you want to ensure are gone
    });
  }
  next();
});

module.exports = mongoose.model('Ebook', EbookSchema);