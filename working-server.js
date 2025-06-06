const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3002; // Use a different port to avoid conflicts

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());

// In-memory storage
const storage = {
  events: [],
  pageViews: [],
  featureUsage: [],
  errors: [],
  feedback: [],
  onboarding: [],
  users: [
    {
      id: 'test-user-1',
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
    }
  ]
};

// Root endpoint - First thing defined
app.get('/', (req, res) => {
  res.json({
    name: 'ExpenseFlow Pro Backend API',
    version: '1.0.0',
    status: 'running',
    message: 'Backend server is working correctly!',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /',
      'GET /api/health',
      'GET /api/stats',
      'POST /api/auth/login',
      'POST /api/auth/register',
      'POST /api/auth/refresh',
      'POST /api/auth/logout',
      'GET /api/auth/me',
      'POST /api/user-analytics/track-event',
      'POST /api/user-analytics/track-page-view',
      'POST /api/user-analytics/track-feature-usage',
      'POST /api/user-analytics/track-error',
      'POST /api/user-analytics/track-onboarding',
      'POST /api/feedback'
    ],
    demoCredentials: {
      email: 'demo@expenseflow.com',
      password: 'demo123'
    },
    frontend: 'http://localhost:3000',
    testPage: 'http://localhost:3000/test-analytics'
  });
});

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: 'development'
  });
});

// Authentication endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  console.log('🔐 Login attempt:', email);
  
  // Find user
  const user = storage.users.find(u => u.email === email && u.password === password);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }
  
  // Generate simple tokens (in real app, use JWT)
  const token = `token_${Date.now()}_${user.id}`;
  const refreshToken = `refresh_${Date.now()}_${user.id}`;
  
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
        isActive: user.isActive,
        isVerified: user.isVerified,
        avatar: user.avatar,
        phone: user.phone,
        companies: user.companies
      },
      token,
      refreshToken
    }
  });
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  
  console.log('📝 Registration attempt:', email);
  
  // Check if user exists
  const existingUser = storage.users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'User already exists'
    });
  }
  
  // Create new user
  const newUser = {
    id: (storage.users.length + 1).toString(),
    email,
    password, // In real app, hash this
    name,
    role: 'user',
    createdAt: new Date().toISOString()
  };
  
  storage.users.push(newUser);
  
  // Generate tokens
  const token = `token_${Date.now()}_${newUser.id}`;
  const refreshToken = `refresh_${Date.now()}_${newUser.id}`;
  
  console.log('✅ Registration successful for:', newUser.email);
  
  res.json({
    success: true,
    message: 'Registration successful',
    data: {
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role
      },
      token,
      refreshToken
    }
  });
});

app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken || !refreshToken.startsWith('refresh_')) {
    return res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
  
  // Extract user ID from token (simple implementation)
  const userId = refreshToken.split('_')[2];
  const user = storage.users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'User not found'
    });
  }
  
  // Generate new tokens
  const newToken = `token_${Date.now()}_${user.id}`;
  const newRefreshToken = `refresh_${Date.now()}_${user.id}`;
  
  res.json({
    success: true,
    data: {
      token: newToken,
      refreshToken: newRefreshToken
    }
  });
});

app.post('/api/auth/logout', (req, res) => {
  console.log('👋 User logged out');
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  if (!token.startsWith('token_')) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  // Extract user ID from token
  const userId = token.split('_')[2];
  const user = storage.users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'User not found'
    });
  }
  
  res.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    }
  });
});

// Auto-login endpoint for development
app.post('/api/auth/auto-login', (req, res) => {
  console.log('🚀 Auto-login request');
  
  // Get the test user
  const user = storage.users[0]; // First user is our test user
  
  if (!user) {
    return res.status(500).json({
      success: false,
      message: 'No test user available'
    });
  }
  
  // Generate simple tokens (in real app, use JWT)
  const token = `token_${Date.now()}_${user.id}`;
  const refreshToken = `refresh_${Date.now()}_${user.id}`;
  
  console.log('✅ Auto-login successful for:', user.email);
  
  res.json({
    success: true,
    message: 'Auto-login successful',
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        isVerified: user.isVerified,
        avatar: user.avatar,
        phone: user.phone,
        companies: user.companies
      },
      token,
      refreshToken
    }
  });
});

