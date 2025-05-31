// backend/controllers/ebookController.js
const Ebook = require('../models/Ebook');
const cloudinary = require('../config/cloudinary'); // Ensure this path is correct for your Cloudinary config
const streamifier = require('streamifier');
const https = require('https');
const slugify = require('slugify'); // Though model handles slug, might be used for filenames

// Helper to upload a file buffer to Cloudinary
const uploadToCloudinary = (fileBuffer, folder, resource_type = 'image') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: folder, resource_type: resource_type },
      (error, result) => {
        if (result) {
          resolve(result);
        } else {
          reject(error || new Error('Cloudinary upload failed with no result and no error object.'));
        }
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

// @desc    Get all ebooks
// @route   GET /api/ebooks
// @access  Public
exports.getAllEbooks = async (req, res) => {
  try {
    const ebooks = await Ebook.find().sort({ createdAt: -1 });
    // The razorpayPaymentLink will be included by default.
    // Your frontend expects 'thumbnail: { url: e.thumbnailUrl }', so we keep the mapping.
    const formattedEbooks = ebooks.map(e => ({
      ...e.toObject(),
      thumbnail: e.thumbnailUrl ? { url: e.thumbnailUrl } : undefined,
    }));
    res.status(200).json({ success: true, count: formattedEbooks.length, data: formattedEbooks });
  } catch (error) {
    console.error("Get All Ebooks Error:", error);
    res.status(500).json({ success: false, error: 'Server Error while fetching ebooks.' });
  }
};

// @desc    Get single ebook by ID (for admin/editing typically)
// @route   GET /api/ebooks/:id (as per your router.js)
// @access  Public (or Private, depending on your auth middleware setup for this route)
exports.getEbookById = async (req, res) => {
  try {
    const ebook = await Ebook.findById(req.params.id);
    if (!ebook) {
      return res.status(404).json({ success: false, error: 'Ebook not found with this ID.' });
    }
    // razorpayPaymentLink will be included by default.
    res.status(200).json({ success: true, data: ebook });
  } catch (error) {
    console.error("Error fetching ebook by ID:", error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ success: false, error: 'Ebook not found (invalid ID format).' });
    }
    res.status(500).json({ success: false, error: 'Server Error while fetching ebook by ID.' });
  }
};

// @desc    Get single ebook by slug (for public-facing pages typically)
// @route   GET /api/ebooks/:slug
// @access  Public
exports.getEbookBySlug = async (req, res) => {
  try {
    const ebook = await Ebook.findOne({ slug: req.params.slug });
    if (!ebook) {
      return res.status(404).json({ success: false, error: 'Ebook not found with this slug.' });
    }
    // razorpayPaymentLink will be included by default.
    res.status(200).json({ success: true, data: ebook });
  } catch (error) {
    console.error("Get Ebook by Slug Error:", error.message);
    res.status(500).json({ success: false, error: 'Server Error while fetching ebook by slug.' });
  }
};

