const express = require('express');
const cors = require('cors');
const multer = require('multer');

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const app = express();
const PORT = 4001;

// Basic middleware
app.use(cors({
  origin: ['http://localhost:4000', 'http://localhost:4001'],
  credentials: true
}));
app.use(express.json());

// Test user data
const testUser = {
  id: 'test-user-1',
  email: 'admin@demo.com',
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin'
};

// Simple login endpoint
app.post('/api/auth/login', (req, res) => {
  console.log('Login request received:', req.body);
  const { email, password } = req.body;
  
  if (email && password) {
    console.log('Login successful for:', email);
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: testUser,
        token: `token_${Date.now()}`,
        refreshToken: `refresh_${Date.now()}`
      }
    });
  } else {
    console.log('Login failed - missing credentials');
    res.status(400).json({
      success: false,
      message: 'Email and password required'
    });
  }
});

// ===== EXPENSES ENDPOINTS =====

// Mock expenses data
let expenses = [
  {
    id: 'exp_001',
    title: 'Business Lunch with Client',
    description: 'Lunch meeting with potential client to discuss project requirements',
    amount: 85.50,
    currency: 'USD',
    category: 'meals',
    date: '2024-01-15',
    status: 'approved',
    submittedAt: '2024-01-15T10:30:00Z',
    approvedAt: '2024-01-16T14:20:00Z',
    approvedBy: 'John Manager',
    merchant: 'The Business Bistro',
    paymentMethod: 'Company Credit Card',
    department: 'Sales',
    project: 'Project Alpha',
    notes: 'Discussed Q1 deliverables and timeline',
    employeeName: 'Jane Smith',
    employeeEmail: 'jane.smith@company.com',
    receipts: 1,
    comments: [
      {
        id: 'comment_001',
        author: 'John Manager',
        authorRole: 'Manager',
        message: 'Approved. Good investment in client relationship.',
        createdAt: '2024-01-16T14:20:00Z'
      }
    ],
    auditLog: [
      {
        id: 'audit_001',
        action: 'created',
        performedBy: 'Jane Smith',
        performedAt: '2024-01-15T09:00:00Z'
      },
      {
        id: 'audit_002',
        action: 'submitted',
        performedBy: 'Jane Smith',
        performedAt: '2024-01-15T10:30:00Z'
      },
      {
        id: 'audit_003',
        action: 'approved',
        performedBy: 'John Manager',
        performedAt: '2024-01-16T14:20:00Z'
      }
    ]
  },
  {
    id: 'exp_002',
    title: 'Office Supplies',
    description: 'Notebooks, pens, and sticky notes for team',
    amount: 45.99,
    currency: 'USD',
    category: 'office',
    date: '2024-01-14',
    status: 'pending',
    submittedAt: '2024-01-14T16:45:00Z',
    merchant: 'Office Depot',
    paymentMethod: 'Personal Credit Card',
    department: 'Engineering',
    notes: 'Reimbursement needed for personal card payment',
    employeeName: 'Mike Johnson',
    employeeEmail: 'mike.johnson@company.com',
    receipts: 1,
    comments: [],
    auditLog: [
      {
        id: 'audit_004',
        action: 'created',
        performedBy: 'Mike Johnson',
        performedAt: '2024-01-14T16:00:00Z'
      },
      {
        id: 'audit_005',
        action: 'submitted',
        performedBy: 'Mike Johnson',
        performedAt: '2024-01-14T16:45:00Z'
      }
    ]
  },
  {
    id: 'exp_003',
    title: 'Conference Travel',
    description: 'Flight and hotel for Tech Conference 2024',
    amount: 1250.00,
    currency: 'USD',
    category: 'travel',
    date: '2024-01-10',
    status: 'draft',
    merchant: 'Delta Airlines & Marriott',
    paymentMethod: 'Company Credit Card',
    department: 'Engineering',
    project: 'Professional Development',
    notes: 'Conference attendance for skill development',
    employeeName: 'Sarah Wilson',
    employeeEmail: 'sarah.wilson@company.com',
    receipts: 2,
    comments: [],
    auditLog: [
      {
        id: 'audit_006',
        action: 'created',
        performedBy: 'Sarah Wilson',
        performedAt: '2024-01-10T11:30:00Z'
      }
    ]
  }
];

// Get all expenses with filtering and sorting
app.get('/api/expenses', (req, res) => {
  try {
    const { status, category, period, search, sortBy = 'date', sortOrder = 'desc' } = req.query;
    
    let filteredExpenses = [...expenses];

    // Apply filters
    if (status && status !== 'all') {
      filteredExpenses = filteredExpenses.filter(expense => expense.status === status);
    }

    if (category && category !== 'all') {
      filteredExpenses = filteredExpenses.filter(expense => expense.category === category);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredExpenses = filteredExpenses.filter(expense =>
        expense.title.toLowerCase().includes(searchLower) ||
        expense.description.toLowerCase().includes(searchLower) ||
        expense.merchant?.toLowerCase().includes(searchLower) ||
        expense.employeeName?.toLowerCase().includes(searchLower)
      );
    }

    if (period && period !== 'all') {
      const now = new Date();
      filteredExpenses = filteredExpenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        
        switch (period) {
          case 'today':
            return expenseDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return expenseDate >= weekAgo;
          case 'month':
            return expenseDate.getMonth() === now.getMonth() && 
                   expenseDate.getFullYear() === now.getFullYear();
          case 'quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            const expenseQuarter = Math.floor(expenseDate.getMonth() / 3);
            return expenseQuarter === quarter && 
                   expenseDate.getFullYear() === now.getFullYear();
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filteredExpenses.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'date':
        default:
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    console.log(`Expenses list requested - ${filteredExpenses.length} results`);
    res.json({
      success: true,
      data: filteredExpenses
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expenses'
    });
  }
});

// Get expense statistics
app.get('/api/expenses/stats', (req, res) => {
  try {
    const totalExpenses = expenses.length;
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const pendingApproval = expenses.filter(e => e.status === 'pending').length;
    const approved = expenses.filter(e => e.status === 'approved').length;
    const rejected = expenses.filter(e => e.status === 'rejected').length;
    
    const now = new Date();
    const thisMonth = expenses.filter(e => {
      const expenseDate = new Date(e.date);
      return expenseDate.getMonth() === now.getMonth() && 
             expenseDate.getFullYear() === now.getFullYear();
    }).reduce((sum, e) => sum + e.amount, 0);
    
    const lastMonth = expenses.filter(e => {
      const expenseDate = new Date(e.date);
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return expenseDate.getMonth() === lastMonthDate.getMonth() && 
             expenseDate.getFullYear() === lastMonthDate.getFullYear();
    }).reduce((sum, e) => sum + e.amount, 0);

    console.log('Expense stats requested');
    res.json({
      success: true,
      data: {
        totalExpenses,
        totalAmount,
        pendingApproval,
        approved,
        rejected,
        thisMonth,
        lastMonth,
        currency: 'USD'
      }
    });
  } catch (error) {
    console.error('Error fetching expense stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expense statistics'
    });
  }
});

// Get single expense
app.get('/api/expenses/:id', (req, res) => {
  try {
    const { id } = req.params;
    const expense = expenses.find(e => e.id === id);
    
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // Add mock receipt data
    const expenseWithReceipts = {
      ...expense,
      receipts: Array.from({ length: expense.receipts }, (_, index) => ({
        id: `receipt_${expense.id}_${index + 1}`,
        filename: `receipt_${index + 1}.pdf`,
        originalName: `Receipt ${index + 1}.pdf`,
        size: Math.floor(Math.random() * 1000000) + 100000,
        mimeType: 'application/pdf',
        uploadedAt: expense.date,
        url: `/api/receipts/${expense.id}_${index + 1}.pdf`
      }))
    };

    console.log('Expense details requested for:', id);
    res.json({
      success: true,
      data: expenseWithReceipts
    });
  } catch (error) {
    console.error('Error fetching expense:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expense'
    });
  }
});

