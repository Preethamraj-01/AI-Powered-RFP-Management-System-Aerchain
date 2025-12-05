import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// RFP API
export const rfpApi = {
  generate: (text) => api.post('/rfp/generate', { text }),
  getAll: () => api.get('/rfp'),
  getById: (id) => api.get(`/rfp/${id}`),
  sendToVendors: (id, vendorIds) => {
    console.log('Sending RFP to vendors:', { id, vendorIds });
    return api.post(`/rfp/${id}/send`, { vendorIds });
  },
  getVendors: async () => {
    console.log('🔗 Making API call to /api/vendors');
    try {
      const response = await api.get('/vendors');
      console.log('✅ API call successful:', response);
      return response;
    } catch (error) {
      console.error('❌ API call failed:', error);
      throw error;
    }
  },
};

// Vendor API
export const vendorApi = {
  getAll: () => api.get('/vendors'),
  getStats: () => api.get('/vendors/stats'),
};

// Proposal API
export const proposalApi = {
  parseDemo: async (vendorId, rfpId, input) => {
  let response;

  if (input instanceof File) {
    // PDF upload
    const form = new FormData();
    form.append("file", input);
    form.append("vendorId", vendorId);
    form.append("rfpId", rfpId);
    response = await api.post("/proposals/parse-demo", form, {
      headers: { "Content-Type": "multipart/form-data" }
    });
  } else {
    // text fallback
    response = await api.post("/proposals/parse-demo", {
      vendorId,
      rfpId,
      proposalText: input
    });
  }

  const extracted = response.data.data.extracted;

  return {
    title: extracted.title,
    items: extracted.items,
    budget: extracted.budget,
    warranty: extracted.warranty,
    expectedDeliveryDate: extracted.expectedDeliveryDate,
    _debug_raw: extracted
  };
}

};

export default api;