// @desc    Create a new ebook
// @route   POST /api/ebooks
// @access  Private (ensure auth middleware is used on the route)
exports.createEbook = async (req, res) => {
  try {
    const { title, description, price, pages, category, razorpayPaymentLink } = req.body;
    const thumbnailFile = req.files?.thumbnailFile ? req.files.thumbnailFile[0] : null;
    const pdfFileNew = req.files?.pdfFileNew ? req.files.pdfFileNew[0] : null;

    const requiredFields = { title, description, price, pages, category };
    for (const [key, value] of Object.entries(requiredFields)) {
        if (!value) {
            return res.status(400).json({ success: false, error: `${key.charAt(0).toUpperCase() + key.slice(1)} is required.` });
        }
    }
    if (!thumbnailFile) {
      return res.status(400).json({ success: false, error: 'Thumbnail image is required for a new E-book.' });
    }
    if (!pdfFileNew) {
      return res.status(400).json({ success: false, error: 'PDF file is required for a new E-book.' });
    }

    let thumbnailResult, pdfResult;
    try {
      thumbnailResult = await uploadToCloudinary(thumbnailFile.buffer, 'ebook_thumbnails', 'image');
      pdfResult = await uploadToCloudinary(pdfFileNew.buffer, 'ebook_pdfs', 'raw');
    } catch (uploadError) {
      console.error("Cloudinary Upload Error (Create Ebook):", uploadError);
      // Attempt to clean up if one file uploaded and the other failed
      if (thumbnailResult?.public_id) {
        await cloudinary.uploader.destroy(thumbnailResult.public_id).catch(e => console.error("Cloudinary thumbnail cleanup failed after PDF upload error:", e));
      }
      // No need to check pdfResult for cleanup if thumbnail upload failed first or pdf upload itself failed.
      return res.status(500).json({ success: false, error: `Failed to upload files to Cloudinary: ${uploadError.message}` });
    }

    const ebookData = {
      title,
      description,
      price: Number(price),
      pages: Number(pages),
      category,
      thumbnailUrl: thumbnailResult.secure_url,
      thumbnailPublicId: thumbnailResult.public_id,
      pdfFileUrl: pdfResult.secure_url,
      pdfFilePublicId: pdfResult.public_id,
      razorpayPaymentLink: razorpayPaymentLink ? razorpayPaymentLink.trim() : null,
      // Slug is auto-generated by the model's pre-save hook
    };

    const newEbook = await Ebook.create(ebookData);
    res.status(201).json({ success: true, data: newEbook, message: "Ebook created successfully." });

  } catch (error) {
    console.error("Create Ebook Error:", error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: Object.values(error.errors).map(val => val.message).join(', ') });
    }
    if (error.code === 11000) { // Duplicate key error (likely for slug)
      return res.status(400).json({ success: false, error: "An ebook with this title (or resulting slug) already exists. Please choose a different title." });
    }
    res.status(500).json({ success: false, error: 'Server Error creating ebook.' });
  }
};

