import { ApiResponse, ApiError, getApiUrl } from './api';

// ========================================
// Types and Interfaces
// ========================================

export interface BankStatement {
  id: string;
  companyId: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  fileHash: string;
  
  // Bank Information
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  statementPeriod?: string;
  currency: string;
  
  // Processing Status
  status: BankStatementStatus;
  processed: boolean;
  processingError?: string;
  
  // Statement Metadata
  openingBalance?: number;
  closingBalance?: number;
  totalCredits?: number;
  totalDebits?: number;
  transactionCount?: number;
  
  // Processing Information
  parsedFormat?: string;
  bankFormat?: string;
  parsingRules?: any;
  duplicateFlags?: any;
  
  // Timestamps
  statementDate?: string;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;

  // Relationships
  _count?: {
    transactions: number;
    correctionLogs: number;
  };
}

export type BankStatementStatus = 
  | 'PENDING' 
  | 'PROCESSING' 
  | 'PROCESSED' 
  | 'FAILED' 
  | 'NEEDS_REVIEW' 
  | 'ARCHIVED';

export interface BankTransaction {
  id: string;
  statementId: string;
  companyId: string;
  
  // Transaction Identifiers
  transactionId?: string;
  referenceNumber?: string;
  checkNumber?: string;
  
  // Transaction Details
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  currency: string;
  
  // Additional Information
  category?: string;
  categoryConfidence?: number;
  merchant?: string;
  location?: string;
  
  // Balance Information
  runningBalance?: number;
  
  // Processing Metadata
  originalData: any;
  parseConfidence?: number;
  isDuplicate: boolean;
  duplicateHash?: string;
  
  // Review and Correction
  needsReview: boolean;
  reviewReason?: string;
  isManuallyEdited: boolean;
  
  // Matching with Expenses
  matchedExpenseId?: string;
  matchConfidence?: number;
  matchStatus: MatchStatus;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Relationships
  matchedExpense?: {
    id: string;
    title: string;
    amount: number;
  };
}

export type TransactionType = 
  | 'DEBIT' 
  | 'CREDIT' 
  | 'FEE' 
  | 'INTEREST' 
  | 'TRANSFER' 
  | 'ADJUSTMENT';

export type MatchStatus = 
  | 'UNMATCHED' 
  | 'AUTO_MATCHED' 
  | 'MANUALLY_MATCHED' 
  | 'REJECTED' 
  | 'PENDING_REVIEW';

export interface UploadOptions {
  accountNumber?: string;
  accountName?: string;
  currency?: string;
  statementPeriod?: string;
  bankFormat?: string;
  autoProcess?: boolean;
}

export interface BankFormat {
  key: string;
  bankName: string;
  formatType: string;
  requiredFields: string[];
}

export interface ProcessingResult {
  success: boolean;
  statementId: string;
  transactionCount: number;
  duplicateCount: number;
  summary: {
    transactionCount: number;
    totalCredits: number;
    totalDebits: number;
    netAmount: number;
    duplicatesDetected: number;
    reviewRequired: number;
  };
  processingTime: number;
  bankFormat: string;
}

export interface StatementAnalytics {
  period: {
    days: number;
    from: string;
    to: string;
  };
  statements: {
    byStatus: Array<{
      status: BankStatementStatus;
      _count: number;
    }>;
    total: number;
  };
  transactions: {
    total: number;
    totalAmount: number;
    averageAmount: number;
  };
  processing: {
    averageTransactionsPerStatement: number;
  };
  duplicates: {
    total: number;
  };
}

export interface TransactionUpdate {
  description?: string;
  amount?: number;
  type?: TransactionType;
  merchant?: string;
  category?: string;
  correctionReason?: string;
}

export interface StatementFilters {
  page?: number;
  limit?: number;
  status?: BankStatementStatus;
  accountNumber?: string;
  bankName?: string;
  startDate?: string;
  endDate?: string;
}