// Create new expense
app.post('/api/expenses', upload.array('receipts'), (req, res) => {
  try {
    const {
      title,
      description,
      amount,
      currency,
      category,
      date,
      merchant,
      paymentMethod,
      department,
      project,
      notes,
      action
    } = req.body;

    // Validate required fields
    if (!title || !amount || !category || !date) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, amount, category, date'
      });
    }

    const newExpense = {
      id: `exp_${Date.now()}`,
      title,
      description: description || '',
      amount: parseFloat(amount),
      currency: currency || 'USD',
      category,
      date,
      status: action === 'submit' ? 'pending' : 'draft',
      submittedAt: action === 'submit' ? new Date().toISOString() : undefined,
      merchant: merchant || '',
      paymentMethod: paymentMethod || '',
      department: department || '',
      project: project || '',
      notes: notes || '',
      employeeName: 'Current User', // TODO: Get from auth context
      employeeEmail: 'user@company.com', // TODO: Get from auth context
      receipts: req.files ? req.files.length : 0,
      comments: [],
      auditLog: [
        {
          id: `audit_${Date.now()}`,
          action: 'created',
          performedBy: 'Current User',
          performedAt: new Date().toISOString()
        }
      ]
    };

    if (action === 'submit') {
      newExpense.auditLog.push({
        id: `audit_${Date.now() + 1}`,
        action: 'submitted',
        performedBy: 'Current User',
        performedAt: new Date().toISOString()
      });
    }

    expenses.push(newExpense);

    console.log('New expense created:', newExpense.title);
    res.json({
      success: true,
      data: newExpense,
      message: action === 'submit' ? 'Expense submitted for approval' : 'Expense saved as draft'
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create expense'
    });
  }
});

// Submit expense for approval
app.post('/api/expenses/:id/submit', (req, res) => {
  try {
    const { id } = req.params;
    const expenseIndex = expenses.findIndex(e => e.id === id);
    
    if (expenseIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    const expense = expenses[expenseIndex];
    
    if (expense.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft expenses can be submitted'
      });
    }

    expense.status = 'pending';
    expense.submittedAt = new Date().toISOString();
    expense.auditLog.push({
      id: `audit_${Date.now()}`,
      action: 'submitted',
      performedBy: 'Current User',
      performedAt: new Date().toISOString()
    });

    console.log('Expense submitted:', expense.title);
    res.json({
      success: true,
      data: expense,
      message: 'Expense submitted for approval'
    });
  } catch (error) {
    console.error('Error submitting expense:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit expense'
    });
  }
});

// Approve expense
app.post('/api/expenses/:id/approve', (req, res) => {
  try {
    const { id } = req.params;
    const expenseIndex = expenses.findIndex(e => e.id === id);
    
    if (expenseIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    const expense = expenses[expenseIndex];
    
    if (expense.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending expenses can be approved'
      });
    }

    expense.status = 'approved';
    expense.approvedAt = new Date().toISOString();
    expense.approvedBy = 'Current Manager'; // TODO: Get from auth context
    expense.auditLog.push({
      id: `audit_${Date.now()}`,
      action: 'approved',
      performedBy: 'Current Manager',
      performedAt: new Date().toISOString()
    });

    console.log('Expense approved:', expense.title);
    res.json({
      success: true,
      data: expense,
      message: 'Expense approved successfully'
    });
  } catch (error) {
    console.error('Error approving expense:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve expense'
    });
  }
});

// Reject expense
app.post('/api/expenses/:id/reject', (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const expenseIndex = expenses.findIndex(e => e.id === id);
    
    if (expenseIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    const expense = expenses[expenseIndex];
    
    if (expense.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending expenses can be rejected'
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    expense.status = 'rejected';
    expense.rejectedAt = new Date().toISOString();
    expense.rejectedBy = 'Current Manager'; // TODO: Get from auth context
    expense.rejectionReason = reason;
    expense.auditLog.push({
      id: `audit_${Date.now()}`,
      action: 'rejected',
      performedBy: 'Current Manager',
      performedAt: new Date().toISOString(),
      details: reason
    });

    console.log('Expense rejected:', expense.title);
    res.json({
      success: true,
      data: expense,
      message: 'Expense rejected'
    });
  } catch (error) {
    console.error('Error rejecting expense:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject expense'
    });
  }
});

// Delete expense
app.delete('/api/expenses/:id', (req, res) => {
  try {
    const { id } = req.params;
    const expenseIndex = expenses.findIndex(e => e.id === id);
    
    if (expenseIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    const deletedExpense = expenses.splice(expenseIndex, 1)[0];
    console.log('Expense deleted:', deletedExpense.title);

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete expense'
    });
  }
});

// Bulk delete expenses
app.post('/api/expenses/bulk-delete', (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid expense IDs'
      });
    }

    const deletedCount = expenses.length;
    expenses = expenses.filter(expense => !ids.includes(expense.id));
    const actualDeleted = deletedCount - expenses.length;

    console.log(`Bulk deleted ${actualDeleted} expenses`);
    res.json({
      success: true,
      message: `${actualDeleted} expenses deleted successfully`
    });
  } catch (error) {
    console.error('Error bulk deleting expenses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete expenses'
    });
  }
});

// Bulk submit expenses
app.post('/api/expenses/bulk-submit', (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid expense IDs'
      });
    }

    let submittedCount = 0;
    expenses.forEach(expense => {
      if (ids.includes(expense.id) && expense.status === 'draft') {
        expense.status = 'pending';
        expense.submittedAt = new Date().toISOString();
        expense.auditLog.push({
          id: `audit_${Date.now()}_${expense.id}`,
          action: 'submitted',
          performedBy: 'Current User',
          performedAt: new Date().toISOString()
        });
        submittedCount++;
      }
    });

    console.log(`Bulk submitted ${submittedCount} expenses`);
    res.json({
      success: true,
      message: `${submittedCount} expenses submitted for approval`
    });
  } catch (error) {
    console.error('Error bulk submitting expenses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit expenses'
    });
  }
});

// Add comment to expense
app.post('/api/expenses/:id/comments', (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const expenseIndex = expenses.findIndex(e => e.id === id);
    
    if (expenseIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment message is required'
      });
    }

    const newComment = {
      id: `comment_${Date.now()}`,
      author: 'Current User', // TODO: Get from auth context
      authorRole: 'Employee', // TODO: Get from auth context
      message: message.trim(),
      createdAt: new Date().toISOString()
    };

    expenses[expenseIndex].comments.push(newComment);

    console.log('Comment added to expense:', id);
    res.json({
      success: true,
      data: newComment,
      message: 'Comment added successfully'
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add comment'
    });
  }
});

// Export expenses
app.get('/api/expenses/export', (req, res) => {
  try {
    const { status, category, period, search } = req.query;
    
    let filteredExpenses = [...expenses];

    // Apply same filters as the main expenses endpoint
    if (status && status !== 'all') {
      filteredExpenses = filteredExpenses.filter(expense => expense.status === status);
    }

    if (category && category !== 'all') {
      filteredExpenses = filteredExpenses.filter(expense => expense.category === category);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredExpenses = filteredExpenses.filter(expense =>
        expense.title.toLowerCase().includes(searchLower) ||
        expense.description.toLowerCase().includes(searchLower) ||
        expense.merchant?.toLowerCase().includes(searchLower)
      );
    }

    // Create CSV content
    const csvHeaders = [
      'ID', 'Title', 'Description', 'Amount', 'Currency', 'Category', 
      'Date', 'Status', 'Merchant', 'Payment Method', 'Department', 
      'Employee', 'Submitted At', 'Approved At'
    ];

    const csvRows = filteredExpenses.map(expense => [
      expense.id,
      expense.title,
      expense.description,
      expense.amount,
      expense.currency,
      expense.category,
      expense.date,
      expense.status,
      expense.merchant || '',
      expense.paymentMethod || '',
      expense.department || '',
      expense.employeeName || '',
      expense.submittedAt || '',
      expense.approvedAt || ''
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    console.log('Expenses exported');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="expenses.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting expenses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export expenses'
    });
  }
});

