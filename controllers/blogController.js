// backend/controllers/blogController.js
// ... (imports: BlogPost, cloudinary, streamifier, slugify) ...
const BlogPost = require('../models/BlogPost');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');
const slugify = require('slugify');


// Helper to upload a file buffer to Cloudinary
const uploadToCloudinary = (fileBuffer, folder, resource_type = 'image') => { /* ... same as before ... */ 
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: folder, resource_type: resource_type, quality: "auto:good" },
      (error, result) => {
        if (result) resolve(result);
        else reject(error || new Error('Cloudinary upload failed'));
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

// @desc    Create a new blog post
// @route   POST /api/blogs
// @access  Private (Admin)
exports.createBlogPost = async (req, res) => { // Ensure this is exported
  try {
    const { title, content, excerpt, categories, author, isFeatured, status, metaTitle, metaDescription, readingTime } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Cover image is required' });
    }

    let coverImageResult;
    try {
      coverImageResult = await uploadToCloudinary(req.file.buffer, 'blog_covers');
    } catch (uploadError) {
      console.error("Cloudinary Upload Error:", uploadError);
      return res.status(500).json({ success: false, error: 'Failed to upload cover image.' });
    }

    const parsedCategories = typeof categories === 'string' ? categories.split(',').map(cat => cat.trim().toLowerCase()) : Array.isArray(categories) ? categories.map(cat => String(cat).trim().toLowerCase()) : [];

    const blogPost = await BlogPost.create({
      title, content, excerpt, categories: parsedCategories, author, 
      isFeatured: isFeatured === 'true' || isFeatured === true,
      status, metaTitle, metaDescription, readingTime,
      coverImage: { url: coverImageResult.secure_url, public_id: coverImageResult.public_id },
    });

    res.status(201).json({ success: true, data: blogPost });
  } catch (error) {
    console.error("Create Blog Post Error:", error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: Object.values(error.errors).map(val => val.message).join(', ') });
    }
    if (coverImageResult?.public_id) {
        await cloudinary.uploader.destroy(coverImageResult.public_id).catch(err => console.error("Cloudinary cleanup failed:", err));
    }
    res.status(500).json({ success: false, error: 'Server Error creating blog post' });
  }
};

