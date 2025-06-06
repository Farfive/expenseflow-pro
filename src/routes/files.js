const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const mime = require('mime-types');
const { PrismaClient } = require('@prisma/client');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { optionalAuth, authenticateToken, requireCompanyAccess } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// ========================================
// File Serving Endpoints
// ========================================

// Serve document files with authentication and access control
router.get('/documents/:documentId', authenticateToken, asyncHandler(async (req, res) => {
  const { documentId } = req.params;
  
  // Get document from database with access control
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      company: {
        include: {
          users: {
            where: {
              userId: req.user.id,
              isActive: true
            }
          }
        }
      }
    }
  });

  if (!document) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  // Check if user has access to this company's documents
  if (!document.company.users.length) {
    throw new AppError('Access denied to this document', 403, 'DOCUMENT_ACCESS_DENIED');
  }

  // Check if file exists on disk
  const filePath = path.resolve(document.filePath);
  
  // Security check: ensure file is within upload directory
  const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
  if (!filePath.startsWith(uploadDir)) {
    logger.error('File path traversal attempt:', { filePath, documentId, userId: req.user.id });
    throw new AppError('Invalid file path', 403, 'INVALID_FILE_PATH');
  }

  if (!await fs.pathExists(filePath)) {
    logger.error('Document file not found on disk:', { filePath, documentId });
    throw new AppError('Document file not found', 404, 'FILE_NOT_FOUND');
  }

  try {
    // Get file stats
    const stats = await fs.stat(filePath);
    
    // Set appropriate headers
    const mimeType = document.mimeType || mime.lookup(filePath) || 'application/octet-stream';
    
    res.set({
      'Content-Type': mimeType,
      'Content-Length': stats.size,
      'Content-Disposition': `inline; filename="${encodeURIComponent(document.originalName)}"`,
      'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY'
    });

    // Handle range requests for large files (useful for PDFs)
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunkSize = (end - start) + 1;

      res.status(206);
      res.set({
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize
      });

      const stream = fs.createReadStream(filePath, { start, end });
      stream.pipe(res);
    } else {
      // Send entire file
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    }

    // Log file access
    logger.info('File accessed', {
      documentId,
      fileName: document.fileName,
      userId: req.user.id,
      companyId: document.companyId,
      fileSize: stats.size,
      mimeType
    });

  } catch (error) {
    logger.error('Error serving file:', error);
    throw new AppError('Error serving file', 500, 'FILE_SERVING_ERROR');
  }
}));

// Serve avatar images (less restrictive access)
router.get('/avatars/:filename', optionalAuth, asyncHandler(async (req, res) => {
  const { filename } = req.params;
  
  // Security check: validate filename
  if (!filename.match(/^avatar_[a-zA-Z0-9_-]+_\d+\.(jpg|jpeg|png|webp)$/)) {
    throw new AppError('Invalid avatar filename', 400, 'INVALID_AVATAR_FILENAME');
  }

  const filePath = path.resolve(process.env.UPLOAD_DIR || './uploads', 'avatars', filename);
  
  // Security check: ensure file is within avatars directory
  const avatarsDir = path.resolve(process.env.UPLOAD_DIR || './uploads', 'avatars');
  if (!filePath.startsWith(avatarsDir)) {
    throw new AppError('Invalid file path', 403, 'INVALID_FILE_PATH');
  }

  if (!await fs.pathExists(filePath)) {
    // Return default avatar or 404
    throw new AppError('Avatar not found', 404, 'AVATAR_NOT_FOUND');
  }

  try {
    const stats = await fs.stat(filePath);
    const mimeType = mime.lookup(filePath) || 'image/jpeg';

    res.set({
      'Content-Type': mimeType,
      'Content-Length': stats.size,
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      'ETag': `"${stats.mtime.getTime()}-${stats.size}"`,
      'X-Content-Type-Options': 'nosniff'
    });

    // Check if client has cached version
    const ifNoneMatch = req.headers['if-none-match'];
    const etag = `"${stats.mtime.getTime()}-${stats.size}"`;
    
    if (ifNoneMatch === etag) {
      return res.status(304).end();
    }

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);

  } catch (error) {
    logger.error('Error serving avatar:', error);
    throw new AppError('Error serving avatar', 500, 'AVATAR_SERVING_ERROR');
  }
}));

