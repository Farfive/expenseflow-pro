import axios from 'axios';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003/api';

// Create axios instance with default config
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Enhanced Export API
export const exportAPI = {
  exportExpenses: async (format: 'excel' | 'pdf' | 'csv' = 'excel', filename?: string) => {
    const params = new URLSearchParams();
    params.append('format', format);
    if (filename) params.append('filename', filename);
    
    const response = await fetch(`${API_BASE_URL}/exports/expenses?${params}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Export failed');
    }
    
    // Handle file download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${Date.now()}.${format === 'excel' ? 'xlsx' : format}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    return { success: true };
  },

  exportAnalytics: async (format: 'pdf' | 'excel' = 'pdf') => {
    const response = await fetch(`${API_BASE_URL}/exports/analytics?format=${format}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Analytics export failed');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_report_${Date.now()}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    return { success: true };
  }
};

// Enhanced OCR API
export const ocrAPI = {
  uploadDocument: async (file: File) => {
    const formData = new FormData();
    formData.append('document', file);
    
    const response = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      headers: getAuthHeaders(false), // Don't set Content-Type for FormData
      body: formData,
    });
    
    return handleResponse(response);
  },

  validateDocument: async (documentId: string) => {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/validate`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    return handleResponse(response);
  }
};

// Settings Persistence API
export const settingsAPI = {
  getSettings: async () => {
    const response = await fetch(`${API_BASE_URL}/settings`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    return handleResponse(response);
  },

  updateCompanySettings: async (settings: any) => {
    const response = await fetch(`${API_BASE_URL}/settings/company`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(settings),
    });
    
    return handleResponse(response);
  },

  updateUserSettings: async (settings: any) => {
    const response = await fetch(`${API_BASE_URL}/settings/user`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(settings),
    });
    
    return handleResponse(response);
  },

  exportSettings: async () => {
    const response = await fetch(`${API_BASE_URL}/settings/export`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Settings export failed');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `settings_export_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    return { success: true };
  },

  importSettings: async (file: File) => {
    const formData = new FormData();
    formData.append('settingsFile', file);
    
    const response = await fetch(`${API_BASE_URL}/settings/import`, {
      method: 'POST',
      headers: getAuthHeaders(false),
      body: formData,
    });
    
    return handleResponse(response);
  }
};

// Integration Management API
export const integrationAPI = {
  getIntegrations: async () => {
    const response = await fetch(`${API_BASE_URL}/integrations`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    return handleResponse(response);
  },

  getIntegrationsByCategory: async (category: string) => {
    const response = await fetch(`${API_BASE_URL}/integrations/categories/${category}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    return handleResponse(response);
  },

  configureIntegration: async (integrationId: string, config: any) => {
    const response = await fetch(`${API_BASE_URL}/integrations/${integrationId}/configure`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(config),
    });
    
    return handleResponse(response);
  },

  testIntegration: async (integrationId: string, config: any) => {
    const response = await fetch(`${API_BASE_URL}/integrations/${integrationId}/test`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(config),
    });
    
    return handleResponse(response);
  },

  syncIntegration: async (integrationId: string) => {
    const response = await fetch(`${API_BASE_URL}/integrations/${integrationId}/sync`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    
    return handleResponse(response);
  },

  removeIntegration: async (integrationId: string) => {
    const response = await fetch(`${API_BASE_URL}/integrations/${integrationId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    
    return handleResponse(response);
  }
};

// Workflow Editor API
export const workflowAPI = {
  getWorkflows: async () => {
    const response = await fetch(`${API_BASE_URL}/workflows`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    return handleResponse(response);
  },

  getWorkflowComponents: async () => {
    const response = await fetch(`${API_BASE_URL}/workflows/components`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    return handleResponse(response);
  },

  createWorkflow: async (workflow: any) => {
    const response = await fetch(`${API_BASE_URL}/workflows`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(workflow),
    });
    
    return handleResponse(response);
  },

  updateWorkflow: async (workflowId: string, updates: any) => {
    const response = await fetch(`${API_BASE_URL}/workflows/${workflowId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    
    return handleResponse(response);
  },

  deleteWorkflow: async (workflowId: string) => {
    const response = await fetch(`${API_BASE_URL}/workflows/${workflowId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    
    return handleResponse(response);
  },

  duplicateWorkflow: async (workflowId: string, name: string) => {
    const response = await fetch(`${API_BASE_URL}/workflows/${workflowId}/duplicate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name }),
    });
    
    return handleResponse(response);
  },

  exportWorkflow: async (workflowId: string) => {
    const response = await fetch(`${API_BASE_URL}/workflows/${workflowId}/export`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Workflow export failed');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow_${workflowId}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    return { success: true };
  },

  importWorkflow: async (file: File) => {
    const formData = new FormData();
    formData.append('workflowFile', file);
    
    const response = await fetch(`${API_BASE_URL}/workflows/import`, {
      method: 'POST',
      headers: getAuthHeaders(false),
      body: formData,
    });
    
    return handleResponse(response);
  }
}; 