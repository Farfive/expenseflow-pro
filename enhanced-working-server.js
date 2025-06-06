const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3002;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());

// File upload configuration
const upload = multer({
  dest: './uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only .png, .jpg, .jpeg and .pdf format allowed!'));
    }
  }
});

// Ensure uploads directory exists
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

// Enhanced in-memory storage
const storage = {
  events: [],
  pageViews: [],
  featureUsage: [],
  errors: [],
  feedback: [],
  onboarding: [],
  users: [
    {
      id: 'user-1',
      email: 'test@expenseflow.com',
      password: 'password123',
      name: 'Test User',
      firstName: 'Test',
      lastName: 'User',
      role: 'admin',
      isActive: true,
      isVerified: true,
      avatar: null,
      phone: '+48123456789',
      companies: [
        {
          id: 'company-1',
          name: 'Test Company',
          role: 'ADMIN',
          permissions: ['*']
        }
      ]
    },
    {
      id: 'user-2',
      email: 'david.kim@techcorp.com',
      password: 'test123',
      name: 'David Kim',
      firstName: 'David',
      lastName: 'Kim',
      role: 'employee',
      department: 'Engineering',
      isActive: true,
      isVerified: true
    },
    {
      id: 'user-3',
      email: 'jennifer.smith@techcorp.com',
      password: 'test123',
      name: 'Jennifer Smith',
      firstName: 'Jennifer',
      lastName: 'Smith',
      role: 'manager',
      department: 'Engineering',
      isActive: true,
      isVerified: true
    }
  ],
  expenses: [],
  documents: [],
  approvals: [],
  categories: [
    { id: 1, name: 'Transportation', description: 'Travel and transportation expenses' },
    { id: 2, name: 'Accommodation', description: 'Hotel and lodging expenses' },
    { id: 3, name: 'Business Meals', description: 'Business meal and entertainment' },
    { id: 4, name: 'Office Supplies', description: 'Office supplies and equipment' },
    { id: 5, name: 'Software', description: 'Software and subscriptions' }
  ],
  analytics: {
    totalExpenses: 0,
    totalAmount: 0,
    monthlyData: [],
    departmentData: []
  }
};

// Helper function to find user by email
const findUserByEmail = (email) => storage.users.find(u => u.email === email);

// Helper function to generate simple tokens
const generateToken = (userId) => `token_${Date.now()}_${userId}`;

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Enhanced ExpenseFlow Pro Backend API',
    version: '1.1.0',
    status: 'running',
    message: 'Enhanced backend server with full expense management capabilities!',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /',
      'GET /api/health',
      'POST /api/auth/login',
      'POST /api/auth/register',
      'GET /api/auth/me',
      'GET /api/dashboard/expenses',
      'GET /api/expenses/new',
      'POST /api/expenses/upload',
      'POST /api/expenses/submit',
      'GET /api/expenses/status/:userId',
      'GET /api/approvals/pending',
      'POST /api/approvals/approve',
      'POST /api/approvals/reject',
      'GET /api/analytics/company-wide',
      'GET /api/categories',
      'POST /api/categorization/auto',
      'POST /api/documents/ocr',
      'GET /api/notifications/:userId'
    ],
    demoCredentials: [
      { email: 'test@expenseflow.com', password: 'password123', role: 'admin' },
      { email: 'david.kim@techcorp.com', password: 'test123', role: 'employee' },
      { email: 'jennifer.smith@techcorp.com', password: 'test123', role: 'manager' }
    ]
  });
});

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: 'development',
    version: '1.1.0'
  });
});

// Authentication endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  console.log('🔐 Login attempt:', email);
  
  const user = findUserByEmail(email);
  
  if (!user || user.password !== password) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }
  
  const token = generateToken(user.id);
  
  console.log('✅ Login successful for:', user.email);
  
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        role: user.role,
        department: user.department,
        isActive: user.isActive,
        isVerified: user.isVerified,
        avatar: user.avatar,
        phone: user.phone,
        companies: user.companies
      },
      token
    }
  });
});

app.get('/api/auth/me', (req, res) => {
  // Simple token validation
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  
  // Extract user ID from token
  const userId = token.split('_')[2];
  const user = storage.users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
  
  res.json({
    success: true,
    data: { user }
  });
});

// Dashboard endpoints
app.get('/api/dashboard/expenses', (req, res) => {
  res.json({
    success: true,
    data: {
      recentExpenses: storage.expenses.slice(-10),
      totalExpenses: storage.expenses.length,
      pendingApprovals: storage.approvals.filter(a => a.status === 'pending').length,
      monthlySpending: storage.analytics.totalAmount
    }
  });
});

// Expense management endpoints
app.get('/api/expenses/new', (req, res) => {
  res.json({
    success: true,
    data: {
      categories: storage.categories,
      form: {
        merchant: '',
        amount: '',
        date: '',
        category: '',
        description: '',
        receiptRequired: true
      }
    }
  });
});

