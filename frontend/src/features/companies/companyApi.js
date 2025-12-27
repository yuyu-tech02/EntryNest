import api from '../../lib/api';

export const companyApi = {
  // List companies
  async list(ordering = null) {
    const params = ordering ? { ordering } : {};
    const response = await api.get('/companies/', { params });
    return response.data;
  },

  // Get company detail
  async get(id) {
    const response = await api.get(`/companies/${id}/`);
    return response.data;
  },

  // Create company
  async create(data) {
    const response = await api.post('/companies/', data);
    return response.data;
  },

  // Update company
  async update(id, data) {
    const response = await api.patch(`/companies/${id}/`, data);
    return response.data;
  },

  // Delete company
  async delete(id) {
    await api.delete(`/companies/${id}/`);
  },
};
