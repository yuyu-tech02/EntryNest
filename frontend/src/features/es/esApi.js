import api from '../../lib/api';

export const esApi = {
  // List all ES versions
  async list() {
    const response = await api.get('/es/');
    return response.data;
  },

  // List ES versions for specific company
  async listByCompany(companyId) {
    const response = await api.get(`/companies/${companyId}/es`);
    return response.data;
  },

  // Get ES version detail
  async get(id) {
    const response = await api.get(`/es/${id}/`);
    return response.data;
  },

  // Create ES version
  async create(data) {
    const response = await api.post('/es/', data);
    return response.data;
  },

  // Update ES version
  async update(id, data) {
    const response = await api.patch(`/es/${id}/`, data);
    return response.data;
  },

  // Delete ES version
  async delete(id) {
    await api.delete(`/es/${id}/`);
  },
};
