import { apiClient } from './apiClient';

export interface AnalyticsParams {
  dateFrom: string;
  dateTo: string;
  category?: string;
  vendor?: string;
  employeeId?: string;
  projectId?: string;
}

export interface KPIMetrics {
  totalSpend: {
    value: number;
    change: number;
    trend: string;
  };
  transactionCount: {
    value: number;
    change: number;
    trend: string;
  };
  averageTransaction: {
    value: number;
    change: number;
    trend: string;
  };
  taxDeductible: {
    value: number;
    percentage: number;
    savings: number;
  };
  budgetUtilization: {
    value: number;
    budget: number;
    utilization: number;
  };
  topCategory: {
    name: string;
    amount: number;
  };
  topVendor: {
    name: string;
    amount: number;
  };
}

export interface ExpenseAnalytics {
  expenses: any[];
  summary: {
    totalAmount: number;
    totalTransactions: number;
    averageAmount: number;
    uniqueCategories: number;
    uniqueVendors: number;
    uniqueEmployees: number;
  };
  trends: {
    grouping: string;
    data: Array<{
      date: string;
      amount: number;
      count: number;
    }>;
    growth: Array<{
      date: string;
      growthRate: number;
    }>;
  };
  categoryBreakdown: Array<{
    name: string;
    amount: number;
    count: number;
    percentage: number;
    averageAmount: number;
    taxDeductible: number;
  }>;
  vendorAnalysis: Array<{
    name: string;
    amount: number;
    count: number;
    averageAmount: number;
    frequency: number;
    categories: string[];
  }>;
  budgetTracking: {
    budgets: Array<{
      category: string;
      budgetAmount: number;
      actualSpend: number;
      utilization: number;
      variance: number;
      status: string;
    }>;
    totalBudget: number;
    totalActual: number;
    overBudgetCategories: number;
    warningCategories: number;
  };
  taxDeductible: {
    taxDeductibleAmount: number;
    nonTaxDeductibleAmount: number;
    totalAmount: number;
    taxDeductiblePercentage: number;
    taxDeductibleCount: number;
    nonTaxDeductibleCount: number;
    categoryBreakdown: Array<{
      category: string;
      amount: number;
    }>;
    estimatedTaxSavings: number;
  };
  departmentAnalysis: Array<{
    name: string;
    amount: number;
    count: number;
    employeeCount: number;
    categoryCount: number;
    averagePerEmployee: number;
    averagePerTransaction: number;
  }>;
  projectAnalysis: Array<{
    name: string;
    amount: number;
    count: number;
    categoryCount: number;
    employeeCount: number;
    averagePerTransaction: number;
  }>;
}

export interface ReportOptions {
  dateFrom: string;
  dateTo: string;
  format: 'pdf' | 'excel';
  filters?: {
    category?: string;
    vendor?: string;
    employeeId?: string;
    projectId?: string;
  };
  includeCharts?: boolean;
  includeDetails?: boolean;
  groupBy?: string;
  name?: string;
}

export interface Report {
  id: string;
  name: string;
  type: string;
  format: string;
  filePath: string;
  fileSize: number;
  status: string;
  createdAt: string;
  generatedBy?: {
    name: string;
    email: string;
  };
}

class AnalyticsService {
  
  /**
   * Get comprehensive expense analytics overview
   */
  async getOverview(companyId: string, params: AnalyticsParams): Promise<ExpenseAnalytics> {
    const response = await apiClient.get('/analytics/overview', {
      params: {
        companyId,
        ...params
      }
    });
    return response.data.data;
  }

  /**
   * Get KPI metrics for dashboard widgets
   */
  async getKPIMetrics(companyId: string, params: Pick<AnalyticsParams, 'dateFrom' | 'dateTo'>): Promise<KPIMetrics> {
    const response = await apiClient.get('/analytics/kpis', {
      params: {
        companyId,
        ...params
      }
    });
    return response.data.data;
  }

  /**
   * Get expense trends over time
   */
  async getTrends(companyId: string, params: AnalyticsParams): Promise<any> {
    const response = await apiClient.get('/analytics/trends', {
      params: {
        companyId,
        ...params
      }
    });
    return response.data.data;
  }

  /**
   * Get category breakdown analysis
   */
  async getCategories(companyId: string, params: Pick<AnalyticsParams, 'dateFrom' | 'dateTo'>): Promise<any[]> {
    const response = await apiClient.get('/analytics/categories', {
      params: {
        companyId,
        ...params
      }
    });
    return response.data.data;
  }

  /**
   * Get vendor spending analysis
   */
  async getVendors(companyId: string, params: Pick<AnalyticsParams, 'dateFrom' | 'dateTo'> & { limit?: number }): Promise<any[]> {
    const response = await apiClient.get('/analytics/vendors', {
      params: {
        companyId,
        ...params
      }
    });
    return response.data.data;
  }

  /**
   * Get budget tracking analysis
   */
  async getBudgetTracking(companyId: string, params: Pick<AnalyticsParams, 'dateFrom' | 'dateTo'>): Promise<any> {
    const response = await apiClient.get('/analytics/budget-tracking', {
      params: {
        companyId,
        ...params
      }
    });
    return response.data.data;
  }

