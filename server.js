// backend/server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path'); // For serving static files
const blogRoutes = require('./routes/blogRoutes');

dotenv.config();
connectDB();

// Route files
const podcastRoutes = require('./routes/podcastRoutes');
const programRoutes = require('./routes/programRoutes');
const ebookRoutes = require('./routes/ebookRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const nutritionPlanRoutes = require('./routes/nutritionPlanRoutes'); // Import nutrition routes
const podcastSeriesRoutes = require('./routes/podcastSeriesRoutes'); // New
const podcastEpisodeRoutes = require('./routes/podcastEpisodeRoutes'); 

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true,
}));
app.use(express.json());

app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' directory (for uploaded images)
// All files in 'public' folder will be accessible e.g. http://localhost:5001/uploads/nutrition/image.jpg
app.use(express.static(path.join(__dirname, 'public')));


// Mount Routers
app.use('/api/podcasts', podcastRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/ebooks', ebookRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/nutrition-plans', nutritionPlanRoutes); // Mount nutrition routes
app.use('/api/blogs', blogRoutes); 
app.use('/api/podcast-series', podcastSeriesRoutes);         // New mount point for series
app.use('/api/podcast-episodes', podcastEpisodeRoutes);  

// Basic error handler (ensure it's AFTER your routes)
app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR HANDLER:", err.name, "-", err.message);
  // console.error("STACK:", err.stack); // Potentially too verbose for prod logs

  let statusCode = err.statusCode || 500;
  let message = err.message || 'An unexpected server error occurred.';

  if (err.name === 'MulterError') {
    statusCode = 400;
    message = `File Upload Error: ${err.message}. Field: ${err.field}`;
     if (err.code === 'LIMIT_UNEXPECTED_FILE' && err.message.includes('Images Only')) {
        message = 'Invalid file type. Only images (jpeg, jpg, png, gif, webp) are allowed for thumbnails.';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE' && err.message.includes('PDF Files Only')) {
        message = 'Invalid file type. Only PDF files are allowed.';
    }
  } else if (err.name === 'ValidationError') { // Mongoose validation error
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
  } else if (err.name === 'CastError') { // Mongoose CastError (e.g. invalid ObjectId)
      statusCode = 400;
      message = `Invalid ${err.path}: ${err.value}`;
  }


  if (res.headersSent) {
    return next(err);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }) // Include stack in dev
  });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`));