app.post('/api/expenses/upload', upload.single('receipt'), (req, res) => {
  const { merchant, amount, category, date, description, userId } = req.body;
  
  console.log('📄 Document upload for:', merchant);
  
  const expense = {
    id: `exp_${Date.now()}`,
    merchant,
    amount: parseFloat(amount),
    category,
    date,
    description,
    userId,
    receiptPath: req.file?.path,
    receiptOriginalName: req.file?.originalname,
    status: 'draft',
    createdAt: new Date().toISOString()
  };
  
  storage.expenses.push(expense);
  
  res.json({
    success: true,
    message: 'Expense uploaded successfully',
    data: { expense }
  });
});

app.post('/api/expenses/submit', (req, res) => {
  const { expenses, submittedBy, approver, totalAmount } = req.body;
  
  console.log('📋 Expense submission by:', submittedBy);
  
  const submission = {
    id: `sub_${Date.now()}`,
    expenses: expenses,
    submittedBy,
    approver,
    totalAmount,
    status: 'pending',
    submittedAt: new Date().toISOString()
  };
  
  storage.approvals.push(submission);
  
  res.json({
    success: true,
    message: 'Expenses submitted for approval',
    data: { submission }
  });
});

app.get('/api/expenses/status/:userId', (req, res) => {
  const { userId } = req.params;
  const userExpenses = storage.expenses.filter(e => e.userId === userId);
  
  res.json({
    success: true,
    data: {
      expenses: userExpenses,
      summary: {
        total: userExpenses.length,
        pending: userExpenses.filter(e => e.status === 'pending').length,
        approved: userExpenses.filter(e => e.status === 'approved').length,
        rejected: userExpenses.filter(e => e.status === 'rejected').length
      }
    }
  });
});

// Approval endpoints
app.get('/api/approvals/pending', (req, res) => {
  const pendingApprovals = storage.approvals.filter(a => a.status === 'pending');
  
  res.json({
    success: true,
    data: {
      pendingApprovals,
      count: pendingApprovals.length
    }
  });
});

app.post('/api/approvals/approve', (req, res) => {
  const { expenseId, approverId, comments } = req.body;
  
  console.log('✅ Approval by:', approverId, 'for:', expenseId);
  
  const approval = storage.approvals.find(a => a.id === expenseId);
  if (approval) {
    approval.status = 'approved';
    approval.approvedBy = approverId;
    approval.approvalComments = comments;
    approval.approvedAt = new Date().toISOString();
  }
  
  res.json({
    success: true,
    message: 'Expense approved successfully',
    data: { approval }
  });
});

app.post('/api/approvals/reject', (req, res) => {
  const { expenseId, approverId, comments, reason } = req.body;
  
  console.log('❌ Rejection by:', approverId, 'for:', expenseId);
  
  const approval = storage.approvals.find(a => a.id === expenseId);
  if (approval) {
    approval.status = 'rejected';
    approval.rejectedBy = approverId;
    approval.rejectionComments = comments;
    approval.rejectionReason = reason;
    approval.rejectedAt = new Date().toISOString();
  }
  
  res.json({
    success: true,
    message: 'Expense rejected',
    data: { approval }
  });
});

// Analytics endpoints
app.get('/api/analytics/company-wide', (req, res) => {
  const totalAmount = storage.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const monthlyData = generateMockMonthlyData();
  const departmentData = generateMockDepartmentData();
  
  res.json({
    success: true,
    data: {
      companyMetrics: {
        totalExpenses: storage.expenses.length,
        totalAmount,
        averageExpense: storage.expenses.length > 0 ? totalAmount / storage.expenses.length : 0,
        pendingApprovals: storage.approvals.filter(a => a.status === 'pending').length
      },
      monthlyData,
      departmentData,
      categoryBreakdown: generateCategoryBreakdown()
    }
  });
});

app.get('/api/analytics/charts/spending-by-category', (req, res) => {
  res.json({
    success: true,
    data: generateCategoryBreakdown()
  });
});

app.get('/api/analytics/charts/monthly-trends', (req, res) => {
  res.json({
    success: true,
    data: generateMockMonthlyData()
  });
});

app.get('/api/analytics/charts/department-comparison', (req, res) => {
  res.json({
    success: true,
    data: generateMockDepartmentData()
  });
});

// Category and categorization endpoints
app.get('/api/categories', (req, res) => {
  res.json({
    success: true,
    data: { categories: storage.categories }
  });
});

app.post('/api/categorization/auto', (req, res) => {
  const { expenses } = req.body;
  
  console.log('🤖 Auto-categorization for', expenses?.length || 0, 'expenses');
  
  // Simple auto-categorization logic
  const categorizedExpenses = expenses?.map(expense => ({
    ...expense,
    suggestedCategory: getCategoryForMerchant(expense.merchant),
    confidence: Math.random() * 0.3 + 0.7 // 70-100% confidence
  })) || [];
  
  res.json({
    success: true,
    message: 'Auto-categorization completed',
    data: { categorizedExpenses }
  });
});