// Analytics endpoints
app.post('/api/user-analytics/track-event', (req, res) => {
  const eventData = {
    id: Date.now().toString(),
    ...req.body,
    timestamp: new Date().toISOString()
  };
  
  storage.events.push(eventData);
  console.log('📊 Event tracked:', eventData.eventName || eventData.eventType);
  
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

// Expense Management Endpoints
app.post('/api/expenses/upload', (req, res) => {
  const expenseData = {
    id: `expense_${Date.now()}`,
    documentId: `doc_${Date.now()}`,
    ...req.body.document,
    status: 'processed',
    ocrConfidence: Math.random() * 0.3 + 0.7, // 70-100%
    timestamp: new Date().toISOString()
  };
  
  // Store expense
  if (!storage.expenses) storage.expenses = [];
  storage.expenses.push(expenseData);
  
  console.log('📄 Expense uploaded:', expenseData.merchant, '$' + expenseData.amount);
  
  res.json({
    success: true,
    message: 'Document uploaded and processed successfully',
    documentId: expenseData.documentId,
    ocrData: {
      amount: expenseData.amount,
      merchant: expenseData.merchant,
      date: expenseData.date,
      confidence: expenseData.ocrConfidence
    },
    data: expenseData
  });
});

app.post('/api/expenses/new', (req, res) => {
  console.log('📝 New expense creation request');
  res.json({
    success: true,
    message: 'Ready to create new expense',
    categories: [
      { id: '1', name: 'Business Meals', color: '#3B82F6' },
      { id: '2', name: 'Transportation', color: '#10B981' },
      { id: '3', name: 'Accommodation', color: '#F59E0B' },
      { id: '4', name: 'Equipment', color: '#8B5CF6' },
      { id: '5', name: 'Software', color: '#EF4444' },
      { id: '6', name: 'Training & Development', color: '#06B6D4' }
    ]
  });
});

app.get('/api/expenses', (req, res) => {
  res.json({
    success: true,
    data: storage.expenses || [],
    total: (storage.expenses || []).length
  });
});

// Transaction Matching
app.post('/api/transactions/match', (req, res) => {
  const documents = req.body.documents || [];
  const matchResults = documents.map(doc => ({
    documentId: doc.documentId,
    matchStatus: Math.random() > 0.2 ? 'matched' : 'unmatched',
    confidence: Math.random() * 0.4 + 0.6,
    matchedTransactionId: `txn_${Date.now()}_${Math.floor(Math.random() * 1000)}`
  }));
  
  console.log('🔄 Transaction matching completed for', documents.length, 'documents');
  
  res.json({
    success: true,
    message: 'Transaction matching completed',
    matches: matchResults
  });
});

// Auto Categorization
app.post('/api/categorization/auto', (req, res) => {
  const expenses = req.body.expenses || [];
  const categorizedExpenses = expenses.map(expense => ({
    ...expense,
    suggestedCategory: expense.category || 'Business Meals',
    confidence: Math.random() * 0.3 + 0.7,
    autoAssigned: true
  }));
  
  console.log('🏷️  Auto-categorization completed for', expenses.length, 'expenses');
  
  res.json({
    success: true,
    message: 'Auto-categorization completed', 
    categorizedExpenses
  });
});

// Analytics Endpoints
app.get('/api/analytics/user-data', (req, res) => {
  const expenses = storage.expenses || [];
  const totalAmount = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  
  res.json({
    success: true,
    data: {
      totalExpenses: expenses.length,
      totalAmount: totalAmount,
      categories: ['Business Meals', 'Transportation', 'Accommodation', 'Equipment'],
      monthlyTrend: 'upward',
      approvalStatus: {
        pending: Math.floor(expenses.length * 0.2),
        approved: Math.floor(expenses.length * 0.7),
        rejected: Math.floor(expenses.length * 0.1)
      }
    }
  });
});

app.get('/api/analytics/charts', (req, res) => {
  const expenses = storage.expenses || [];
  
  // Group by category
  const categoryData = expenses.reduce((acc, exp) => {
    const category = exp.category || 'Other';
    acc[category] = (acc[category] || 0) + (exp.amount || 0);
    return acc;
  }, {});
  
  res.json({
    success: true,
    charts: {
      expenseByCategory: Object.entries(categoryData).map(([name, value]) => ({ name, value })),
      monthlyTrends: [
        { month: 'Jan', amount: Math.floor(Math.random() * 5000) + 1000 },
        { month: 'Feb', amount: Math.floor(Math.random() * 5000) + 1000 },
        { month: 'Mar', amount: Math.floor(Math.random() * 5000) + 1000 }
      ],
      departmentBreakdown: [
        { department: 'Sales', amount: Math.floor(Math.random() * 3000) + 500 },
        { department: 'Marketing', amount: Math.floor(Math.random() * 3000) + 500 },
        { department: 'Technology', amount: Math.floor(Math.random() * 3000) + 500 }
      ]
    }
  });
});

// Dashboard Widgets
app.get('/api/dashboard/widgets', (req, res) => {
  const expenses = storage.expenses || [];
  
  res.json({
    success: true,
    widgets: [
      {
        id: 'expense_summary',
        title: 'Expense Summary',
        data: {
          total: expenses.length,
          pending: Math.floor(expenses.length * 0.3),
          approved: Math.floor(expenses.length * 0.6),
          rejected: Math.floor(expenses.length * 0.1)
        }
      },
      {
        id: 'recent_activities',
        title: 'Recent Activities',
        data: {
          activities: expenses.slice(-5).map(exp => ({
            type: 'expense_submitted',
            description: `${exp.merchant} - $${exp.amount}`,
            timestamp: exp.timestamp
          }))
        }
      },
      {
        id: 'budget_tracker',
        title: 'Budget Tracker',
        data: {
          budget: 10000,
          spent: expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0),
          remaining: 10000 - expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0)
        }
      }
    ]
  });
});

