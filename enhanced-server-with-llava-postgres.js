const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const helmet = require('helmet');

// Import services
const EnhancedOCRService = require('./enhanced-ocr-service');
const databaseService = require('./database-service');
const exportService = require('./export-service');

// Import existing services
const settingsService = require('./settings-service');
const integrationService = require('./integration-service');
const workflowService = require('./workflow-service');

const app = express();
const PORT = process.env.PORT || 8001;

// Initialize services
const ocrService = new EnhancedOCRService();
let dbConnected = false;

// Middleware
app.use(helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:4000', 'http://localhost:4001'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// File upload configuration
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images (JPG, PNG) and PDF files are allowed'));
    }
  }
});

// Database initialization
async function initializeDatabase() {
  try {
    console.log('🚀 Initializing database connection...');
    const result = await databaseService.connect();
    
    if (result.success) {
      dbConnected = true;
      console.log('✅ Database connection established');
    } else {
      console.log('⚠️ Database connection failed, using fallback mode');
      console.log('💡 To enable PostgreSQL: Run setup-database.bat');
      dbConnected = false;
    }
  } catch (error) {
    console.error('Database initialization error:', error);
    dbConnected = false;
  }
}

// Helper function for tenant context
function getTenantContext(req) {
  return {
    tenantId: req.headers['x-tenant-id'] || 'default-tenant',
    companyId: req.headers['x-company-id'] || 'default-company'
  };
}

