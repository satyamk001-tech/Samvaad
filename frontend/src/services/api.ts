const rawBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
export const API_BASE = rawBase 
  ? (rawBase.endsWith('/api/v1') ? rawBase.replace(/\/+$/, '') : `${rawBase.replace(/\/+$/, '')}/api/v1`)
  : (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
      ? 'https://samvaad-l9lg.onrender.com/api/v1'
      : '/api/v1');

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data: any = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('samvaad_access_token');
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    // Attempt token refresh
    const refreshed = await attemptTokenRefresh();
    if (refreshed) {
      // Retry original request
      const newToken = localStorage.getItem('samvaad_access_token');
      headers.set('Authorization', `Bearer ${newToken}`);
      const retryResponse = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
      if (!retryResponse.ok) {
        throw new ApiError(retryResponse.status, 'Request failed after refresh');
      }
      return retryResponse.json();
    } else {
      localStorage.removeItem('samvaad_access_token');
      localStorage.removeItem('samvaad_refresh_token');
      localStorage.removeItem('samvaad_user');
      window.dispatchEvent(new Event('samvaad:auth_expired'));
    }
  }

  if (!response.ok) {
    let errorData = null;
    try {
      errorData = await response.json();
    } catch {
      // Ignore json parse error
    }
    const message = errorData?.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new ApiError(response.status, message, errorData);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

async function attemptTokenRefresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem('samvaad_refresh_token');
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem('samvaad_access_token', data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem('samvaad_refresh_token', data.refreshToken);
    }
    return true;
  } catch {
    return false;
  }
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  patch: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  put: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