// Document Management
app.post('/api/documents/upload', (req, res) => {
  console.log('📎 Document upload request');
  res.json({
    success: true,
    message: 'Document upload endpoint ready',
    supportedFormats: ['jpg', 'png', 'pdf'],
    maxSize: '10MB'
  });
});

// Export Functions
app.post('/api/exports/generate', (req, res) => {
  console.log('📊 Export generation request');
  res.json({
    success: true,
    message: 'Export generated successfully',
    downloadUrl: '/api/exports/download/export_' + Date.now() + '.xlsx',
    format: 'xlsx'
  });
});

// Reports
app.post('/api/reports/generate', (req, res) => {
  console.log('📈 Report generation request');
  res.json({
    success: true,
    message: 'Report generated successfully',
    reportId: 'report_' + Date.now(),
    status: 'ready'
  });
});

// Stats endpoint
app.get('/api/stats', (req, res) => {
  res.json({
    events: storage.events.length,
    pageViews: storage.pageViews.length,
    featureUsage: storage.featureUsage.length,
    errors: storage.errors.length,
    feedback: storage.feedback.length,
    uptime: process.uptime(),
    lastActivity: new Date().toISOString()
  });
});

// Dashboard endpoint (simplified)
app.get('/api/user-analytics/dashboard', (req, res) => {
  res.json({
    success: true,
    data: {
      overview: {
        totalEvents: storage.events.length,
        uniqueUsers: 1,
        avgEventsPerUser: storage.events.length
      },
      recentActivity: storage.events.slice(-5)
    }
  });
});

// Additional missing endpoints for comprehensive testing
app.get('/api/dashboard/expenses', (req, res) => {
  console.log('📊 Dashboard expenses request');
  res.json({
    success: true,
    data: {
      recentExpenses: storage.expenses?.slice(-10) || [],
      totalExpenses: storage.expenses?.length || 0,
      pendingApprovals: 5,
      monthlySpending: 15000
    }
  });
});

