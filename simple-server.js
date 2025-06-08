const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 4001;

// Faster middleware setup with optimizations
app.use(cors({
  origin: ['http://localhost:4000', 'http://localhost:4001', 'http://localhost:3000'],
  credentials: true,
  maxAge: 86400, // Cache CORS preflight for 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Disable x-powered-by header for better performance
app.disable('x-powered-by');

// Cache control for faster responses
app.use((req, res, next) => {
  // Set cache headers for static content
  if (req.url.includes('/api/')) {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  next();
});

// Pre-computed test user data (no need to compute on each request)
const testUser = {
  id: 'test-user-1',
  email: 'test@expenseflow.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'admin',
  companyId: 'test-company-1',
  company: {
    id: 'test-company-1',
    name: 'Test Company',
    settings: {
      currency: 'PLN',
      timezone: 'Europe/Warsaw'
    }
  },
  permissions: ['read', 'write', 'admin'],
  profilePicture: null,
  lastLoginAt: new Date().toISOString(),
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: new Date().toISOString()
};

// Pre-generated token for faster autologin (in production, use proper JWT)
let cachedTokenData = null;
const generateTokenData = () => {
  if (!cachedTokenData) {
    cachedTokenData = {
      token: `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      refreshToken: `refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }
  return cachedTokenData;
};

// Basic authentication endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Simple validation for demo
  if (email && password) {
    const tokens = generateTokenData();
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: testUser,
        ...tokens
      }
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Email and password required'
    });
  }
});

app.get('/api/auth/me', (req, res) => {
  res.json({
    success: true,
    data: testUser
  });
});

app.post('/api/auth/logout', (req, res) => {
  cachedTokenData = null;
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images and PDFs
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDF files are allowed'), false);
    }
  }
});

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Lightweight in-memory storage (consider Redis for production)
const storage = {
  events: [],
  pageViews: [],
  featureUsage: [],
  errors: [],
  feedback: [],
  documents: [],
  expenses: [],
  companySettings: null,
  userPreferences: {},
  systemSettings: null,
  integrations: null
};

// Analytics API endpoints
app.post('/api/user-analytics/track-event', (req, res) => {
  const eventData = {
    id: Date.now().toString(),
    ...req.body,
    timestamp: new Date().toISOString()
  };
  
  storage.events.push(eventData);
  console.log('📊 Event tracked:', eventData.eventName);
  
  res.json({
    success: true,
    message: 'Event tracked successfully',
    data: eventData
  });
});

app.post('/api/user-analytics/track-page-view', (req, res) => {
  const pageViewData = {
    id: Date.now().toString(),
    ...req.body,
    timestamp: new Date().toISOString()
  };
  
  storage.pageViews.push(pageViewData);
  console.log('📄 Page view tracked:', pageViewData.page);
  
  res.json({
    success: true,
    message: 'Page view tracked successfully',
    data: pageViewData
  });
});

app.post('/api/user-analytics/track-feature-usage', (req, res) => {
  const featureData = {
    id: Date.now().toString(),
    ...req.body,
    timestamp: new Date().toISOString()
  };
  
  storage.featureUsage.push(featureData);
  console.log('🔧 Feature usage tracked:', featureData.feature, featureData.action);
  
  res.json({
    success: true,
    message: 'Feature usage tracked successfully',
    data: featureData
  });
});

app.post('/api/user-analytics/track-error', (req, res) => {
  const errorData = {
    id: Date.now().toString(),
    ...req.body,
    timestamp: new Date().toISOString()
  };
  
  storage.errors.push(errorData);
  console.log('❌ Error tracked:', errorData.errorType, errorData.errorMessage);
  
  res.json({
    success: true,
    message: 'Error tracked successfully',
    data: errorData
  });
});

app.post('/api/user-analytics/track-onboarding', (req, res) => {
  const onboardingData = {
    id: Date.now().toString(),
    ...req.body,
    timestamp: new Date().toISOString()
  };
  
  console.log('🎯 Onboarding step tracked:', onboardingData.stepName, onboardingData.completed ? 'completed' : 'viewed');
  
  res.json({
    success: true,
    message: 'Onboarding step tracked successfully',
    data: onboardingData
  });
});

