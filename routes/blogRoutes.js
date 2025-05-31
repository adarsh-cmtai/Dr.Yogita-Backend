// backend/routes/blogRoutes.js
const express = require('express');
const {
  createBlogPost,
  getAllBlogPosts,
  getFeaturedBlogPosts,
  getAllCategories,
  getBlogPostBySlug,
  updateBlogPost,
  deleteBlogPost,
  getRelatedBlogPosts, // <-- Import new controller
} = require('../controllers/blogController');
const { uploadBlogCoverImage } = require('../middlewares/uploadMiddleware');
// const { protect, authorize } = require('../middlewares/authMiddleware'); 

const router = express.Router();

// Public routes
router.get('/', getAllBlogPosts);
router.get('/featured', getFeaturedBlogPosts);
router.get('/categories', getAllCategories);
router.get('/related/:slug', getRelatedBlogPosts); // <-- New route for related posts
router.get('/slug/:slug', getBlogPostBySlug);         // Ensure this is after more specific GET routes like /related


// Admin routes
router.post('/', /* protect, authorize('admin'), */ uploadBlogCoverImage, createBlogPost);
router.put('/:id', /* protect, authorize('admin'), */ uploadBlogCoverImage, updateBlogPost);
router.delete('/:id', /* protect, authorize('admin'), */ deleteBlogPost);

module.exports = router;