// ===== BANK STATEMENTS ENDPOINTS =====

// Mock bank statements data
let bankStatements = [
  {
    id: 'stmt_001',
    filename: 'bank_statement_jan_2024.pdf',
    originalName: 'Bank Statement January 2024.pdf',
    bankName: 'Chase Bank',
    accountNumber: '****1234',
    statementPeriod: {
      from: '2024-01-01',
      to: '2024-01-31'
    },
    status: 'processed',
    uploadedAt: '2024-01-15T10:30:00Z',
    processedAt: '2024-01-15T10:35:00Z',
    size: 1245760,
    transactionCount: 45,
    totalCredits: 5250.00,
    totalDebits: 3890.50,
    currency: 'USD',
    extractedTransactions: [
      {
        id: 'txn_001',
        date: '2024-01-15',
        description: 'Business Lunch - The Bistro',
        amount: -85.50,
        type: 'debit',
        balance: 2450.75,
        category: 'Meals & Entertainment',
        matched: true,
        matchedExpenseId: 'exp_001',
        matchedExpenseTitle: 'Business Lunch with Client'
      },
      {
        id: 'txn_002',
        date: '2024-01-14',
        description: 'Office Depot Purchase',
        amount: -45.99,
        type: 'debit',
        balance: 2536.25,
        category: 'Office Supplies',
        matched: true,
        matchedExpenseId: 'exp_002',
        matchedExpenseTitle: 'Office Supplies'
      },
      {
        id: 'txn_003',
        date: '2024-01-10',
        description: 'Salary Deposit',
        amount: 5000.00,
        type: 'credit',
        balance: 7582.24,
        category: 'Salary',
        matched: false
      },
      {
        id: 'txn_004',
        date: '2024-01-08',
        description: 'Gas Station - Shell',
        amount: -65.00,
        type: 'debit',
        balance: 2582.24,
        category: 'Transportation',
        matched: false
      }
    ]
  },
  {
    id: 'stmt_002',
    filename: 'bank_statement_dec_2023.pdf',
    originalName: 'Bank Statement December 2023.pdf',
    bankName: 'Wells Fargo',
    accountNumber: '****5678',
    statementPeriod: {
      from: '2023-12-01',
      to: '2023-12-31'
    },
    status: 'processed',
    uploadedAt: '2024-01-05T14:20:00Z',
    processedAt: '2024-01-05T14:25:00Z',
    size: 956890,
    transactionCount: 38,
    totalCredits: 4800.00,
    totalDebits: 3200.75,
    currency: 'USD',
    extractedTransactions: []
  },
  {
    id: 'stmt_003',
    filename: 'bank_statement_processing.pdf',
    originalName: 'Bank Statement February 2024.pdf',
    bankName: 'Bank of America',
    accountNumber: '****9012',
    statementPeriod: {
      from: '2024-02-01',
      to: '2024-02-29'
    },
    status: 'processing',
    uploadedAt: '2024-02-16T09:15:00Z',
    size: 1524000,
    transactionCount: 0,
    totalCredits: 0,
    totalDebits: 0,
    currency: 'USD',
    extractedTransactions: []
  }
];

// Get all bank statements
app.get('/api/bank-statements', (req, res) => {
  try {
    console.log('Bank statements list requested');
    res.json({
      success: true,
      data: bankStatements
    });
  } catch (error) {
    console.error('Error fetching bank statements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bank statements'
    });
  }
});

// Get single bank statement
app.get('/api/bank-statements/:id', (req, res) => {
  try {
    const { id } = req.params;
    const statement = bankStatements.find(s => s.id === id);
    
    if (!statement) {
      return res.status(404).json({
        success: false,
        message: 'Bank statement not found'
      });
    }

    console.log('Bank statement details requested for:', id);
    res.json({
      success: true,
      data: statement
    });
  } catch (error) {
    console.error('Error fetching bank statement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bank statement'
    });
  }
});

// Upload bank statement
app.post('/api/bank-statements/upload', upload.single('statement'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const newStatement = {
      id: `stmt_${Date.now()}`,
      filename: req.file.filename,
      originalName: req.file.originalname,
      bankName: 'Unknown Bank', // TODO: Extract from file
      accountNumber: '****0000', // TODO: Extract from file
      statementPeriod: {
        from: new Date().toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
      },
      status: 'processing',
      uploadedAt: new Date().toISOString(),
      size: req.file.size,
      transactionCount: 0,
      totalCredits: 0,
      totalDebits: 0,
      currency: 'USD',
      extractedTransactions: []
    };

    bankStatements.unshift(newStatement);
    console.log('Bank statement uploaded:', newStatement.originalName);

    // Simulate processing after 5 seconds
    setTimeout(() => {
      const statement = bankStatements.find(s => s.id === newStatement.id);
      if (statement) {
        statement.status = 'processed';
        statement.processedAt = new Date().toISOString();
        statement.bankName = 'Sample Bank';
        statement.accountNumber = '****' + Math.floor(Math.random() * 9999).toString().padStart(4, '0');
        statement.transactionCount = Math.floor(Math.random() * 50) + 10;
        statement.totalCredits = Math.floor(Math.random() * 5000) + 1000;
        statement.totalDebits = Math.floor(Math.random() * 3000) + 500;
        
        // Generate sample transactions
        statement.extractedTransactions = Array.from({ length: 5 }, (_, index) => ({
          id: `txn_${Date.now()}_${index}`,
          date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          description: ['Coffee Shop', 'Gas Station', 'Grocery Store', 'Restaurant', 'Office Supplies'][index],
          amount: -(Math.floor(Math.random() * 100) + 10),
          type: 'debit',
          balance: Math.floor(Math.random() * 5000) + 1000,
          category: ['Food', 'Transportation', 'Groceries', 'Meals', 'Office'][index],
          matched: false
        }));
        
        console.log('Bank statement processed:', statement.originalName);
      }
    }, 5000);

    res.json({
      success: true,
      message: 'Bank statement uploaded successfully',
      data: newStatement
    });
  } catch (error) {
    console.error('Error uploading bank statement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload bank statement'
    });
  }
});

// Delete bank statement
app.delete('/api/bank-statements/:id', (req, res) => {
  try {
    const { id } = req.params;
    const statementIndex = bankStatements.findIndex(s => s.id === id);
    
    if (statementIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Bank statement not found'
      });
    }

    const deletedStatement = bankStatements.splice(statementIndex, 1)[0];
    console.log('Bank statement deleted:', deletedStatement.originalName);

    res.json({
      success: true,
      message: 'Bank statement deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting bank statement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete bank statement'
    });
  }
});

// Reprocess bank statement
app.post('/api/bank-statements/:id/reprocess', (req, res) => {
  try {
    const { id } = req.params;
    const statementIndex = bankStatements.findIndex(s => s.id === id);
    
    if (statementIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Bank statement not found'
      });
    }

    const statement = bankStatements[statementIndex];
    statement.status = 'processing';
    statement.processedAt = undefined;

    console.log('Bank statement reprocessing started:', statement.originalName);

    // Simulate reprocessing after 3 seconds
    setTimeout(() => {
      const stmt = bankStatements.find(s => s.id === id);
      if (stmt) {
        stmt.status = 'processed';
        stmt.processedAt = new Date().toISOString();
        console.log('Bank statement reprocessed:', stmt.originalName);
      }
    }, 3000);

    res.json({
      success: true,
      message: 'Reprocessing started'
    });
  } catch (error) {
    console.error('Error reprocessing bank statement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reprocess bank statement'
    });
  }
});