// Document upload and OCR endpoints
app.post('/api/documents/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const documentId = Date.now().toString();
    const document = {
      id: documentId,
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      uploadedAt: new Date().toISOString(),
      status: 'uploaded',
      ocrData: null
    };

    storage.documents.push(document);
    console.log('📄 Document uploaded:', req.file.originalname);

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        documentId,
        filename: req.file.originalname,
        size: req.file.size,
        status: 'uploaded'
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: error.message
    });
  }
});

app.post('/api/documents/:documentId/process', (req, res) => {
  const { documentId } = req.params;
  const document = storage.documents.find(d => d.id === documentId);

  if (!document) {
    return res.status(404).json({
      success: false,
      message: 'Document not found'
    });
  }

  // Mock OCR processing with realistic data
  const mockOcrData = {
    documentType: 'receipt',
    totalAmount: Math.floor(Math.random() * 500) + 10,
    currency: 'PLN',
    transactionDate: new Date().toISOString().split('T')[0],
    merchantName: ['Żabka', 'Biedronka', 'Lidl', 'Tesco', 'Carrefour', 'Auchan'][Math.floor(Math.random() * 6)],
    nipNumber: '1234567890',
    vatAmount: Math.floor(Math.random() * 50) + 5,
    items: [
      { description: 'Chleb', quantity: 1, price: 3.50 },
      { description: 'Mleko', quantity: 2, price: 4.20 },
      { description: 'Masło', quantity: 1, price: 8.90 }
    ],
    confidence: 0.95,
    processingTime: Math.floor(Math.random() * 3000) + 1000
  };

  // Update document with OCR data
  document.ocrData = mockOcrData;
  document.status = 'processed';
  document.processedAt = new Date().toISOString();

  console.log('🔍 Document processed:', document.filename, '- Amount:', mockOcrData.totalAmount, 'PLN');

  res.json({
    success: true,
    message: 'Document processed successfully',
    data: {
      documentId,
      status: 'processed',
      ocrData: mockOcrData
    }
  });
});

app.get('/api/documents/:documentId', (req, res) => {
  const { documentId } = req.params;
  const document = storage.documents.find(d => d.id === documentId);

  if (!document) {
    return res.status(404).json({
      success: false,
      message: 'Document not found'
    });
  }

  res.json({
    success: true,
    data: document
  });
});

// Delete document
app.delete('/api/documents/:documentId', (req, res) => {
  const { documentId } = req.params;
  const documentIndex = storage.documents.findIndex(d => d.id === documentId);

  if (documentIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Document not found'
    });
  }

  const document = storage.documents[documentIndex];
  
  // Remove file from filesystem
  if (fs.existsSync(document.path)) {
    try {
      fs.unlinkSync(document.path);
    } catch (error) {
      console.warn('Failed to delete file:', error.message);
    }
  }

  // Remove from storage
  storage.documents.splice(documentIndex, 1);
  
  console.log('🗑️ Document deleted:', document.filename);

  res.json({
    success: true,
    message: 'Document deleted successfully'
  });
});

// Bulk delete documents
app.post('/api/documents/bulk-delete', (req, res) => {
  const { documentIds } = req.body;

  if (!Array.isArray(documentIds) || documentIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Document IDs array is required'
    });
  }

  let deletedCount = 0;
  const errors = [];

  documentIds.forEach(documentId => {
    const documentIndex = storage.documents.findIndex(d => d.id === documentId);
    
    if (documentIndex !== -1) {
      const document = storage.documents[documentIndex];
      
      // Remove file from filesystem
      if (fs.existsSync(document.path)) {
        try {
          fs.unlinkSync(document.path);
        } catch (error) {
          errors.push(`Failed to delete file for ${document.filename}: ${error.message}`);
        }
      }

      // Remove from storage
      storage.documents.splice(documentIndex, 1);
      deletedCount++;
    } else {
      errors.push(`Document ${documentId} not found`);
    }
  });

  console.log(`🗑️ Bulk delete: ${deletedCount} documents deleted`);

  res.json({
    success: true,
    message: `${deletedCount} documents deleted successfully`,
    data: {
      deletedCount,
      errors: errors.length > 0 ? errors : null
    }
  });
});