// Download document with proper headers for download
router.get('/documents/:documentId/download', authenticateToken, asyncHandler(async (req, res) => {
  const { documentId } = req.params;
  
  // Get document with access control (reuse logic from serve endpoint)
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      company: {
        include: {
          users: {
            where: {
              userId: req.user.id,
              isActive: true
            }
          }
        }
      }
    }
  });

  if (!document) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  if (!document.company.users.length) {
    throw new AppError('Access denied to this document', 403, 'DOCUMENT_ACCESS_DENIED');
  }

  const filePath = path.resolve(document.filePath);
  const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
  
  if (!filePath.startsWith(uploadDir)) {
    throw new AppError('Invalid file path', 403, 'INVALID_FILE_PATH');
  }

  if (!await fs.pathExists(filePath)) {
    throw new AppError('Document file not found', 404, 'FILE_NOT_FOUND');
  }

  try {
    const stats = await fs.stat(filePath);
    const mimeType = document.mimeType || 'application/octet-stream';

    // Force download with proper filename
    res.set({
      'Content-Type': mimeType,
      'Content-Length': stats.size,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(document.originalName)}"`,
      'X-Content-Type-Options': 'nosniff'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);

    // Log download
    logger.info('File downloaded', {
      documentId,
      fileName: document.fileName,
      originalName: document.originalName,
      userId: req.user.id,
      companyId: document.companyId
    });

  } catch (error) {
    logger.error('Error downloading file:', error);
    throw new AppError('Error downloading file', 500, 'FILE_DOWNLOAD_ERROR');
  }
}));

// Get file information/metadata
router.get('/documents/:documentId/info', authenticateToken, asyncHandler(async (req, res) => {
  const { documentId } = req.params;
  
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      company: {
        include: {
          users: {
            where: {
              userId: req.user.id,
              isActive: true
            }
          }
        }
      }
    }
  });

  if (!document) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  if (!document.company.users.length) {
    throw new AppError('Access denied to this document', 403, 'DOCUMENT_ACCESS_DENIED');
  }

  // Return file metadata without exposing sensitive path information
  res.json({
    success: true,
    data: {
      id: document.id,
      originalName: document.originalName,
      fileName: document.fileName,
      fileSize: document.fileSize,
      mimeType: document.mimeType,
      status: document.status,
      ocrProcessed: document.ocrProcessed,
      confidenceScore: document.confidenceScore,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      // Don't expose actual file path for security
      downloadUrl: `/api/v1/files/documents/${document.id}/download`,
      viewUrl: `/api/v1/files/documents/${document.id}`
    }
  });
}));

// Health check for file storage
router.get('/health', asyncHandler(async (req, res) => {
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  
  try {
    // Check if upload directories exist and are writable
    const documentsDir = path.join(uploadDir, 'documents');
    const avatarsDir = path.join(uploadDir, 'avatars');
    
    await fs.ensureDir(documentsDir);
    await fs.ensureDir(avatarsDir);
    
    // Test write access
    const testFile = path.join(uploadDir, 'test-write-access.tmp');
    await fs.writeFile(testFile, 'test');
    await fs.remove(testFile);
    
    res.json({
      success: true,
      data: {
        status: 'healthy',
        uploadDir,
        directoriesChecked: ['documents', 'avatars'],
        writeAccess: true
      }
    });
  } catch (error) {
    logger.error('File storage health check failed:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'File storage not healthy',
        code: 'STORAGE_UNHEALTHY',
        details: error.message
      }
    });
  }
}));

module.exports = router; 