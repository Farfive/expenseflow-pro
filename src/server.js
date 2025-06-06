const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs-extra');

// Load environment variables
require('dotenv').config();

// Import utilities and middleware
const logger = require('./utils/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { authenticateToken } = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const companyRoutes = require('./routes/companies');
const expenseRoutes = require('./routes/expenses');
const documentRoutes = require('./routes/documents');
const fileRoutes = require('./routes/files');
const approvalRoutes = require('./routes/approvals');
const categoryRoutes = require('./routes/categories');
const projectRoutes = require('./routes/projects');
const notificationRoutes = require('./routes/notifications');
const categorizationRoutes = require('./routes/categorization');
const bankStatementRoutes = require('./routes/bankStatements');
const exportRoutes = require('./routes/exports');

// Import services
const DocumentQueueService = require('./services/documentQueue');
const DocumentProcessor = require('./services/documentProcessor');

// Initialize Express app
const app = express();

// ========================================
// Security & Middleware Configuration
// ========================================

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-company-id']
};
app.use(cors(corsOptions));

// Request parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: message => logger.info(message.trim())
    }
  }));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// ========================================
// File Storage Setup
// ========================================

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
fs.ensureDirSync(uploadDir);
fs.ensureDirSync(path.join(uploadDir, 'documents'));
fs.ensureDirSync(path.join(uploadDir, 'avatars'));
fs.ensureDirSync(path.join(uploadDir, 'temp'));
fs.ensureDirSync(path.join(uploadDir, 'previews'));
fs.ensureDirSync('./logs');
fs.ensureDirSync('./exports');

// Initialize document processing services
let documentQueue;
let documentProcessor;

try {
  documentQueue = new DocumentQueueService();
  documentProcessor = new DocumentProcessor();
  logger.info('Document processing services initialized');
} catch (error) {
  logger.error('Failed to initialize document processing services:', error);
}

// ========================================
// API Routes
// ========================================

const apiVersion = process.env.API_VERSION || 'v1';

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Information endpoint
app.get(`/api/${apiVersion}`, (req, res) => {
  res.json({
    name: 'ExpenseFlow Pro API',
    version: apiVersion,
    description: 'Scalable expense management API with OCR integration',
    endpoints: {
      auth: `/api/${apiVersion}/auth`,
      users: `/api/${apiVersion}/users`,
      companies: `/api/${apiVersion}/companies`,
      expenses: `/api/${apiVersion}/expenses`,
      documents: `/api/${apiVersion}/documents`,
      files: `/api/${apiVersion}/files`,
      approvals: `/api/${apiVersion}/approvals`,
      categories: `/api/${apiVersion}/categories`,
      projects: `/api/${apiVersion}/projects`,
      notifications: `/api/${apiVersion}/notifications`,
      categorization: `/api/${apiVersion}/categorization`,
      bankStatements: `/api/${apiVersion}/bank-statements`,
      exports: `/api/${apiVersion}/exports`
    }
  });
});

// Public routes (no authentication required)
app.use(`/api/${apiVersion}/auth`, authRoutes);
app.use(`/api/${apiVersion}/files`, fileRoutes); // File serving endpoint

// Protected routes (authentication required)
app.use(`/api/${apiVersion}/users`, authenticateToken, userRoutes);
app.use(`/api/${apiVersion}/companies`, authenticateToken, companyRoutes);
app.use(`/api/${apiVersion}/expenses`, authenticateToken, expenseRoutes);
app.use(`/api/${apiVersion}/documents`, authenticateToken, documentRoutes);
app.use(`/api/${apiVersion}/approvals`, authenticateToken, approvalRoutes);
app.use(`/api/${apiVersion}/categories`, authenticateToken, categoryRoutes);
app.use(`/api/${apiVersion}/projects`, authenticateToken, projectRoutes);
app.use(`/api/${apiVersion}/notifications`, authenticateToken, notificationRoutes);
app.use(`/api/${apiVersion}/categorization`, authenticateToken, categorizationRoutes);
app.use(`/api/${apiVersion}/bank-statements`, authenticateToken, bankStatementRoutes);
app.use(`/api/${apiVersion}/exports`, authenticateToken, exportRoutes);

// ========================================
// Error Handling
// ========================================

// 404 handler for undefined routes
app.use(notFound);

// Global error handler
app.use(errorHandler);

// ========================================
// Server Startup
// ========================================

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close(async () => {
    logger.info('HTTP server closed.');
    
    // Close document queue
    if (documentQueue) {
      await documentQueue.shutdown();
    }
    
    // Close database connections
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
};

// Start server
const server = app.listen(PORT, HOST, () => {
  logger.info(`🚀 ExpenseFlow Pro API server running on http://${HOST}:${PORT}`);
  logger.info(`📚 API Documentation: http://${HOST}:${PORT}/api/${apiVersion}`);
  logger.info(`🏥 Health Check: http://${HOST}:${PORT}/health`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app; 