import axios from 'axios';

// Base URL for your backend
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout for large files
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

// Proposal API - FIXED VERSION
export const proposalApi = {
  // Parse proposal from uploaded file (for demo/testing)
  parseDemoWithFile: async (formData) => {
    console.log('🔄 parseDemoWithFile called with FormData');
    
    // Debug FormData contents
    if (formData instanceof FormData) {
      console.log('📁 FormData entries:');
      for (let [key, value] of formData.entries()) {
        console.log(`${key}:`, value);
      }
    } else {
      console.log('❌ Input is not FormData:', typeof formData);
    }
    
    try {
      const response = await api.post("/proposals/parse-demo", formData, {
        headers: { 
          "Content-Type": "multipart/form-data",
        },
        timeout: 60000, // 60 seconds for AI processing
      });
      
      console.log('✅ API Response received:', response.status);
      return response.data;
      
    } catch (error) {
      console.error('❌ API Error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  },
  
  // Submit proposal (regular submission)
  submit: (proposalData) => api.post('/proposals', proposalData),
  
  // Get all proposals
  getAll: () => api.get('/proposals'),
  
  // Get single proposal by ID
  getById: (id) => api.get(`/proposals/${id}`),
  
  // Get proposals for specific RFP
  getByRfpId: (rfpId) => api.get(`/proposals/rfp/${rfpId}`),
  
  // Get proposals from specific vendor
  getByVendorId: (vendorId) => api.get(`/proposals/vendor/${vendorId}`),
  
  // Update proposal status
  updateStatus: (proposalId, status) => api.put(`/proposals/${proposalId}/status`, { status }),
  
  // Delete proposal
  delete: (id) => api.delete(`/proposals/${id}`),
  
  // AI Compare proposals for an RFP
  compare: (rfpId) => api.get(`/proposals/compare/${rfpId}`).then(response => response.data),
  
  // Extract text from uploaded file
  extractText: async (formData) => {
    const response = await api.post('/proposals/extract-text', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
    
    return response.data;
  },
  
  // Analyze proposal content
  analyze: (proposalId) => api.get(`/proposals/${proposalId}/analyze`),
};

// Comparison API - for AI comparison of proposals against RFP
export const comparisonApi = {
  // Compare multiple proposal files against an RFP
  compare: async (rfpId, files) => {
    console.log('🔄 comparisonApi.compare called with:', { rfpId, filesCount: files.length });
    
    const formData = new FormData();
    formData.append('rfpId', rfpId);
    
    files.forEach((file, index) => {
      formData.append('proposalFiles', file);
      console.log(`📄 Added file ${index + 1}: ${file.name} (${file.size} bytes)`);
    });
    
    try {
      const response = await api.post('/comparison/compare', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minutes for AI comparison
      });
      
      console.log('✅ Comparison API Response received:', response.status);
      return response.data;
      
    } catch (error) {
      console.error('❌ Comparison API Error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  },
  
  // Get comparison results for an RFP
  getResults: (rfpId) => {
    console.log('🔄 Getting comparison results for RFP:', rfpId);
    return api.get(`/comparison/results/${rfpId}`).then(response => response.data);
  },
  
  // Test endpoint to check if comparison API is working
  test: () => {
    console.log('🔄 Testing comparison API connection');
    return api.get('/comparison/test').then(response => response.data);
  }
};

// Export all APIs including the new comparisonApi
export default api;

