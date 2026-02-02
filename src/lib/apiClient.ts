/**
 * Backend API Client for AUREUS Platform
 * Handles all backend API communication
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

interface ApiResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('aureus_token', token);
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('aureus_token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('aureus_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new ApiError(
          data.detail || data.message || 'Request failed',
          data.code || `HTTP_${response.status}`,
          data
        );
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Network error',
        'NETWORK_ERROR'
      );
    }
  }

  // Authentication
  async login(email: string, password: string) {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await this.request<{
      access_token: string;
      token_type: string;
      user: any;
    }>('/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    this.setToken(response.access_token);
    return response;
  }

  async getCurrentUser() {
    return this.request<any>('/v1/auth/me', {
      method: 'GET',
    });
  }

  // Query Execution
  async executeQuery(sql: string, datasetId: string, question?: string) {
    return this.request<{
      execution_id: string;
      sql: string;
      columns: string[];
      data: any[];
      row_count: number;
      execution_time: number;
      evidence: any;
      status: string;
    }>('/v1/query/execute', {
      method: 'POST',
      body: JSON.stringify({
        sql,
        dataset_id: datasetId,
        question,
      }),
    });
  }

  async getQueryHistory(limit: number = 50) {
    return this.request<any[]>(`/v1/query/history?limit=${limit}`, {
      method: 'GET',
    });
  }

  // Datasets
  async getDatasets() {
    return this.request<any[]>('/v1/datasets', {
      method: 'GET',
    });
  }

  async getDataset(id: string) {
    return this.request<any>(`/v1/datasets/${id}`, {
      method: 'GET',
    });
  }

  async createDataset(dataset: any) {
    return this.request<any>('/v1/datasets', {
      method: 'POST',
      body: JSON.stringify(dataset),
    });
  }

  // Audit Log
  async getAuditLog(filters?: any) {
    const params = new URLSearchParams(filters);
    return this.request<any[]>(`/v1/audit?${params}`, {
      method: 'GET',
    });
  }

  // Health Check
  async healthCheck() {
    return this.request<{
      status: string;
      version: string;
      environment: string;
    }>('/health', {
      method: 'GET',
    });
  }
}

export const apiClient = new ApiClient();
export { ApiError };
