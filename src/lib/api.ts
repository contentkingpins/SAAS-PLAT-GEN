// API Client for Healthcare Lead Platform Backend Integration
// Base URL for the backend API
const API_BASE_URL = 'https://main.d1iz6ogqp82qj7.amplifyapp.com';

// Types for API responses
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface LoginResponse {
  success: boolean;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    vendorId: string | null;
    teamId: string | null;
    vendor: any | null;
    team: any | null;
  };
  token: string;
}

// API Client Class
class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    // Get token from localStorage on initialization
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('authToken');
    }
  }

  // Set authentication token
  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', token);
    }
  }

  // Clear authentication token
  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
    }
  }

  // Get default headers
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Make API request with error handling
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Authentication endpoints
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/api/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.success && response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async checkSystemStatus(): Promise<ApiResponse> {
    return this.request<ApiResponse>('/api/auth/setup/');
  }

  // User Management (Admin only)
  async getUsers(): Promise<ApiResponse> {
    return this.request<ApiResponse>('/api/admin/users/');
  }

  async createUser(userData: any): Promise<ApiResponse> {
    return this.request<ApiResponse>('/api/admin/users/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: string, userData: any): Promise<ApiResponse> {
    return this.request<ApiResponse>(`/api/admin/users/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id: string): Promise<ApiResponse> {
    return this.request<ApiResponse>(`/api/admin/users/${id}/`, {
      method: 'DELETE',
    });
  }

  // Team Management
  async getTeams(): Promise<ApiResponse> {
    return this.request<ApiResponse>('/api/admin/teams/');
  }

  async createTeam(teamData: any): Promise<ApiResponse> {
    return this.request<ApiResponse>('/api/admin/teams/', {
      method: 'POST',
      body: JSON.stringify(teamData),
    });
  }

  // Vendor Management
  async getVendors(): Promise<ApiResponse> {
    return this.request<ApiResponse>('/api/admin/vendors/');
  }

  async createVendor(vendorData: any): Promise<ApiResponse> {
    return this.request<ApiResponse>('/api/admin/vendors/', {
      method: 'POST',
      body: JSON.stringify(vendorData),
    });
  }

  async updateVendor(id: string, vendorData: any): Promise<ApiResponse> {
    return this.request<ApiResponse>(`/api/admin/vendors/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(vendorData),
    });
  }

  async deleteVendor(id: string): Promise<ApiResponse> {
    return this.request<ApiResponse>(`/api/admin/vendors/${id}/`, {
      method: 'DELETE',
    });
  }

  // Lead Management
  async getLeads(filters?: any): Promise<ApiResponse> {
    const params = filters ? `?${new URLSearchParams(filters).toString()}` : '';
    return this.request<ApiResponse>(`/api/admin/leads/${params}`);
  }

  async createLead(leadData: any): Promise<ApiResponse> {
    return this.request<ApiResponse>('/api/admin/leads/', {
      method: 'POST',
      body: JSON.stringify(leadData),
    });
  }

  async updateLead(id: string, leadData: any): Promise<ApiResponse> {
    return this.request<ApiResponse>(`/api/admin/leads/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(leadData),
    });
  }

  async getLeadHistory(id: string): Promise<ApiResponse> {
    return this.request<ApiResponse>(`/api/admin/leads/${id}/history/`);
  }

  // Alert Management
  async getAlerts(): Promise<ApiResponse> {
    return this.request<ApiResponse>('/api/admin/alerts/');
  }

  async createAlert(alertData: any): Promise<ApiResponse> {
    return this.request<ApiResponse>('/api/admin/alerts/', {
      method: 'POST',
      body: JSON.stringify(alertData),
    });
  }

  async updateAlert(id: string, alertData: any): Promise<ApiResponse> {
    return this.request<ApiResponse>(`/api/admin/alerts/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(alertData),
    });
  }

  async deleteAlert(id: string): Promise<ApiResponse> {
    return this.request<ApiResponse>(`/api/admin/alerts/${id}/`, {
      method: 'DELETE',
    });
  }

  async runBulkMBICheck(): Promise<ApiResponse> {
    return this.request<ApiResponse>('/api/admin/alerts/bulk-check/', {
      method: 'POST',
    });
  }

  // Analytics
  async getDashboardMetrics(): Promise<ApiResponse> {
    return this.request<ApiResponse>('/api/analytics/dashboard/');
  }

  // File Upload
  async uploadHistoricalData(formData: FormData): Promise<ApiResponse> {
    return this.request<ApiResponse>('/api/admin/uploads/historical-data/', {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type for FormData, let browser set it
        'Authorization': this.token ? `Bearer ${this.token}` : '',
      },
    });
  }
}

// Create and export the API client instance
const apiClient = new ApiClient(API_BASE_URL);

export default apiClient;

// Export types for use in components
export type { ApiResponse, LoginResponse };

// Export test credentials for development
export const TEST_CREDENTIALS = {
  admin: { email: 'admin@healthcare.com', password: 'admin123' },
  vendor: { email: 'vendor@healthcare.com', password: 'admin123' },
  advocate: { email: 'advocate@healthcare.com', password: 'admin123' },
  collections: { email: 'collections@healthcare.com', password: 'admin123' },
}; 