// ... other controller functions (getAllBlogPosts, getFeaturedBlogPosts, etc. correctly exported) ...
exports.getAllBlogPosts = async (req, res) => { /* ... code ... */ 
  try {
    const { category, search, page = 1, limit = 6, sortBy = 'createdAt', order = 'desc' } = req.query;
    const query = { status: 'published' };
    if (category && category !== 'all') query.categories = category.toLowerCase();
    if (search) query.$or = [ { title: { $regex: search, $options: 'i' } }, { content: { $regex: search, $options: 'i' } }, { excerpt: { $regex: search, $options: 'i' } }, ];
    const pageNum = parseInt(page, 10); const limitNum = parseInt(limit, 10); const skip = (pageNum - 1) * limitNum;
    const sortOptions = {}; sortOptions[sortBy] = order === 'asc' ? 1 : -1;
    const posts = await BlogPost.find(query).sort(sortOptions).skip(skip).limit(limitNum).select('-content');
    const totalPosts = await BlogPost.countDocuments(query); const totalPages = Math.ceil(totalPosts / limitNum);
    res.status(200).json({ success: true, count: posts.length, totalPosts, totalPages, currentPage: pageNum, data: posts, });
  } catch (error) { console.error("Get All Blog Posts Error:", error); res.status(500).json({ success: false, error: 'Server Error' }); }
};
exports.getFeaturedBlogPosts = async (req, res) => { /* ... code ... */ 
  try {
    const limit = parseInt(req.query.limit) || 2;
    const featuredPosts = await BlogPost.find({ isFeatured: true, status: 'published' }).sort({ createdAt: -1 }).limit(limit).select('-content'); 
    res.status(200).json({ success: true, count: featuredPosts.length, data: featuredPosts });
  } catch (error) { console.error("Get Featured Blog Posts Error:", error); res.status(500).json({ success: false, error: 'Server Error' }); }
};
exports.getAllCategories = async (req, res) => { /* ... code ... */ 
  try {
    const categories = await BlogPost.distinct('categories', { status: 'published' });
    const cleanedCategories = categories.filter(cat => cat && cat.trim() !== '').sort();
    res.status(200).json({ success: true, data: cleanedCategories });
  } catch (error) { console.error("Get All Categories Error:", error); res.status(500).json({ success: false, error: 'Server Error' }); }
};
exports.getBlogPostBySlug = async (req, res) => { /* ... code ... */ 
  try {
    const post = await BlogPost.findOne({ slug: req.params.slug, status: 'published' });
    if (!post) return res.status(404).json({ success: false, error: 'Blog post not found' });
    res.status(200).json({ success: true, data: post });
  } catch (error) { console.error("Get Blog Post By Slug Error:", error); res.status(500).json({ success: false, error: 'Server Error' }); }
};
exports.updateBlogPost = async (req, res) => { /* ... code ... */ 
  try {
    let post = await BlogPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: 'Blog post not found' });
    const { title, content, excerpt, categories, author, isFeatured, status, metaTitle, metaDescription, readingTime } = req.body;
    const updateData = { ...req.body };
    if (typeof categories === 'string') updateData.categories = categories.split(',').map(cat => cat.trim().toLowerCase());
    else if (Array.isArray(categories)) updateData.categories = categories.map(cat => String(cat).trim().toLowerCase());
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured === 'true' || isFeatured === true;
    if (req.file) {
      if (post.coverImage?.public_id) await cloudinary.uploader.destroy(post.coverImage.public_id).catch(err => console.error("Old image cleanup failed:", err));
      const coverImageResult = await uploadToCloudinary(req.file.buffer, 'blog_covers');
      updateData.coverImage = { url: coverImageResult.secure_url, public_id: coverImageResult.public_id };
    }
    if (title && title !== post.title) updateData.slug = slugify(title, { lower: true, strict: true, replacement: '-' });
    post = await BlogPost.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    res.status(200).json({ success: true, data: post });
  } catch (error) {
    console.error("Update Blog Post Error:", error);
    if (error.name === 'ValidationError') return res.status(400).json({ success: false, error: Object.values(error.errors).map(val => val.message).join(', ') });
    res.status(500).json({ success: false, error: 'Server Error updating blog post' });
  }
};
exports.deleteBlogPost = async (req, res) => { /* ... code ... */ 
  try {
    const post = await BlogPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: 'Blog post not found' });
    if (post.coverImage?.public_id) await cloudinary.uploader.destroy(post.coverImage.public_id).catch(err => console.error("Cloudinary delete failed:", err));
    await post.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) { console.error("Delete Blog Post Error:", error); res.status(500).json({ success: false, error: 'Server Error' }); }
};




exports.getBlogPostBySlug = async (req, res) => {
  try {
    const post = await BlogPost.findOne({ slug: req.params.slug, status: 'published' });
      // .populate('author', 'name bio avatar socialLinks'); // If using populated author

    if (!post) {
      return res.status(404).json({ success: false, error: 'Blog post not found' });
    }
    // Send the full post data, including content
    res.status(200).json({ success: true, data: post });
  } catch (error) {
    console.error("Get Blog Post By Slug Error:", error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Get related blog posts
// @route   GET /api/blogs/related/:slug
// @access  Public
exports.getRelatedBlogPosts = async (req, res) => {
  try {
    const currentPostSlug = req.params.slug;
    const limit = parseInt(req.query.limit) || 3; // Number of related posts to fetch

    const currentPost = await BlogPost.findOne({ slug: currentPostSlug, status: 'published' }).select('categories _id');
    if (!currentPost) {
      return res.status(200).json({ success: true, data: [] }); // No related posts if current doesn't exist
    }

    const relatedPosts = await BlogPost.find({
      categories: { $in: currentPost.categories }, // Shares at least one category
      slug: { $ne: currentPostSlug },             // Exclude the current post
      _id: { $ne: currentPost._id },               // Ensure it's not the same document
      status: 'published',
    })
    .sort({ createdAt: -1 }) // Or by relevance score if you implement that
    .limit(limit)
    .select('title slug excerpt coverImage categories createdAt readingTime'); // Select fields needed for cards

    res.status(200).json({ success: true, count: relatedPosts.length, data: relatedPosts });
  } catch (error) {
    console.error("Get Related Blog Posts Error:", error);
    res.status(500).json({ success: false, error: 'Server Error fetching related posts' });
  }
};