const multer = require('multer');
const path = require('path');

function checkImageFileType(file, cb) {
  if (!file.originalname || typeof file.originalname !== 'string') {
    const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname);
    err.message = 'File name is missing or invalid for image type check.';
    return cb(err);
  }
  const filetypes = /jpeg|jpg|png|gif|webp|avif/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname);
    err.message = 'Invalid file type. Only images (jpeg, jpg, png, gif, webp, avif) are allowed.';
    cb(err);
  }
}

function checkPdfFileType(file, cb) {
  if (!file.originalname || typeof file.originalname !== 'string') {
    const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname);
    err.message = 'File name is missing or invalid for PDF type check.';
    return cb(err);
  }
  const filetypes = /pdf/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = file.mimetype === 'application/pdf';
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname);
    err.message = 'Invalid file type. Only PDF files are allowed.';
    cb(err);
  }
}

function checkVideoFileType(file, cb) {
  if (!file.originalname || typeof file.originalname !== 'string') {
    const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname);
    err.message = 'File name is missing or invalid for video type check.';
    return cb(err);
  }
  const filetypes = /mp4|mov|avi|wmv|flv|mkv|webm|mpeg/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetypePrefix = /^video\//;
  if (mimetypePrefix.test(file.mimetype) && extname) {
    return cb(null, true);
  } else {
    const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname);
    err.message = 'Invalid file type. Only common video formats (MP4, MOV, AVI, WebM, MPEG etc.) are allowed.';
    cb(err);
  }
}

const memoryStorage = multer.memoryStorage();

const uploadEbookFiles = multer({
  storage: memoryStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    if (file.fieldname === "thumbnail") {
      checkImageFileType(file, cb);
    } else if (file.fieldname === "pdfFile") {
      checkPdfFileType(file, cb);
    } else {
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
    }
  },
}).fields([{ name: 'thumbnail', maxCount: 1 }, { name: 'pdfFile', maxCount: 1 }]);

const uploadBlogCoverImage = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    if (file.fieldname === "coverImageFile") {
      checkImageFileType(file, cb);
    } else {
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname + '. Expected coverImageFile.'));
    }
  }
}).single('coverImageFile');

const uploadNutritionPlanAssets = multer({
  storage: memoryStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    if (file.fieldname === "thumbnailFile") {
      checkImageFileType(file, cb);
    } else if (file.fieldname === "pdfFileNew") {
      checkPdfFileType(file, cb);
    } else {
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', `Unexpected field: ${file.fieldname}. Expected "thumbnailFile" or "pdfFileNew".`));
    }
  }
}).fields([{ name: 'thumbnailFile', maxCount: 1 }, { name: 'pdfFileNew', maxCount: 1 }]);

const uploadSingleNutritionThumbnail = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    if (file.fieldname === "thumbnail") {
      checkImageFileType(file, cb);
    } else {
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname + '. Expected thumbnail.'));
    }
  }
}).single('thumbnail');

const uploadSinglePodcastThumbnail = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    if (file.fieldname === "thumbnail") {
      checkImageFileType(file, cb);
    } else {
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname + '. Expected thumbnail.'));
    }
  }
}).single('thumbnail');

const uploadSingleProgramThumbnail = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    if (file.fieldname === "thumbnail") {
      checkImageFileType(file, cb);
    } else {
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname + '. Expected thumbnail.'));
    }
  }
}).single('thumbnail');

const uploadSingleThumbnail = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    if (file.fieldname === "thumbnail") {
      checkImageFileType(file, cb);
    } else {
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname + '. Expected thumbnail.'));
    }
  }
}).single('thumbnail');

const uploadPodcastSeriesCover = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    if (file.fieldname === "coverImageFile") {
      checkImageFileType(file, cb);
    } else {
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname + '. Expected coverImageFile.'));
    }
  }
}).single('coverImageFile');

const uploadPodcastEpisodeThumbnail = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    if (file.fieldname === "thumbnailFile") {
      checkImageFileType(file, cb);
    } else {
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname + '. Expected thumbnailFile.'));
    }
  }
}).single('thumbnailFile');

const M_uploadProgramThumbnailForCloudinary = multer({
  storage: memoryStorage,
  limits: { fileSize: 150 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    if (file.fieldname === "thumbnailFile") {
      checkImageFileType(file, cb);
    } else if (file.fieldname === "videoFile") {
      checkVideoFileType(file, cb);
    } else {
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
    }
  }
}).fields([{ name: 'thumbnailFile', maxCount: 1 }, { name: 'videoFile', maxCount: 1 }]);

const M_uploadProgramSeriesCoverForCloudinary = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "coverImageFile") {
      checkImageFileType(file, cb);
    } else {
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
    }
  }
}).single('coverImageFile');


module.exports = {
  uploadEbookFiles,
  uploadBlogCoverImage,
  uploadNutritionPlanAssets,
  uploadSingleNutritionThumbnail,
  uploadSinglePodcastThumbnail,
  uploadSingleProgramThumbnail,
  uploadSingleThumbnail,
  uploadPodcastSeriesCover,
  uploadPodcastEpisodeThumbnail,
  M_uploadProgramThumbnailForCloudinary,
  M_uploadProgramSeriesCoverForCloudinary,
};
