// backend/models/PodcastSeries.js
const mongoose = require('mongoose');

const PodcastSeriesSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Podcast series title is required'],
    trim: true,
    unique: true, // Assuming series titles should be unique
  },
  description: {
    type: String,
    required: [true, 'Podcast series description is required'],
  },
  coverImageUrl: {
    type: String,
    required: [true, 'Cover image URL is required'],
  },
  cloudinaryPublicIdCover: {
    type: String,
    required: [true, 'Cloudinary Public ID for cover image is required'],
  },
  slug: { // For potential SEO friendly URLs, generated from title
    type: String,
    unique: true,
    lowercase: true,
  },
  category: {
    type: String,
    trim: true,
  },
  author: {
    type: String,
    trim: true,
  },
  // Episodes will be linked via PodcastEpisode model's 'podcastSeries' field
}, { timestamps: true });

// Pre-save hook to generate slug from title
PodcastSeriesSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = this.title.toLowerCase().split(' ').join('-').replace(/[^\w-]+/g, '');
  }
  next();
});

module.exports = mongoose.model('PodcastSeries', PodcastSeriesSchema);