app.get('/api/expenses/new', (req, res) => {
  console.log('📝 New expense form request');
  res.json({
    success: true,
    data: {
      categories: [
        { id: 1, name: 'Transportation', description: 'Travel expenses' },
        { id: 2, name: 'Accommodation', description: 'Hotel and lodging' },
        { id: 3, name: 'Business Meals', description: 'Client and business meals' },
        { id: 4, name: 'Office Supplies', description: 'Office equipment and supplies' },
        { id: 5, name: 'Software', description: 'Software subscriptions' }
      ],
      form: {
        merchant: '',
        amount: '',
        date: '',
        category: '',
        description: ''
      }
    }
  });
});

app.post('/api/expenses/upload', (req, res) => {
  console.log('📄 Expense upload:', req.body.merchant || 'Unknown merchant');
  
  const expense = {
    id: `exp_${Date.now()}`,
    ...req.body,
    uploadedAt: new Date().toISOString(),
    status: 'pending'
  };
  
  if (!storage.expenses) storage.expenses = [];
  storage.expenses.push(expense);
  
  res.json({
    success: true,
    message: 'Expense uploaded successfully',
    data: { expense }
  });
});

app.post('/api/expenses/submit', (req, res) => {
  console.log('📋 Expense submission by:', req.body.submittedBy);
  
  const submission = {
    id: `sub_${Date.now()}`,
    ...req.body,
    submittedAt: new Date().toISOString(),
    status: 'pending_approval'
  };
  
  res.json({
    success: true,
    message: 'Expenses submitted for approval',
    data: { submission }
  });
});