// @desc    Update an ebook
// @route   PUT /api/ebooks/:id
// @access  Private (ensure auth middleware is used on the route)
exports.updateEbook = async (req, res) => {
  try {
    const ebookId = req.params.id;
    let ebook = await Ebook.findById(ebookId);
    if (!ebook) {
      return res.status(404).json({ success: false, error: 'Ebook not found.' });
    }

    const {
      title, description, price, pages, category, razorpayPaymentLink,
      thumbnailUrl: directThumbnailUrl, // For direct URL input from form
      pdfFileUrl: directPdfFileUrl       // For direct URL input from form
    } = req.body;

    const thumbnailFile = req.files?.thumbnailFile ? req.files.thumbnailFile[0] : null;
    const pdfFileNew = req.files?.pdfFileNew ? req.files.pdfFileNew[0] : null;

    // Prepare update data object
    const updateData = {};

    // Update textual fields if provided
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = Number(price);
    if (pages !== undefined) updateData.pages = Number(pages);
    if (category !== undefined) updateData.category = category;
    if (razorpayPaymentLink !== undefined) {
      updateData.razorpayPaymentLink = razorpayPaymentLink.trim() === '' ? null : razorpayPaymentLink.trim();
    }

    // Handle Thumbnail Update
    if (thumbnailFile) { // New file uploaded
      if (ebook.thumbnailPublicId) {
        try { await cloudinary.uploader.destroy(ebook.thumbnailPublicId); }
        catch (e) { console.warn("Cloudinary: Old thumbnail deletion failed during update:", e.message); }
      }
      const thumbnailResult = await uploadToCloudinary(thumbnailFile.buffer, 'ebook_thumbnails', 'image');
      updateData.thumbnailUrl = thumbnailResult.secure_url;
      updateData.thumbnailPublicId = thumbnailResult.public_id;
    } else if (directThumbnailUrl !== undefined) { // Direct URL provided or field cleared
        if(directThumbnailUrl === '' && ebook.thumbnailPublicId) { // Clearing the thumbnail
            try { await cloudinary.uploader.destroy(ebook.thumbnailPublicId); }
            catch (e) { console.warn("Cloudinary: Old thumbnail deletion failed on clear:", e.message); }
            updateData.thumbnailUrl = null;
            updateData.thumbnailPublicId = null;
        } else if (directThumbnailUrl && directThumbnailUrl !== ebook.thumbnailUrl) { // New direct URL
            updateData.thumbnailUrl = directThumbnailUrl;
            // If it's an external URL, there's no new publicId from our Cloudinary.
            // Consider nullifying publicId if it's no longer a Cloudinary asset we manage.
            // For simplicity, if old publicId existed and URL changes, it might become orphaned unless explicitly deleted.
            // If directThumbnailUrl is a Cloudinary URL from *our* account, this logic might need to be smarter
            // by extracting publicId from it, but that's more complex.
            updateData.thumbnailPublicId = null; // Assuming direct URL is not a new Cloudinary upload for now
        }
    }


    // Handle PDF Update
    if (pdfFileNew) { // New file uploaded
      if (ebook.pdfFilePublicId) {
        try { await cloudinary.uploader.destroy(ebook.pdfFilePublicId, { resource_type: 'raw' }); }
        catch (e) { console.warn("Cloudinary: Old PDF deletion failed during update:", e.message); }
      }
      const pdfResult = await uploadToCloudinary(pdfFileNew.buffer, 'ebook_pdfs', 'raw');
      updateData.pdfFileUrl = pdfResult.secure_url;
      updateData.pdfFilePublicId = pdfResult.public_id;
    } else if (directPdfFileUrl !== undefined) { // Direct URL provided or field cleared
        if(directPdfFileUrl === '' && ebook.pdfFilePublicId) { // Clearing the PDF
            try { await cloudinary.uploader.destroy(ebook.pdfFilePublicId, { resource_type: 'raw' }); }
            catch (e) { console.warn("Cloudinary: Old PDF deletion failed on clear:", e.message); }
            updateData.pdfFileUrl = null;
            updateData.pdfFilePublicId = null;
        } else if (directPdfFileUrl && directPdfFileUrl !== ebook.pdfFileUrl) { // New direct URL
            updateData.pdfFileUrl = directPdfFileUrl;
            updateData.pdfFilePublicId = null; // Similar to thumbnail, assuming external or unknown origin
        }
    }

    // If title is changed, the pre-save hook in the model will update the slug.
    // For findByIdAndUpdate, hooks are not run by default unless `runValidators: true` and `context: 'query'` are set.
    // We are relying on the pre-save hook, so if `title` is in `updateData`, the model will handle slug.
    // Alternatively, to ensure slug is updated with findByIdAndUpdate if title changes:
    if (updateData.title && updateData.title !== ebook.title) {
        updateData.slug = slugify(updateData.title, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });
    }


    const updatedEbook = await Ebook.findByIdAndUpdate(ebookId, { $set: updateData }, {
      new: true, // Return the modified document
      runValidators: true, // Ensure schema validations are run
      context: 'query' // Important for some validators and pre/post hooks with findByIdAndUpdate
    });

    if (!updatedEbook) {
        // This case should ideally not be hit if findById above worked and ID is valid.
        return res.status(404).json({ success: false, error: 'Ebook not found after update attempt (unexpected).' });
    }

    res.status(200).json({ success: true, data: updatedEbook, message: "Ebook updated successfully." });

  } catch (error) {
    console.error("Update Ebook Error:", error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: Object.values(error.errors).map(val => val.message).join(', ') });
    }
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: "An ebook with the updated title (or resulting slug) already exists." });
    }
    res.status(500).json({ success: false, error: 'Server Error updating ebook.' });
  }
};