// Reprocess document
app.post('/api/documents/:documentId/reprocess', (req, res) => {
  const { documentId } = req.params;
  const document = storage.documents.find(d => d.id === documentId);

  if (!document) {
    return res.status(404).json({
      success: false,
      message: 'Document not found'
    });
  }

  // Reset status and reprocess
  document.status = 'processing';
  document.processedAt = null;
  document.ocrData = null;

  // Simulate processing delay
  setTimeout(() => {
    // Generate new mock OCR data
    const mockOcrData = {
      documentType: 'receipt',
      totalAmount: Math.floor(Math.random() * 500) + 10,
      currency: 'PLN',
      transactionDate: new Date().toISOString().split('T')[0],
      merchantName: ['Żabka', 'Biedronka', 'Lidl', 'Tesco', 'Carrefour', 'Auchan'][Math.floor(Math.random() * 6)],
      nipNumber: '1234567890',
      vatAmount: Math.floor(Math.random() * 50) + 5,
      items: [
        { description: 'Chleb', quantity: 1, price: 3.50 },
        { description: 'Mleko', quantity: 2, price: 4.20 },
        { description: 'Masło', quantity: 1, price: 8.90 }
      ],
      confidence: Math.random() * 0.3 + 0.7, // 0.7 - 1.0
      processingTime: Math.floor(Math.random() * 3000) + 1000
    };

    document.ocrData = mockOcrData;
    document.status = 'completed';
    document.processedAt = new Date().toISOString();

    console.log('🔄 Document reprocessed:', document.filename);
  }, 2000);

  res.json({
    success: true,
    message: 'Document reprocessing started',
    data: {
      documentId,
      status: 'processing'
    }
  });
});

// Get document statistics
app.get('/api/documents/stats', (req, res) => {
  const totalDocs = storage.documents.length;
  const statusCounts = storage.documents.reduce((acc, doc) => {
    acc[doc.status] = (acc[doc.status] || 0) + 1;
    return acc;
  }, {});

  const totalSize = storage.documents.reduce((sum, doc) => sum + doc.size, 0);
  const avgConfidence = storage.documents
    .filter(doc => doc.ocrData?.confidence)
    .reduce((sum, doc, _, arr) => sum + doc.ocrData.confidence / arr.length, 0);

  const recentDocs = storage.documents
    .filter(doc => {
      const uploadDate = new Date(doc.uploadedAt);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return uploadDate > dayAgo;
    }).length;

  res.json({
    success: true,
    data: {
      totalDocuments: totalDocs,
      statusBreakdown: [
        { status: 'uploaded', count: statusCounts.uploaded || 0 },
        { status: 'processing', count: statusCounts.processing || 0 },
        { status: 'completed', count: statusCounts.completed || 0 },
        { status: 'error', count: statusCounts.error || 0 }
      ],
      totalSize: totalSize,
      averageConfidence: avgConfidence || 0,
      recentUploads: recentDocs,
      processingRate: totalDocs > 0 ? ((statusCounts.completed || 0) / totalDocs * 100).toFixed(1) : 0
    }
  });
});

// Settings endpoints
// Company settings
app.get('/api/settings/company', (req, res) => {
  const companySettings = storage.companySettings || {
    id: '1',
    companyName: 'ExpenseFlow Pro Demo',
    companyEmail: 'admin@expenseflow.com',
    companyPhone: '+48 123 456 789',
    companyAddress: {
      street: 'ul. Przykładowa 123',
      city: 'Warszawa',
      postalCode: '00-001',
      country: 'Poland'
    },
    taxId: 'PL1234567890',
    currency: 'PLN',
    timezone: 'Europe/Warsaw',
    fiscalYearStart: '01-01',
    logo: null,
    theme: {
      primaryColor: '#3B82F6',
      secondaryColor: '#10B981',
      accentColor: '#F59E0B'
    },
    features: {
      ocrEnabled: true,
      multiCurrency: false,
      advancedReporting: true,
      apiAccess: false,
      customCategories: true,
      bulkOperations: true
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: false,
      weeklyReports: true,
      monthlyReports: true
    },
    security: {
      twoFactorAuth: false,
      sessionTimeout: 30,
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialChars: false
      }
    },
    integrations: {
      accounting: null,
      banking: null,
      storage: null
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: new Date().toISOString()
  };

  res.json({
    success: true,
    data: companySettings
  });
});

