const request = require('supertest');
const TestDataGenerator = require('./test-data-generator');

class ApiHelpers {
  constructor(app) {
    this.app = app;
    this.tokens = new Map();
  }

  // Authentication helpers
  async login(credentials) {
    const response = await request(this.app)
      .post('/api/auth/login')
      .send(credentials)
      .expect(200);

    const { token, user } = response.body;
    this.tokens.set(user.id, token);
    return { token, user };
  }

  async loginAsUser(userType = 'employee') {
    const userData = TestDataGenerator.generateUser({ role: userType });
    await this.createUser(userData);
    return await this.login({
      email: userData.email,
      password: userData.password
    });
  }

  async logout(userId) {
    const token = this.tokens.get(userId);
    if (token) {
      await request(this.app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      this.tokens.delete(userId);
    }
  }

  getAuthHeader(userId) {
    const token = this.tokens.get(userId);
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // User management helpers
  async createUser(userData) {
    const response = await request(this.app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    return response.body.user;
  }

  async deleteUser(userId, adminToken = null) {
    const headers = adminToken ? { Authorization: `Bearer ${adminToken}` } : {};
    
    await request(this.app)
      .delete(`/api/users/${userId}`)
      .set(headers)
      .expect(200);
  }

  // Expense helpers
  async createExpense(expenseData, userId) {
    const headers = this.getAuthHeader(userId);
    
    const response = await request(this.app)
      .post('/api/expenses')
      .set(headers)
      .send(expenseData)
      .expect(201);

    return response.body.expense;
  }

  async getExpenses(userId, filters = {}) {
    const headers = this.getAuthHeader(userId);
    const queryString = new URLSearchParams(filters).toString();
    
    const response = await request(this.app)
      .get(`/api/expenses?${queryString}`)
      .set(headers)
      .expect(200);

    return response.body;
  }

  async updateExpense(expenseId, updateData, userId) {
    const headers = this.getAuthHeader(userId);
    
    const response = await request(this.app)
      .put(`/api/expenses/${expenseId}`)
      .set(headers)
      .send(updateData)
      .expect(200);

    return response.body.expense;
  }

  async deleteExpense(expenseId, userId) {
    const headers = this.getAuthHeader(userId);
    
    await request(this.app)
      .delete(`/api/expenses/${expenseId}`)
      .set(headers)
      .expect(200);
  }

  async submitExpenseForApproval(expenseId, userId) {
    const headers = this.getAuthHeader(userId);
    
    const response = await request(this.app)
      .post(`/api/expenses/${expenseId}/submit`)
      .set(headers)
      .expect(200);

    return response.body.expense;
  }

  async approveExpense(expenseId, approverUserId, comments = '') {
    const headers = this.getAuthHeader(approverUserId);
    
    const response = await request(this.app)
      .post(`/api/expenses/${expenseId}/approve`)
      .set(headers)
      .send({ comments })
      .expect(200);

    return response.body.expense;
  }

  async rejectExpense(expenseId, approverUserId, reason) {
    const headers = this.getAuthHeader(approverUserId);
    
    const response = await request(this.app)
      .post(`/api/expenses/${expenseId}/reject`)
      .set(headers)
      .send({ reason })
      .expect(200);

    return response.body.expense;
  }

  // Document helpers
  async uploadDocument(filePath, userId, metadata = {}) {
    const headers = this.getAuthHeader(userId);
    
    const response = await request(this.app)
      .post('/api/documents/upload')
      .set(headers)
      .attach('document', filePath)
      .field('metadata', JSON.stringify(metadata))
      .expect(201);

    return response.body.document;
  }

  async getDocuments(userId, filters = {}) {
    const headers = this.getAuthHeader(userId);
    const queryString = new URLSearchParams(filters).toString();
    
    const response = await request(this.app)
      .get(`/api/documents?${queryString}`)
      .set(headers)
      .expect(200);

    return response.body;
  }

  async deleteDocument(documentId, userId) {
    const headers = this.getAuthHeader(userId);
    
    await request(this.app)
      .delete(`/api/documents/${documentId}`)
      .set(headers)
      .expect(200);
  }

  async processDocumentOCR(documentId, userId) {
    const headers = this.getAuthHeader(userId);
    
    const response = await request(this.app)
      .post(`/api/documents/${documentId}/ocr`)
      .set(headers)
      .expect(200);

    return response.body;
  }

  // Matching helpers
  async triggerMatching(userId) {
    const headers = this.getAuthHeader(userId);
    
    const response = await request(this.app)
      .post('/api/matching/trigger')
      .set(headers)
      .expect(200);

    return response.body;
  }

  async getMatchingSuggestions(userId, filters = {}) {
    const headers = this.getAuthHeader(userId);
    const queryString = new URLSearchParams(filters).toString();
    
    const response = await request(this.app)
      .get(`/api/matching/suggestions?${queryString}`)
      .set(headers)
      .expect(200);

    return response.body;
  }

  async confirmMatch(matchId, userId) {
    const headers = this.getAuthHeader(userId);
    
    const response = await request(this.app)
      .post(`/api/matching/${matchId}/confirm`)
      .set(headers)
      .expect(200);

    return response.body;
  }

  // Bank statement helpers
  async uploadBankStatement(filePath, userId, metadata = {}) {
    const headers = this.getAuthHeader(userId);
    
    const response = await request(this.app)
      .post('/api/bank-statements/upload')
      .set(headers)
      .attach('statement', filePath)
      .field('metadata', JSON.stringify(metadata))
      .expect(201);

    return response.body.statement;
  }

  async getBankStatements(userId, filters = {}) {
    const headers = this.getAuthHeader(userId);
    const queryString = new URLSearchParams(filters).toString();
    
    const response = await request(this.app)
      .get(`/api/bank-statements?${queryString}`)
      .set(headers)
      .expect(200);

    return response.body;
  }

  // Export helpers
  async exportData(format, filters, userId) {
    const headers = this.getAuthHeader(userId);
    
    const response = await request(this.app)
      .post('/api/exports')
      .set(headers)
      .send({ format, filters })
      .expect(200);

    return response.body;
  }

  async getExportStatus(exportId, userId) {
    const headers = this.getAuthHeader(userId);
    
    const response = await request(this.app)
      .get(`/api/exports/${exportId}/status`)
      .set(headers)
      .expect(200);

    return response.body;
  }

  async downloadExport(exportId, userId) {
    const headers = this.getAuthHeader(userId);
    
    const response = await request(this.app)
      .get(`/api/exports/${exportId}/download`)
      .set(headers)
      .expect(200);

    return response;
  }

  // Category helpers
  async createCategory(categoryData, userId) {
    const headers = this.getAuthHeader(userId);
    
    const response = await request(this.app)
      .post('/api/categories')
      .set(headers)
      .send(categoryData)
      .expect(201);

    return response.body.category;
  }

  async getCategories(userId) {
    const headers = this.getAuthHeader(userId);
    
    const response = await request(this.app)
      .get('/api/categories')
      .set(headers)
      .expect(200);

    return response.body.categories;
  }

  // Settings helpers
  async updateCompanySettings(settings, userId) {
    const headers = this.getAuthHeader(userId);
    
    const response = await request(this.app)
      .put('/api/settings/company')
      .set(headers)
      .send(settings)
      .expect(200);

    return response.body.settings;
  }

  async getCompanySettings(userId) {
    const headers = this.getAuthHeader(userId);
    
    const response = await request(this.app)
      .get('/api/settings/company')
      .set(headers)
      .expect(200);

    return response.body.settings;
  }

  // Workflow helpers
  async createWorkflow(workflowData, userId) {
    const headers = this.getAuthHeader(userId);
    
    const response = await request(this.app)
      .post('/api/workflows')
      .set(headers)
      .send(workflowData)
      .expect(201);

    return response.body.workflow;
  }

  async triggerWorkflow(workflowId, triggerData, userId) {
    const headers = this.getAuthHeader(userId);
    
    const response = await request(this.app)
      .post(`/api/workflows/${workflowId}/trigger`)
      .set(headers)
      .send(triggerData)
      .expect(200);

    return response.body;
  }

  // Test data cleanup helpers
  async cleanupTestData() {
    // Clean up all test data created during tests
    const testUsers = await this.getTestUsers();
    
    for (const user of testUsers) {
      await this.deleteUser(user.id);
    }
    
    // Clean up other test entities
    await this.cleanupTestExpenses();
    await this.cleanupTestDocuments();
    await this.cleanupTestBankStatements();
  }

  async getTestUsers() {
    // Return users with test email patterns
    const response = await request(this.app)
      .get('/api/admin/users')
      .query({ filter: 'test' })
      .expect(200);

    return response.body.users.filter(user => 
      user.email.includes('test.') || user.email.includes('@test')
    );
  }

  async cleanupTestExpenses() {
    // Implementation for cleaning up test expenses
  }

  async cleanupTestDocuments() {
    // Implementation for cleaning up test documents
  }

  async cleanupTestBankStatements() {
    // Implementation for cleaning up test bank statements
  }

  // Assertion helpers
  async assertExpenseExists(expenseId, userId) {
    const headers = this.getAuthHeader(userId);
    
    const response = await request(this.app)
      .get(`/api/expenses/${expenseId}`)
      .set(headers)
      .expect(200);

    return response.body.expense;
  }

  async assertExpenseStatus(expenseId, expectedStatus, userId) {
    const expense = await this.assertExpenseExists(expenseId, userId);
    expect(expense.status).toBe(expectedStatus);
    return expense;
  }

  async assertDocumentProcessed(documentId, userId) {
    const headers = this.getAuthHeader(userId);
    
    const response = await request(this.app)
      .get(`/api/documents/${documentId}`)
      .set(headers)
      .expect(200);

    const document = response.body.document;
    expect(document.ocrStatus).toBe('completed');
    expect(document.extractedData).toBeDefined();
    return document;
  }

  // Performance testing helpers
  async measureResponseTime(method, endpoint, data = null, userId = null) {
    const headers = userId ? this.getAuthHeader(userId) : {};
    const startTime = Date.now();
    
    let response;
    switch (method.toUpperCase()) {
      case 'GET':
        response = await request(this.app).get(endpoint).set(headers);
        break;
      case 'POST':
        response = await request(this.app).post(endpoint).set(headers).send(data);
        break;
      case 'PUT':
        response = await request(this.app).put(endpoint).set(headers).send(data);
        break;
      case 'DELETE':
        response = await request(this.app).delete(endpoint).set(headers);
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    return {
      response,
      responseTime,
      status: response.status
    };
  }
}

module.exports = ApiHelpers; 