// @desc    Delete an ebook
// @route   DELETE /api/ebooks/:id
// @access  Private (ensure auth middleware is used on the route)
exports.deleteEbook = async (req, res) => {
  try {
    const ebook = await Ebook.findById(req.params.id);
    if (!ebook) {
      return res.status(404).json({ success: false, error: 'Ebook not found.' });
    }

    // Attempt to delete files from Cloudinary
    if (ebook.thumbnailPublicId) {
      try { await cloudinary.uploader.destroy(ebook.thumbnailPublicId); }
      catch (e) { console.warn(`Cloudinary: Failed to delete thumbnail ${ebook.thumbnailPublicId} during ebook deletion:`, e.message); }
    }
    if (ebook.pdfFilePublicId) {
      try { await cloudinary.uploader.destroy(ebook.pdfFilePublicId, { resource_type: 'raw' }); }
      catch (e) { console.warn(`Cloudinary: Failed to delete PDF ${ebook.pdfFilePublicId} during ebook deletion:`, e.message); }
    }

    await Ebook.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Ebook removed successfully.' });
  } catch (error) {
    console.error("Delete Ebook Error:", error.message);
    res.status(500).json({ success: false, error: 'Server Error while deleting ebook.' });
  }
};

// @desc    Download an ebook PDF
// @route   GET /api/ebooks/download/:id
// @access  Private (Consider adding authentication/authorization middleware to this route)
exports.downloadEbookPdf = async (req, res) => {
  try {
    const ebook = await Ebook.findById(req.params.id);

    if (!ebook || !ebook.pdfFileUrl) {
      return res.status(404).json({ success: false, error: 'Ebook PDF not found or its URL is missing.' });
    }

    const pdfUrl = ebook.pdfFileUrl;
    const safeTitleForFilename = (ebook.title || 'ebook').replace(/[^a-z0-9_.-]/gi, '_').substring(0, 60);
    const filename = `${slugify(safeTitleForFilename, { lower: true, strict: true, replacement: '_' })}.pdf`;

    // Set headers to prompt download
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Proxy the download from Cloudinary
    const request = https.get(pdfUrl, (pdfResponse) => {
      if (pdfResponse.statusCode === 200) {
        // Set Content-Type from Cloudinary's response or default to application/pdf
        res.setHeader('Content-Type', pdfResponse.headers['content-type'] || 'application/pdf');
        pdfResponse.pipe(res);
      } else {
        console.error(`Cloudinary download error for Ebook PDF (${ebook._id}): Status ${pdfResponse.statusCode}`);
        if (!res.headersSent) {
          res.status(pdfResponse.statusCode || 502).json({ success: false, error: 'Failed to fetch PDF from storage provider.' });
        } else {
          // If headers are already sent, it's hard to gracefully send a JSON error.
          // We should ensure the stream is properly closed.
          res.end();
        }
      }
    });

    request.on('error', (e) => {
      console.error(`Error fetching Ebook PDF (${ebook._id}) from Cloudinary:`, e.message);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Server error while attempting to fetch PDF for download.' });
      } else {
        res.end();
      }
    });

    // Handle client closing connection prematurely
    req.on('close', () => {
        if (request && !request.destroyed) {
            request.destroy(); // Abort the outgoing https request to Cloudinary
            console.log(`Client closed connection, aborted download for ebook: ${ebook._id}`);
        }
    });


  } catch (error) {
    console.error("Download Ebook PDF Error for ebook ID:", req.params.id, error.message);
    if (!res.headersSent) {
      if (error.kind === 'ObjectId') {
        return res.status(404).json({ success: false, error: 'Ebook not found (invalid ID format for download).' });
      }
      res.status(500).json({ success: false, error: 'Server error processing PDF download request.' });
    } else {
        // If headers sent, just try to end response.
        res.end();
    }
  }
};