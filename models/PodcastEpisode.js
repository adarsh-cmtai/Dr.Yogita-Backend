// backend/models/PodcastEpisode.js
const mongoose = require('mongoose');

const PodcastEpisodeSchema = new mongoose.Schema({
  podcastSeries: { // Reference to the parent PodcastSeries
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PodcastSeries',
    required: [true, 'Podcast series ID is required'],
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Episode title is required'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Episode description is required'],
  },
  thumbnailUrl: { // Episode-specific thumbnail
    type: String,
    required: [true, 'Episode thumbnail URL is required'],
  },
  cloudinaryPublicIdThumbnail: { // Cloudinary ID for episode thumbnail
    type: String,
    required: [true, 'Cloudinary Public ID for episode thumbnail is required'],
  },
  youtubeLink: {
    type: String,
    required: [true, 'YouTube link is required'],
    match: [
      /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/,
      'Please enter a valid YouTube URL'
    ]
  },
  publishDate: {
    type: Date,
    default: Date.now,
  },
  duration: { // e.g., "35 min" or number of seconds
    type: String, // Or Number (e.g., in seconds)
    required: [true, 'Duration is required'],
  },
  episodeNumber: { // Order within the series
    type: Number,
    required: [true, 'Episode number is required'],
  }
}, { timestamps: true }); // Adds createdAt and updatedAt

// Ensure episodeNumber is unique within a podcastSeries
PodcastEpisodeSchema.index({ podcastSeries: 1, episodeNumber: 1 }, { unique: true });

module.exports = mongoose.model('PodcastEpisode', PodcastEpisodeSchema);