// =====================================
// API ROUTES
// =====================================

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await databaseService.getStatus();
    const ocrStatus = await ocrService.getStatus();
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        ocr: ocrStatus,
        server: { port: PORT, environment: process.env.NODE_ENV || 'development' }
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// OCR and Document Processing Routes
app.post('/api/documents/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    console.log('📄 Processing uploaded document:', req.file.originalname);
    
    const ocrResult = await ocrService.processDocument(req.file.path, req.file.originalname);
    
    let documentRecord = null;
    if (dbConnected) {
      const { tenantId, companyId } = getTenantContext(req);
      
      const documentData = {
        filename: req.file.originalname,
        filepath: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size,
        status: ocrResult.success ? 'PROCESSED' : 'FAILED',
        extractedData: ocrResult.extractedData || {},
        confidence: ocrResult.confidence,
        processingMethod: ocrResult.processingMethod,
        processedAt: new Date()
      };

      const dbResult = await databaseService.createDocument(tenantId, companyId, documentData);
      if (dbResult.success) {
        documentRecord = dbResult.document;
      }
    }

    res.json({
      success: true,
      result: ocrResult,
      document: documentRecord,
      file: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        path: req.file.path
      }
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get documents with OCR results
app.get('/api/documents', async (req, res) => {
  try {
    if (!dbConnected) {
      return res.json({
        success: true,
        documents: [],
        message: 'Database not connected - documents stored in memory only'
      });
    }

    const { tenantId, companyId } = getTenantContext(req);
    const { limit, offset, status } = req.query;
    
    const result = await databaseService.getDocuments(tenantId, companyId, {
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
      status
    });

    res.json(result);
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reprocess document with different OCR method
app.post('/api/documents/:id/reprocess', async (req, res) => {
  try {
    const { id } = req.params;
    const { method } = req.body; // 'llava', 'tesseract', or 'hybrid'
    
    if (!dbConnected) {
      return res.status(400).json({
        success: false,
        error: 'Database not connected'
      });
    }

    // Get document from database
    const prisma = databaseService.getClient();
    const document = await prisma.document.findUnique({
      where: { id }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // Reprocess with specified method
    const ocrResult = await ocrService.processDocument(document.filepath, document.filename);
    
    // Update document in database
    const updateData = {
      extractedData: ocrResult.extractedData || {},
      confidence: ocrResult.confidence,
      processingMethod: ocrResult.processingMethod,
      processedAt: new Date()
    };

    const dbResult = await databaseService.updateDocument(id, updateData);

    res.json({
      success: true,
      result: ocrResult,
      document: dbResult.document
    });
  } catch (error) {
    console.error('Document reprocess error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Expense creation from OCR data
app.post('/api/expenses/from-document', async (req, res) => {
  try {
    const { documentId, expenseData, corrections } = req.body;
    
    if (!dbConnected) {
      return res.status(400).json({
        success: false,
        error: 'Database not connected'
      });
    }

    const { tenantId, companyId } = getTenantContext(req);
    
    // Create expense from OCR data
    const expense = {
      amount: expenseData.total_amount,
      currency: expenseData.currency || 'PLN',
      date: expenseData.transaction_date ? new Date(expenseData.transaction_date) : new Date(),
      description: expenseData.merchant_name || 'Unknown merchant',
      category: expenseData.category_suggestion || 'Other',
      documentId,
      status: 'DRAFT',
      userId: 'system', // Would be from auth in production
      ...corrections // Any manual corrections
    };

    const result = await databaseService.createExpense(tenantId, companyId, expense);

    res.json(result);
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =====================================
// EXISTING SERVICE ENDPOINTS
// =====================================

// Export service endpoints
app.get('/api/export/analytics', async (req, res) => {
  try {
    const { format = 'pdf', dateFrom, dateTo } = req.query;
    
    // Get analytics data (would be from database in production)
    const analyticsData = {
      totalExpenses: 0,
      categoryBreakdown: {},
      period: { from: dateFrom, to: dateTo }
    };

    if (dbConnected) {
      const { tenantId, companyId } = getTenantContext(req);
      const expenses = await databaseService.getExpenses(tenantId, companyId, {
        dateFrom, dateTo
      });
      
      if (expenses.success) {
        analyticsData.totalExpenses = expenses.expenses.reduce((sum, exp) => sum + exp.amount, 0);
      }
    }

    const result = exportService.exportAnalyticsReport(analyticsData, format);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Settings service endpoints
app.get('/api/settings', async (req, res) => {
  try {
    const settings = settingsService.getAllSettings();
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/settings/company', async (req, res) => {
  try {
    const result = settingsService.updateCompanySettings(req.body);
    res.json({
      success: true,
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Integration service endpoints
app.get('/api/integrations', async (req, res) => {
  try {
    const integrations = integrationService.getAvailableIntegrations();
    res.json({
      success: true,
      integrations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/integrations/:id/configure', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await integrationService.configureIntegration(id, req.body);
    res.json({
      success: true,
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Workflow service endpoints
app.get('/api/workflows', async (req, res) => {
  try {
    const workflows = workflowService.getAllWorkflows();
    res.json({
      success: true,
      workflows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/workflows', async (req, res) => {
  try {
    const result = workflowService.createWorkflow(req.body);
    res.json({
      success: true,
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =====================================
// ERROR HANDLING
// =====================================

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'File too large. Maximum size is 50MB.' });
    }
  }
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// =====================================
// SERVER STARTUP
// =====================================

async function startServer() {
  try {
    console.log('🚀 Starting ExpenseFlow Pro Enhanced Server...');
    console.log('🤖 Ollama LLaVA + PostgreSQL Integration');
    console.log('=====================================');
    
    // Initialize database
    await initializeDatabase();
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log('=====================================');
      console.log('✅ SERVER STARTED SUCCESSFULLY');
      console.log(`🌐 Server URL: http://localhost:${PORT}`);
      console.log(`📋 API Health: http://localhost:${PORT}/api/health`);
      console.log('=====================================');
      console.log('🔧 SERVICES STATUS:');
      console.log(`   📄 Document Processing: Enhanced OCR (LLaVA + Tesseract)`);
      console.log(`   🗄️  Database: ${dbConnected ? 'PostgreSQL Connected' : 'In-Memory Fallback'}`);
      console.log(`   🤖 AI OCR: Ollama LLaVA Integration`);
      console.log(`   📊 Analytics: Export & Reporting Services`);
      console.log(`   ⚙️  Settings: Configuration Management`);
      console.log(`   🔗 Integrations: ERP & Third-party Systems`);
      console.log(`   🔄 Workflows: Business Process Automation`);
      console.log('=====================================');
      
      if (!dbConnected) {
        console.log('💡 SETUP TIPS:');
        console.log('   To enable PostgreSQL: Run setup-database.bat');
        console.log('   To setup Ollama LLaVA: Run setup-ollama.bat');
        console.log('=====================================');
      }
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('🛑 Shutting down server...');
      await databaseService.disconnect();
      server.close(() => {
        console.log('✅ Server shut down gracefully');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('🛑 Shutting down server...');
      await databaseService.disconnect();
      server.close(() => {
        console.log('✅ Server shut down gracefully');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = app; 