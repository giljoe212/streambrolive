// src/apiConfig.ts

// In development, the app defaults to a local server.
// In production, the VITE_API_URL environment variable *must* be set during the build process.
const getApiBaseUrl = () => {
  const baseUrl = import.meta.env.PROD 
    ? (import.meta.env.VITE_API_URL || 'https://streambrolive-production.up.railway.app')
    : 'http://localhost:3001';
  
  // Pastikan URL tidak diakhiri dengan /
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
};

const API_BASE_URL = getApiBaseUrl();

// Log URL yang digunakan
if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  console.warn('WARNING: The VITE_API_URL environment variable is not set. Using default production URL.');
}
console.log(`API Base URL: ${API_BASE_URL}`);

export { API_BASE_URL as API_URL };
export { API_BASE_URL };
