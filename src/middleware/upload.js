const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const crypto = require('crypto');
const mime = require('mime-types');
const sharp = require('sharp');
const { AppError } = require('./errorHandler');
const logger = require('../utils/logger');

// ========================================
// Storage Configuration
// ========================================

// Configure storage for documents
const documentStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const companyId = req.headers['x-company-id'] || req.user?.companies?.[0]?.id;
      const uploadPath = path.join(
        process.env.UPLOAD_DIR || './uploads',
        'documents',
        companyId || 'general'
      );
      
      // Ensure directory exists
      await fs.ensureDir(uploadPath);
      cb(null, uploadPath);
    } catch (error) {
      logger.error('Error creating upload directory:', error);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and random string
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const randomString = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${timestamp}_${randomString}${ext}`;
    cb(null, filename);
  }
});

// Configure storage for avatars
const avatarStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const uploadPath = path.join(
        process.env.UPLOAD_DIR || './uploads',
        'avatars'
      );
      
      await fs.ensureDir(uploadPath);
      cb(null, uploadPath);
    } catch (error) {
      logger.error('Error creating avatar upload directory:', error);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const userId = req.user?.id || 'anonymous';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `avatar_${userId}_${timestamp}${ext}`;
    cb(null, filename);
  }
});

// ========================================
// File Validation
// ========================================

// Allowed file types for documents
const allowedDocumentTypes = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'application/pdf'
];

// Allowed file types for avatars
const allowedAvatarTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
];

// File filter function
const createFileFilter = (allowedTypes) => {
  return (req, file, cb) => {
    // Check MIME type
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new AppError(
        `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
        400,
        'INVALID_FILE_TYPE'
      ));
    }

    // Additional security check: verify file extension
    const ext = path.extname(file.originalname).toLowerCase();
    const expectedExt = mime.extension(file.mimetype);
    
    if (expectedExt && !ext.includes(expectedExt.substring(0, 3))) {
      return cb(new AppError(
        'File extension does not match MIME type',
        400,
        'FILE_EXTENSION_MISMATCH'
      ));
    }

    cb(null, true);
  };
};

// ========================================
// Multer Configuration
// ========================================

const limits = {
  fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
  files: 5, // Maximum 5 files per request
  fieldNameSize: 100,
  fieldSize: 1024 * 1024, // 1MB for field values
};

// Document upload configuration
const uploadDocuments = multer({
  storage: documentStorage,
  limits,
  fileFilter: createFileFilter(allowedDocumentTypes)
});

// Avatar upload configuration  
const uploadAvatar = multer({
  storage: avatarStorage,
  limits: {
    ...limits,
    fileSize: 5 * 1024 * 1024, // 5MB for avatars
    files: 1
  },
  fileFilter: createFileFilter(allowedAvatarTypes)
});

// Memory storage for processing before saving
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits,
  fileFilter: createFileFilter([...allowedDocumentTypes, ...allowedAvatarTypes])
});

// ========================================
// File Processing Middleware
// ========================================

// Image optimization middleware
const optimizeImage = async (req, res, next) => {
  if (!req.file || !req.file.mimetype.startsWith('image/')) {
    return next();
  }

  try {
    const optimizedBuffer = await sharp(req.file.buffer)
      .resize(2048, 2048, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ 
        quality: 85,
        progressive: true 
      })
      .toBuffer();

    req.file.buffer = optimizedBuffer;
    req.file.size = optimizedBuffer.length;
    
    next();
  } catch (error) {
    logger.error('Image optimization error:', error);
    next(error);
  }
};

// File validation middleware
const validateFile = (req, res, next) => {
  if (!req.file && !req.files) {
    return next(new AppError('No file uploaded', 400, 'NO_FILE_UPLOADED'));
  }

  const files = req.files || [req.file];
  
  for (const file of files) {
    // Check for malicious filenames
    if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
      return next(new AppError('Invalid filename', 400, 'INVALID_FILENAME'));
    }

    // Check file size
    if (file.size > limits.fileSize) {
      return next(new AppError(
        `File too large. Maximum size: ${limits.fileSize / 1024 / 1024}MB`,
        400,
        'FILE_TOO_LARGE'
      ));
    }

    // Log file upload
    logger.info('File uploaded', {
      filename: file.filename,
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      userId: req.user?.id,
      companyId: req.headers['x-company-id']
    });
  }

  next();
};

// Generate file hash for deduplication
const generateFileHash = async (filePath) => {
  try {
    const fileBuffer = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  } catch (error) {
    logger.error('Error generating file hash:', error);
    throw error;
  }
};

// Check for duplicate files
const checkDuplicateFile = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const fileHash = await generateFileHash(req.file.path);
    req.file.hash = fileHash;

    // Check if file already exists in database
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const existingFile = await prisma.document.findUnique({
      where: { fileHash }
    });

    if (existingFile) {
      // Remove the uploaded file since it's a duplicate
      await fs.remove(req.file.path);
      
      return res.status(409).json({
        success: false,
        error: {
          message: 'File already exists',
          code: 'DUPLICATE_FILE',
          existingFileId: existingFile.id
        }
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Clean up failed uploads
const cleanupFiles = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // If error response and files were uploaded, clean them up
    if (res.statusCode >= 400 && (req.file || req.files)) {
      const files = req.files || [req.file];
      files.forEach(async (file) => {
        if (file.path && await fs.pathExists(file.path)) {
          await fs.remove(file.path);
          logger.info('Cleaned up failed upload:', file.path);
        }
      });
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

// ========================================
// Export Configuration
// ========================================

module.exports = {
  // Upload configurations
  uploadDocuments,
  uploadAvatar,
  memoryUpload,
  
  // Middleware
  validateFile,
  optimizeImage,
  checkDuplicateFile,
  cleanupFiles,
  
  // Utilities
  generateFileHash,
  
  // File type constants
  allowedDocumentTypes,
  allowedAvatarTypes,
  limits
}; 