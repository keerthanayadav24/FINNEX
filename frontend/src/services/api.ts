const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim() !== '') {
    return envUrl;
  }
  if (import.meta.env.PROD) {
    throw new Error(
      'FINNEX Configuration Error: VITE_API_BASE_URL environment variable is required in production mode.'
    );
  }
  return 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

let activeUserId: string | null = localStorage.getItem('finnex_user_id') || localStorage.getItem('finnex_dev_user_id');

export const setDevUserId = (id: string | null) => {
  activeUserId = id;
  if (id) {
    localStorage.setItem('finnex_user_id', id);
    localStorage.setItem('finnex_dev_user_id', id);
  } else {
    localStorage.removeItem('finnex_user_id');
    localStorage.removeItem('finnex_dev_user_id');
  }
};

export const getDevUserId = () => activeUserId;
export const setClerkToken = (_token: string | null) => {};

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (activeUserId) {
    headers['Authorization'] = `Bearer ${activeUserId}`;
    headers['x-user-id'] = activeUserId;
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error?.message || data.message || `API error (${response.status})`;
    throw new Error(errorMsg);
  }

  return (data.data !== undefined ? data.data : data) as T;
}
