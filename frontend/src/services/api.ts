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

const STORAGE_KEY = 'finnex_user_id';
const LEGACY_STORAGE_KEY = 'finnex_dev_user_id';

let activeUserId: string | null = localStorage.getItem(STORAGE_KEY);

// Migrate or clear legacy dev key safely
if (!activeUserId) {
  const legacyVal = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacyVal && legacyVal !== 'dev_user_demo_123') {
    activeUserId = legacyVal;
    localStorage.setItem(STORAGE_KEY, legacyVal);
  }
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

export const setDevUserId = (id: string | null) => {
  activeUserId = id;
  if (id) {
    localStorage.setItem(STORAGE_KEY, id);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } else {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
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
