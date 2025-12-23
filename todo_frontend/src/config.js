export const API_CONFIG = {
  // Centralized base URL for the backend API
  BASE_URL: 'http://localhost:3001',
};

// PUBLIC_INTERFACE
export function getApiBaseUrl() {
  /** Returns the configured API base URL for the backend. */
  return API_CONFIG.BASE_URL;
}
