const PodcastEpisode = require('../models/PodcastEpisode'); // Adjust path if your model is elsewhere
const cloudinary = require('../config/cloudinary'); // Adjust path to your Cloudinary config
const streamifier = require('streamifier');

// @desc    Create a new podcast episode
// @route   POST /api/podcasts
// @access  Private (add auth middleware later if needed)
exports.createPodcastEpisode = async (req, res) => {
  const { title, description, youtubeLink, duration, episodeNumber } = req.body;
  // Frontend sends new file as 'thumbnailFile' in req.files
  const thumbnailFile = req.files?.thumbnailFile ? req.files.thumbnailFile[0] : null;

  if (!title || !description || !youtubeLink || !duration) {
    return res.status(400).json({ success: false, error: 'Title, Description, YouTube Link, and Duration are required.' });
  }
  if (!thumbnailFile) {
      return res.status(400).json({ success: false, error: 'Thumbnail image is required for new episode' });
  }

  try {
    let newThumbnailUrl;
    let newCloudinaryPublicId;

    if (thumbnailFile) {
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "podcast_thumbnails" }, // Optional: organize in a folder
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        streamifier.createReadStream(thumbnailFile.buffer).pipe(uploadStream);
      });
      newThumbnailUrl = result.secure_url;
      newCloudinaryPublicId = result.public_id;
    }

    const newEpisode = new PodcastEpisode({
      title,
      description,
      youtubeLink,
      duration,
      episodeNumber: episodeNumber ? parseInt(episodeNumber) : undefined,
      thumbnailUrl: newThumbnailUrl,
      cloudinaryPublicId: newCloudinaryPublicId,
    });

    const savedEpisode = await newEpisode.save();
    res.status(201).json({success: true, data: savedEpisode});
  } catch (error) {
    console.error("Error creating podcast episode:", error);
    if (error.name === 'ValidationError') {
        return res.status(400).json({ success: false, error: error.message, errors: error.errors });
    }
    res.status(500).json({ success: false, error: 'Server Error', details: error.message });
  }
};

// @desc    Get all podcast episodes
// @route   GET /api/podcasts
// @access  Public
exports.getAllPodcastEpisodes = async (req, res) => {
  try {
    const episodes = await PodcastEpisode.find().sort({ publishDate: -1, createdAt: -1 });
    console.log("this is all podcasts", episodes);
    // Frontend expects thumbnail.url for renderItemList consistency in some cases
    const formattedEpisodes = episodes.map(ep => ({
        ...ep.toObject(), // Get plain object
        // This mapping is for renderItemList in frontend if it strictly needs thumbnail.url
        // However, the direct thumbnailUrl from model is often fine.
        thumbnail: ep.thumbnailUrl ? { url: ep.thumbnailUrl } : undefined
    }));
    res.json({ success: true, data: formattedEpisodes });
  } catch (error) {
    console.error("Error fetching podcast episodes:", error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Get a single podcast episode by ID
// @route   GET /api/podcasts/:id
// @access  Public
exports.getPodcastEpisodeById = async (req, res) => {
  try {
    const episode = await PodcastEpisode.findById(req.params.id);
    if (!episode) {
      return res.status(404).json({ success: false, error: 'Episode not found' });
    }
    // Return the raw episode data, frontend will map to its formData
    res.json({ success: true, data: episode });
  } catch (error) {
    console.error("Error fetching podcast episode by ID:", error);
    if (error.kind === 'ObjectId') {
        return res.status(404).json({ success: false, error: 'Episode not found (invalid ID format)' });
    }
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Update a podcast episode
// @route   PUT /api/podcasts/:id
// @access  Private (add auth middleware later)
exports.updatePodcastEpisode = async (req, res) => {
  // `thumbnail` from body is the existing URL, `thumbnailFile` from files is the new upload
  const { title, description, youtubeLink, duration, episodeNumber, thumbnail: thumbnailUrlFromForm } = req.body;
  const thumbnailFile = req.files?.thumbnailFile ? req.files.thumbnailFile[0] : null;
  
  try {
    let episode = await PodcastEpisode.findById(req.params.id);
    if (!episode) {
      return res.status(404).json({ success: false, error: 'Episode not found' });
    }

    // Update text fields
    if (title) episode.title = title;
    if (description) episode.description = description;
    if (youtubeLink) episode.youtubeLink = youtubeLink;
    if (duration) episode.duration = duration;
    if (episodeNumber !== undefined) episode.episodeNumber = episodeNumber ? parseInt(episodeNumber) : null; // Allow clearing
    
    // Handle thumbnail update
    if (thumbnailFile) { // New file uploaded
      if (episode.cloudinaryPublicId) { // Delete old one from Cloudinary
        try { await cloudinary.uploader.destroy(episode.cloudinaryPublicId); } 
        catch (e) { console.warn("Old cloudinary image delete failed (podcast update):", e.message); }
      }
      // Upload new one
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "podcast_thumbnails" },
          (error, result) => { if (error) reject(error); else resolve(result); }
        );
        streamifier.createReadStream(thumbnailFile.buffer).pipe(uploadStream);
      });
      episode.thumbnailUrl = result.secure_url;
      episode.cloudinaryPublicId = result.public_id;
    } else if (thumbnailUrlFromForm && episode.thumbnailUrl !== thumbnailUrlFromForm) {
      // This case might not be needed if frontend always sends the current URL unless cleared
      // If thumbnailUrlFromForm is different from current, but no new file, it implies URL itself was edited (not typical for Cloudinary)
      // For Cloudinary, usually you'd re-upload or the URL doesn't change.
      // If just keeping existing URL, no action needed here unless explicitly cleared.
      episode.thumbnailUrl = thumbnailUrlFromForm; // Update if string URL was directly modified (less common)
    } else if (!thumbnailUrlFromForm && episode.thumbnailUrl) {
      // Thumbnail was explicitly cleared in the form (no URL sent, no new file)
      if (episode.cloudinaryPublicId) {
        try { await cloudinary.uploader.destroy(episode.cloudinaryPublicId); }
        catch (e) { console.warn("Old cloudinary image delete failed (podcast update - clear):", e.message); }
        episode.cloudinaryPublicId = null;
      }
      episode.thumbnailUrl = null;
    }
    // If thumbnailUrlFromForm is the same as episode.thumbnailUrl and no new file, nothing changes for thumbnail

    const updatedEpisode = await episode.save();
    res.json({success: true, data: updatedEpisode});
  } catch (error) {
    console.error("Error updating podcast episode:", error);
     if (error.name === 'ValidationError') {
        return res.status(400).json({ success: false, error: error.message, errors: error.errors });
    }
    res.status(500).json({ success: false, error: 'Server Error', details: error.message });
  }
};

// @desc    Delete a podcast episode
// @route   DELETE /api/podcasts/:id
// @access  Private (add auth middleware later)
exports.deletePodcastEpisode = async (req, res) => {
  try {
    const episode = await PodcastEpisode.findById(req.params.id);
    if (!episode) {
      return res.status(404).json({ success: false, error: 'Episode not found' });
    }

    if (episode.cloudinaryPublicId) {
      try { await cloudinary.uploader.destroy(episode.cloudinaryPublicId); }
      catch(e) { console.warn("Cloudinary delete failed during episode deletion:", e.message)}
    }
    await episode.deleteOne();
    res.json({ success: true, message: 'Podcast episode removed' });
  } catch (error) {
    console.error("Error deleting podcast episode:", error);
    if (error.kind === 'ObjectId') {
        return res.status(404).json({ success: false, error: 'Episode not found (invalid ID format)' });
    }
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};