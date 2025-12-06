import React, { useState, useEffect } from 'react';
import RFPChat from './components/RFPChat';
import { rfpApi, vendorApi, proposalApi } from './services/api';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('create');
  const [vendors, setVendors] = useState([]);
  const [rfps, setRfps] = useState([]);
  const [demoProposalText, setDemoProposalText] = useState('');
  const [comparisonResult, setComparisonResult] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [parsedResult, setParsedResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Load vendors
  useEffect(() => {
    const loadVendors = async () => {
      try {
        const response = await vendorApi.getAll();
        setVendors(response.data.data);
      } catch (error) {
        console.error('Error loading vendors:', error);
      }
    };
    loadVendors();
  }, []);

  // Load RFPs
  useEffect(() => {
    const loadRFPs = async () => {
      try {
        const response = await rfpApi.getAll();
        setRfps(response.data.data);
      } catch (error) {
        console.error('Error loading RFPs:', error);
      }
    };
    loadRFPs();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFileName(file.name);
      setDemoProposalText(file.name);
      console.log('✅ File selected:', {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: new Date(file.lastModified).toLocaleString()
      });

      // Clear previous results
      setParsedResult(null);
    } else {
      setSelectedFile(null);
      setFileName('');
      setDemoProposalText('');
    }
  };

  const handleParseDemoProposal = async () => {
    console.log('🚀 Starting parse demo proposal...');

    if (!selectedFile) {
      alert('❌ Please select a file first');
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    setParsedResult(null);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Debug FormData
      console.log('📋 FormData created. Entries:');
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value instanceof File ?
          `File: ${value.name} (${value.size} bytes)` : value);
      }

      // Call API
      console.log('📤 Sending to API...');
      const result = await proposalApi.parseDemoWithFile(formData);

      clearInterval(progressInterval);
      setUploadProgress(100);

      console.log('✅ API Response:', result);

      // Handle response - FIXED SECTION
      if (result.success) {
        // CRITICAL FIX: Extract data from the nested structure
        // The API returns: { success: true, data: { extracted: {...} } }
        const extractedData = result.data?.extracted || result.data || result;

        console.log('📊 Extracted data:', {
          title: extractedData?.title,
          totalPrice: extractedData?.totalPrice,
          hasTitle: !!extractedData?.title,
          hasPrice: !!extractedData?.totalPrice,
          keys: Object.keys(extractedData || {})
        });

        // Ensure we have a valid object
        if (extractedData && typeof extractedData === 'object') {
          setParsedResult(extractedData);
          console.log('✅ Data set to state:', extractedData);
        } else {
          throw new Error('Invalid data format received from API');
        }

        // Auto-switch to show results
        setTimeout(() => {
          const resultsElement = document.getElementById('parsed-results');
          if (resultsElement) {
            resultsElement.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
          }
        }, 200);
      } else {
        // Handle error case
        const errorData = {
          error: result.message || result.error || 'Unknown error occurred',
          success: false
        };
        setParsedResult(errorData);
        console.error('❌ API returned error:', errorData);
        alert(`Error: ${result.message || result.error}`);
      }

    } catch (error) {
      console.error('❌ Parse error:', error);

      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Unknown error occurred';

      const errorData = {
        error: errorMessage,
        success: false,
        details: error.response?.data?.details
      };

      setParsedResult(errorData);
      console.error('❌ Error data set:', errorData);

      alert(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
      setTimeout(() => setUploadProgress(0), 500);
    }
  };

  const handleCompareProposals = async () => {
    const rfpId = rfps[0]?._id || '69306ad0666b5f64831825d9';

    try {
      const result = await proposalApi.compare(rfpId);
      setComparisonResult(result.data);
    } catch (error) {
      alert(`❌ Error: ${error.response?.data?.error || error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-indigo-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">AI RFP Management System</h1>
          <p className="text-sm opacity-90">Streamline procurement with AI-powered automation</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex space-x-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded whitespace-nowrap ${activeTab === 'create' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}
          >
            Create RFP
          </button>
          <button
            onClick={() => setActiveTab('vendors')}
            className={`px-4 py-2 rounded whitespace-nowrap ${activeTab === 'vendors' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}
          >
            Vendors ({vendors.length})
          </button>
          <button
            onClick={() => setActiveTab('rfps')}
            className={`px-4 py-2 rounded whitespace-nowrap ${activeTab === 'rfps' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}
          >
            RFPs ({rfps.length})
          </button>
          <button
            onClick={() => setActiveTab('proposals')}
            className={`px-4 py-2 rounded whitespace-nowrap ${activeTab === 'proposals' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}
          >
            Parse Proposal
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`px-4 py-2 rounded whitespace-nowrap ${activeTab === 'compare' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}
          >
            AI Compare
          </button>
        </div>

        {/* Content */}
        <div className="mb-8">
          {activeTab === 'create' && (
            <div>
              <RFPChat />
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-4 rounded shadow">
                  <h3 className="font-bold mb-2">🟢 System Status</h3>
                  <p className="text-sm">Backend: <span className="text-green-600">✅ Running</span></p>
                  <p className="text-sm">Database: <span className="text-green-600">✅ Connected</span></p>
                  <p className="text-sm">AI API: <span className="text-green-600">✅ Ready</span></p>
                </div>
                <div className="bg-white p-4 rounded shadow">
                  <h3 className="font-bold mb-2">🔗 Quick Links</h3>
                  <p className="text-sm">
                    <a href="http://localhost:8025" className="text-blue-500 hover:underline block">View MailHog</a>
                    <a href="http://localhost:5000/api/rfp" className="text-blue-500 hover:underline block">Backend API</a>
                  </p>
                </div>
                <div className="bg-white p-4 rounded shadow">
                  <h3 className="font-bold mb-2">📋 Examples</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>"20 monitors, 24-inch, $8,000"</li>
                    <li>"50 chairs, 4 weeks delivery"</li>
                    <li>"Software for 100 users"</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vendors' && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">Vendors ({vendors.length})</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Email</th>
                      <th className="px-4 py-2 text-left">Category</th>
                      <th className="px-4 py-2 text-left">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.map((vendor) => (
                      <tr key={vendor._id} className="border-t">
                        <td className="px-4 py-2">{vendor.name}</td>
                        <td className="px-4 py-2 text-blue-500">{vendor.email}</td>
                        <td className="px-4 py-2">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                            {vendor.category}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className="text-yellow-500">★</span> {vendor.rating}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'rfps' && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">RFPs ({rfps.length})</h2>
              <div className="space-y-4">
                {rfps.map((rfp) => (
                  <div key={rfp._id} className="border rounded p-4">
                    <h3 className="font-bold">{rfp.title}</h3>
                    <p className="text-sm text-gray-600">Budget: {rfp.budget} | Status: <span className={`px-2 py-1 rounded text-xs ${rfp.status === 'sent' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{rfp.status}</span></p>
                    <p className="text-sm mt-2">Items: {rfp.items.map(item => `${item.quantity}x ${item.itemName}`).join(', ')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'proposals' && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">📄 Parse Vendor Proposal</h2>
              <p className="text-gray-600 mb-6">Upload a proposal document (PDF/DOCX) and AI will extract key details</p>

              {/* File Upload Section */}
              <div className="mb-8 p-4 border-2 border-dashed border-gray-300 rounded-lg">
                <div className="flex flex-col items-center justify-center">
                  <div className="mb-4">
                    <svg className="w-12 h-12 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                  </div>

                  <label className="cursor-pointer bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors">
                    <span className="font-semibold">Choose File</span>
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-input"
                    />
                  </label>

                  <p className="mt-2 text-sm text-gray-500">or drag and drop</p>
                  <p className="mt-1 text-xs text-gray-400">PDF, DOCX, TXT up to 10MB</p>
                </div>

                {fileName && (
                  <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span className="font-medium">{fileName}</span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedFile(null);
                          setFileName('');
                          document.getElementById('file-input').value = '';
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Parse Button */}
              <div className="flex justify-center">
                <button
                  onClick={handleParseDemoProposal}
                  disabled={!selectedFile || loading}
                  className={`
                    px-8 py-3 rounded-lg font-semibold text-lg
                    transition-all duration-300 transform hover:scale-105
                    ${!selectedFile || loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'}
                  `}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin h-5 w-5 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing with AI...
                    </div>
                  ) : '🤖 Parse with AI'}
                </button>
              </div>

              {/* Progress Bar */}
              {loading && (
                <div className="mt-6">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Uploading & Processing...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}



          {/* Results Section */}
          <div id="parsed-results" style={{ marginTop: '30px' }}>
            {parsedResult && (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                {/* Header */}
                <div className={`
                  px-6 py-4 text-white font-bold
                  ${parsedResult.success === false ? 'bg-red-500' : 'bg-gradient-to-r from-green-500 to-emerald-600'}
                `}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {parsedResult.success === false ? '❌ Parsing Failed' : '✅ AI Parsing Results'}
                      {parsedResult.score && (
                        <span className="ml-4 px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm">
                          AI Score: {parsedResult.score}/100
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setParsedResult(null)}
                      className="text-white hover:text-gray-200"
                    >
                      ✕ Clear
                    </button>
                  </div>
                </div>

                {/* Error State */}
                {parsedResult.success === false ? (
                  <div className="p-6">
                    <div className="flex items-center p-4 bg-red-50 rounded-lg">
                      <svg className="w-8 h-8 text-red-500 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <div>
                        <h4 className="font-bold text-red-700">Extraction Failed</h4>
                        <p className="text-red-600">{parsedResult.error}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Success State */
                  <div className="p-6">
                    {/* Summary Card */}
                    <div className="mb-8 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                      <h3 className="font-bold text-lg text-blue-800 mb-3">📋 Proposal Summary</h3>
                      <p className="text-blue-700">{parsedResult.summary || "No summary available"}</p>
                    </div>

                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                      {/* Total Price */}
                      <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
                        <div className="flex items-center mb-3">
                          <div className="p-2 bg-green-100 rounded-lg mr-3">
                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                          </div>
                          <h4 className="font-bold text-gray-700">Total Price</h4>
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                          ${parsedResult.totalPrice?.toLocaleString() || '0'}
                        </div>
                      </div>

                      {/* Delivery Timeline */}
                      <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
                        <div className="flex items-center mb-3">
                          <div className="p-2 bg-blue-100 rounded-lg mr-3">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                          </div>
                          <h4 className="font-bold text-gray-700">Delivery Timeline</h4>
                        </div>
                        <div className="text-xl font-semibold text-blue-600">
                          {parsedResult.deliveryTimeline || 'Not specified'}
                        </div>
                      </div>

                      {/* Vendor Name */}
                      <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
                        <div className="flex items-center mb-3">
                          <div className="p-2 bg-purple-100 rounded-lg mr-3">
                            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                            </svg>
                          </div>
                          <h4 className="font-bold text-gray-700">Vendor</h4>
                        </div>
                        <div className="text-xl font-semibold text-purple-600">
                          {parsedResult.vendorName || 'Not specified'}
                        </div>
                      </div>
                    </div>

                    {/* Details Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                      {/* Left Column */}
                      <div className="space-y-6">
                        {/* Items */}
                        {parsedResult.items && (
                          <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
                            <h4 className="font-bold text-gray-800 mb-3">📦 Items/Services</h4>
                            <div className="space-y-2">
                              {Array.isArray(parsedResult.items) ? (
                                parsedResult.items.map((item, index) => (
                                  <div key={index} className="p-3 bg-gray-50 rounded border border-gray-200">
                                    <div className="flex items-start">
                                      <span className="text-blue-500 mr-2">•</span>
                                      <span>{item}</span>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="p-3 bg-gray-50 rounded border border-gray-200">
                                  {parsedResult.items}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Specifications */}
                        {parsedResult.specifications && (
                          <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
                            <h4 className="font-bold text-gray-800 mb-3">🔧 Specifications</h4>
                            <div className="p-3 bg-gray-50 rounded border border-gray-200">
                              {parsedResult.specifications}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right Column */}
                      <div className="space-y-6">
                        {/* Payment Terms */}
                        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
                          <h4 className="font-bold text-gray-800 mb-3">💳 Payment Terms</h4>
                          <div className="p-3 bg-gray-50 rounded border border-gray-200">
                            {parsedResult.paymentTerms || 'Not specified'}
                          </div>
                        </div>

                        {/* Warranty */}
                        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
                          <h4 className="font-bold text-gray-800 mb-3">🛡️ Warranty</h4>
                          <div className="p-3 bg-gray-50 rounded border border-gray-200">
                            {parsedResult.warranty || 'Not specified'}
                          </div>
                        </div>

                        {/* Additional Details */}
                        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
                          <h4 className="font-bold text-gray-800 mb-3">📝 Additional Details</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Budget Allocated:</span>
                              <span className="font-semibold">
                                {parsedResult.budget && parsedResult.budget !== 'Not specified'
                                  ? (() => {
                                    // Check if it already has a currency symbol
                                    const budgetStr = parsedResult.budget.toString();
                                    if (budgetStr.includes('$') || budgetStr.includes('₹') || budgetStr.includes('€') || budgetStr.includes('£')) {
                                      return budgetStr;
                                    }
                                    // Add $ as default
                                    return `$${budgetStr}`;
                                  })()
                                  : 'Not specified'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Quantity:</span>
                              <span className="font-semibold">{parsedResult.quantity || 'Not specified'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">RFP Reference:</span>
                              <span className="font-semibold">{parsedResult.rfpReference || 'Not specified'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Simple Consolidated Summary */}
                    <div className="mt-6 p-6 bg-white rounded-xl shadow border">
                      <h4 className="font-bold text-xl text-gray-800 mb-4 border-b pb-2">📋 AI Analysis Summary</h4>

                      <div className="space-y-3 text-gray-700">
                        <div className="flex items-start">
                          <div className="bg-blue-100 p-2 rounded-lg mr-3">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium">Proposal Overview:</p>
                            <p className="text-gray-600">{parsedResult.summary || `A proposal from ${parsedResult.vendorName || 'vendor'} for ${parsedResult.title || 'procurement'} valued at $${parsedResult.totalPrice?.toLocaleString() || '0'}.`}</p>
                          </div>
                        </div>

                        <div className="flex items-start">
                          <div className="bg-green-100 p-2 rounded-lg mr-3">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium">Key Terms:</p>
                            <p className="text-gray-600">
                              • Total Price: <span className="font-semibold">${parsedResult.totalPrice?.toLocaleString() || '0'}</span><br />
                              • Quantity: <span className="font-semibold">{parsedResult.quantity || 'Not specified'}</span> units<br />
                              • Delivery: <span className="font-semibold">{parsedResult.deliveryTimeline || 'Not specified'}</span><br />
                              • Payment: <span className="font-semibold">{parsedResult.paymentTerms || 'Not specified'}</span><br />
                              • Warranty: <span className="font-semibold">{parsedResult.warranty || 'Not specified'}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start">
                          <div className="bg-purple-100 p-2 rounded-lg mr-3">
                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium">Items Included:</p>
                            <p className="text-gray-600">
                              {Array.isArray(parsedResult.items) ?
                                parsedResult.items.slice(0, 2).join(', ') + (parsedResult.items.length > 2 ? ` and ${parsedResult.items.length - 2} more items` : '') :
                                parsedResult.items || 'No items specified'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {activeTab === 'compare' && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">AI Proposal Comparison</h2>
              <button
                onClick={handleCompareProposals}
                className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 mb-6"
              >
                Run AI Comparison
              </button>

              {comparisonResult ? (
                <div className="border rounded p-4 bg-gray-50">
                  <h3 className="font-bold mb-2">AI Analysis Results</h3>
                  <pre className="whitespace-pre-wrap text-sm">
                    {JSON.stringify(comparisonResult, null, 2)}
                  </pre>
                </div>
              ) : (
                <p className="text-gray-600">Click above to compare proposals with AI</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600 border-t pt-4">
          <p>Backend: localhost:5000 | Frontend: localhost:3000 | MailHog: localhost:8025</p>
          <p className="mt-2">
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">✅ System Ready</span>
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs ml-2">🤖 AI Powered</span>
            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs ml-2">📧 Email Integrated</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;