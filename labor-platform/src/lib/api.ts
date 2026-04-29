// 从环境变量读取 API 地址，默认 localhost 开发环境
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// 导出基础 URL 供图片等静态资源拼接使用
export const API_ORIGIN = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'http://localhost:3001';

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  private setToken(token: string | null) {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const token = this.getToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    // 检查 HTTP 状态码
    if (!response.ok) {
      // 尝试解析服务器返回的 JSON 错误信息
      try {
        const errorData = await response.json();
        return errorData;
      } catch {
        // 服务器返回非 JSON（如 502 HTML 错误页）
        return {
          code: response.status,
          message: `请求失败 (${response.status})`,
          data: null as T,
        };
      }
    }

    const data = await response.json();
    return data;
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async upload<T>(endpoint: string, file: File): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    // 检查 HTTP 状态码
    if (!response.ok) {
      try {
        const errorData = await response.json();
        return errorData;
      } catch {
        return {
          code: response.status,
          message: `上传失败 (${response.status})`,
          data: null as T,
        };
      }
    }

    return response.json();
  }

  setAuthToken(token: string) {
    this.setToken(token);
  }

  clearAuthToken() {
    this.setToken(null);
  }
}

export const api = new ApiClient();