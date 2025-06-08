const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Import new services
const exportService = require('./export-service');
const ocrService = require('./ocr-service');
const settingsService = require('./settings-service');
const integrationService = require('./integration-service');
const workflowService = require('./workflow-service');

const app = express();
const PORT = process.env.PORT || 4001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|csv|xlsx|xls/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, and spreadsheets are allowed.'));
    }
  }
});

// ===== AUTHENTICATION ENDPOINTS =====
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  console.log('Login attempt:', email);
  
  // Accept any credentials for demo
  if (email && password) {
    const user = {
      id: '1',
      email: email,
      firstName: 'John',
      lastName: 'Doe',
      role: 'Manager',
      department: 'Finance',
      permissions: ['view_expenses', 'approve_expenses', 'manage_users']
    };
    
    const token = 'demo-jwt-token-' + Date.now();
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        token,
        expiresIn: '8h'
      }
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }
});

app.post('/api/auth/logout', (req, res) => {
  console.log('User logged out');
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

// ===== MOCK DATA =====
let expenses = [
  {
    id: '1',
    title: 'Business Lunch with Client',
    amount: 125.50,
    currency: 'PLN',
    category: 'Meals & Entertainment',
    date: '2024-01-15',
    status: 'pending',
    description: 'Lunch meeting with potential client to discuss project requirements',
    employeeName: 'John Doe',
    employeeId: '1',
    submittedAt: '2024-01-15T14:30:00Z',
    receiptUrl: '/uploads/receipt-1.jpg',
    tags: ['client', 'business development'],
    department: 'Sales',
    project: 'New Client Acquisition',
    approvalWorkflow: 'standard',
    currentStep: 'manager_approval'
  },
  {
    id: '2',
    title: 'Office Supplies - Stationery',
    amount: 89.99,
    currency: 'PLN',
    category: 'Office Supplies',
    date: '2024-01-14',
    status: 'approved',
    description: 'Monthly office supplies including pens, paper, and folders',
    employeeName: 'Jane Smith',
    employeeId: '2',
    submittedAt: '2024-01-14T09:15:00Z',
    approvedAt: '2024-01-14T16:20:00Z',
    approvedBy: 'Manager',
    receiptUrl: '/uploads/receipt-2.jpg',
    tags: ['office', 'monthly'],
    department: 'Administration',
    project: 'General Operations'
  }
];

let documents = [
  {
    id: '1',
    filename: 'receipt-business-lunch.jpg',
    originalName: 'IMG_20240115_143022.jpg',
    type: 'receipt',
    status: 'processed',
    uploadedAt: '2024-01-15T14:30:00Z',
    processedAt: '2024-01-15T14:31:15Z',
    size: 2048576,
    extractedData: {
      amount: 125.50,
      currency: 'PLN',
      date: '2024-01-15',
      merchant: 'Restaurant Bella Vista',
      category: 'Meals & Entertainment',
      confidence: 0.92
    },
    linkedExpenseId: '1'
  }
];

let categories = [
  { id: '1', name: 'Meals & Entertainment', description: 'Business meals and entertainment expenses', color: '#FF6B6B', isActive: true, parentId: null },
  { id: '2', name: 'Travel & Transportation', description: 'Travel, flights, hotels, and transportation', color: '#4ECDC4', isActive: true, parentId: null },
  { id: '3', name: 'Office Supplies', description: 'Office equipment and supplies', color: '#45B7D1', isActive: true, parentId: null },
  { id: '4', name: 'Professional Services', description: 'Consulting, legal, and professional fees', color: '#96CEB4', isActive: true, parentId: null },
  { id: '5', name: 'Marketing & Advertising', description: 'Marketing campaigns and advertising costs', color: '#FFEAA7', isActive: true, parentId: null }
];

let bankStatements = [
  {
    id: 'stmt_1',
    filename: 'statement-jan-2024.pdf',
    originalName: 'Bank_Statement_January_2024.pdf',
    bankName: 'PKO Bank Polski',
    accountNumber: '****1234',
    statementPeriod: { from: '2024-01-01', to: '2024-01-31' },
    status: 'processed',
    uploadedAt: '2024-02-01T09:00:00Z',
    processedAt: '2024-02-01T09:05:30Z',
    size: 1024000,
    transactionCount: 25,
    totalCredits: 15000.00,
    totalDebits: 8500.00,
    currency: 'PLN',
    extractedTransactions: [
      {
        id: 'txn_1',
        date: '2024-01-15',
        amount: -125.50,
        description: 'RESTAURANT BELLA VISTA',
        type: 'debit',
        matched: true,
        matchedExpenseId: '1'
      }
    ]
  }
];

let userProfile = {
  id: '1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@company.com',
  phone: '+48 123 456 789',
  position: 'Senior Accountant',
  department: 'Finance',
  company: 'ExpenseFlow Demo Corp',
  address: 'ul. Marszałkowska 123',
  city: 'Warsaw',
  country: 'Poland',
  timezone: 'Europe/Warsaw',
  language: 'en',
  currency: 'PLN',
  avatar: '',
  role: 'Manager',
  joinDate: '2023-01-15',
  lastLogin: '2024-01-15T10:30:00Z',
  preferences: {
    notifications: { email: true, push: true, sms: false },
    theme: 'light',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'european'
  }
};

// ===== ENHANCED EXPORT ENDPOINTS =====
app.get('/api/exports/expenses', async (req, res) => {
  try {
    const { format = 'excel', filename = 'expenses' } = req.query;
    
    let result;
    if (format === 'pdf') {
      result = exportService.exportExpensesToPDF(expenses, filename);
    } else if (format === 'csv') {
      result = exportService.exportToCSV(expenses, filename);
    } else {
      result = exportService.exportExpensesToExcel(expenses, filename);
    }
    
    if (result.success) {
      res.download(result.filepath, result.filename, (err) => {
        if (err) {
          console.error('Download error:', err);
          res.status(500).json({ success: false, error: 'Download failed' });
        }
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/exports/analytics', async (req, res) => {
  try {
    const { format = 'pdf' } = req.query;
    
    // Generate analytics data
    const analyticsData = {
      overview: {
        totalExpenses: expenses.length,
        totalAmount: expenses.reduce((sum, exp) => sum + exp.amount, 0),
        averageExpense: expenses.reduce((sum, exp) => sum + exp.amount, 0) / expenses.length,
        monthlyGrowth: 12.5
      },
      categoryBreakdown: categories.map(cat => {
        const categoryExpenses = expenses.filter(exp => exp.category === cat.name);
        const amount = categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        return {
          category: cat.name,
          amount,
          count: categoryExpenses.length,
          percentage: Math.round((amount / expenses.reduce((sum, exp) => sum + exp.amount, 0)) * 100)
        };
      }),
      monthlyTrends: [
        { month: 'Jan 2024', amount: 5420.50, count: 15 },
        { month: 'Dec 2023', amount: 4830.25, count: 12 },
        { month: 'Nov 2023', amount: 6120.75, count: 18 }
      ]
    };
    
    const result = exportService.exportAnalyticsReport(analyticsData, format);
    
    if (result.success) {
      res.download(result.filepath, result.filename, (err) => {
        if (err) {
          console.error('Download error:', err);
          res.status(500).json({ success: false, error: 'Download failed' });
        }
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Analytics export error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== ENHANCED OCR ENDPOINTS =====
app.post('/api/documents/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    console.log('Processing document with real OCR:', req.file.originalname);
    
    // Process document with real OCR
    const ocrResult = await ocrService.processDocument(req.file.path, req.file.originalname);
    
    const newDocument = {
      id: `doc_${Date.now()}`,
      filename: req.file.filename,
      originalName: req.file.originalname,
      type: 'receipt',
      status: ocrResult.success ? 'processed' : 'failed',
      uploadedAt: new Date().toISOString(),
      processedAt: ocrResult.success ? new Date().toISOString() : null,
      size: req.file.size,
      extractedData: ocrResult.extractedData,
      extractedText: ocrResult.extractedText,
      confidence: ocrResult.confidence,
      processingError: ocrResult.success ? null : ocrResult.error
    };

    documents.unshift(newDocument);
    
    res.json({
      success: true,
      message: 'Document processed successfully',
      data: newDocument
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process document',
      error: error.message
    });
  }
});

app.get('/api/documents/:id/validate', (req, res) => {
  try {
    const { id } = req.params;
    const document = documents.find(d => d.id === id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    const validation = ocrService.validateExtractedData(document.extractedData);
    
    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Document validation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== SETTINGS PERSISTENCE ENDPOINTS =====
app.get('/api/settings', (req, res) => {
  try {
    const settings = settingsService.getAllSettings();
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Settings fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.put('/api/settings/company', (req, res) => {
  try {
    const result = settingsService.updateCompanySettings(req.body);
    res.json(result);
  } catch (error) {
    console.error('Company settings update error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.put('/api/settings/user', (req, res) => {
  try {
    const result = settingsService.updateUserSettings(req.body);
    res.json(result);
  } catch (error) {
    console.error('User settings update error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/settings/export', (req, res) => {
  try {
    const result = settingsService.exportSettings();
    if (result.success) {
      res.download(result.filepath, result.filename);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Settings export error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/settings/import', upload.single('settingsFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No settings file uploaded'
      });
    }
    
    const result = settingsService.importSettings(req.file.path);
    res.json(result);
  } catch (error) {
    console.error('Settings import error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== INTEGRATION ENDPOINTS =====
app.get('/api/integrations', (req, res) => {
  try {
    const integrations = integrationService.getAvailableIntegrations();
    res.json({
      success: true,
      data: integrations
    });
  } catch (error) {
    console.error('Integrations fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/integrations/categories/:category', (req, res) => {
  try {
    const { category } = req.params;
    const integrations = integrationService.getIntegrationsByCategory(category);
    res.json({
      success: true,
      data: integrations
    });
  } catch (error) {
    console.error('Category integrations fetch error:', error);
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
    res.json(result);
  } catch (error) {
    console.error('Integration configuration error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/integrations/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await integrationService.testIntegrationConnection(id, req.body);
    res.json(result);
  } catch (error) {
    console.error('Integration test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/integrations/:id/sync', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await integrationService.syncIntegration(id);
    res.json(result);
  } catch (error) {
    console.error('Integration sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.delete('/api/integrations/:id', (req, res) => {
  try {
    const { id } = req.params;
    const result = integrationService.removeIntegration(id);
    res.json(result);
  } catch (error) {
    console.error('Integration removal error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== WORKFLOW EDITOR ENDPOINTS =====
app.get('/api/workflows', (req, res) => {
  try {
    const workflows = workflowService.getAllWorkflows();
    res.json({
      success: true,
      data: workflows
    });
  } catch (error) {
    console.error('Workflows fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/workflows/components', (req, res) => {
  try {
    const components = workflowService.getWorkflowComponents();
    res.json({
      success: true,
      data: components
    });
  } catch (error) {
    console.error('Workflow components fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/workflows', (req, res) => {
  try {
    const result = workflowService.createWorkflow(req.body);
    res.json(result);
  } catch (error) {
    console.error('Workflow creation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.put('/api/workflows/:id', (req, res) => {
  try {
    const { id } = req.params;
    const result = workflowService.updateWorkflow(id, req.body);
    res.json(result);
  } catch (error) {
    console.error('Workflow update error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.delete('/api/workflows/:id', (req, res) => {
  try {
    const { id } = req.params;
    const result = workflowService.deleteWorkflow(id);
    res.json(result);
  } catch (error) {
    console.error('Workflow deletion error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/workflows/:id/duplicate', (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const result = workflowService.duplicateWorkflow(id, name);
    res.json(result);
  } catch (error) {
    console.error('Workflow duplication error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/workflows/:id/export', (req, res) => {
  try {
    const { id } = req.params;
    const result = workflowService.exportWorkflow(id);
    if (result.success) {
      res.download(result.filepath, result.filename);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Workflow export error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/workflows/import', upload.single('workflowFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No workflow file uploaded'
      });
    }
    
    const result = workflowService.importWorkflow(req.file.path);
    res.json(result);
  } catch (error) {
    console.error('Workflow import error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== EXISTING ENDPOINTS (SIMPLIFIED) =====
app.get('/api/expenses', (req, res) => {
  res.json({ success: true, data: expenses });
});

app.post('/api/expenses', (req, res) => {
  const newExpense = {
    id: `exp_${Date.now()}`,
    ...req.body,
    submittedAt: new Date().toISOString(),
    status: 'pending'
  };
  expenses.unshift(newExpense);
  res.json({ success: true, data: newExpense });
});

app.get('/api/documents', (req, res) => {
  res.json({ success: true, data: documents });
});

app.get('/api/categories', (req, res) => {
  res.json({ success: true, data: categories });
});

app.get('/api/bank-statements', (req, res) => {
  res.json({ success: true, data: bankStatements });
});

app.get('/api/profile', (req, res) => {
  res.json({ success: true, data: userProfile });
});

app.put('/api/profile', (req, res) => {
  userProfile = { ...userProfile, ...req.body };
  res.json({ success: true, data: userProfile });
});

// ===== ANALYTICS ENDPOINTS =====
app.get('/api/analytics/overview', (req, res) => {
  const overview = {
    totalExpenses: expenses.length,
    totalAmount: expenses.reduce((sum, exp) => sum + exp.amount, 0),
    pendingApprovals: expenses.filter(exp => exp.status === 'pending').length,
    monthlyGrowth: 12.5,
    averageExpense: expenses.reduce((sum, exp) => sum + exp.amount, 0) / expenses.length
  };
  res.json({ success: true, data: overview });
});

// ===== ERROR HANDLING =====
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: error.message
  });
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`🚀 Enhanced ExpenseFlow Pro Backend running on port ${PORT}`);
  console.log(`📊 Features: Real OCR, File Exports, Settings Persistence, Integrations, Workflow Editor`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  
  // Clean up old export files on startup
  exportService.cleanupOldFiles();
});

module.exports = app; 