app.put('/api/settings/company', (req, res) => {
  try {
    const updates = req.body;
    
    // Validate required fields
    if (!updates.companyName || !updates.companyEmail) {
      return res.status(400).json({
        success: false,
        message: 'Company name and email are required'
      });
    }

    // Get current settings or create default
    const currentSettings = storage.companySettings || {};
    
    // Merge updates with current settings
    storage.companySettings = {
      ...currentSettings,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    console.log('🏢 Company settings updated');

    res.json({
      success: true,
      message: 'Company settings updated successfully',
      data: storage.companySettings
    });
  } catch (error) {
    console.error('Error updating company settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update company settings'
    });
  }
});

// User preferences
app.get('/api/settings/preferences', (req, res) => {
  const userId = req.headers.authorization?.split(' ')[1] || 'demo-user';
  
  const userPreferences = storage.userPreferences?.[userId] || {
    id: userId,
    theme: 'system',
    language: 'en',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    currency: 'PLN',
    notifications: {
      email: true,
      push: false,
      desktop: true,
      expenseReminders: true,
      reportReady: true,
      systemUpdates: false
    },
    dashboard: {
      defaultView: 'overview',
      showQuickActions: true,
      showRecentExpenses: true,
      showStatistics: true,
      itemsPerPage: 20
    },
    privacy: {
      profileVisibility: 'team',
      shareAnalytics: false,
      marketingEmails: false
    },
    accessibility: {
      highContrast: false,
      largeText: false,
      reducedMotion: false,
      screenReader: false
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: new Date().toISOString()
  };

  res.json({
    success: true,
    data: userPreferences
  });
});

app.put('/api/settings/preferences', (req, res) => {
  try {
    const userId = req.headers.authorization?.split(' ')[1] || 'demo-user';
    const updates = req.body;

    // Initialize user preferences storage if not exists
    if (!storage.userPreferences) {
      storage.userPreferences = {};
    }

    // Get current preferences or create default
    const currentPreferences = storage.userPreferences[userId] || {};
    
    // Merge updates with current preferences
    storage.userPreferences[userId] = {
      ...currentPreferences,
      ...updates,
      id: userId,
      updatedAt: new Date().toISOString()
    };

    console.log('👤 User preferences updated for:', userId);

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: storage.userPreferences[userId]
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update preferences'
    });
  }
});

// System settings (admin only)
app.get('/api/settings/system', (req, res) => {
  const systemSettings = storage.systemSettings || {
    version: '1.0.0',
    environment: 'development',
    maintenance: {
      enabled: false,
      message: '',
      scheduledAt: null
    },
    limits: {
      maxFileSize: 10485760, // 10MB
      maxFilesPerUpload: 5,
      maxUsersPerCompany: 100,
      maxExpensesPerMonth: 1000
    },
    features: {
      registration: true,
      guestAccess: false,
      apiAccess: true,
      webhooks: false
    },
    backup: {
      enabled: true,
      frequency: 'daily',
      retention: 30,
      lastBackup: new Date().toISOString()
    },
    monitoring: {
      enabled: true,
      logLevel: 'info',
      metricsRetention: 90
    },
    updatedAt: new Date().toISOString()
  };

  res.json({
    success: true,
    data: systemSettings
  });
});