// Match transaction to expense
app.post('/api/bank-statements/:id/transactions/:transactionId/match', (req, res) => {
  try {
    const { id, transactionId } = req.params;
    const { expenseId } = req.body;
    
    const statement = bankStatements.find(s => s.id === id);
    if (!statement) {
      return res.status(404).json({
        success: false,
        message: 'Bank statement not found'
      });
    }

    const transaction = statement.extractedTransactions.find(t => t.id === transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Find the expense (simplified - in real app would validate expense exists)
    const expense = expenses.find(e => e.id === expenseId);
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    transaction.matched = true;
    transaction.matchedExpenseId = expenseId;
    transaction.matchedExpenseTitle = expense.title;

    console.log(`Transaction ${transactionId} matched to expense ${expenseId}`);
    res.json({
      success: true,
      message: 'Transaction matched successfully',
      data: {
        expenseTitle: expense.title
      }
    });
  } catch (error) {
    console.error('Error matching transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to match transaction'
    });
  }
});

// Unmatch transaction
app.post('/api/bank-statements/:id/transactions/:transactionId/unmatch', (req, res) => {
  try {
    const { id, transactionId } = req.params;
    
    const statement = bankStatements.find(s => s.id === id);
    if (!statement) {
      return res.status(404).json({
        success: false,
        message: 'Bank statement not found'
      });
    }

    const transaction = statement.extractedTransactions.find(t => t.id === transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    transaction.matched = false;
    transaction.matchedExpenseId = undefined;
    transaction.matchedExpenseTitle = undefined;

    console.log(`Transaction ${transactionId} unmatched`);
    res.json({
      success: true,
      message: 'Transaction unmatched successfully'
    });
  } catch (error) {
    console.error('Error unmatching transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unmatch transaction'
    });
  }
});

// Auto-match transactions
app.post('/api/bank-statements/:id/auto-match', (req, res) => {
  try {
    const { id } = req.params;
    
    const statement = bankStatements.find(s => s.id === id);
    if (!statement) {
      return res.status(404).json({
        success: false,
        message: 'Bank statement not found'
      });
    }

    let matchedCount = 0;
    
    // Simple auto-matching logic based on amount and date proximity
    statement.extractedTransactions.forEach(transaction => {
      if (!transaction.matched && transaction.type === 'debit') {
        const matchingExpense = expenses.find(expense => {
          const amountMatch = Math.abs(Math.abs(transaction.amount) - expense.amount) < 1.0;
          const dateMatch = Math.abs(new Date(transaction.date).getTime() - new Date(expense.date).getTime()) < 3 * 24 * 60 * 60 * 1000; // 3 days
          return amountMatch && dateMatch;
        });

        if (matchingExpense) {
          transaction.matched = true;
          transaction.matchedExpenseId = matchingExpense.id;
          transaction.matchedExpenseTitle = matchingExpense.title;
          matchedCount++;
        }
      }
    });

    console.log(`Auto-matched ${matchedCount} transactions for statement ${id}`);
    res.json({
      success: true,
      message: `${matchedCount} transactions auto-matched`,
      data: {
        matchedCount,
        transactions: statement.extractedTransactions
      }
    });
  } catch (error) {
    console.error('Error auto-matching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to auto-match transactions'
    });
  }
});

// Download bank statement
app.get('/api/bank-statements/:id/download', (req, res) => {
  try {
    const { id } = req.params;
    const statement = bankStatements.find(s => s.id === id);
    
    if (!statement) {
      return res.status(404).json({
        success: false,
        message: 'Bank statement not found'
      });
    }

    // In a real app, this would serve the actual file
    // For demo, we'll just return a success message
    console.log('Bank statement download requested:', statement.originalName);
    res.json({
      success: true,
      message: 'Download would start here',
      filename: statement.originalName
    });
  } catch (error) {
    console.error('Error downloading bank statement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download bank statement'
    });
  }
});

// ===== BANK STATEMENTS ENDPOINTS =====

// Bank statements data already declared above - using existing bankStatements array

// Get all bank statements
app.get('/api/bank-statements', (req, res) => {
  try {
    console.log('Bank statements list requested');
    res.json({
      success: true,
      data: bankStatements
    });
  } catch (error) {
    console.error('Error fetching bank statements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bank statements'
    });
  }
});

// Get single bank statement
app.get('/api/bank-statements/:id', (req, res) => {
  try {
    const { id } = req.params;
    const statement = bankStatements.find(s => s.id === id);
    
    if (!statement) {
      return res.status(404).json({
        success: false,
        message: 'Bank statement not found'
      });
    }

    console.log('Bank statement details requested for:', id);
    res.json({
      success: true,
      data: statement
    });
  } catch (error) {
    console.error('Error fetching bank statement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bank statement'
    });
  }
});

// Upload bank statement
app.post('/api/bank-statements/upload', upload.single('statement'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const newStatement = {
      id: `stmt_${Date.now()}`,
      filename: req.file.filename,
      originalName: req.file.originalname,
      bankName: 'Sample Bank',
      accountNumber: '****0000',
      statementPeriod: {
        from: new Date().toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
      },
      status: 'processing',
      uploadedAt: new Date().toISOString(),
      size: req.file.size,
      transactionCount: 0,
      totalCredits: 0,
      totalDebits: 0,
      currency: 'USD',
      extractedTransactions: []
    };

    bankStatements.unshift(newStatement);
    console.log('Bank statement uploaded:', newStatement.originalName);

    // Simulate processing
    setTimeout(() => {
      const statement = bankStatements.find(s => s.id === newStatement.id);
      if (statement) {
        statement.status = 'processed';
        statement.processedAt = new Date().toISOString();
        statement.transactionCount = 15;
        statement.totalCredits = 2500.00;
        statement.totalDebits = 1200.00;
        console.log('Bank statement processed:', statement.originalName);
      }
    }, 5000);

    res.json({
      success: true,
      message: 'Bank statement uploaded successfully',
      data: newStatement
    });
  } catch (error) {
    console.error('Error uploading bank statement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload bank statement'
    });
  }
});

// Delete bank statement
app.delete('/api/bank-statements/:id', (req, res) => {
  try {
    const { id } = req.params;
    const statementIndex = bankStatements.findIndex(s => s.id === id);
    
    if (statementIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Bank statement not found'
      });
    }

    const deletedStatement = bankStatements.splice(statementIndex, 1)[0];
    console.log('Bank statement deleted:', deletedStatement.originalName);

    res.json({
      success: true,
      message: 'Bank statement deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting bank statement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete bank statement'
    });
  }
});

// Match transaction to expense
app.post('/api/bank-statements/:id/transactions/:transactionId/match', (req, res) => {
  try {
    const { id, transactionId } = req.params;
    const { expenseId } = req.body;
    
    const statement = bankStatements.find(s => s.id === id);
    if (!statement) {
      return res.status(404).json({
        success: false,
        message: 'Bank statement not found'
      });
    }

    const transaction = statement.extractedTransactions.find(t => t.id === transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    const expense = expenses.find(e => e.id === expenseId);
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    transaction.matched = true;
    transaction.matchedExpenseId = expenseId;
    transaction.matchedExpenseTitle = expense.title;

    console.log(`Transaction ${transactionId} matched to expense ${expenseId}`);
    res.json({
      success: true,
      message: 'Transaction matched successfully',
      data: { expenseTitle: expense.title }
    });
  } catch (error) {
    console.error('Error matching transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to match transaction'
    });
  }
});