app.get('/api/expenses/status/:userId', (req, res) => {
  const { userId } = req.params;
  console.log('📊 Expense status request for:', userId);
  
  const userExpenses = storage.expenses?.filter(e => e.userId === userId) || [];
  
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

app.get('/api/approvals/pending', (req, res) => {
  console.log('✋ Pending approvals request');
  res.json({
    success: true,
    data: {
      pendingApprovals: [
        {
          id: 'exp_001',
          merchant: 'Business Hotel',
          amount: 250.00,
          submittedBy: 'david.kim@techcorp.com',
          submittedAt: new Date().toISOString()
        }
      ],
      count: 1
    }
  });
});

app.get('/api/approvals/pending/:managerId', (req, res) => {
  console.log('✋ Manager pending approvals request');
  res.json({
    success: true,
    data: {
      pendingApprovals: [],
      count: 0
    }
  });
});

app.post('/api/approvals/approve', (req, res) => {
  console.log('✅ Approval request:', req.body.expenseId);
  res.json({
    success: true,
    message: 'Expense approved successfully',
    data: {
      approvalId: `approval_${Date.now()}`,
      status: 'approved'
    }
  });
});

app.post('/api/approvals/reject', (req, res) => {
  console.log('❌ Rejection request:', req.body.expenseId);
  res.json({
    success: true,
    message: 'Expense rejected',
    data: {
      rejectionId: `rejection_${Date.now()}`,
      status: 'rejected'
    }
  });
});

app.post('/api/approvals/comment', (req, res) => {
  console.log('💬 Approval comment added');
  res.json({
    success: true,
    message: 'Comment added successfully'
  });
});

app.get('/api/analytics/budget/:department', (req, res) => {
  const { department } = req.params;
  console.log('📊 Budget analytics for:', department);
  res.json({
    success: true,
    data: {
      budgetData: {
        allocated: 50000,
        spent: 25000,
        remaining: 25000,
        percentage: 50
      }
    }
  });
});

app.get('/api/analytics/company-wide', (req, res) => {
  console.log('🏢 Company-wide analytics request');
  res.json({
    success: true,
    data: {
      companyMetrics: {
        totalExpenses: storage.expenses?.length || 0,
        totalAmount: 45000,
        averageExpense: 150,
        pendingApprovals: 5
      },
      monthlyData: [
        { month: 'Jan', amount: 15000 },
        { month: 'Feb', amount: 18000 },
        { month: 'Mar', amount: 12000 }
      ],
      departmentData: [
        { department: 'Engineering', amount: 25000 },
        { department: 'Sales', amount: 15000 },
        { department: 'Marketing', amount: 5000 }
      ]
    }
  });
});

app.get('/api/analytics/charts/spending-by-category', (req, res) => {
  res.json({
    success: true,
    data: [
      { category: 'Transportation', amount: 15000, percentage: 33 },
      { category: 'Accommodation', amount: 12000, percentage: 27 },
      { category: 'Business Meals', amount: 10000, percentage: 22 },
      { category: 'Office Supplies', amount: 8000, percentage: 18 }
    ]
  });
});

app.get('/api/analytics/charts/monthly-trends', (req, res) => {
  res.json({
    success: true,
    data: [
      { month: 'Jan', amount: 15000 },
      { month: 'Feb', amount: 18000 },
      { month: 'Mar', amount: 12000 },
      { month: 'Apr', amount: 22000 },
      { month: 'May', amount: 19000 },
      { month: 'Jun', amount: 25000 }
    ]
  });
});

app.get('/api/analytics/charts/department-comparison', (req, res) => {
  res.json({
    success: true,
    data: [
      { department: 'Engineering', amount: 25000 },
      { department: 'Sales', amount: 20000 },
      { department: 'Marketing', amount: 15000 },
      { department: 'Finance', amount: 8000 }
    ]
  });
});

app.get('/api/categories', (req, res) => {
  console.log('🏷️  Categories request');
  res.json({
    success: true,
    data: {
      categories: [
        { id: 1, name: 'Transportation', description: 'Travel and transportation' },
        { id: 2, name: 'Accommodation', description: 'Hotels and lodging' },
        { id: 3, name: 'Business Meals', description: 'Client meals and entertainment' },
        { id: 4, name: 'Office Supplies', description: 'Office equipment and supplies' },
        { id: 5, name: 'Software', description: 'Software subscriptions and tools' }
      ]
    }
  });
});

app.get('/api/notifications/:userId', (req, res) => {
  const { userId } = req.params;
  console.log('🔔 Notifications request for:', userId);
  res.json({
    success: true,
    data: {
      notifications: [
        {
          id: 1,
          type: 'expense_approved',
          message: 'Your hotel expense has been approved',
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
      ],
      unreadCount: 1
    }
  });
});

app.get('/api/reports/team-spending/:managerId', (req, res) => {
  const { managerId } = req.params;
  console.log('📊 Team spending report for:', managerId);
  res.json({
    success: true,
    data: {
      teamSpending: {
        total: 35000,
        byMember: [
          { name: 'David Kim', amount: 15000 },
          { name: 'Sarah Johnson', amount: 12000 },
          { name: 'Mike Chen', amount: 8000 }
        ]
      }
    }
  });
});

app.get('/api/dashboard/executive', (req, res) => {
  console.log('🏢 Executive dashboard request');
  res.json({
    success: true,
    data: {
      executiveMetrics: {
        totalBudget: 500000,
        totalSpent: 125000,
        budgetUtilization: 25,
        departmentCount: 4,
        employeeCount: 150
      }
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 ExpenseFlow Pro - Working Backend Server');
  console.log('=============================================');
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ API Base URL: http://localhost:${PORT}/api`);
  console.log('✅ Root endpoint available at http://localhost:' + PORT);
  console.log('\n📍 Important URLs:');
  console.log(`   Backend: http://localhost:${PORT}`);
  console.log(`   Frontend: http://localhost:3000`);
  console.log(`   Test Page: http://localhost:3000/test-analytics`);
  console.log('\n🔧 Note: You may need to update Next.js config to proxy to port ' + PORT);
  console.log('\nReady for testing! 🎉\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server gracefully...');
  process.exit(0);
}); 