app.put('/api/settings/system', (req, res) => {
  try {
    const updates = req.body;
    
    // Get current settings or create default
    const currentSettings = storage.systemSettings || {};
    
    // Merge updates with current settings
    storage.systemSettings = {
      ...currentSettings,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    console.log('⚙️ System settings updated');

    res.json({
      success: true,
      message: 'System settings updated successfully',
      data: storage.systemSettings
    });
  } catch (error) {
    console.error('Error updating system settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update system settings'
    });
  }
});

// Integrations
app.get('/api/settings/integrations', (req, res) => {
  const integrations = storage.integrations || {
    accounting: {
      enabled: false,
      provider: null,
      config: {},
      lastSync: null,
      status: 'disconnected'
    },
    banking: {
      enabled: false,
      provider: null,
      config: {},
      lastSync: null,
      status: 'disconnected'
    },
    storage: {
      enabled: false,
      provider: 'local',
      config: {},
      lastSync: null,
      status: 'connected'
    },
    notifications: {
      email: {
        enabled: true,
        provider: 'smtp',
        config: {
          host: 'smtp.gmail.com',
          port: 587,
          secure: false
        },
        status: 'connected'
      },
      slack: {
        enabled: false,
        provider: null,
        config: {},
        status: 'disconnected'
      }
    },
    analytics: {
      enabled: false,
      provider: null,
      config: {},
      status: 'disconnected'
    }
  };

  res.json({
    success: true,
    data: integrations
  });
});

app.put('/api/settings/integrations/:type', (req, res) => {
  try {
    const { type } = req.params;
    const updates = req.body;

    // Initialize integrations storage if not exists
    if (!storage.integrations) {
      storage.integrations = {};
    }

    // Update specific integration
    storage.integrations[type] = {
      ...storage.integrations[type],
      ...updates,
      lastUpdated: new Date().toISOString()
    };

    console.log(`🔗 Integration updated: ${type}`);

    res.json({
      success: true,
      message: `${type} integration updated successfully`,
      data: storage.integrations[type]
    });
  } catch (error) {
    console.error('Error updating integration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update integration'
    });
  }
});

// Test integration connection
app.post('/api/settings/integrations/:type/test', (req, res) => {
  const { type } = req.params;
  
  // Simulate connection test
  setTimeout(() => {
    const success = Math.random() > 0.3; // 70% success rate
    
    if (success) {
      res.json({
        success: true,
        message: `${type} connection test successful`,
        data: {
          status: 'connected',
          latency: Math.floor(Math.random() * 200) + 50,
          testedAt: new Date().toISOString()
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: `${type} connection test failed`,
        error: 'Connection timeout or invalid credentials'
      });
    }
  }, 1000 + Math.random() * 2000); // 1-3 second delay
});

app.get('/api/documents', (req, res) => {
  const { status, search, limit = 50, offset = 0 } = req.query;
  
  let filteredDocs = storage.documents;
  
  // Filter by status
  if (status && status !== 'all') {
    filteredDocs = filteredDocs.filter(doc => doc.status === status);
  }
  
  // Search by filename or merchant name
  if (search) {
    const searchLower = search.toLowerCase();
    filteredDocs = filteredDocs.filter(doc => 
      doc.filename.toLowerCase().includes(searchLower) ||
      (doc.ocrData?.merchantName && doc.ocrData.merchantName.toLowerCase().includes(searchLower))
    );
  }
  
  // Sort by upload date (newest first)
  filteredDocs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  
  // Pagination
  const total = filteredDocs.length;
  const paginatedDocs = filteredDocs.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
  
  res.json({
    success: true,
    data: {
      documents: paginatedDocs.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        mimetype: doc.mimetype,
        size: doc.size,
        status: doc.status,
        uploadedAt: doc.uploadedAt,
        processedAt: doc.processedAt,
        ocrData: doc.ocrData ? {
          totalAmount: doc.ocrData.totalAmount,
          currency: doc.ocrData.currency,
          merchantName: doc.ocrData.merchantName,
          transactionDate: doc.ocrData.transactionDate,
          confidence: doc.ocrData.confidence
        } : null
      })),
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < total
      }
    }
  });
});