// Document processing endpoints
app.post('/api/documents/ocr', upload.single('document'), (req, res) => {
  console.log('🔍 OCR processing for:', req.file?.originalname);
  
  // Simulate OCR processing
  setTimeout(() => {
    const mockOcrResult = {
      merchant: 'Sample Restaurant',
      amount: 45.67,
      date: '2024-01-15',
      items: [
        { description: 'Lunch special', quantity: 1, price: 35.67 },
        { description: 'Coffee', quantity: 2, price: 5.00 }
      ],
      confidence: 0.89
    };
    
    res.json({
      success: true,
      message: 'OCR processing completed',
      data: { extractedData: mockOcrResult }
    });
  }, 1000);
});

// Notification endpoints
app.get('/api/notifications/:userId', (req, res) => {
  const { userId } = req.params;
  
  const mockNotifications = [
    {
      id: 1,
      type: 'expense_approved',
      message: 'Your expense has been approved',
      timestamp: new Date().toISOString(),
      read: false
    },
    {
      id: 2,
      type: 'expense_submitted',
      message: 'Expense submitted for approval',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      read: true
    }
  ];
  
  res.json({
    success: true,
    data: {
      notifications: mockNotifications,
      unreadCount: mockNotifications.filter(n => !n.read).length
    }
  });
});

// Existing analytics endpoints
app.get('/api/stats', (req, res) => {
  res.json({
    totalEvents: storage.events.length,
    totalPageViews: storage.pageViews.length,
    totalUsers: storage.users.length,
    totalExpenses: storage.expenses.length,
    totalFeedback: storage.feedback.length,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// User analytics endpoints (existing)
app.post('/api/user-analytics/track-event', (req, res) => {
  const { event, userId, data } = req.body;
  storage.events.push({
    id: Date.now(),
    event,
    userId,
    data,
    timestamp: new Date().toISOString()
  });
  
  console.log('📊 Event tracked:', event, 'for user:', userId);
  res.json({ success: true, message: 'Event tracked successfully' });
});

app.post('/api/user-analytics/track-page-view', (req, res) => {
  const { page, userId } = req.body;
  storage.pageViews.push({
    id: Date.now(),
    page,
    userId,
    timestamp: new Date().toISOString()
  });
  
  console.log('👁️  Page view:', page, 'for user:', userId);
  res.json({ success: true, message: 'Page view tracked successfully' });
});

// Helper functions
function getCategoryForMerchant(merchant) {
  const merchantLower = merchant.toLowerCase();
  if (merchantLower.includes('hotel') || merchantLower.includes('marriott')) return 'Accommodation';
  if (merchantLower.includes('airline') || merchantLower.includes('uber')) return 'Transportation';
  if (merchantLower.includes('restaurant') || merchantLower.includes('grille')) return 'Business Meals';
  if (merchantLower.includes('office') || merchantLower.includes('depot')) return 'Office Supplies';
  return 'Miscellaneous';
}

function generateMockMonthlyData() {
  return [
    { month: 'Jan', amount: 15000 },
    { month: 'Feb', amount: 18000 },
    { month: 'Mar', amount: 22000 },
    { month: 'Apr', amount: 19000 },
    { month: 'May', amount: 25000 },
    { month: 'Jun', amount: 28000 }
  ];
}

function generateMockDepartmentData() {
  return [
    { department: 'Engineering', amount: 45000 },
    { department: 'Sales', amount: 38000 },
    { department: 'Marketing', amount: 32000 },
    { department: 'Finance', amount: 15000 }
  ];
}

function generateCategoryBreakdown() {
  return [
    { category: 'Transportation', amount: 35000, percentage: 35 },
    { category: 'Accommodation', amount: 25000, percentage: 25 },
    { category: 'Business Meals', amount: 20000, percentage: 20 },
    { category: 'Office Supplies', amount: 15000, percentage: 15 },
    { category: 'Software', amount: 5000, percentage: 5 }
  ];
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error.message);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Enhanced ExpenseFlow Pro - Backend Server');
  console.log('=============================================');
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ API Base URL: http://localhost:${PORT}/api`);
  console.log(`✅ Root endpoint available at http://localhost:${PORT}`);
  console.log('📍 Important URLs:');
  console.log(`   Backend: http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Stats: http://localhost:${PORT}/api/stats`);
  console.log('🔧 Available test users:');
  storage.users.forEach(user => {
    console.log(`   📧 ${user.email} (${user.role}) - password: ${user.password}`);
  });
  console.log('Ready for comprehensive testing! 🎉\n');
}); 