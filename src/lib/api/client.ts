import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';

interface ApiError {
  message: string;
  status: number;
  code?: string;
}

// Interface for standardized API responses
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Login response interface
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

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    // Force the base URL to always be '/api' since we're not using an external API
    const baseURL = '/api';
    
    console.log('ApiClient baseURL:', baseURL); // Debug logging
    
    this.client = axios.create({
      baseURL: baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for auth
    this.client.interceptors.request.use(
      async (config) => {
        try {
          // Get JWT token from localStorage with better error handling
          let token = null;
          if (typeof window !== 'undefined') {
            try {
              token = localStorage.getItem('authToken');
            } catch (storageError) {
              console.warn('LocalStorage access failed:', storageError);
            }
          }

          if (token && token.trim() !== '') {
            config.headers.Authorization = `Bearer ${token}`;
            console.log(`✅ API Request: ${config.method?.toUpperCase()} ${config.url} with token`);
          } else {
            console.warn(`⚠️ API Request: ${config.method?.toUpperCase()} ${config.url} WITHOUT token`);
          }
        } catch (error) {
          console.error('❌ Auth interceptor error:', error);
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(`API Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
        return response;
      },
      (error: AxiosError) => {
        console.error(`API Error: ${error.response?.status || 'Network'} ${error.config?.method?.toUpperCase()} ${error.config?.url}`, error.response?.data);

        // Handle 401 (Unauthorized) errors
        if (error.response?.status === 401) {
          console.warn('Authentication failed, clearing token and redirecting to login');
          // Clear token and redirect to login
          if (typeof window !== 'undefined') {
            localStorage.removeItem('authToken');
            // Show user-friendly message
            alert('Your session has expired. Please log in again.');
            window.location.href = '/login';
          }
        }

        const apiError: ApiError = {
          message: (error.response?.data as any)?.error || (error.response?.data as any)?.message || error.message || 'An error occurred',
          status: error.response?.status || 500,
          code: error.code,
        };
        return Promise.reject(apiError);
      }
    );
  }

  // Helper method to extract data from standardized API responses
  private extractData<T>(responseData: any): T {
    // Check if it's our new standardized format
    if (responseData && typeof responseData === 'object' && 'success' in responseData) {
      const apiResponse = responseData as ApiResponse<T>;
      if (apiResponse.success && apiResponse.data !== undefined) {
        return apiResponse.data;
      } else if (!apiResponse.success) {
        throw new Error(apiResponse.error || 'API request failed');
      }
    }

    // Fallback to returning the data as-is (for backward compatibility)
    return responseData;
  }

  // Authentication method
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.client.post('/auth/login', { email, password });
    const loginResponse = response.data as LoginResponse;

    if (loginResponse.success && loginResponse.token) {
      // Store the token
      if (typeof window !== 'undefined') {
        localStorage.setItem('authToken', loginResponse.token);
      }
    }

    return loginResponse;
  }

  // GET request
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get(url, config);
    return this.extractData<T>(response.data);
  }

  // POST request
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post(url, data, config);
    return this.extractData<T>(response.data);
  }

  // PUT request
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put(url, data, config);
    return this.extractData<T>(response.data);
  }

  // PATCH request
  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch(url, data, config);
    return this.extractData<T>(response.data);
  }

  // DELETE request
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete(url, config);
    return this.extractData<T>(response.data);
  }

  // File upload
  async upload<T>(url: string, file: File, onProgress?: (progress: number) => void): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    };

    const response = await this.client.post(url, formData, config);
    return this.extractData<T>(response.data);
  }
}

export const apiClient = new ApiClient();
export type { ApiError, ApiResponse, LoginResponse };

// Export test credentials for development
export const TEST_CREDENTIALS = {
  admin: { email: 'admin@healthcare.com', password: 'admin123' },
  vendor: { email: 'vendor@healthcare.com', password: 'admin123' },
  advocate: { email: 'advocate@healthcare.com', password: 'admin123' },
  collections: { email: 'collections@healthcare.com', password: 'admin123' },
};