// Auto-match transactions
app.post('/api/bank-statements/:id/auto-match', (req, res) => {
  try {
    const { id } = req.params;
    
    const statement = bankStatements.find(s => s.id === id);
    if (!statement) {
      return res.status(404).json({
        success: false,
        message: 'Bank statement not found'
      });
    }

    let matchedCount = 0;
    
    statement.extractedTransactions.forEach(transaction => {
      if (!transaction.matched && transaction.type === 'debit') {
        const matchingExpense = expenses.find(expense => {
          const amountMatch = Math.abs(Math.abs(transaction.amount) - expense.amount) < 1.0;
          return amountMatch;
        });

        if (matchingExpense) {
          transaction.matched = true;
          transaction.matchedExpenseId = matchingExpense.id;
          transaction.matchedExpenseTitle = matchingExpense.title;
          matchedCount++;
        }
      }
    });

    console.log(`Auto-matched ${matchedCount} transactions for statement ${id}`);
    res.json({
      success: true,
      message: `${matchedCount} transactions auto-matched`,
      data: {
        matchedCount,
        transactions: statement.extractedTransactions
      }
    });
  } catch (error) {
    console.error('Error auto-matching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to auto-match transactions'
    });
  }
});

// ===== DOCUMENTS ENDPOINTS =====

// Mock documents data
let documents = [
  {
    id: '1',
    filename: 'receipt_restaurant_2024.pdf',
    originalName: 'Restaurant Receipt.pdf',
    type: 'receipt',
    status: 'processed',
    uploadedAt: '2024-01-15T10:30:00Z',
    processedAt: '2024-01-15T10:31:00Z',
    size: 245760,
    extractedData: {
      amount: 89.50,
      currency: 'PLN',
      date: '2024-01-15',
      merchant: 'Restaurant Bella Vista',
      category: 'Meals & Entertainment'
    }
  },
  {
    id: '2',
    filename: 'invoice_office_supplies.pdf',
    originalName: 'Office Supplies Invoice.pdf',
    type: 'invoice',
    status: 'processed',
    uploadedAt: '2024-01-14T14:20:00Z',
    processedAt: '2024-01-14T14:22:00Z',
    size: 156890,
    extractedData: {
      amount: 234.99,
      currency: 'PLN',
      date: '2024-01-14',
      merchant: 'Office Depot Poland',
      category: 'Office Supplies'
    }
  },
  {
    id: '3',
    filename: 'receipt_fuel_2024.jpg',
    originalName: 'Fuel Receipt.jpg',
    type: 'receipt',
    status: 'processing',
    uploadedAt: '2024-01-16T09:15:00Z',
    size: 1024000,
    extractedData: null
  }
];

// Documents endpoints
app.get('/api/documents', (req, res) => {
  console.log('Documents list requested');
  res.json({
    success: true,
    data: documents,
    total: documents.length
  });
});

app.get('/api/documents/:id', (req, res) => {
  const { id } = req.params;
  const document = documents.find(doc => doc.id === id);
  
  if (!document) {
    return res.status(404).json({
      success: false,
      message: 'Document not found'
    });
  }
  
  console.log('Document details requested for:', id);
  res.json({
    success: true,
    data: document
  });
});

app.post('/api/documents/upload', (req, res) => {
  const { filename, type = 'receipt' } = req.body;
  
  const newDocument = {
    id: (documents.length + 1).toString(),
    filename: filename || `document_${Date.now()}.pdf`,
    originalName: filename || `Document ${Date.now()}.pdf`,
    type,
    status: 'processing',
    uploadedAt: new Date().toISOString(),
    size: Math.floor(Math.random() * 1000000) + 100000,
    extractedData: null
  };
  
  documents.push(newDocument);
  console.log('Document uploaded:', newDocument.filename);
  
  // Simulate processing after 3 seconds
  setTimeout(() => {
    const doc = documents.find(d => d.id === newDocument.id);
    if (doc) {
      doc.status = 'processed';
      doc.processedAt = new Date().toISOString();
      doc.extractedData = {
        amount: Math.floor(Math.random() * 500) + 10,
        currency: 'PLN',
        date: new Date().toISOString().split('T')[0],
        merchant: 'Sample Merchant',
        category: 'General'
      };
      console.log('Document processed:', doc.filename);
    }
  }, 3000);
  
  res.json({
    success: true,
    message: 'Document uploaded successfully',
    data: newDocument
  });
});

app.delete('/api/documents/:id', (req, res) => {
  const { id } = req.params;
  const index = documents.findIndex(doc => doc.id === id);
  
  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: 'Document not found'
    });
  }
  
  const deletedDocument = documents.splice(index, 1)[0];
  console.log('Document deleted:', deletedDocument.filename);
  
  res.json({
    success: true,
    message: 'Document deleted successfully',
    data: deletedDocument
  });
});

app.get('/api/documents/stats', (req, res) => {
  const stats = {
    total: documents.length,
    processed: documents.filter(doc => doc.status === 'processed').length,
    processing: documents.filter(doc => doc.status === 'processing').length,
    failed: documents.filter(doc => doc.status === 'failed').length,
    totalSize: documents.reduce((sum, doc) => sum + doc.size, 0),
    byType: {
      receipt: documents.filter(doc => doc.type === 'receipt').length,
      invoice: documents.filter(doc => doc.type === 'invoice').length,
      other: documents.filter(doc => !['receipt', 'invoice'].includes(doc.type)).length
    }
  };
  
  console.log('Document stats requested');
  res.json({
    success: true,
    data: stats
  });
});

// ===== PROFILE ENDPOINTS =====

// Mock profile data
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
    notifications: {
      email: true,
      push: true,
      sms: false
    },
    theme: 'light',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'european'
  }
};

app.get('/api/profile', (req, res) => {
  console.log('Profile requested');
  res.json({
    success: true,
    data: userProfile
  });
});

app.put('/api/profile', (req, res) => {
  const updates = req.body;
  userProfile = { ...userProfile, ...updates };
  console.log('Profile updated');
  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: userProfile
  });
});

// ===== REPORTS ENDPOINTS =====

// Mock reports data
let reports = [
  {
    id: '1',
    name: 'Monthly Expense Report - December 2024',
    type: 'monthly',
    description: 'Comprehensive monthly expense breakdown',
    dateRange: '2024-12-01 to 2024-12-31',
    totalAmount: 15420.50,
    currency: 'PLN',
    status: 'completed',
    createdAt: '2024-12-01T10:00:00Z',
    lastGenerated: '2024-12-31T23:59:00Z',
    format: 'PDF'
  },
  {
    id: '2',
    name: 'Quarterly Business Travel Report - Q4 2024',
    type: 'quarterly',
    description: 'Travel expenses for Q4 2024',
    dateRange: '2024-10-01 to 2024-12-31',
    totalAmount: 8750.25,
    currency: 'PLN',
    status: 'completed',
    createdAt: '2024-10-01T09:00:00Z',
    lastGenerated: '2024-12-31T18:30:00Z',
    format: 'Excel'
  },
  {
    id: '3',
    name: 'Department Expense Summary - Finance',
    type: 'department',
    description: 'Finance department expense analysis',
    dateRange: '2024-01-01 to 2024-12-31',
    totalAmount: 45230.75,
    currency: 'PLN',
    status: 'generating',
    createdAt: '2024-01-01T08:00:00Z',
    lastGenerated: '2024-12-15T14:20:00Z',
    format: 'PDF'
  },
  {
    id: '4',
    name: 'Tax Deduction Report - 2024',
    type: 'tax',
    description: 'VAT and tax deductible expenses',
    dateRange: '2024-01-01 to 2024-12-31',
    totalAmount: 12890.40,
    currency: 'PLN',
    status: 'pending',
    createdAt: '2024-01-01T07:00:00Z',
    lastGenerated: '2024-11-30T16:45:00Z',
    format: 'CSV'
  }
];

