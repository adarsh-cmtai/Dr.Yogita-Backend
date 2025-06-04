const mongoose = require('mongoose');
const slugify = require('slugify');

const ProgramSchema = new mongoose.Schema({
  programSeries: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProgramSeries',
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
  },
  duration: { // e.g., "Approx. 45 minutes" or "3 sessions, 20 min each"
    type: String,
    required: [true, 'Duration is required'],
  },
  thumbnailUrl: { // For the program's preview image
    type: String,
    required: [true, 'Thumbnail URL is required'],
  },
  thumbnailCloudinaryPublicId: { // To manage thumbnail on Cloudinary
    type: String,
    required: [true, 'Cloudinary Public ID for thumbnail is required'],
  },
  videoUrl: { // URL of the uploaded video on Cloudinary
    type: String,
    // Make it required if a video is always expected for a program
    // required: [true, 'Video URL is required'],
  },
  videoCloudinaryPublicId: { // To manage video on Cloudinary
    type: String,
    // required: [true, 'Cloudinary Public ID for video is required'],
  },
  slug: {
    type: String,
    unique: true,
  },
  episodeNumber: { // If programs are part of a sequence in a series
    type: Number,
    default: 1,
  },
  publishDate: {
    type: Date,
    default: Date.now,
  },
  // Add any other relevant fields like 'whatYouWillLearn': [String], 'requirements': [String]
}, { timestamps: true });

ProgramSchema.pre('save', function (next) {
  if (this.isModified('title') || !this.slug) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

module.exports = mongoose.model('Program', ProgramSchema);
