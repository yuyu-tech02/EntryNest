import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // Important for session cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Get CSRF token from cookie
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// Add CSRF token to all non-GET requests
api.interceptors.request.use((config) => {
  if (config.method !== 'get') {
    config.headers['X-CSRFToken'] = getCookie('csrftoken');
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Enhance error with more useful information
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      // Extract error message from various response formats
      let message = 'エラーが発生しました';
      if (data.detail) {
        message = data.detail;
      } else if (data.message) {
        message = data.message;
      } else if (typeof data === 'string') {
        message = data;
      } else if (data.non_field_errors) {
        message = data.non_field_errors.join(', ');
      }

      error.userMessage = message;
      error.statusCode = status;
    } else if (error.request) {
      // Request was made but no response received
      error.userMessage = 'サーバーに接続できません';
      error.statusCode = 0;
    } else {
      // Error in request configuration
      error.userMessage = 'リクエストの設定でエラーが発生しました';
      error.statusCode = 0;
    }

    return Promise.reject(error);
  }
);

/**
 * Extract user-friendly error message from an error object.
 * @param {Error} error - The error object from a failed API call
 * @param {string} fallbackMessage - Default message if no specific error found
 * @returns {string} User-friendly error message
 */
export function getErrorMessage(error, fallbackMessage = 'エラーが発生しました') {
  if (error.userMessage) {
    return error.userMessage;
  }

  if (error.response?.data?.detail) {
    return error.response.data.detail;
  }

  if (error.message) {
    return error.message;
  }

  return fallbackMessage;
}

/**
 * Check if error is an authentication error (401/403).
 * @param {Error} error - The error object
 * @returns {boolean}
 */
export function isAuthError(error) {
  const status = error.statusCode || error.response?.status;
  return status === 401 || status === 403;
}

/**
 * Check if error is a rate limit error (429).
 * @param {Error} error - The error object
 * @returns {boolean}
 */
export function isRateLimitError(error) {
  const status = error.statusCode || error.response?.status;
  return status === 429;
}

export default api;