app.get('/api/reports', (req, res) => {
  console.log('Reports list requested');
  res.json({
    success: true,
    data: reports
  });
});

app.get('/api/reports/stats', (req, res) => {
  const stats = {
    totalReports: reports.length,
    monthlyExpenses: 15420.50,
    pendingReports: reports.filter(r => r.status === 'pending').length,
    averageAmount: reports.reduce((sum, r) => sum + r.totalAmount, 0) / reports.length
  };
  
  console.log('Reports stats requested');
  res.json({
    success: true,
    data: stats
  });
});

app.post('/api/reports/:id/generate', (req, res) => {
  const { id } = req.params;
  const report = reports.find(r => r.id === id);
  
  if (!report) {
    return res.status(404).json({
      success: false,
      message: 'Report not found'
    });
  }
  
  report.status = 'generating';
  console.log('Report generation started:', report.name);
  
  // Simulate generation after 3 seconds
  setTimeout(() => {
    report.status = 'completed';
    report.lastGenerated = new Date().toISOString();
    console.log('Report generated:', report.name);
  }, 3000);
  
  res.json({
    success: true,
    message: 'Report generation started',
    data: report
  });
});

app.get('/api/reports/:id/download', (req, res) => {
  const { id } = req.params;
  const { format } = req.query;
  const report = reports.find(r => r.id === id);
  
  if (!report) {
    return res.status(404).json({
      success: false,
      message: 'Report not found'
    });
  }
  
  console.log('Report download requested:', report.name, format);
  
  // Simulate file download
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="report-${id}.${format?.toLowerCase() || 'pdf'}"`);
  res.send(`Mock report content for ${report.name}`);
});

// ===== NOTIFICATIONS ENDPOINTS =====

// Mock notifications data
let notifications = [
  {
    id: '1',
    title: 'New Expense Submitted',
    message: 'John Doe submitted a new expense for review: Business Lunch - €45.50',
    type: 'info',
    category: 'expenses',
    isRead: false,
    isArchived: false,
    createdAt: '2024-01-15T10:30:00Z',
    actionUrl: '/dashboard/expenses/123',
    actionText: 'Review Expense',
    priority: 'medium',
    relatedEntity: {
      type: 'expense',
      id: '123',
      name: 'Business Lunch'
    }
  },
  {
    id: '2',
    title: 'Document Processing Complete',
    message: 'Receipt scan completed successfully. All data extracted and categorized.',
    type: 'success',
    category: 'documents',
    isRead: false,
    isArchived: false,
    createdAt: '2024-01-15T09:15:00Z',
    actionUrl: '/dashboard/documents/456',
    actionText: 'View Document',
    priority: 'low',
    relatedEntity: {
      type: 'document',
      id: '456',
      name: 'Receipt_2024_001.pdf'
    }
  },
  {
    id: '3',
    title: 'Bank Statement Upload Failed',
    message: 'Failed to process bank statement. File format not supported.',
    type: 'error',
    category: 'bank-statements',
    isRead: true,
    isArchived: false,
    createdAt: '2024-01-15T08:45:00Z',
    actionUrl: '/dashboard/bank-statements',
    actionText: 'Try Again',
    priority: 'high',
    relatedEntity: {
      type: 'bank-statement',
      id: '789',
      name: 'statement_december.csv'
    }
  },
  {
    id: '4',
    title: 'Monthly Report Ready',
    message: 'Your December 2024 expense report has been generated and is ready for download.',
    type: 'success',
    category: 'reports',
    isRead: true,
    isArchived: false,
    createdAt: '2024-01-14T16:20:00Z',
    actionUrl: '/dashboard/reports/monthly-dec-2024',
    actionText: 'Download Report',
    priority: 'medium',
    relatedEntity: {
      type: 'report',
      id: 'monthly-dec-2024',
      name: 'Monthly Report - December 2024'
    }
  },
  {
    id: '5',
    title: 'Expense Approval Required',
    message: 'Travel expense of €1,250.00 requires manager approval.',
    type: 'warning',
    category: 'approvals',
    isRead: false,
    isArchived: false,
    createdAt: '2024-01-14T14:10:00Z',
    actionUrl: '/dashboard/verification',
    actionText: 'Review & Approve',
    priority: 'high',
    relatedEntity: {
      type: 'expense',
      id: '999',
      name: 'Business Travel - Berlin'
    }
  }
];

app.get('/api/notifications', (req, res) => {
  console.log('Notifications list requested');
  res.json({
    success: true,
    data: notifications
  });
});

app.get('/api/notifications/stats', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.isRead).length,
    archived: notifications.filter(n => n.isArchived).length,
    today: notifications.filter(n => n.createdAt.startsWith(today)).length
  };
  
  console.log('Notifications stats requested');
  res.json({
    success: true,
    data: stats
  });
});

app.post('/api/notifications/mark-read', (req, res) => {
  const { ids } = req.body;
  
  notifications.forEach(notification => {
    if (ids.includes(notification.id)) {
      notification.isRead = true;
    }
  });
  
  console.log('Notifications marked as read:', ids);
  res.json({
    success: true,
    message: `${ids.length} notification(s) marked as read`
  });
});

app.post('/api/notifications/archive', (req, res) => {
  const { ids } = req.body;
  
  notifications.forEach(notification => {
    if (ids.includes(notification.id)) {
      notification.isArchived = true;
    }
  });
  
  console.log('Notifications archived:', ids);
  res.json({
    success: true,
    message: `${ids.length} notification(s) archived`
  });
});

app.delete('/api/notifications/delete', (req, res) => {
  const { ids } = req.body;
  
  notifications = notifications.filter(notification => !ids.includes(notification.id));
  
  console.log('Notifications deleted:', ids);
  res.json({
    success: true,
    message: `${ids.length} notification(s) deleted`
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// ===== PROFILE ENDPOINTS =====

// userProfile already declared above - using existing userProfile object

app.get('/api/profile', (req, res) => {
  console.log('Profile requested');
  res.json({
    success: true,
    data: userProfile
  });
});

app.put('/api/profile', (req, res) => {
  const updates = req.body;
  userProfile = { ...userProfile, ...updates };
  console.log('Profile updated');
  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: userProfile
  });
});

// ===== REPORTS ENDPOINTS =====

// Mock reports data
let reports = [
  {
    id: '1',
    name: 'Monthly Expense Report - December 2024',
    type: 'monthly',
    description: 'Comprehensive monthly expense breakdown',
    dateRange: '2024-12-01 to 2024-12-31',
    totalAmount: 15420.50,
    currency: 'PLN',
    status: 'completed',
    createdAt: '2024-12-01T10:00:00Z',
    lastGenerated: '2024-12-31T23:59:00Z',
    format: 'PDF'
  },
  {
    id: '2',
    name: 'Quarterly Business Travel Report - Q4 2024',
    type: 'quarterly',
    description: 'Travel expenses for Q4 2024',
    dateRange: '2024-10-01 to 2024-12-31',
    totalAmount: 8750.25,
    currency: 'PLN',
    status: 'completed',
    createdAt: '2024-10-01T09:00:00Z',
    lastGenerated: '2024-12-31T18:30:00Z',
    format: 'Excel'
  },
  {
    id: '3',
    name: 'Department Expense Summary - Finance',
    type: 'department',
    description: 'Finance department expense analysis',
    dateRange: '2024-01-01 to 2024-12-31',
    totalAmount: 45230.75,
    currency: 'PLN',
    status: 'generating',
    createdAt: '2024-01-01T08:00:00Z',
    lastGenerated: '2024-12-15T14:20:00Z',
    format: 'PDF'
  },
  {
    id: '4',
    name: 'Tax Deduction Report - 2024',
    type: 'tax',
    description: 'VAT and tax deductible expenses',
    dateRange: '2024-01-01 to 2024-12-31',
    totalAmount: 12890.40,
    currency: 'PLN',
    status: 'pending',
    createdAt: '2024-01-01T07:00:00Z',
    lastGenerated: '2024-11-30T16:45:00Z',
    format: 'CSV'
  }
];

app.get('/api/reports', (req, res) => {
  console.log('Reports list requested');
  res.json({
    success: true,
    data: reports
  });
});

app.get('/api/reports/stats', (req, res) => {
  const stats = {
    totalReports: reports.length,
    monthlyExpenses: 15420.50,
    pendingReports: reports.filter(r => r.status === 'pending').length,
    averageAmount: reports.reduce((sum, r) => sum + r.totalAmount, 0) / reports.length
  };
  
  console.log('Reports stats requested');
  res.json({
    success: true,
    data: stats
  });
});

app.post('/api/reports/:id/generate', (req, res) => {
  const { id } = req.params;
  const report = reports.find(r => r.id === id);
  
  if (!report) {
    return res.status(404).json({
      success: false,
      message: 'Report not found'
    });
  }
  
  report.status = 'generating';
  console.log('Report generation started:', report.name);
  
  // Simulate generation after 3 seconds
  setTimeout(() => {
    report.status = 'completed';
    report.lastGenerated = new Date().toISOString();
    console.log('Report generated:', report.name);
  }, 3000);
  
  res.json({
    success: true,
    message: 'Report generation started',
    data: report
  });
});

app.get('/api/reports/:id/download', (req, res) => {
  const { id } = req.params;
  const { format } = req.query;
  const report = reports.find(r => r.id === id);
  
  if (!report) {
    return res.status(404).json({
      success: false,
      message: 'Report not found'
    });
  }
  
  console.log('Report download requested:', report.name, format);
  
  // Simulate file download
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="report-${id}.${format?.toLowerCase() || 'pdf'}"`);
  res.send(`Mock report content for ${report.name}`);
});

