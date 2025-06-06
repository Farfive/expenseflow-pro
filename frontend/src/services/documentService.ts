import axios from 'axios';
import { api } from './api';

export interface DocumentUploadResponse {
  success: boolean;
  message: string;
  data: {
    document: {
      id: string;
      filename: string;
      originalName: string;
      documentType: string;
      status: string;
      createdAt: string;
    };
    processing: {
      jobId: string;
      status: string;
      estimatedProcessingTime: number;
    };
  };
}

export interface BatchUploadResponse {
  success: boolean;
  message: string;
  data: {
    batch: {
      batchId: string;
      documentCount: number;
      documents: string[];
    };
    processing: {
      jobId: string;
      status: string;
      estimatedProcessingTime: number;
    };
  };
}

export interface DocumentListResponse {
  success: boolean;
  data: {
    documents: Document[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface Document {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  documentType: string;
  description: string;
  status: 'uploaded' | 'queued' | 'processing' | 'completed' | 'failed' | 'requires_review';
  extractedText?: string;
  ocrData?: {
    processingId: string;
    extractedData: {
      amount: number | null;
      currency: string | null;
      date: string | null;
      vendor: string | null;
      taxId: string | null;
      vatAmount: number | null;
      accountNumber: string | null;
    };
    confidenceScores: Record<string, number>;
    overallConfidence: number;
    requiresReview: boolean;
    previewImages: string[];
    processedAt: string;
  };
  ocrConfidence?: number;
  requiresReview: boolean;
  errorMessage?: string;
  userId: string;
  companyId: string;
  batchId?: string;
  processingJobId?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  expenses?: Array<{
    id: string;
    amount: number;
    currency: string;
    description: string;
  }>;
}

export interface DocumentStatusResponse {
  success: boolean;
  data: {
    document: {
      id: string;
      status: string;
      ocrConfidence?: number;
      requiresReview: boolean;
      errorMessage?: string;
      createdAt: string;
      updatedAt: string;
    };
    processing?: {
      jobId: string;
      status: string;
      progress: number;
      createdAt: string;
      processedOn?: string;
      finishedOn?: string;
      failedReason?: string;
    };
  };
}

export interface QueueStatsResponse {
  success: boolean;
  data: {
    stats: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      total: number;
    };
  };
}

export interface DocumentFilters {
  page?: number;
  limit?: number;
  status?: string;
  documentType?: string;
  requiresReview?: boolean;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export class DocumentService {
  /**
   * Upload single document
   */
  async uploadDocument(
    file: File,
    options: {
      documentType?: string;
      description?: string;
      processingPriority?: number;
    } = {}
  ): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append('document', file);
    
    if (options.documentType) {
      formData.append('documentType', options.documentType);
    }
    if (options.description) {
      formData.append('description', options.description);
    }
    if (options.processingPriority !== undefined) {
      formData.append('processingPriority', options.processingPriority.toString());
    }

    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  /**
   * Upload multiple documents as batch
   */
  async uploadBatch(
    files: File[],
    options: {
      documentType?: string;
      batchDescription?: string;
    } = {}
  ): Promise<BatchUploadResponse> {
    const formData = new FormData();
    
    files.forEach((file) => {
      formData.append('documents', file);
    });
    
    if (options.documentType) {
      formData.append('documentType', options.documentType);
    }
    if (options.batchDescription) {
      formData.append('batchDescription', options.batchDescription);
    }

    const response = await api.post('/documents/upload/batch', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  /**
   * Get documents list with filtering and pagination
   */
  async getDocuments(filters: DocumentFilters = {}): Promise<DocumentListResponse> {
    const response = await api.get('/documents', {
      params: filters,
    });

    return response.data;
  }

  /**
   * Get single document details
   */
  async getDocument(id: string): Promise<{ success: boolean; data: { document: Document } }> {
    const response = await api.get(`/documents/${id}`);
    return response.data;
  }

  /**
   * Get document processing status
   */
  async getDocumentStatus(id: string): Promise<DocumentStatusResponse> {
    const response = await api.get(`/documents/${id}/status`);
    return response.data;
  }

  /**
   * Reprocess a document
   */
  async reprocessDocument(
    id: string,
    priority?: number
  ): Promise<{ success: boolean; message: string; data: { processing: any } }> {
    const response = await api.post(`/documents/${id}/reprocess`, {
      priority,
    });

    return response.data;
  }

  /**
   * Update document metadata
   */
  async updateDocument(
    id: string,
    updates: {
      documentType?: string;
      description?: string;
      requiresReview?: boolean;
    }
  ): Promise<{ success: boolean; message: string; data: { document: Document } }> {
    const response = await api.put(`/documents/${id}`, updates);
    return response.data;
  }

  /**
   * Delete document
   */
  async deleteDocument(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/documents/${id}`);
    return response.data;
  }

  /**
   * Get processing queue statistics
   */
  async getQueueStats(): Promise<QueueStatsResponse> {
    const response = await api.get('/documents/queue/stats');
    return response.data;
  }

  /**
   * Get document file URL
   */
  getDocumentUrl(filename: string): string {
    return `${process.env.NEXT_PUBLIC_API_URL}/api/v1/files/documents/${filename}`;
  }

  /**
   * Get preview image URL
   */
  getPreviewUrl(filename: string): string {
    return `${process.env.NEXT_PUBLIC_API_URL}/api/v1/files/previews/${filename}`;
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File): { isValid: boolean; error?: string } {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
    ];

    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'File size must be less than 50MB',
      };
    }

    if (!allowedTypes.includes(file.mimetype || file.type)) {
      return {
        isValid: false,
        error: 'Only PDF, JPG, and PNG files are allowed',
      };
    }

    return { isValid: true };
  }

  /**
   * Validate files for batch upload
   */
  validateBatch(files: File[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const maxFiles = 10;

    if (files.length === 0) {
      errors.push('At least one file is required');
    }

    if (files.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed in batch upload`);
    }

    files.forEach((file, index) => {
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        errors.push(`File ${index + 1} (${file.name}): ${validation.error}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
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
   * Get confidence level description
   */
  getConfidenceLevel(confidence: number): {
    level: 'low' | 'medium' | 'high';
    label: string;
    color: string;
  } {
    if (confidence >= 0.8) {
      return {
        level: 'high',
        label: 'High Confidence',
        color: 'text-green-600 bg-green-100',
      };
    } else if (confidence >= 0.6) {
      return {
        level: 'medium',
        label: 'Medium Confidence',
        color: 'text-yellow-600 bg-yellow-100',
      };
    } else {
      return {
        level: 'low',
        label: 'Low Confidence',
        color: 'text-red-600 bg-red-100',
      };
    }
  }

  /**
   * Get status badge info
   */
  getStatusBadge(status: string): {
    label: string;
    color: string;
    icon: string;
  } {
    const statusMap = {
      uploaded: {
        label: 'Uploaded',
        color: 'text-blue-600 bg-blue-100',
        icon: '📄',
      },
      queued: {
        label: 'Queued',
        color: 'text-yellow-600 bg-yellow-100',
        icon: '⏳',
      },
      processing: {
        label: 'Processing',
        color: 'text-purple-600 bg-purple-100',
        icon: '⚙️',
      },
      completed: {
        label: 'Completed',
        color: 'text-green-600 bg-green-100',
        icon: '✅',
      },
      failed: {
        label: 'Failed',
        color: 'text-red-600 bg-red-100',
        icon: '❌',
      },
      requires_review: {
        label: 'Requires Review',
        color: 'text-orange-600 bg-orange-100',
        icon: '👁️',
      },
    };

    return statusMap[status as keyof typeof statusMap] || {
      label: 'Unknown',
      color: 'text-gray-600 bg-gray-100',
      icon: '❓',
    };
  }

  /**
   * Get document type icon
   */
  getDocumentTypeIcon(type: string): string {
    const typeMap = {
      receipt: '🧾',
      invoice: '📋',
      statement: '📊',
      bank_statement: '🏦',
      other: '📄',
    };

    return typeMap[type as keyof typeof typeMap] || '📄';
  }

  /**
   * Poll document status until processing is complete
   */
  async pollDocumentStatus(
    documentId: string,
    onUpdate?: (status: DocumentStatusResponse) => void,
    timeout = 300000 // 5 minutes
  ): Promise<DocumentStatusResponse> {
    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const status = await this.getDocumentStatus(documentId);
          
          if (onUpdate) {
            onUpdate(status);
          }

          const documentStatus = status.data.document.status;
          if (documentStatus === 'completed' || documentStatus === 'failed' || documentStatus === 'requires_review') {
            resolve(status);
            return;
          }

          if (Date.now() - startTime > timeout) {
            reject(new Error('Polling timeout'));
            return;
          }

          setTimeout(poll, pollInterval);
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }
}

// Export singleton instance
export const documentService = new DocumentService(); 