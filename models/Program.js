// backend/models/Program.js
const mongoose = require('mongoose');
const slugify = require('slugify'); // You'll need to install this: npm install slugify

const ProgramSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    unique: true,
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
  },
  duration: { // e.g., "35 min"
    type: String,
    required: [true, 'Duration is required'],
  },
  thumbnailUrl: {
    type: String,
    required: [true, 'Thumbnail URL is required'],
  },
  cloudinaryPublicId: { // To delete from Cloudinary if needed
    type: String,
    required: [true, 'Cloudinary Public ID is required'],
  },
  youtubeLink: {
    type: String,
    trim: true,
    // Basic validation for YouTube URL (can be more complex)
    match: [
      /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/,
      'Please enter a valid YouTube URL if provided'
    ],
    default: '' // Default to empty string if not provided
  },
  slug: {
    type: String,
    unique: true,
  },
  publishDate: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Middleware to create slug from title before saving
ProgramSchema.pre('save', function (next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

module.exports = mongoose.model('Program', ProgramSchema);