// ===== NOTIFICATIONS ENDPOINTS =====

// Mock notifications data
let notificationsData = [
  {
    id: '1',
    title: 'New Expense Submitted',
    message: 'John Doe submitted a new expense for review: Business Lunch - €45.50',
    type: 'info',
    category: 'expenses',
    isRead: false,
    isArchived: false,
    createdAt: '2024-01-15T10:30:00Z',
    actionUrl: '/dashboard/expenses/123',
    actionText: 'Review Expense',
    priority: 'medium',
    relatedEntity: {
      type: 'expense',
      id: '123',
      name: 'Business Lunch'
    }
  },
  {
    id: '2',
    title: 'Document Processing Complete',
    message: 'Receipt scan completed successfully. All data extracted and categorized.',
    type: 'success',
    category: 'documents',
    isRead: false,
    isArchived: false,
    createdAt: '2024-01-15T09:15:00Z',
    actionUrl: '/dashboard/documents/456',
    actionText: 'View Document',
    priority: 'low',
    relatedEntity: {
      type: 'document',
      id: '456',
      name: 'Receipt_2024_001.pdf'
    }
  },
  {
    id: '3',
    title: 'Bank Statement Upload Failed',
    message: 'Failed to process bank statement. File format not supported.',
    type: 'error',
    category: 'bank-statements',
    isRead: true,
    isArchived: false,
    createdAt: '2024-01-15T08:45:00Z',
    actionUrl: '/dashboard/bank-statements',
    actionText: 'Try Again',
    priority: 'high',
    relatedEntity: {
      type: 'bank-statement',
      id: '789',
      name: 'statement_december.csv'
    }
  },
  {
    id: '4',
    title: 'Monthly Report Ready',
    message: 'Your December 2024 expense report has been generated and is ready for download.',
    type: 'success',
    category: 'reports',
    isRead: true,
    isArchived: false,
    createdAt: '2024-01-14T16:20:00Z',
    actionUrl: '/dashboard/reports/monthly-dec-2024',
    actionText: 'Download Report',
    priority: 'medium',
    relatedEntity: {
      type: 'report',
      id: 'monthly-dec-2024',
      name: 'Monthly Report - December 2024'
    }
  },
  {
    id: '5',
    title: 'Expense Approval Required',
    message: 'Travel expense of €1,250.00 requires manager approval.',
    type: 'warning',
    category: 'approvals',
    isRead: false,
    isArchived: false,
    createdAt: '2024-01-14T14:10:00Z',
    actionUrl: '/dashboard/verification',
    actionText: 'Review & Approve',
    priority: 'high',
    relatedEntity: {
      type: 'expense',
      id: '999',
      name: 'Business Travel - Berlin'
    }
  }
];

app.get('/api/notifications', (req, res) => {
  console.log('Notifications list requested');
  res.json({
    success: true,
    data: notificationsData
  });
});

app.get('/api/notifications/stats', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const stats = {
    total: notificationsData.length,
    unread: notificationsData.filter(n => !n.isRead).length,
    archived: notificationsData.filter(n => n.isArchived).length,
    today: notificationsData.filter(n => n.createdAt.startsWith(today)).length
  };
  
  console.log('Notifications stats requested');
  res.json({
    success: true,
    data: stats
  });
});

app.post('/api/notifications/mark-read', (req, res) => {
  const { ids } = req.body;
  
  notificationsData.forEach(notification => {
    if (ids.includes(notification.id)) {
      notification.isRead = true;
    }
  });
  
  console.log('Notifications marked as read:', ids);
  res.json({
    success: true,
    message: `${ids.length} notification(s) marked as read`
  });
});

app.post('/api/notifications/archive', (req, res) => {
  const { ids } = req.body;
  
  notificationsData.forEach(notification => {
    if (ids.includes(notification.id)) {
      notification.isArchived = true;
    }
  });
  
  console.log('Notifications archived:', ids);
  res.json({
    success: true,
    message: `${ids.length} notification(s) archived`
  });
});

app.delete('/api/notifications/delete', (req, res) => {
  const { ids } = req.body;
  
  notificationsData = notificationsData.filter(notification => !ids.includes(notification.id));
  
  console.log('Notifications deleted:', ids);
  res.json({
    success: true,
    message: `${ids.length} notification(s) deleted`
  });
});

// ===== TEAM ENDPOINTS =====

// Mock team data
let teamMembers = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@company.com',
    phone: '+48 123 456 789',
    role: 'Manager',
    department: 'Finance',
    position: 'Senior Accountant',
    status: 'active',
    joinDate: '2023-01-15',
    lastLogin: '2024-01-15T10:30:00Z',
    permissions: ['view_all_expenses', 'approve_expenses', 'view_reports']
  },
  {
    id: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@company.com',
    phone: '+48 987 654 321',
    role: 'Employee',
    department: 'Marketing',
    position: 'Marketing Specialist',
    status: 'active',
    joinDate: '2023-03-20',
    lastLogin: '2024-01-14T16:45:00Z',
    permissions: ['create_expense', 'view_own_expenses']
  },
  {
    id: '3',
    firstName: 'Mike',
    lastName: 'Johnson',
    email: 'mike.johnson@company.com',
    phone: '+48 555 123 456',
    role: 'Accountant',
    department: 'Finance',
    position: 'Junior Accountant',
    status: 'active',
    joinDate: '2023-06-10',
    lastLogin: '2024-01-13T09:20:00Z',
    permissions: ['view_all_expenses', 'edit_expenses', 'view_reports']
  },
  {
    id: '4',
    firstName: 'Sarah',
    lastName: 'Wilson',
    email: 'sarah.wilson@company.com',
    phone: '+48 777 888 999',
    role: 'Admin',
    department: 'IT',
    position: 'System Administrator',
    status: 'active',
    joinDate: '2022-11-05',
    lastLogin: '2024-01-15T08:15:00Z',
    permissions: ['all_permissions']
  },
  {
    id: '5',
    firstName: 'Tom',
    lastName: 'Brown',
    email: 'tom.brown@company.com',
    phone: '+48 444 555 666',
    role: 'Employee',
    department: 'Sales',
    position: 'Sales Representative',
    status: 'pending',
    joinDate: '2024-01-10',
    lastLogin: '',
    permissions: ['create_expense', 'view_own_expenses']
  }
];

