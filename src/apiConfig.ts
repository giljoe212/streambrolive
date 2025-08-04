// src/apiConfig.ts

// In development, the app defaults to a local server.
// In production, the VITE_API_URL environment variable *must* be set during the build process.
const API_URL = import.meta.env.PROD 
  ? import.meta.env.VITE_API_URL 
  : 'http://localhost:3001';

if (import.meta.env.PROD && !API_URL) {
  console.error('FATAL ERROR: The VITE_API_URL environment variable is not set in the production environment.');
  // This will help you diagnose configuration issues in your deployment environment.
}

export { API_URL };
