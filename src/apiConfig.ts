// src/apiConfig.ts

// In development, the app will use the local server on port 3001
// In production, it will use the VITE_API_URL environment variable or default to the same domain
const getApiBaseUrl = () => {
  if (import.meta.env.DEV) {
    return 'http://localhost:3001';
  }
  
  // In production, use VITE_API_URL if set, otherwise use current domain
  const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;
  
  // Remove trailing slash if present
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
};

const API_BASE_URL = getApiBaseUrl();

// Log the URL being used
console.log(`API Base URL: ${API_BASE_URL}`);

// Export the base URL
export { API_BASE_URL, API_BASE_URL as API_URL };

export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    ME: '/api/auth/me'
  },
  STREAMS: {
    LIST: '/api/streams',
    CREATE: '/api/streams',
    DETAIL: (id: string) => `/api/streams/${id}`,
    UPDATE: (id: string) => `/api/streams/${id}`,
    DELETE: (id: string) => `/api/streams/${id}`
  }
};