app.get('/api/team', (req, res) => {
  console.log('Team members list requested');
  res.json({
    success: true,
    data: teamMembers
  });
});

app.get('/api/team/stats', (req, res) => {
  const stats = {
    total: 25,
    active: 22,
    inactive: 2,
    pending: 1,
    byRole: {
      admin: 2,
      manager: 5,
      accountant: 8,
      employee: 10
    }
  };
  
  console.log('Team stats requested');
  res.json({
    success: true,
    data: stats
  });
});

app.put('/api/team/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const memberIndex = teamMembers.findIndex(member => member.id === id);
  if (memberIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Team member not found'
    });
  }
  
  teamMembers[memberIndex].status = status;
  console.log('Team member status updated:', id, status);
  
  res.json({
    success: true,
    message: 'Status updated successfully',
    data: teamMembers[memberIndex]
  });
});

app.delete('/api/team/:id', (req, res) => {
  const { id } = req.params;
  
  const memberIndex = teamMembers.findIndex(member => member.id === id);
  if (memberIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Team member not found'
    });
  }
  
  const deletedMember = teamMembers.splice(memberIndex, 1)[0];
  console.log('Team member deleted:', deletedMember.email);
  
  res.json({
    success: true,
    message: 'Team member deleted successfully',
    data: deletedMember
  });
});

// ===== CATEGORIES ENDPOINTS =====

// Mock categories data
let categories = [
  {
    id: '1',
    name: 'Travel & Transportation',
    description: 'Business travel, flights, hotels, car rentals',
    color: '#3B82F6',
    icon: 'plane',
    isActive: true,
    isDefault: true,
    taxDeductible: true,
    requiresReceipt: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    expenseCount: 45,
    totalAmount: 12500.50,
    subcategories: [
      {
        id: '1a',
        name: 'Flights',
        description: 'Airline tickets and fees',
        color: '#3B82F6',
        icon: 'plane',
        parentId: '1',
        isActive: true,
        isDefault: false,
        taxDeductible: true,
        requiresReceipt: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        expenseCount: 15,
        totalAmount: 8500.00
      }
    ]
  },
  {
    id: '2',
    name: 'Meals & Entertainment',
    description: 'Business meals, client entertainment',
    color: '#10B981',
    icon: 'utensils',
    isActive: true,
    isDefault: true,
    taxDeductible: true,
    requiresReceipt: true,
    maxAmount: 500,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    expenseCount: 32,
    totalAmount: 2850.75
  }
];

app.get('/api/categories', (req, res) => {
  console.log('Categories list requested');
  res.json({
    success: true,
    data: categories
  });
});

app.get('/api/categories/stats', (req, res) => {
  const stats = {
    total: 15,
    active: 12,
    inactive: 3,
    withSubcategories: 4,
    totalExpenses: 125,
    totalAmount: 21801.50
  };
  
  console.log('Categories stats requested');
  res.json({
    success: true,
    data: stats
  });
});

app.post('/api/categories', (req, res) => {
  const newCategory = {
    id: (categories.length + 1).toString(),
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expenseCount: 0,
    totalAmount: 0
  };
  
  categories.push(newCategory);
  console.log('Category created:', newCategory.name);
  
  res.json({
    success: true,
    message: 'Category created successfully',
    data: newCategory
  });
});

app.put('/api/categories/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const categoryIndex = categories.findIndex(cat => cat.id === id);
  if (categoryIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Category not found'
    });
  }
  
  categories[categoryIndex] = {
    ...categories[categoryIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  console.log('Category updated:', id);
  res.json({
    success: true,
    message: 'Category updated successfully',
    data: categories[categoryIndex]
  });
});

app.delete('/api/categories/:id', (req, res) => {
  const { id } = req.params;
  
  const categoryIndex = categories.findIndex(cat => cat.id === id);
  if (categoryIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Category not found'
    });
  }
  
  const deletedCategory = categories.splice(categoryIndex, 1)[0];
  console.log('Category deleted:', deletedCategory.name);
  
  res.json({
    success: true,
    message: 'Category deleted successfully',
    data: deletedCategory
  });
});

// ===== WORKFLOWS ENDPOINTS =====

// Mock workflows data
let workflows = [
  {
    id: '1',
    name: 'High Value Expense Approval',
    description: 'Requires manager approval for expenses over 1000 PLN',
    isActive: true,
    priority: 1,
    conditions: [
      {
        type: 'amount',
        operator: 'greater_than',
        value: 1000
      }
    ],
    actions: [
      {
        type: 'require_approval',
        level: 1
      }
    ],
    approvers: [
      {
        id: '1',
        name: 'John Manager',
        email: 'john.manager@company.com',
        role: 'Manager',
        level: 1
      }
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    usageCount: 45,
    lastUsed: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    name: 'Travel Expense Auto-Approval',
    description: 'Auto-approve travel expenses under 500 PLN with receipt',
    isActive: true,
    priority: 2,
    conditions: [
      {
        type: 'category',
        operator: 'equals',
        value: 'Travel & Transportation'
      },
      {
        type: 'amount',
        operator: 'less_than',
        value: 500
      }
    ],
    actions: [
      {
        type: 'auto_approve'
      }
    ],
    approvers: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    usageCount: 128,
    lastUsed: '2024-01-15T14:20:00Z'
  }
];

app.get('/api/workflows', (req, res) => {
  console.log('Workflows list requested');
  res.json({
    success: true,
    data: workflows
  });
});

app.get('/api/workflows/stats', (req, res) => {
  const stats = {
    total: 8,
    active: 6,
    inactive: 2,
    totalApprovals: 208,
    pendingApprovals: 15,
    averageApprovalTime: 2.5
  };
  
  console.log('Workflows stats requested');
  res.json({
    success: true,
    data: stats
  });
});

app.put('/api/workflows/:id/toggle', (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;
  
  const workflowIndex = workflows.findIndex(w => w.id === id);
  if (workflowIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Workflow not found'
    });
  }
  
  workflows[workflowIndex].isActive = isActive;
  workflows[workflowIndex].updatedAt = new Date().toISOString();
  
  console.log('Workflow status toggled:', id, isActive);
  res.json({
    success: true,
    message: 'Workflow status updated',
    data: workflows[workflowIndex]
  });
});

app.delete('/api/workflows/:id', (req, res) => {
  const { id } = req.params;
  
  const workflowIndex = workflows.findIndex(w => w.id === id);
  if (workflowIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Workflow not found'
    });
  }
  
  const deletedWorkflow = workflows.splice(workflowIndex, 1)[0];
  console.log('Workflow deleted:', deletedWorkflow.name);
  
  res.json({
    success: true,
    message: 'Workflow deleted successfully',
    data: deletedWorkflow
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 TEST BACKEND SERVER STARTED`);
  console.log(`✅ Running on http://localhost:${PORT}`);
  console.log(`✅ Health: http://localhost:${PORT}/api/health`);
  console.log(`✅ Login: POST http://localhost:${PORT}/api/auth/login`);
  console.log(`\nReady for testing!\n`);
}); 