export interface TransactionFilters {
  page?: number;
  limit?: number;
  type?: TransactionType;
  needsReview?: boolean;
  isDuplicate?: boolean;
  search?: string;
}

// ========================================
// Bank Statement Service Class
// ========================================

class BankStatementService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${getApiUrl()}/bank-statements`;
  }

  private async handleRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('token');
    const companyId = localStorage.getItem('companyId');

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-company-id': companyId || '',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.message || 'Request failed',
        response.status,
        data.errors
      );
    }

    return data;
  }

  // ========================================
  // File Upload and Processing
  // ========================================

  /**
   * Upload bank statement file
   */
  async uploadStatement(
    file: File,
    options: UploadOptions = {}
  ): Promise<ApiResponse<ProcessingResult>> {
    const formData = new FormData();
    formData.append('statement', file);
    
    // Add options to form data
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, String(value));
      }
    });

    return this.handleRequest<ApiResponse<ProcessingResult>>(
      `${this.baseUrl}/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );
  }

  /**
   * Process uploaded statement
   */
  async processStatement(
    statementId: string,
    options?: { bankFormat?: string }
  ): Promise<ApiResponse<ProcessingResult>> {
    return this.handleRequest<ApiResponse<ProcessingResult>>(
      `${this.baseUrl}/${statementId}/process`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options || {}),
      }
    );
  }

  // ========================================
  // Statement Management
  // ========================================

  /**
   * Get bank statements with filtering
   */
  async getStatements(
    filters: StatementFilters = {}
  ): Promise<ApiResponse<{
    statements: BankStatement[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });

    const url = `${this.baseUrl}${params.toString() ? `?${params}` : ''}`;
    return this.handleRequest<ApiResponse<{
      statements: BankStatement[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>>(url);
  }

  /**
   * Get specific bank statement
   */
  async getStatement(
    statementId: string,
    options?: {
      includeTransactions?: boolean;
      transactionPage?: number;
      transactionLimit?: number;
    }
  ): Promise<ApiResponse<{
    statement: BankStatement;
    transactions?: BankTransaction[];
    transactionPagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>> {
    const params = new URLSearchParams();
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });
    }

    const url = `${this.baseUrl}/${statementId}${params.toString() ? `?${params}` : ''}`;
    return this.handleRequest<ApiResponse<{
      statement: BankStatement;
      transactions?: BankTransaction[];
      transactionPagination?: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>>(url);
  }

  /**
   * Delete bank statement
   */
  async deleteStatement(statementId: string): Promise<ApiResponse<{ message: string }>> {
    return this.handleRequest<ApiResponse<{ message: string }>>(
      `${this.baseUrl}/${statementId}`,
      {
        method: 'DELETE',
      }
    );
  }

  // ========================================
  // Transaction Management
  // ========================================

  /**
   * Get transactions for a statement
   */
  async getTransactions(
    statementId: string,
    filters: TransactionFilters = {}
  ): Promise<ApiResponse<{
    transactions: BankTransaction[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });

    const url = `${this.baseUrl}/${statementId}/transactions${params.toString() ? `?${params}` : ''}`;
    return this.handleRequest<ApiResponse<{
      transactions: BankTransaction[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>>(url);
  }

  /**
   * Update transaction
   */
  async updateTransaction(
    transactionId: string,
    updateData: TransactionUpdate
  ): Promise<ApiResponse<{
    transaction: BankTransaction;
    correctionsLogged: number;
  }>> {
    return this.handleRequest<ApiResponse<{
      transaction: BankTransaction;
      correctionsLogged: number;
    }>>(
      `${this.baseUrl}/transactions/${transactionId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      }
    );
  }

  // ========================================
  // Analytics and Statistics
  // ========================================

  /**
   * Get analytics summary
   */
  async getAnalytics(options?: {
    days?: number;
    accountNumber?: string;
  }): Promise<ApiResponse<{ summary: StatementAnalytics }>> {
    const params = new URLSearchParams();
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });
    }

    const url = `${this.baseUrl}/analytics/summary${params.toString() ? `?${params}` : ''}`;
    return this.handleRequest<ApiResponse<{ summary: StatementAnalytics }>>(url);
  }

  /**
   * Get supported bank formats
   */
  async getSupportedFormats(): Promise<ApiResponse<{ formats: BankFormat[] }>> {
    return this.handleRequest<ApiResponse<{ formats: BankFormat[] }>>(
      `${this.baseUrl}/formats`
    );
  }

  // ========================================
  // Utility Methods
  // ========================================

  /**
   * Validate file for upload
   */
  validateFile(file: File): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check file type
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      errors.push('File type not supported. Please upload CSV, Excel, or PDF files.');
    }

    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      errors.push('File size exceeds 50MB limit.');
    }

    // Check file name
    if (!file.name || file.name.length === 0) {
      errors.push('File must have a valid name.');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format currency amount
   */
  formatAmount(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Get status display information
   */
  getStatusInfo(status: BankStatementStatus): {
    label: string;
    color: string;
    description: string;
  } {
    const statusMap = {
      'PENDING': {
        label: 'Pending',
        color: 'bg-gray-100 text-gray-800',
        description: 'Uploaded and waiting to be processed'
      },
      'PROCESSING': {
        label: 'Processing',
        color: 'bg-blue-100 text-blue-800',
        description: 'Currently being processed'
      },
      'PROCESSED': {
        label: 'Processed',
        color: 'bg-green-100 text-green-800',
        description: 'Successfully processed'
      },
      'FAILED': {
        label: 'Failed',
        color: 'bg-red-100 text-red-800',
        description: 'Processing failed'
      },
      'NEEDS_REVIEW': {
        label: 'Needs Review',
        color: 'bg-yellow-100 text-yellow-800',
        description: 'Requires manual review'
      },
      'ARCHIVED': {
        label: 'Archived',
        color: 'bg-gray-100 text-gray-600',
        description: 'Archived statement'
      }
    };

    return statusMap[status] || statusMap['PENDING'];
  }

  /**
   * Get transaction type display information
   */
  getTransactionTypeInfo(type: TransactionType): {
    label: string;
    color: string;
    icon: string;
  } {
    const typeMap = {
      'DEBIT': {
        label: 'Debit',
        color: 'text-red-600',
        icon: '−'
      },
      'CREDIT': {
        label: 'Credit',
        color: 'text-green-600',
        icon: '+'
      },
      'FEE': {
        label: 'Fee',
        color: 'text-orange-600',
        icon: '$'
      },
      'INTEREST': {
        label: 'Interest',
        color: 'text-blue-600',
        icon: '%'
      },
      'TRANSFER': {
        label: 'Transfer',
        color: 'text-purple-600',
        icon: '⇄'
      },
      'ADJUSTMENT': {
        label: 'Adjustment',
        color: 'text-gray-600',
        icon: '≈'
      }
    };

    return typeMap[type] || typeMap['DEBIT'];
  }

  /**
   * Calculate statement period from date range
   */
  calculateStatementPeriod(startDate: Date, endDate: Date): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
      // Same month
      return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
    } else {
      // Multiple months
      return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')} to ${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}`;
    }
  }

  /**
   * Generate duplicate detection hash
   */
  generateTransactionHash(transaction: Partial<BankTransaction>): string {
    const hashData = [
      transaction.date ? new Date(transaction.date).toDateString() : '',
      transaction.description?.toLowerCase().trim() || '',
      Math.abs(transaction.amount || 0).toFixed(2)
    ].join('|');

    // Simple hash function (in production, use crypto API)
    let hash = 0;
    for (let i = 0; i < hashData.length; i++) {
      const char = hashData.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

// ========================================
// Export Service Instance
// ========================================

export const bankStatementService = new BankStatementService();
export default bankStatementService; 