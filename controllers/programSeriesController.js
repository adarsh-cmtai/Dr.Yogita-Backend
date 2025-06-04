// backend/controllers/programSeriesController.js
const ProgramSeries = require('../models/ProgramSeries');
const Program = require('../models/Program'); // To handle deletion of associated programs
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');
const slugify = require('slugify');

const streamUpload = (fileBuffer, folder) => {
    return new Promise((resolve, reject) => {
        let stream = cloudinary.uploader.upload_stream(
          { folder: folder },
          (error, result) => {
            if (result) { resolve(result); } else { reject(error); }
          }
        );
      streamifier.createReadStream(fileBuffer).pipe(stream);
    });
};

// @desc    Get all program series
// @route   GET /api/program-series
// @access  Public
exports.getAllProgramSeries = async (req, res) => {
  try {
    const seriesList = await ProgramSeries.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: seriesList.length, data: seriesList });
  } catch (error) {
    console.error("Error getting all program series:", error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Get single program series by ID
// @route   GET /api/program-series/id/:id
// @access  Public
exports.getProgramSeriesById = async (req, res) => {
    try {
      const series = await ProgramSeries.findById(req.params.id);
      if (!series) {
        return res.status(404).json({ success: false, error: 'Program series not found' });
      }
      res.status(200).json({ success: true, data: series });
    } catch (error) {
      console.error("Error fetching program series by ID:", error);
      if (error.kind === 'ObjectId') {
          return res.status(404).json({ success: false, error: 'Program series not found (invalid ID format)' });
      }
      res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Get single program series by slug
// @route   GET /api/program-series/:slug (or /api/program-series/slug/:slug for consistency)
// @access  Public
exports.getProgramSeriesBySlug = async (req, res) => {
  try {
    const series = await ProgramSeries.findOne({ slug: req.params.slug });
    if (!series) {
      return res.status(404).json({ success: false, error: 'Program series not found' });
    }
    res.status(200).json({ success: true, data: series });
  } catch (error) {
    console.error("Error fetching program series by slug:", error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Create a new program series
// @route   POST /api/program-series
// @access  Private (add auth middleware later)
exports.createProgramSeries = async (req, res) => {
  try {
    const { title, description, category, author } = req.body;
    const coverImageFile = req.files?.coverImageFile ? req.files.coverImageFile[0] : null;

    if (!title || !description) {
        return res.status(400).json({ success: false, error: 'Title and Description are required.' });
    }
    if (!coverImageFile) {
      return res.status(400).json({ success: false, error: 'Cover image is required for new program series' });
    }

    const cloudinaryResult = await streamUpload(coverImageFile.buffer, "program_series_covers");

    const newSeries = await ProgramSeries.create({
      title, description, category, author,
      coverImageUrl: cloudinaryResult.secure_url,
      coverImageCloudinaryPublicId: cloudinaryResult.public_id,
      // Slug is auto-generated
    });
    res.status(201).json({ success: true, data: newSeries });
  } catch (error) {
    console.error("Create Program Series Error:", error);
    if (error.code === 11000) { // Duplicate key error (e.g. title or slug)
        return res.status(400).json({ success: false, error: 'A program series with this title already exists.' });
    }
    if (error.name === 'ValidationError') {
        return res.status(400).json({ success: false, error: Object.values(error.errors).map(val => val.message).join(', ') });
    }
    res.status(500).json({ success: false, error: 'Server Error creating program series' });
  }
};

// @desc    Update a program series
// @route   PUT /api/program-series/:id
// @access  Private (add auth middleware later)
exports.updateProgramSeries = async (req, res) => {
    try {
        let series = await ProgramSeries.findById(req.params.id);
        if (!series) { return res.status(404).json({ success: false, error: 'Program series not found' }); }

        const { title, description, category, author } = req.body;
        const coverImageFile = req.files?.coverImageFile ? req.files.coverImageFile[0] : null;
        
        let updateData = { ...req.body }; // title, description, category, author
        delete updateData.coverImageUrl; // Prevent manual override
        delete updateData.coverImageCloudinaryPublicId; // Prevent manual override
        delete updateData.slug; // Slug should regenerate if title changes

        if (coverImageFile) {
            if (series.coverImageCloudinaryPublicId) {
                try { await cloudinary.uploader.destroy(series.coverImageCloudinaryPublicId); }
                catch (e) { console.warn("Old Cloudinary cover image delete failed (series update):", e.message); }
            }
            const cloudinaryResult = await streamUpload(coverImageFile.buffer, "program_series_covers");
            updateData.coverImageUrl = cloudinaryResult.secure_url;
            updateData.coverImageCloudinaryPublicId = cloudinaryResult.public_id;
        }

        if (title && title !== series.title) {
            updateData.slug = slugify(title, { lower: true, strict: true });
        }
        
        const updatedSeries = await ProgramSeries.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
        if (!updatedSeries) { // Should be caught by findById earlier, but good practice
            return res.status(404).json({ success: false, error: 'Program series not found after update attempt.' });
        }
        res.status(200).json({ success: true, data: updatedSeries });
    } catch (error) {
        console.error("Update Program Series Error:", error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, error: 'A program series with this title already exists.' });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, error: Object.values(error.errors).map(val => val.message).join(', ') });
        }
        res.status(500).json({ success: false, error: 'Server Error updating program series' });
    }
};

// @desc    Delete a program series (and its associated programs)
// @route   DELETE /api/program-series/:id
// @access  Private (add auth middleware later)
exports.deleteProgramSeries = async (req, res) => {
  try {
    const series = await ProgramSeries.findById(req.params.id);
    if (!series) {
      return res.status(404).json({ success: false, error: 'Program series not found' });
    }

    // 1. Delete cover image from Cloudinary
    if (series.coverImageCloudinaryPublicId) {
      try {await cloudinary.uploader.destroy(series.coverImageCloudinaryPublicId); }
      catch(e){console.warn("Cloudinary cover image delete failed for series:", e.message)}
    }

    // 2. Find and delete all programs (episodes) associated with this series
    const programsInSeries = await Program.find({ programSeries: series._id });
    for (const program of programsInSeries) {
      if (program.cloudinaryPublicId) {
        try { await cloudinary.uploader.destroy(program.cloudinaryPublicId); }
        catch (e) { console.warn(`Cloudinary thumbnail delete failed for program ${program._id}:`, e.message); }
      }
      await program.deleteOne();
    }

    // 3. Delete the series itself
    await series.deleteOne();
    res.status(200).json({ success: true, message: 'Program series and all its programs removed successfully' });
  } catch (error) {
    console.error("Delete Program Series Error:", error);
    res.status(500).json({ success: false, error: 'Server Error deleting program series' });
  }
};