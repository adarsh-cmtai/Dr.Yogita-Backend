// backend/models/ProgramSeries.js
const mongoose = require('mongoose');
const slugify = require('slugify');

const ProgramSeriesSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required for the program series'],
    trim: true,
    unique: true,
  },
  description: {
    type: String,
    required: [true, 'Description is required for the program series'],
  },
  coverImageUrl: {
    type: String,
    required: [true, 'Cover image URL is required'],
  },
  coverImageCloudinaryPublicId: {
    type: String,
    required: [true, 'Cloudinary Public ID for cover image is required'],
  },
  slug: {
    type: String,
    unique: true,
  },
  category: {
    type: String,
    trim: true,
  },
  author: { // e.g., "Dr. Yogita"
    type: String,
    trim: true,
  },
  publishDate: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Middleware to create slug from title before saving
ProgramSeriesSchema.pre('save', function (next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

module.exports = mongoose.model('ProgramSeries', ProgramSeriesSchema);