// Expense management endpoints
app.post('/api/expenses', (req, res) => {
  const expenseData = {
    id: Date.now().toString(),
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'pending'
  };

  storage.expenses.push(expenseData);
  console.log('💰 Expense created:', expenseData.amount, expenseData.currency, '-', expenseData.description);

  res.json({
    success: true,
    message: 'Expense created successfully',
    data: expenseData
  });
});

app.get('/api/expenses', (req, res) => {
  res.json({
    success: true,
    data: storage.expenses
  });
});

app.get('/api/expenses/stats', (req, res) => {
  const totalExpenses = storage.expenses.length;
  const totalAmount = storage.expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const avgAmount = totalExpenses > 0 ? totalAmount / totalExpenses : 0;
  
  const categoryStats = storage.expenses.reduce((acc, exp) => {
    const category = exp.category || 'Other';
    acc[category] = (acc[category] || 0) + (exp.amount || 0);
    return acc;
  }, {});

  const monthlyStats = storage.expenses.reduce((acc, exp) => {
    const month = exp.createdAt ? exp.createdAt.substring(0, 7) : new Date().toISOString().substring(0, 7);
    acc[month] = (acc[month] || 0) + (exp.amount || 0);
    return acc;
  }, {});

  res.json({
    success: true,
    data: {
      totalExpenses,
      totalAmount,
      avgAmount,
      categoryBreakdown: Object.entries(categoryStats).map(([category, amount]) => ({
        category,
        amount,
        percentage: totalAmount > 0 ? (amount / totalAmount * 100).toFixed(1) : 0
      })),
      monthlyTrends: Object.entries(monthlyStats).map(([month, amount]) => ({
        month,
        amount
      })).sort((a, b) => a.month.localeCompare(b.month))
    }
  });
});

// Feedback endpoints
app.post('/api/feedback', (req, res) => {
  const feedbackData = {
    id: Date.now().toString(),
    ...req.body,
    timestamp: new Date().toISOString()
  };
  
  storage.feedback.push(feedbackData);
  console.log('💬 Feedback received:', feedbackData.type, feedbackData.message);
  
  res.json({
    success: true,
    message: 'Feedback submitted successfully',
    data: feedbackData
  });
});

// A/B Testing endpoints
app.get('/api/user-analytics/ab-test/:testName', (req, res) => {
  const { testName } = req.params;
  
  // Simple A/B test variant assignment
  const variants = ['control', 'variant_a', 'variant_b'];
  const variant = variants[Math.floor(Math.random() * variants.length)];
  
  console.log('🧪 A/B Test variant assigned:', testName, '→', variant);
  
  res.json({
    success: true,
    data: {
      testName,
      variant,
      assignedAt: new Date().toISOString()
    }
  });
});

app.post('/api/user-analytics/ab-test/:testName/conversion', (req, res) => {
  const { testName } = req.params;
  const conversionData = req.body;
  
  console.log('✅ A/B Test conversion tracked:', testName, conversionData);
  
  res.json({
    success: true,
    message: 'Conversion tracked successfully'
  });
});

