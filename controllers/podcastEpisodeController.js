// backend/controllers/podcastEpisodeController.js
const PodcastEpisode = require('../models/PodcastEpisode');
const PodcastSeries = require('../models/PodcastSeries'); // To check if series exists
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');
const mongoose = require('mongoose');


// Helper function to upload to Cloudinary (can be refactored into a shared utility)
const uploadToCloudinary = (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: folder },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

// @desc    Create a new podcast episode for a series
// @route   POST /api/podcast-episodes
// @access  Private (add auth later)
exports.createPodcastEpisode = async (req, res, next) => {
  const { podcastSeries, title, description, youtubeLink, duration, episodeNumber, publishDate } = req.body;
  const thumbnailFile = req.file; // From multer 'uploadPodcastEpisodeThumbnail'
  console.log("this is episode");

  if (!podcastSeries || !title || !description || !youtubeLink || !duration || !episodeNumber) {
    return res.status(400).json({ success: false, error: 'PodcastSeriesID, Title, Description, YouTube Link, Duration, and Episode Number are required.' });
  }
  if (!thumbnailFile) {
      return res.status(400).json({ success: false, error: 'Episode thumbnail image is required.' });
  }

  let uploadResult;
  try {
    // Check if podcast series exists
    const seriesExists = await PodcastSeries.findById(podcastSeries);
    if (!seriesExists) {
        return res.status(404).json({ success: false, error: 'Podcast series not found.' });
    }

    uploadResult = await uploadToCloudinary(thumbnailFile.buffer, "podcast_episode_thumbnails");
    
    const newEpisode = new PodcastEpisode({
      podcastSeries: podcastSeries,
      title,
      description,
      youtubeLink,
      duration,
      episodeNumber: parseInt(episodeNumber),
      publishDate: publishDate ? new Date(publishDate) : Date.now(),
      thumbnailUrl: uploadResult.secure_url,
      cloudinaryPublicIdThumbnail: uploadResult.public_id,
    });

    const savedEpisode = await newEpisode.save();
    res.status(201).json({success: true, data: savedEpisode});
  } catch (error) {
    if (uploadResult && uploadResult.public_id) {
        try { await cloudinary.uploader.destroy(uploadResult.public_id); }
        catch (e) { console.warn("Cloudinary cleanup failed after episode creation error:", e.message); }
    }
    next(error);
  }
};

// @desc    Get all podcast episodes for a specific series
// @route   GET /api/podcast-episodes/series/:seriesId
// @access  Public
exports.getAllPodcastEpisodesBySeries = async (req, res, next) => {
  try {
    const { seriesId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(seriesId)) {
        return res.status(400).json({ success: false, error: 'Invalid Series ID format' });
    }

    const seriesExists = await PodcastSeries.findById(seriesId);
    if (!seriesExists) {
        return res.status(404).json({ success: false, error: 'Podcast series not found.' });
    }

    const episodes = await PodcastEpisode.find({ podcastSeries: seriesId })
                                        .sort({ episodeNumber: 'asc' }); // or publishDate: -1

    res.json({ success: true, count: episodes.length, data: episodes });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single podcast episode by ID
// @route   GET /api/podcast-episodes/:id
// @access  Public
exports.getPodcastEpisodeById = async (req, res, next) => {
  try {
    const episode = await PodcastEpisode.findById(req.params.id).populate('podcastSeries', 'title slug');
    if (!episode) {
      return res.status(404).json({ success: false, error: 'Episode not found' });
    }
    res.json({ success: true, data: episode });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a podcast episode
// @route   PUT /api/podcast-episodes/:id
// @access  Private (add auth later)
exports.updatePodcastEpisode = async (req, res, next) => {
  const { title, description, youtubeLink, duration, episodeNumber, publishDate } = req.body;
  const thumbnailFile = req.file; // New thumbnail if uploaded
  let oldCloudinaryPublicIdThumbnail;

  try {
    let episode = await PodcastEpisode.findById(req.params.id);
    if (!episode) {
      return res.status(404).json({ success: false, error: 'Episode not found' });
    }
    oldCloudinaryPublicIdThumbnail = episode.cloudinaryPublicIdThumbnail;

    // Update fields
    if (title) episode.title = title;
    if (description) episode.description = description;
    if (youtubeLink) episode.youtubeLink = youtubeLink;
    if (duration) episode.duration = duration;
    if (episodeNumber) episode.episodeNumber = parseInt(episodeNumber);
    if (publishDate) episode.publishDate = new Date(publishDate);

    let uploadResult;
    if (thumbnailFile) {
      uploadResult = await uploadToCloudinary(thumbnailFile.buffer, "podcast_episode_thumbnails");
      episode.thumbnailUrl = uploadResult.secure_url;
      episode.cloudinaryPublicIdThumbnail = uploadResult.public_id;
    }

    const updatedEpisode = await episode.save();

    if (uploadResult && oldCloudinaryPublicIdThumbnail && oldCloudinaryPublicIdThumbnail !== episode.cloudinaryPublicIdThumbnail) {
      try { await cloudinary.uploader.destroy(oldCloudinaryPublicIdThumbnail); }
      catch (e) { console.warn("Old Cloudinary thumbnail delete failed during episode update:", e.message); }
    }
    
    res.json({success: true, data: updatedEpisode});
  } catch (error) {
    if (uploadResult && uploadResult.public_id) {
        try { await cloudinary.uploader.destroy(uploadResult.public_id); }
        catch (e) { console.warn("Cloudinary cleanup failed after episode update error:", e.message); }
    }
    next(error);
  }
};

// @desc    Delete a podcast episode
// @route   DELETE /api/podcast-episodes/:id
// @access  Private (add auth later)
exports.deletePodcastEpisode = async (req, res, next) => {
  try {
    const episode = await PodcastEpisode.findById(req.params.id);
    if (!episode) {
      return res.status(404).json({ success: false, error: 'Episode not found' });
    }

    if (episode.cloudinaryPublicIdThumbnail) {
      try { await cloudinary.uploader.destroy(episode.cloudinaryPublicIdThumbnail); }
      catch(e) { console.warn("Cloudinary thumbnail delete failed during episode deletion:", e.message)}
    }
    
    await episode.deleteOne();
    res.json({ success: true, message: 'Podcast episode removed' });
  } catch (error) {
    next(error);
  }
};
