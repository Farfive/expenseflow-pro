// Import routes
const authRoutes = require('./routes/auth');
const expenseRoutes = require('./routes/expenses');
const documentRoutes = require('./routes/documents');
const bankStatementRoutes = require('./routes/bankStatements');
const categorizationRoutes = require('./routes/categorization');
const transactionMatchingRoutes = require('./routes/transactionMatching');
const verificationRoutes = require('./routes/verification');
const analyticsRoutes = require('./routes/analytics');
const userAnalyticsRoutes = require('./routes/userAnalytics');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/bank-statements', bankStatementRoutes);
app.use('/api/categorization', categorizationRoutes);
app.use('/api/transaction-matching', transactionMatchingRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/user-analytics', userAnalyticsRoutes); 