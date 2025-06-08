const { PrismaClient } = require('@prisma/client');

class DatabaseService {
  constructor() {
    this.prisma = null;
    this.isConnected = false;
    this.connectionString = this.buildConnectionString();
  }

  buildConnectionString() {
    // Build connection string from environment variables
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '5432';
    const database = process.env.DB_NAME || 'expenseflow_pro';
    const username = process.env.DB_USER || 'expenseflow';
    const password = process.env.DB_PASSWORD || 'password123';
    
    return `postgresql://${username}:${password}@${host}:${port}/${database}?schema=public`;
  }

  async connect() {
    try {
      if (this.isConnected && this.prisma) {
        return { success: true, message: 'Already connected' };
      }

      console.log('🗄️ Connecting to PostgreSQL database...');
      
      // Initialize Prisma client with connection string
      this.prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL || this.connectionString
          }
        },
        log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
      });

      // Test the connection
      await this.prisma.$connect();
      
      // Verify database structure
      await this.verifyDatabaseStructure();
      
      this.isConnected = true;
      console.log('✅ Connected to PostgreSQL database successfully');
      
      return {
        success: true,
        message: 'Connected to PostgreSQL database',
        connectionString: this.maskPassword(this.connectionString)
      };
    } catch (error) {
      console.error('❌ Database connection error:', error);
      this.isConnected = false;
      
      return {
        success: false,
        error: error.message,
        fallback: 'Using in-memory storage'
      };
    }
  }

  async verifyDatabaseStructure() {
    try {
      // Check if key tables exist by performing simple queries
      const tenantCount = await this.prisma.tenant.count();
      const userCount = await this.prisma.user.count();
      
      console.log(`📊 Database verification: ${tenantCount} tenants, ${userCount} users`);
      return true;
    } catch (error) {
      console.warn('⚠️ Database structure verification failed:', error.message);
      throw new Error('Database schema not properly initialized. Run: npx prisma db push');
    }
  }

  async disconnect() {
    try {
      if (this.prisma && this.isConnected) {
        await this.prisma.$disconnect();
        this.isConnected = false;
        console.log('🔌 Disconnected from database');
      }
    } catch (error) {
      console.error('Database disconnect error:', error);
    }
  }

  getClient() {
    if (!this.isConnected || !this.prisma) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.prisma;
  }

  async getStatus() {
    try {
      if (!this.isConnected || !this.prisma) {
        return {
          connected: false,
          error: 'Not connected'
        };
      }

      // Test connection with a simple query
      await this.prisma.$queryRaw`SELECT 1`;
      
      const stats = await this.getDatabaseStats();
      
      return {
        connected: true,
        connectionString: this.maskPassword(this.connectionString),
        stats
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }

  async getDatabaseStats() {
    try {
      const [
        tenantCount,
        userCount,
        companyCount,
        expenseCount,
        documentCount
      ] = await Promise.all([
        this.prisma.tenant.count(),
        this.prisma.user.count(),
        this.prisma.company.count(),
        this.prisma.expense.count(),
        this.prisma.document.count()
      ]);

      return {
        tenants: tenantCount,
        users: userCount,
        companies: companyCount,
        expenses: expenseCount,
        documents: documentCount
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      return null;
    }
  }

  maskPassword(connectionString) {
    return connectionString.replace(/:([^@:]+)@/, ':****@');
  }

  // Document operations
  async createDocument(tenantId, companyId, documentData) {
    try {
      const document = await this.prisma.document.create({
        data: {
          tenantId,
          companyId,
          ...documentData
        }
      });
      return { success: true, document };
    } catch (error) {
      console.error('Error creating document:', error);
      return { success: false, error: error.message };
    }
  }

  async getDocuments(tenantId, companyId, options = {}) {
    try {
      const { limit = 50, offset = 0, status } = options;
      
      const where = {
        tenantId,
        companyId
      };
      
      if (status) {
        where.status = status;
      }

      const documents = await this.prisma.document.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          company: {
            select: { name: true }
          }
        }
      });

      return { success: true, documents };
    } catch (error) {
      console.error('Error fetching documents:', error);
      return { success: false, error: error.message };
    }
  }

  async updateDocument(documentId, updateData) {
    try {
      const document = await this.prisma.document.update({
        where: { id: documentId },
        data: updateData
      });
      return { success: true, document };
    } catch (error) {
      console.error('Error updating document:', error);
      return { success: false, error: error.message };
    }
  }

  // Expense operations
  async createExpense(tenantId, companyId, expenseData) {
    try {
      const expense = await this.prisma.expense.create({
        data: {
          tenantId,
          companyId,
          ...expenseData
        }
      });
      return { success: true, expense };
    } catch (error) {
      console.error('Error creating expense:', error);
      return { success: false, error: error.message };
    }
  }

  async getExpenses(tenantId, companyId, options = {}) {
    try {
      const { limit = 50, offset = 0, status, dateFrom, dateTo } = options;
      
      const where = {
        tenantId,
        companyId
      };
      
      if (status) {
        where.status = status;
      }
      
      if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) where.date.gte = new Date(dateFrom);
        if (dateTo) where.date.lte = new Date(dateTo);
      }

      const expenses = await this.prisma.expense.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { date: 'desc' },
        include: {
          category: {
            select: { name: true, color: true }
          },
          user: {
            select: { firstName: true, lastName: true }
          }
        }
      });

      return { success: true, expenses };
    } catch (error) {
      console.error('Error fetching expenses:', error);
      return { success: false, error: error.message };
    }
  }

  // User operations
  async createUser(userData) {
    try {
      const user = await this.prisma.user.create({
        data: userData
      });
      return { success: true, user };
    } catch (error) {
      console.error('Error creating user:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserByEmail(email, tenantId) {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          email,
          tenantId
        },
        include: {
          companies: {
            include: {
              company: {
                select: { id: true, name: true }
              }
            }
          }
        }
      });
      return { success: true, user };
    } catch (error) {
      console.error('Error fetching user:', error);
      return { success: false, error: error.message };
    }
  }

  // Company operations
  async createCompany(tenantId, companyData) {
    try {
      const company = await this.prisma.company.create({
        data: {
          tenantId,
          ...companyData
        }
      });
      return { success: true, company };
    } catch (error) {
      console.error('Error creating company:', error);
      return { success: false, error: error.message };
    }
  }

  async getCompanies(tenantId) {
    try {
      const companies = await this.prisma.company.findMany({
        where: { tenantId },
        orderBy: { name: 'asc' }
      });
      return { success: true, companies };
    } catch (error) {
      console.error('Error fetching companies:', error);
      return { success: false, error: error.message };
    }
  }

  // Bank statement operations
  async createBankStatement(tenantId, companyId, statementData) {
    try {
      const statement = await this.prisma.bankStatement.create({
        data: {
          tenantId,
          companyId,
          ...statementData
        }
      });
      return { success: true, statement };
    } catch (error) {
      console.error('Error creating bank statement:', error);
      return { success: false, error: error.message };
    }
  }

  async createBankTransaction(tenantId, companyId, transactionData) {
    try {
      const transaction = await this.prisma.bankTransaction.create({
        data: {
          tenantId,
          companyId,
          ...transactionData
        }
      });
      return { success: true, transaction };
    } catch (error) {
      console.error('Error creating bank transaction:', error);
      return { success: false, error: error.message };
    }
  }

  // Cleanup method for development
  async cleanup() {
    if (process.env.NODE_ENV === 'development') {
      try {
        console.log('🧹 Performing development cleanup...');
        
        // Delete test data (be careful with this in production!)
        await this.prisma.auditLog.deleteMany({});
        await this.prisma.expense.deleteMany({});
        await this.prisma.document.deleteMany({});
        
        console.log('✅ Development cleanup completed');
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }
  }
}

// Export singleton instance
const databaseService = new DatabaseService();
module.exports = databaseService; 