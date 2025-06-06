const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { body, validationResult, param, query } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const DocumentProcessor = require('../services/documentProcessor');
const DocumentQueueService = require('../services/documentQueue');
const { authenticate, requireRole, requireCompanyAccess } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();
const documentProcessor = new DocumentProcessor();
const documentQueue = new DocumentQueueService();

// Configure multer for document uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.env.UPLOAD_PATH || 'uploads', 'temp');
    await fs.ensureDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 10, // Max 10 files at once
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Invalid file type. Only PDF, JPG, and PNG files are allowed.', 400));
    }
  },
});

/**
 * @route POST /api/documents/upload
 * @desc Upload and process single document
 */
router.post('/upload',
  authenticate,
  requireCompanyAccess,
  upload.single('document'),
  [
    body('documentType')
      .optional()
      .isIn(['receipt', 'invoice', 'statement', 'bank_statement', 'other'])
      .withMessage('Invalid document type'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('processingPriority')
      .optional()
      .isInt({ min: 0, max: 10 })
      .withMessage('Priority must be between 0 and 10'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
      }

      const {
        documentType = 'receipt',
        description = '',
        processingPriority = 0,
      } = req.body;

      // Create document record
      const document = await prisma.document.create({
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          fileSize: req.file.size,
          filePath: req.file.path,
          documentType,
          description,
          status: 'uploaded',
          userId: req.user.id,
          companyId: req.user.companyId,
          metadata: {
            uploadedAt: new Date().toISOString(),
            userAgent: req.get('User-Agent'),
            ipAddress: req.ip,
          },
        },
      });

      // Add to processing queue
      const queueResult = await documentQueue.addDocumentToQueue({
        documentId: document.id,
        filePath: req.file.path,
        originalName: req.file.originalname,
        documentType,
        userId: req.user.id,
        companyId: req.user.companyId,
        priority: parseInt(processingPriority),
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      });

      // Update document with job ID
      await prisma.document.update({
        where: { id: document.id },
        data: {
          processingJobId: queueResult.jobId,
          status: 'queued',
        },
      });

      logger.info('Document uploaded and queued for processing', {
        documentId: document.id,
        jobId: queueResult.jobId,
        userId: req.user.id,
      });

      res.status(201).json({
        success: true,
        message: 'Document uploaded and queued for processing',
        data: {
          document: {
            id: document.id,
            filename: document.filename,
            originalName: document.originalName,
            documentType: document.documentType,
            status: document.status,
            createdAt: document.createdAt,
          },
          processing: {
            jobId: queueResult.jobId,
            status: queueResult.status,
            estimatedProcessingTime: queueResult.estimatedProcessingTime,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/documents/upload/batch
 * @desc Upload and process multiple documents
 */
router.post('/upload/batch',
  authenticate,
  requireCompanyAccess,
  upload.array('documents', 10),
  [
    body('documentType')
      .optional()
      .isIn(['receipt', 'invoice', 'statement', 'bank_statement', 'other'])
      .withMessage('Invalid document type'),
    body('batchDescription')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Batch description must be less than 500 characters'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded',
        });
      }

      const {
        documentType = 'receipt',
        batchDescription = '',
      } = req.body;

      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const documents = [];

      // Create document records
      for (const file of req.files) {
        const document = await prisma.document.create({
          data: {
            filename: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            fileSize: file.size,
            filePath: file.path,
            documentType,
            description: batchDescription,
            status: 'uploaded',
            userId: req.user.id,
            companyId: req.user.companyId,
            batchId,
            metadata: {
              uploadedAt: new Date().toISOString(),
              batchUpload: true,
              userAgent: req.get('User-Agent'),
              ipAddress: req.ip,
            },
          },
        });

        documents.push({
          documentId: document.id,
          filePath: file.path,
          originalName: file.originalname,
          documentType,
          fileSize: file.size,
          mimeType: file.mimetype,
        });
      }

      // Add batch to processing queue
      const queueResult = await documentQueue.addBatchToQueue({
        batchId,
        documents,
        userId: req.user.id,
        companyId: req.user.companyId,
        description: batchDescription,
      });

      // Update all documents with batch job ID
      await prisma.document.updateMany({
        where: { batchId },
        data: {
          processingJobId: queueResult.jobId,
          status: 'queued',
        },
      });

      logger.info('Batch uploaded and queued for processing', {
        batchId,
        documentCount: documents.length,
        jobId: queueResult.jobId,
        userId: req.user.id,
      });

      res.status(201).json({
        success: true,
        message: 'Documents uploaded and queued for batch processing',
        data: {
          batch: {
            batchId,
            documentCount: documents.length,
            documents: documents.map(doc => doc.documentId),
          },
          processing: {
            jobId: queueResult.jobId,
            status: queueResult.status,
            estimatedProcessingTime: queueResult.estimatedProcessingTime,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/documents
 * @desc Get user's documents with filtering and pagination
 */
router.get('/',
  authenticate,
  requireCompanyAccess,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('status').optional().isIn(['uploaded', 'queued', 'processing', 'completed', 'failed', 'requires_review']),
    query('documentType').optional().isIn(['receipt', 'invoice', 'statement', 'bank_statement', 'other']),
    query('requiresReview').optional().isBoolean(),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const {
        page = 1,
        limit = 20,
        status,
        documentType,
        requiresReview,
        dateFrom,
        dateTo,
        search,
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Build where clause
      const where = {
        companyId: req.user.companyId,
      };

      if (status) where.status = status;
      if (documentType) where.documentType = documentType;
      if (requiresReview !== undefined) where.requiresReview = requiresReview === 'true';
      
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom);
        if (dateTo) where.createdAt.lte = new Date(dateTo);
      }

      if (search) {
        where.OR = [
          { originalName: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { extractedText: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Get documents with pagination
      const [documents, total] = await Promise.all([
        prisma.document.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
            expenses: {
              select: { id: true, amount: true, currency: true, description: true },
            },
          },
        }),
        prisma.document.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          documents,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/documents/:id
 * @desc Get single document details
 */
router.get('/:id',
  authenticate,
  requireCompanyAccess,
  [
    param('id').isUUID().withMessage('Invalid document ID'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const document = await prisma.document.findFirst({
        where: {
          id: req.params.id,
          companyId: req.user.companyId,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          expenses: {
            include: {
              category: true,
            },
          },
        },
      });

      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found',
        });
      }

      res.json({
        success: true,
        data: { document },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/documents/:id/status
 * @desc Get document processing status
 */
router.get('/:id/status',
  authenticate,
  requireCompanyAccess,
  [
    param('id').isUUID().withMessage('Invalid document ID'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const document = await prisma.document.findFirst({
        where: {
          id: req.params.id,
          companyId: req.user.companyId,
        },
        select: {
          id: true,
          status: true,
          processingJobId: true,
          ocrConfidence: true,
          requiresReview: true,
          errorMessage: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found',
        });
      }

      let jobStatus = null;
      if (document.processingJobId) {
        try {
          jobStatus = await documentQueue.getJobStatus(document.processingJobId);
        } catch (error) {
          logger.warn('Failed to get job status:', error);
        }
      }

      res.json({
        success: true,
        data: {
          document: {
            id: document.id,
            status: document.status,
            ocrConfidence: document.ocrConfidence,
            requiresReview: document.requiresReview,
            errorMessage: document.errorMessage,
            createdAt: document.createdAt,
            updatedAt: document.updatedAt,
          },
          processing: jobStatus,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/documents/:id/reprocess
 * @desc Reprocess a document
 */
router.post('/:id/reprocess',
  authenticate,
  requireCompanyAccess,
  [
    param('id').isUUID().withMessage('Invalid document ID'),
    body('priority').optional().isInt({ min: 0, max: 10 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const document = await prisma.document.findFirst({
        where: {
          id: req.params.id,
          companyId: req.user.companyId,
        },
      });

      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found',
        });
      }

      if (!document.filePath || !(await fs.pathExists(document.filePath))) {
        return res.status(400).json({
          success: false,
          message: 'Document file not found',
        });
      }

      // Add to processing queue with higher priority
      const queueResult = await documentQueue.addDocumentToQueue({
        documentId: document.id,
        filePath: document.filePath,
        originalName: document.originalName,
        documentType: document.documentType,
        userId: req.user.id,
        companyId: req.user.companyId,
        priority: req.body.priority || 5, // Higher priority for reprocessing
        fileSize: document.fileSize,
        mimeType: document.mimeType,
      });

      // Update document status
      await prisma.document.update({
        where: { id: document.id },
        data: {
          processingJobId: queueResult.jobId,
          status: 'queued',
          errorMessage: null,
          updatedAt: new Date(),
        },
      });

      logger.info('Document requeued for processing', {
        documentId: document.id,
        jobId: queueResult.jobId,
        userId: req.user.id,
      });

      res.json({
        success: true,
        message: 'Document queued for reprocessing',
        data: {
          processing: {
            jobId: queueResult.jobId,
            status: queueResult.status,
            estimatedProcessingTime: queueResult.estimatedProcessingTime,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route PUT /api/documents/:id
 * @desc Update document metadata
 */
router.put('/:id',
  authenticate,
  requireCompanyAccess,
  [
    param('id').isUUID().withMessage('Invalid document ID'),
    body('documentType')
      .optional()
      .isIn(['receipt', 'invoice', 'statement', 'bank_statement', 'other']),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('requiresReview').optional().isBoolean(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { documentType, description, requiresReview } = req.body;

      const document = await prisma.document.findFirst({
        where: {
          id: req.params.id,
          companyId: req.user.companyId,
        },
      });

      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found',
        });
      }

      const updateData = {
        updatedAt: new Date(),
      };

      if (documentType !== undefined) updateData.documentType = documentType;
      if (description !== undefined) updateData.description = description;
      if (requiresReview !== undefined) updateData.requiresReview = requiresReview;

      const updatedDocument = await prisma.document.update({
        where: { id: req.params.id },
        data: updateData,
      });

      res.json({
        success: true,
        message: 'Document updated successfully',
        data: { document: updatedDocument },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route DELETE /api/documents/:id
 * @desc Delete a document
 */
router.delete('/:id',
  authenticate,
  requireCompanyAccess,
  requireRole(['admin', 'manager']),
  [
    param('id').isUUID().withMessage('Invalid document ID'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const document = await prisma.document.findFirst({
        where: {
          id: req.params.id,
          companyId: req.user.companyId,
        },
      });

      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found',
        });
      }

      // Delete file from filesystem
      if (document.filePath && await fs.pathExists(document.filePath)) {
        await fs.remove(document.filePath);
      }

      // Delete preview images
      if (document.ocrData?.previewImages) {
        for (const previewPath of document.ocrData.previewImages) {
          if (await fs.pathExists(previewPath)) {
            await fs.remove(previewPath);
          }
        }
      }

      // Delete document record
      await prisma.document.delete({
        where: { id: req.params.id },
      });

      logger.info('Document deleted', {
        documentId: document.id,
        userId: req.user.id,
      });

      res.json({
        success: true,
        message: 'Document deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/documents/queue/stats
 * @desc Get processing queue statistics
 */
router.get('/queue/stats',
  authenticate,
  requireRole(['admin', 'manager']),
  async (req, res, next) => {
    try {
      const stats = await documentQueue.getQueueStats();
      
      res.json({
        success: true,
        data: { stats },
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router; 