// Dashboard data endpoint
app.get('/api/user-analytics/dashboard', (req, res) => {
  const dashboardData = {
    overview: {
      totalEvents: storage.events.length,
      uniqueUsers: new Set(storage.events.map(e => e.sessionId || 'anonymous')).size,
      avgEventsPerUser: storage.events.length / Math.max(1, new Set(storage.events.map(e => e.sessionId || 'anonymous')).size)
    },
    pageViews: Object.entries(
      storage.pageViews.reduce((acc, pv) => {
        acc[pv.page] = (acc[pv.page] || 0) + 1;
        return acc;
      }, {})
    ).map(([page, views]) => ({ page, views })),
    featureUsage: Object.entries(
      storage.featureUsage.reduce((acc, fu) => {
        acc[fu.feature] = (acc[fu.feature] || 0) + 1;
        return acc;
      }, {})
    ).map(([feature, usage]) => ({ feature, usage })),
    errors: Object.entries(
      storage.errors.reduce((acc, err) => {
        acc[err.errorType] = (acc[err.errorType] || 0) + 1;
        return acc;
      }, {})
    ).map(([type, count]) => ({ type, count })),
    feedback: Object.entries(
      storage.feedback.reduce((acc, fb) => {
        acc[fb.type || 'general'] = (acc[fb.type || 'general'] || 0) + 1;
        return acc;
      }, {})
    ).map(([type, count]) => ({ type, count })),
    performance: {
      averageLoadTime: 250,
      averageDomContentLoaded: 180,
      averageFirstContentfulPaint: 220,
      averageTimeToInteractive: 400
    },
    onboarding: {
      totalUsers: 10,
      averageTimeSpent: 120000
    }
  };
  
  res.json({
    success: true,
    data: dashboardData
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'ExpenseFlow Pro Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      login: 'POST /api/auth/login',
      getCurrentUser: 'GET /api/auth/me',
      logout: 'POST /api/auth/logout',
      health: '/api/health',
      stats: '/api/stats',
      trackEvent: 'POST /api/user-analytics/track-event',
      trackPageView: 'POST /api/user-analytics/track-page-view',
      trackFeatureUsage: 'POST /api/user-analytics/track-feature-usage',
      trackError: 'POST /api/user-analytics/track-error',
      trackOnboarding: 'POST /api/user-analytics/track-onboarding',
      feedback: 'POST /api/feedback',
      dashboard: 'GET /api/user-analytics/dashboard'
    },
    frontend: 'http://localhost:4000',
    testPage: 'http://localhost:4000/test-analytics'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Stats endpoint for debugging
app.get('/api/stats', (req, res) => {
  res.json({
    events: storage.events.length,
    pageViews: storage.pageViews.length,
    featureUsage: storage.featureUsage.length,
    errors: storage.errors.length,
    feedback: storage.feedback.length,
    lastActivity: new Date().toISOString()
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 ExpenseFlow Pro - Simple Backend Server');
  console.log('===========================================');
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ API Base URL: http://localhost:${PORT}/api`);
  console.log('✅ CORS enabled for frontend on port 4000');
  console.log('\nAvailable endpoints:');
  console.log('🔑 POST /api/auth/login');
  console.log('👤 GET  /api/auth/me');
  console.log('👋 POST /api/auth/logout');
  console.log('📄 POST /api/documents/upload');
  console.log('🔍 POST /api/documents/:id/process');
  console.log('🔄 POST /api/documents/:id/reprocess');
  console.log('📋 GET  /api/documents');
  console.log('📋 GET  /api/documents/:id');
  console.log('📊 GET  /api/documents/stats');
  console.log('🗑️ DELETE /api/documents/:id');
  console.log('🗑️ POST /api/documents/bulk-delete');
  console.log('💰 POST /api/expenses');
  console.log('💰 GET  /api/expenses');
  console.log('📊 GET  /api/expenses/stats');
  console.log('⚙️ GET  /api/settings/company');
  console.log('⚙️ PUT  /api/settings/company');
  console.log('👤 GET  /api/settings/preferences');
  console.log('👤 PUT  /api/settings/preferences');
  console.log('🔧 GET  /api/settings/system');
  console.log('🔧 PUT  /api/settings/system');
  console.log('🔗 GET  /api/settings/integrations');
  console.log('🔗 PUT  /api/settings/integrations/:type');
  console.log('🧪 POST /api/settings/integrations/:type/test');
  console.log('📊 POST /api/user-analytics/track-event');
  console.log('📄 POST /api/user-analytics/track-page-view');
  console.log('🔧 POST /api/user-analytics/track-feature-usage');
  console.log('❌ POST /api/user-analytics/track-error');
  console.log('🎯 POST /api/user-analytics/track-onboarding');
  console.log('💬 POST /api/feedback');
  console.log('📈 GET  /api/user-analytics/dashboard');
  console.log('❤️  GET  /api/health');
  console.log('📊 GET  /api/stats');
  console.log('\n🌐 Frontend: http://localhost:4000');
  console.log('🧪 Test Analytics: http://localhost:4000/test-analytics');
  console.log('\nReady for testing! 🎉\n');
}); 