  /**
   * Get tax-deductible expense analysis
   */
  async getTaxDeductible(companyId: string, params: Pick<AnalyticsParams, 'dateFrom' | 'dateTo'>): Promise<any> {
    const response = await apiClient.get('/analytics/tax-deductible', {
      params: {
        companyId,
        ...params
      }
    });
    return response.data.data;
  }

  /**
   * Get department spending analysis
   */
  async getDepartments(companyId: string, params: Pick<AnalyticsParams, 'dateFrom' | 'dateTo'>): Promise<any[]> {
    const response = await apiClient.get('/analytics/departments', {
      params: {
        companyId,
        ...params
      }
    });
    return response.data.data;
  }

  /**
   * Get project spending analysis
   */
  async getProjects(companyId: string, params: Pick<AnalyticsParams, 'dateFrom' | 'dateTo'>): Promise<any[]> {
    const response = await apiClient.get('/analytics/projects', {
      params: {
        companyId,
        ...params
      }
    });
    return response.data.data;
  }

  /**
   * Get comparative analysis (period-over-period)
   */
  async getComparative(companyId: string, periods: {
    currentPeriod: { dateFrom: string; dateTo: string };
    previousPeriod: { dateFrom: string; dateTo: string };
  }): Promise<any> {
    const response = await apiClient.post('/analytics/comparative', {
      companyId,
      ...periods
    });
    return response.data.data;
  }

  /**
   * Generate expense report
   */
  async generateReport(companyId: string, options: ReportOptions): Promise<{
    success: boolean;
    reportId: string;
    filePath: string;
    downloadUrl: string;
  }> {
    const response = await apiClient.post('/analytics/reports/generate', {
      companyId,
      ...options
    });
    return response.data.data;
  }

  /**
   * Get list of generated reports
   */
  async getReports(companyId: string, params: {
    page?: number;
    limit?: number;
    type?: string;
    format?: string;
  } = {}): Promise<{
    data: Report[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await apiClient.get('/analytics/reports', {
      params: {
        companyId,
        ...params
      }
    });
    return response.data;
  }

  /**
   * Download a generated report
   */
  async downloadReport(reportId: string): Promise<string> {
    return `/api/analytics/reports/download/${reportId}`;
  }

  /**
   * Delete a generated report
   */
  async deleteReport(reportId: string): Promise<void> {
    await apiClient.delete(`/analytics/reports/${reportId}`);
  }

  /**
   * Export raw analytics data
   */
  async exportData(companyId: string, params: AnalyticsParams & { format?: 'json' | 'csv' }): Promise<any> {
    const response = await apiClient.get('/analytics/export-data', {
      params: {
        companyId,
        ...params
      }
    });
    
    if (params.format === 'csv') {
      // Handle CSV download
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expense-data-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      return;
    }
    
    return response.data.data;
  }

  /**
   * Get analytics data with caching
   */
  async getCachedOverview(companyId: string, params: AnalyticsParams, cacheKey?: string): Promise<ExpenseAnalytics> {
    // Check if we have cached data
    const key = cacheKey || `analytics_${companyId}_${params.dateFrom}_${params.dateTo}`;
    const cached = sessionStorage.getItem(key);
    
    if (cached) {
      try {
        const parsedCache = JSON.parse(cached);
        const now = Date.now();
        
        // Cache is valid for 5 minutes
        if (now - parsedCache.timestamp < 5 * 60 * 1000) {
          return parsedCache.data;
        }
      } catch (error) {
        // Invalid cache, continue to fetch
      }
    }
    
    // Fetch fresh data
    const data = await this.getOverview(companyId, params);
    
    // Cache the data
    sessionStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
    
    return data;
  }

  /**
   * Clear analytics cache
   */
  clearCache(): void {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith('analytics_')) {
        sessionStorage.removeItem(key);
      }
    });
  }

  /**
   * Get drill-down data for specific chart element
   */
  async getDrillDownData(companyId: string, type: 'category' | 'vendor' | 'department', itemName: string, params: AnalyticsParams): Promise<any> {
    const drillDownParams = {
      ...params,
      [type]: itemName
    };
    
    return this.getOverview(companyId, drillDownParams);
  }

  /**
   * Get real-time analytics updates
   */
  async getRealtimeUpdates(companyId: string, lastUpdateTime: string): Promise<any> {
    const response = await apiClient.get('/analytics/realtime', {
      params: {
        companyId,
        since: lastUpdateTime
      }
    });
    return response.data.data;
  }

  /**
   * Save analytics preferences
   */
  async savePreferences(companyId: string, preferences: {
    defaultDateRange?: string;
    defaultChartTypes?: string[];
    defaultFilters?: any;
    autoRefresh?: boolean;
    refreshInterval?: number;
  }): Promise<void> {
    await apiClient.post('/analytics/preferences', {
      companyId,
      ...preferences
    });
  }

  /**
   * Get analytics preferences
   */
  async getPreferences(companyId: string): Promise<any> {
    const response = await apiClient.get('/analytics/preferences', {
      params: { companyId }
    });
    return response.data.data;
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService; 