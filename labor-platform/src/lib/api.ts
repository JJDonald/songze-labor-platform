const API_BASE = import.meta.env.VITE_API_URL || '/api';

const stripApiSuffix = (value: string) => value.replace(/\/api\/?$/, '');

export const API_ORIGIN = import.meta.env.VITE_API_URL
  ? stripApiSuffix(import.meta.env.VITE_API_URL)
  : '';

export class ApiError extends Error {
  code: number;
  data: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.data = data;
  }
}

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

type UnauthorizedHandler = () => void;

class ApiClient {
  private unauthorizedHandler: UnauthorizedHandler | null = null;

  onUnauthorized(handler: UnauthorizedHandler) {
    this.unauthorizedHandler = handler;
  }

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

  private handleUnauthorized() {
    this.clearAuthToken();
    this.unauthorizedHandler?.();
  }

  private async parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
    let payload: ApiResponse<T> | null = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    const code = payload?.code ?? response.status;
    if (!response.ok || (payload && payload.code !== 0)) {
      if (code === 401) {
        this.handleUnauthorized();
      }
      throw new ApiError(code, payload?.message || `请求失败 (${response.status})`, payload?.data ?? undefined);
    }

    return payload as ApiResponse<T>;
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

    return this.parseResponse<T>(response);
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

    return this.parseResponse<T>(response);
  }

  /**
   * Downloads a file from the API (expects a non-JSON binary/octet-stream response)
   * and triggers a browser download with the given filename.
   */
  async download(endpoint: string, filename: string): Promise<void> {
    const token = this.getToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, { method: 'GET', headers });

    if (!response.ok) {
      let message = `下载失败 (${response.status})`;
      try {
        const payload = (await response.json()) as ApiResponse<unknown>;
        if (payload?.code === 401) {
          this.handleUnauthorized();
        }
        if (payload?.message) {
          message = payload.message;
        }
      } catch {
        // Non-JSON error body; keep the generic message.
      }
      throw new ApiError(response.status, message);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }

  setAuthToken(token: string) {
    this.setToken(token);
  }

  clearAuthToken() {
    this.setToken(null);
  }
}

export const api = new ApiClient();
