import api from '../../lib/api';

export const authApi = {
  // Get CSRF token
  async getCsrfToken() {
    await api.get('/csrf/');
  },

  // Register new user
  async register(email, password, passwordConfirm) {
    const response = await api.post('/auth/register', {
      email,
      password,
      password_confirm: passwordConfirm,
    });
    return response.data;
  },

  // Login
  async login(email, password) {
    const response = await api.post('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  // Logout
  async logout() {
    await api.post('/auth/logout');
  },

  // Get current user
  async me() {
    const response = await api.get('/me');
    return response.data;
  },

  // Update settings and profile
  async updateSettings(settings) {
    const response = await api.patch('/me/settings', settings);
    return response.data;
  },
};
