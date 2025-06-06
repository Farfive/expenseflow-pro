import { ApiResponse, ApiError, getApiUrl } from './api';

// ========================================
// Types and Interfaces
// ========================================

export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  isActive: boolean;
  defaultVatRate?: number;
  metadata?: {
    keywords?: string[];
    taxCategory?: string;
    accountingCode?: string;
    isDefault?: boolean;
  };
  createdAt: string;
  updatedAt: string;
  _count?: {
    expenses: number;
  };
}

export interface CategorizationResult {
  category: string;
  confidence: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  predictions: Array<{
    category: string;
    confidence: number;
    sources: string[];
  }>;
  reasoning: string;
  suggested: boolean;
}

export interface VendorCategory {
  id: string;
  vendorName: string;
  normalizedVendor: string;
  category: string;
  companyId?: string;
  confidence: number;
  usageCount: number;
  lastUsed: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryKeyword {
  id: string;
  keyword: string;
  category: string;
  weight: number;
  companyId?: string;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategorizationInsights {
  categoryDistribution: Array<{
    category: Category;
    count: number;
    totalAmount: number;
  }>;
  confidenceStats: Array<{
    status: string;
    _count: number;
    _avg: { confidenceScore: number };
  }>;
  learningCount: number;
  topVendors: VendorCategory[];
  period: {
    days: number;
    from: string;
    to: string;
  };
}

export interface DocumentData {
  vendor?: string;
  description?: string;
  extractedText?: string;
  amount?: number;
  id?: string;
}

export interface CreateCategoryData {
  name: string;
  description?: string;
  color?: string;
  defaultVatRate?: number;
  keywords?: string[];
  taxCategory?: string;
  accountingCode?: string;
}

export interface UpdateCategoryData extends Partial<CreateCategoryData> {}

export interface CreateVendorMappingData {
  vendorName: string;
  category: string;
  confidence?: number;
}

export interface LearningData {
  vendor?: string;
  description?: string;
  extractedText?: string;
  amount?: number;
  userCategory: string;
  originalPrediction?: string;
}

// ========================================
// Categorization Service Class
// ========================================

class CategorizationService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${getApiUrl()}/categorization`;
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
        'Content-Type': 'application/json',
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
  // Category Management
  // ========================================

  /**
   * Get all categories for the company
   */
  async getCategories(options?: {
    includeStats?: boolean;
    days?: number;
  }): Promise<ApiResponse<{
    categories: Category[];
    statistics?: CategorizationInsights['categoryDistribution'];
  }>> {
    const params = new URLSearchParams();
    if (options?.includeStats) params.append('includeStats', 'true');
    if (options?.days) params.append('days', options.days.toString());

    const url = `${this.baseUrl}/categories${params.toString() ? `?${params}` : ''}`;
    return this.handleRequest<ApiResponse<{
      categories: Category[];
      statistics?: CategorizationInsights['categoryDistribution'];
    }>>(url);
  }

  /**
   * Create a new category
   */
  async createCategory(data: CreateCategoryData): Promise<ApiResponse<{ category: Category }>> {
    return this.handleRequest<ApiResponse<{ category: Category }>>(
      `${this.baseUrl}/categories`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  /**
   * Update an existing category
   */
  async updateCategory(
    categoryId: string,
    data: UpdateCategoryData
  ): Promise<ApiResponse<{ category: Category }>> {
    return this.handleRequest<ApiResponse<{ category: Category }>>(
      `${this.baseUrl}/categories/${categoryId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  }

  /**
   * Delete a category
   */
  async deleteCategory(categoryId: string): Promise<ApiResponse<{ message: string }>> {
    return this.handleRequest<ApiResponse<{ message: string }>>(
      `${this.baseUrl}/categories/${categoryId}`,
      {
        method: 'DELETE',
      }
    );
  }

  // ========================================
  // Document Categorization
  // ========================================

  /**
   * Categorize a single document
   */
  async categorizeDocument(data: DocumentData): Promise<ApiResponse<CategorizationResult>> {
    return this.handleRequest<ApiResponse<CategorizationResult>>(
      `${this.baseUrl}/categorize`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  /**
   * Categorize multiple documents in batch
   */
  async batchCategorize(
    documents: DocumentData[]
  ): Promise<ApiResponse<{ results: Array<CategorizationResult & { documentId?: string }> }>> {
    return this.handleRequest<ApiResponse<{ results: Array<CategorizationResult & { documentId?: string }> }>>(
      `${this.baseUrl}/batch-categorize`,
      {
        method: 'POST',
        body: JSON.stringify({ documents }),
      }
    );
  }

  /**
   * Learn from user correction
   */
  async learnFromCorrection(data: LearningData): Promise<ApiResponse<{ message: string }>> {
    return this.handleRequest<ApiResponse<{ message: string }>>(
      `${this.baseUrl}/learn`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  // ========================================
  // Vendor Management
  // ========================================

  /**
   * Get known vendors and their categories
   */
  async getVendors(options?: {
    search?: string;
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{
    vendors: VendorCategory[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>> {
    const params = new URLSearchParams();
    if (options?.search) params.append('search', options.search);
    if (options?.category) params.append('category', options.category);
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());

    const url = `${this.baseUrl}/vendors${params.toString() ? `?${params}` : ''}`;
    return this.handleRequest<ApiResponse<{
      vendors: VendorCategory[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>>(url);
  }

  /**
   * Add or update vendor category mapping
   */
  async createVendorMapping(data: CreateVendorMappingData): Promise<ApiResponse<{ vendor: VendorCategory }>> {
    return this.handleRequest<ApiResponse<{ vendor: VendorCategory }>>(
      `${this.baseUrl}/vendors`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  // ========================================
  // Analytics and Insights
  // ========================================

  /**
   * Get categorization insights and analytics
   */
  async getInsights(days: number = 30): Promise<ApiResponse<{ insights: CategorizationInsights }>> {
    const params = new URLSearchParams({ days: days.toString() });
    return this.handleRequest<ApiResponse<{ insights: CategorizationInsights }>>(
      `${this.baseUrl}/insights?${params}`
    );
  }

  /**
   * Get category suggestions for company
   */
  async getCategorySuggestions(): Promise<ApiResponse<{
    existing: Category[];
    suggestions: Array<{
      name: string;
      description: string;
      keywords: string[];
      taxCategory: string;
      accountingCode: string;
    }>;
  }>> {
    return this.handleRequest<ApiResponse<{
      existing: Category[];
      suggestions: Array<{
        name: string;
        description: string;
        keywords: string[];
        taxCategory: string;
        accountingCode: string;
      }>;
    }>>(`${this.baseUrl}/suggestions`);
  }

  /**
   * Create default categories for company
   */
  async createDefaultCategories(): Promise<ApiResponse<{
    message: string;
    categories: Category[];
  }>> {
    return this.handleRequest<ApiResponse<{
      message: string;
      categories: Category[];
    }>>(
      `${this.baseUrl}/create-defaults`,
      {
        method: 'POST',
      }
    );
  }

  // ========================================
  // Utility Methods
  // ========================================

  /**
   * Get confidence level color
   */
  getConfidenceColor(level: 'high' | 'medium' | 'low'): string {
    switch (level) {
      case 'high':
        return 'text-green-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  }

  /**
   * Get confidence percentage display
   */
  getConfidenceDisplay(confidence: number): string {
    return `${Math.round(confidence * 100)}%`;
  }

  /**
   * Format category name for display
   */
  formatCategoryName(name: string): string {
    return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Get category color or default
   */
  getCategoryColor(category: Category): string {
    return category.color || this.getDefaultCategoryColor(category.name);
  }

  /**
   * Get default color for category
   */
  private getDefaultCategoryColor(categoryName: string): string {
    const colorMap: Record<string, string> = {
      'travel': '#3B82F6',
      'meals': '#EF4444',
      'office_supplies': '#6366F1',
      'technology': '#8B5CF6',
      'utilities': '#F59E0B',
      'marketing': '#EC4899',
      'professional_services': '#10B981',
      'other': '#6B7280'
    };

    return colorMap[categoryName] || '#6B7280';
  }

  /**
   * Validate category data
   */
  validateCategoryData(data: CreateCategoryData): string[] {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Category name is required');
    }

    if (data.name && data.name.length > 100) {
      errors.push('Category name must be less than 100 characters');
    }

    if (data.description && data.description.length > 500) {
      errors.push('Description must be less than 500 characters');
    }

    if (data.color && !/^#[0-9A-F]{6}$/i.test(data.color)) {
      errors.push('Color must be a valid hex code');
    }

    if (data.defaultVatRate && (data.defaultVatRate < 0 || data.defaultVatRate > 100)) {
      errors.push('VAT rate must be between 0 and 100');
    }

    return errors;
  }

  /**
   * Validate vendor data
   */
  validateVendorData(data: CreateVendorMappingData): string[] {
    const errors: string[] = [];

    if (!data.vendorName || data.vendorName.trim().length === 0) {
      errors.push('Vendor name is required');
    }

    if (!data.category || data.category.trim().length === 0) {
      errors.push('Category is required');
    }

    if (data.confidence !== undefined && (data.confidence < 0 || data.confidence > 1)) {
      errors.push('Confidence must be between 0 and 1');
    }

    return errors;
  }

  /**
   * Get categorization recommendations based on data
   */
  getCategoryRecommendations(data: DocumentData): string[] {
    const recommendations: string[] = [];
    const { vendor, description, amount } = data;

    // Amount-based recommendations
    if (amount) {
      if (amount < 25) {
        recommendations.push('Consider checking for office supplies or small purchases');
      } else if (amount > 500) {
        recommendations.push('Large amount - verify category carefully');
      }
    }

    // Vendor-based recommendations
    if (vendor) {
      const vendorLower = vendor.toLowerCase();
      
      if (vendorLower.includes('hotel') || vendorLower.includes('airline')) {
        recommendations.push('Likely travel expense');
      } else if (vendorLower.includes('restaurant') || vendorLower.includes('cafe')) {
        recommendations.push('Likely meal expense');
      } else if (vendorLower.includes('amazon') || vendorLower.includes('staples')) {
        recommendations.push('Check if office supplies or technology');
      }
    }

    // Description-based recommendations
    if (description) {
      const descLower = description.toLowerCase();
      
      if (descLower.includes('software') || descLower.includes('subscription')) {
        recommendations.push('Likely technology or software expense');
      } else if (descLower.includes('advertising') || descLower.includes('marketing')) {
        recommendations.push('Likely marketing expense');
      }
    }

    return recommendations;
  }
}

// ========================================
// Export Service Instance
// ========================================

export const categorizationService = new CategorizationService();
export default categorizationService; 