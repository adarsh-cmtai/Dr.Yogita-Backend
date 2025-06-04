const mongoose = require('mongoose'); // Ensure mongoose is imported for ObjectId.isValid
const Program = require('../models/Program');
const ProgramSeries = require('../models/ProgramSeries');
const cloudinary = require('../config/cloudinary'); // Your Cloudinary config
const streamifier = require('streamifier');
const slugify = require('slugify');

// Helper to upload a file stream to Cloudinary
const streamUploadToCloudinary = (fileBuffer, options) => {
    return new Promise((resolve, reject) => {
        let stream = cloudinary.uploader.upload_stream(
            options, // options like folder, resource_type
            (error, result) => {
                if (result) { resolve(result); } else { reject(error); }
            }
        );
        streamifier.createReadStream(fileBuffer).pipe(stream);
    });
};

// @desc    Get all programs
// @route   GET /api/programs
// @access  Public
exports.getAllPrograms = async (req, res) => {
  try {
    const query = req.query.seriesId ? { programSeries: req.query.seriesId } : {};
    const programs = await Program.find(query)
                                  .populate('programSeries', 'title slug')
                                  .sort({ episodeNumber: 1, createdAt: -1 });
    res.status(200).json({ success: true, count: programs.length, data: programs });
  } catch (error) {
    console.error("Error getting all programs:", error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Get all programs for a specific series ID
// @route   GET /api/programs/series/:seriesId
// @access  Public
exports.getProgramsBySeriesId = async (req, res) => {
  try {
    const seriesId = req.params.seriesId;
    if (!mongoose.Types.ObjectId.isValid(seriesId)) {
        return res.status(400).json({ success: false, error: 'Invalid Series ID format' });
    }
    const programs = await Program.find({ programSeries: seriesId })
                                  .sort({ episodeNumber: 1, publishDate: 'asc' });
    if (!programs) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }
    res.status(200).json({ success: true, count: programs.length, data: programs });
  } catch (error) {
    console.error(`Error fetching programs for series ${req.params.seriesId}:`, error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Get single program by ID
// @route   GET /api/programs/id/:id
// @access  Public
exports.getProgramById = async (req, res) => {
    try {
      const program = await Program.findById(req.params.id).populate('programSeries', 'title slug');
      if (!program) {
        return res.status(404).json({ success: false, error: 'Program not found' });
      }
      res.status(200).json({ success: true, data: program });
    } catch (error) {
      console.error("Error fetching program by ID:", error);
      if (error.kind === 'ObjectId') {
          return res.status(404).json({ success: false, error: 'Program not found (invalid ID format)' });
      }
      res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Get single program by slug
// @route   GET /api/programs/:slug
// @access  Public
exports.getProgramBySlug = async (req, res) => {
  try {
    const program = await Program.findOne({ slug: req.params.slug }).populate('programSeries', 'title slug');
    if (!program) {
      return res.status(404).json({ success: false, error: 'Program not found' });
    }
    res.status(200).json({ success: true, data: program });
  } catch (error) {
    console.error("Error fetching program by slug:", error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Create a new program
// @route   POST /api/programs
// @access  Private (add auth middleware)
exports.createProgram = async (req, res) => {
  try {
    const { title, description, price, duration, programSeries, episodeNumber } = req.body;
    // req.files will be populated by M_uploadProgramAssetsForCloudinary middleware
    const thumbnailFile = req.files?.thumbnailFile?.[0];
    const videoFile = req.files?.videoFile?.[0];

    if (!title || !description || !price || !duration ) {
        return res.status(400).json({ success: false, error: 'Title, Description, Price, and Duration are required.' });
    }
    if (!thumbnailFile) {
      return res.status(400).json({ success: false, error: 'Thumbnail image (thumbnailFile) is required.' });
    }
    // Make videoFile required if all programs must have a video
    if (!videoFile) {
      return res.status(400).json({ success: false, error: 'Program video (videoFile) is required.' });
    }

    if (programSeries) {
        const seriesExists = await ProgramSeries.findById(programSeries);
        if (!seriesExists) {
            return res.status(400).json({ success: false, error: 'Specified Program Series does not exist.' });
        }
    }

    // Upload thumbnail to Cloudinary
    const thumbUploadOpts = { folder: "program_thumbnails", resource_type: "image" };
    const thumbResult = await streamUploadToCloudinary(thumbnailFile.buffer, thumbUploadOpts);

    // Upload video to Cloudinary
    const videoUploadOpts = { folder: "program_videos", resource_type: "video" };
    const videoResult = await streamUploadToCloudinary(videoFile.buffer, videoUploadOpts);

    const newProgramData = {
      title, description, price: Number(price), duration,
      thumbnailUrl: thumbResult.secure_url,
      thumbnailCloudinaryPublicId: thumbResult.public_id,
      videoUrl: videoResult.secure_url,
      videoCloudinaryPublicId: videoResult.public_id,
      episodeNumber: episodeNumber ? Number(episodeNumber) : 1,
    };
    if (programSeries) {
        newProgramData.programSeries = programSeries;
    }

    const newProgram = await Program.create(newProgramData);
    res.status(201).json({ success: true, data: newProgram });
  } catch (error) {
    console.error("Create Program Error:", error);
    if (error.code === 11000) { // Duplicate key (slug)
        return res.status(400).json({ success: false, error: 'A program with this title/slug already exists.' });
    }
    if (error.name === 'ValidationError') {
        return res.status(400).json({ success: false, error: Object.values(error.errors).map(val => val.message).join(', ') });
    }
    res.status(500).json({ success: false, error: 'Server Error creating program' });
  }
};

// @desc    Update a program
// @route   PUT /api/programs/:id
// @access  Private (add auth middleware)
exports.updateProgram = async (req, res) => {
    try {
        let program = await Program.findById(req.params.id);
        if (!program) { return res.status(404).json({ success: false, error: 'Program not found' }); }

        const { title, description, price, duration, programSeries, episodeNumber, clearThumbnail, clearVideo } = req.body;
        const newThumbnailFile = req.files?.thumbnailFile?.[0];
        const newVideoFile = req.files?.videoFile?.[0];

        let updateData = { ...req.body };
        // Remove fields managed by file uploads or specific logic from direct update
        delete updateData.thumbnailUrl;
        delete updateData.thumbnailCloudinaryPublicId;
        delete updateData.videoUrl;
        delete updateData.videoCloudinaryPublicId;
        delete updateData.slug; // Slug updates based on title change

        if (programSeries !== undefined) {
            if (programSeries) {
                const seriesExists = await ProgramSeries.findById(programSeries);
                if (!seriesExists) return res.status(400).json({ success: false, error: 'Specified Program Series does not exist.' });
                updateData.programSeries = programSeries;
            } else {
                updateData.programSeries = null;
            }
        }
        if (price !== undefined) updateData.price = Number(price);
        if (episodeNumber !== undefined) updateData.episodeNumber = Number(episodeNumber);


        // Handle Thumbnail Update or Clearing
        if (newThumbnailFile) {
            if (program.thumbnailCloudinaryPublicId) { // Delete old thumbnail
                try { await cloudinary.uploader.destroy(program.thumbnailCloudinaryPublicId, { resource_type: "image" }); }
                catch (e) { console.warn("Old thumbnail delete failed:", e.message); }
            }
            const thumbUploadOpts = { folder: "program_thumbnails", resource_type: "image" };
            const thumbResult = await streamUploadToCloudinary(newThumbnailFile.buffer, thumbUploadOpts);
            updateData.thumbnailUrl = thumbResult.secure_url;
            updateData.thumbnailCloudinaryPublicId = thumbResult.public_id;
        } else if (clearThumbnail === 'true' && program.thumbnailUrl) {
            if (program.thumbnailCloudinaryPublicId) {
                try { await cloudinary.uploader.destroy(program.thumbnailCloudinaryPublicId, { resource_type: "image" }); }
                catch (e) { console.warn("Cloudinary thumbnail delete failed (clear):", e.message); }
            }
            updateData.thumbnailUrl = null;
            updateData.thumbnailCloudinaryPublicId = null;
        }

        // Handle Video Update or Clearing
        if (newVideoFile) {
            if (program.videoCloudinaryPublicId) { // Delete old video
                try { await cloudinary.uploader.destroy(program.videoCloudinaryPublicId, { resource_type: "video" }); }
                catch (e) { console.warn("Old video delete failed:", e.message); }
            }
            const videoUploadOpts = { folder: "program_videos", resource_type: "video" };
            const videoResult = await streamUploadToCloudinary(newVideoFile.buffer, videoUploadOpts);
            updateData.videoUrl = videoResult.secure_url;
            updateData.videoCloudinaryPublicId = videoResult.public_id;
        } else if (clearVideo === 'true' && program.videoUrl) {
            if (program.videoCloudinaryPublicId) {
                try { await cloudinary.uploader.destroy(program.videoCloudinaryPublicId, { resource_type: "video" }); }
                catch (e) { console.warn("Cloudinary video delete failed (clear):", e.message); }
            }
            updateData.videoUrl = null;
            updateData.videoCloudinaryPublicId = null;
        }


        if (title && title !== program.title) {
            updateData.slug = slugify(title, { lower: true, strict: true });
        }

        const updatedProgram = await Program.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
                                            .populate('programSeries', 'title slug');
        res.status(200).json({ success: true, data: updatedProgram });
    } catch (error) {
        console.error("Update Program Error:", error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, error: 'A program with this title/slug already exists.' });
        }
         if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, error: Object.values(error.errors).map(val => val.message).join(', ') });
        }
        res.status(500).json({ success: false, error: 'Server Error updating program' });
    }
};

// @desc    Delete a program
// @route   DELETE /api/programs/:id
// @access  Private (add auth middleware)
exports.deleteProgram = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);
    if (!program) {
      return res.status(404).json({ success: false, error: 'Program not found' });
    }

    // Delete thumbnail from Cloudinary
    if (program.thumbnailCloudinaryPublicId) {
      try { await cloudinary.uploader.destroy(program.thumbnailCloudinaryPublicId, { resource_type: "image" }); }
      catch(e){ console.warn("Cloudinary thumbnail delete failed:", e.message); }
    }
    // Delete video from Cloudinary
    if (program.videoCloudinaryPublicId) {
      try { await cloudinary.uploader.destroy(program.videoCloudinaryPublicId, { resource_type: "video" }); }
      catch(e){ console.warn("Cloudinary video delete failed:", e.message); }
    }

    await program.deleteOne();
    res.status(200).json({ success: true, message: 'Program removed successfully' });
  } catch (error) {
    console.error("Delete Program Error:", error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
