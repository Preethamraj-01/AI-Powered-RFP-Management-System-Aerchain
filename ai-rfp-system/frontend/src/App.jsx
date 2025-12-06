import React, { useState, useEffect } from 'react';
import RFPChat from './components/RFPChat';
import { rfpApi, vendorApi, proposalApi, comparisonApi } from './services/api';
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
  
  // New states for AI Comparison tab
  const [selectedRFPId, setSelectedRFPId] = useState("");
  const [proposalFiles, setProposalFiles] = useState([]);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonProgress, setComparisonProgress] = useState(0);
  const [comparisonData, setComparisonData] = useState(null);

  // Enhanced data normalizer for API response
  const normalizeParsedData = (apiData) => {
    console.log('🔍 Normalizing API data:', apiData);
    
    // If data is already in the right format, return it
    if (apiData && apiData.title && apiData.totalPrice) {
      return apiData;
    }
    
    // Extract data from various possible API response structures
    let extracted = apiData;
    
    // If data is nested in response.data or response.data.extracted
    if (apiData?.data?.extracted) {
      extracted = apiData.data.extracted;
    } else if (apiData?.data) {
      extracted = apiData.data;
    } else if (apiData?.extracted) {
      extracted = apiData.extracted;
    }
    
    // Default normalized structure
    const normalized = {
      title: extracted?.title || extracted?.proposalTitle || 'Untitled Proposal',
      vendorName: extracted?.vendorName || extracted?.vendor || 'Unknown Vendor',
      totalPrice: extracted?.totalPrice || extracted?.price || extracted?.cost || 'Not specified',
      budget: extracted?.budget || extracted?.budgetAmount || 'Not specified',
      quantity: extracted?.quantity || extracted?.units || extracted?.qty || 'Not specified',
      items: Array.isArray(extracted?.items) ? extracted.items : 
             (extracted?.items ? [extracted.items] : 
             (extracted?.description ? [extracted.description] : [])),
      specifications: extracted?.specifications || extracted?.specs || extracted?.techSpecs || 'Not specified',
      paymentTerms: extracted?.paymentTerms || extracted?.terms || 'Not specified',
      warranty: extracted?.warranty || extracted?.warrantyPeriod || 'Not specified',
      deliveryTimeline: extracted?.deliveryTimeline || extracted?.delivery || extracted?.timeline || 'Not specified',
      rfpReference: extracted?.rfpReference || extracted?.rfpId || 'Not specified',
      notes: extracted?.notes || extracted?.additionalDetails || extracted?.comments || 'Not specified',
      summary: extracted?.summary || extracted?.aiSummary || extracted?.executiveSummary || '',
      score: extracted?.score || extracted?.confidence || extracted?.aiScore || extracted?.analysisScore || 0,
      success: extracted?.success !== false
    };
    
    // Try to extract AI Consolidated Summary from raw text or notes
    if (!normalized.summary && extracted?.rawText) {
      const rawText = extracted.rawText.toLowerCase();
      
      // Look for summary indicators in text
      if (rawText.includes('summary') || rawText.includes('executive') || rawText.includes('overview')) {
        const lines = extracted.rawText.split('\n');
        const summaryLines = lines.filter(line => 
          line.toLowerCase().includes('summary') || 
          line.toLowerCase().includes('overview') ||
          line.toLowerCase().includes('executive')
        );
        
        if (summaryLines.length > 0) {
          normalized.summary = summaryLines.join(' | ');
        }
      }
    }
    
    // Extract specifications more aggressively if not found
    if (normalized.specifications === 'Not specified' && extracted?.rawText) {
      const rawText = extracted.rawText.toLowerCase();
      
      // Look for specifications indicators
      if (rawText.includes('specification') || rawText.includes('technical') || 
          rawText.includes('configuration') || rawText.includes('features')) {
        const lines = extracted.rawText.split('\n');
        const specLines = lines.filter(line => 
          line.toLowerCase().includes('spec') || 
          line.toLowerCase().includes('gen') ||
          line.toLowerCase().includes('ram') ||
          line.toLowerCase().includes('gb') ||
          line.toLowerCase().includes('ssd') ||
          line.toLowerCase().includes('display') ||
          line.toLowerCase().includes('processor')
        );
        
        if (specLines.length > 0) {
          normalized.specifications = specLines.join(', ');
        }
      }
    }
    
    console.log('✅ Normalized data:', normalized);
    return normalized;
  };

  // Price formatting helper
  const formatPriceDisplay = (price) => {
    if (!price || price === 'Not specified') return 'Not specified';
    
    // If price is an object with currency info
    if (typeof price === 'object' && price !== null) {
      return price.formatted || price.raw || price.value || 'Not specified';
    }
    
    // If price is a string with currency symbol
    if (typeof price === 'string') {
      // Check if it's already formatted
      if (price.includes('$') || price.includes('€') || price.includes('£') || price.includes('₹') || price.includes('Rs')) {
        return price;
      }
      // Try to parse as number
      const num = parseFloat(price.replace(/[^0-9.-]+/g, ""));
      if (!isNaN(num)) {
        return `$${num.toLocaleString()}`;
      }
      return price;
    }
    
    // If price is a number, assume USD
    if (!isNaN(price)) {
      return `$${parseFloat(price).toLocaleString()}`;
    }
    
    return price;
  };

  // Get currency code from price object
  const getCurrencyCode = (price) => {
    if (!price || typeof price !== 'object') return '';
    return price.currency || price.currencyCode || '';
  };

  // Get currency name from price object
  const getCurrencyName = (price) => {
    if (!price || typeof price !== 'object') return '';
    return price.currencyName || price.currency || '';
  };

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
      const response = await proposalApi.parseDemoWithFile(formData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      console.log('✅ API Response:', response);
      
      // Normalize the response data
      const normalizedData = normalizeParsedData(response.data || response);
      
      // Ensure we have a valid object
      if (normalizedData) {
        setParsedResult(normalizedData);
        console.log('✅ Normalized data set to state:', normalizedData);
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

  // Handler for proposal file selection (AI Comparison)
  const handleProposalFilesChange = (e) => {
    const files = Array.from(e.target.files);
    const txtFiles = files.filter(file => 
      file.type === 'text/plain' || file.name.endsWith('.txt')
    );
    
    if (txtFiles.length !== files.length) {
      alert('Only .txt files are allowed. Non-text files were ignored.');
    }
    
    setProposalFiles(prev => [...prev, ...txtFiles]);
  };

  // Remove a proposal file
  const removeProposalFile = (index) => {
    setProposalFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Handle AI Comparison
  const handleAIComparison = async () => {
    if (!selectedRFPId) {
      alert('Please select an RFP first');
      return;
    }
    
    if (proposalFiles.length === 0) {
      alert('Please upload at least one proposal file');
      return;
    }
    
    setComparisonLoading(true);
    setComparisonProgress(0);
    setComparisonData(null);
    
    try {
      const formData = new FormData();
      formData.append('rfpId', selectedRFPId);
      
      proposalFiles.forEach(file => {
        formData.append('proposalFiles', file);
      });
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setComparisonProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);
      
      // Use the comparison API
      const response = await comparisonApi.compare(selectedRFPId, proposalFiles);
      
      clearInterval(progressInterval);
      setComparisonProgress(100);
      
      if (!response.success) {
        throw new Error(response.error || 'Comparison failed');
      }
      
      setComparisonData(response);
      console.log('✅ AI Comparison Result:', response);
      
      // Auto-scroll to results
      setTimeout(() => {
        const resultsElement = document.getElementById('comparison-results');
        if (resultsElement) {
          resultsElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }, 200);
      
    } catch (error) {
      console.error('❌ Comparison Error Details:', {
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      });
      
      alert(`Comparison failed: ${error.response?.data?.error || error.message}`);
      
      if (error.response) {
        console.log('Full error response:', error.response);
      }
    } finally {
      setComparisonLoading(false);
      setTimeout(() => setComparisonProgress(0), 500);
    }
  };

  // Handler for the old compare button
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
            <>
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">📄 Parse Vendor Proposal</h2>
                <p className="text-gray-600 mb-6">Note: Upload a proposal document (.txt) and AI will extract key details</p>
                
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

              {/* Results Section - Only visible in Parse Proposal tab */}
              <div id="parsed-results" className="mt-8">
                {parsedResult && (
                  <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                    {/* Header */}
                    <div className={`
                      px-6 py-4 text-white font-bold
                      ${parsedResult.success === false ? 'bg-red-500' : 'bg-gradient-to-r from-green-500 to-emerald-600'}
                    `}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {parsedResult.success === false ? '❌ Parsing Failed' : '✅ Proposal Analysis Complete'}
                          {parsedResult.score && (
                            <span className="ml-4 px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm">
                              AI Confidence: {parsedResult.score}%
                            </span>
                          )}
                        </div>
                        <button 
                          onClick={() => setParsedResult(null)}
                          className="text-white hover:text-gray-200 text-lg"
                          title="Clear results"
                        >
                          ✕
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
                      /* Success State - Consolidated View */
                      <div className="p-6">
                        {/* Executive Summary Card */}
                        <div className="mb-8 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                          <div className="flex items-center mb-3">
                            <div className="p-2 bg-blue-100 rounded-lg mr-3">
                              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                              </svg>
                            </div>
                            <h3 className="font-bold text-lg text-blue-800">📋 Executive Summary</h3>
                          </div>
                          <div className="text-gray-700 leading-relaxed">
                            {parsedResult.summary || `Proposal titled "${parsedResult.title}" from ${parsedResult.vendorName || 'an unknown vendor'} with a total value of ${formatPriceDisplay(parsedResult.totalPrice)}.`}
                          </div>
                          
                          {/* Quick Stats */}
                          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="text-center p-2 bg-white rounded border">
                              <div className="text-sm text-gray-500">Total Value</div>
                              <div className="text-xl font-bold text-green-600">
                                {formatPriceDisplay(parsedResult.totalPrice)}
                              </div>
                              {getCurrencyCode(parsedResult.totalPrice) && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {getCurrencyCode(parsedResult.totalPrice)}
                                </div>
                              )}
                            </div>
                            <div className="text-center p-2 bg-white rounded border">
                              <div className="text-sm text-gray-500">Delivery Time</div>
                              <div className="text-lg font-semibold text-blue-600">
                                {parsedResult.deliveryTimeline || 'N/A'}
                              </div>
                            </div>
                            <div className="text-center p-2 bg-white rounded border">
                              <div className="text-sm text-gray-500">Warranty</div>
                              <div className="text-lg font-semibold text-purple-600">
                                {parsedResult.warranty || 'N/A'}
                              </div>
                            </div>
                            <div className="text-center p-2 bg-white rounded border">
                              <div className="text-sm text-gray-500">Payment Terms</div>
                              <div className="text-lg font-semibold text-orange-600">
                                {parsedResult.paymentTerms || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* AI Consolidated Summary Section - UPDATED */}
                        <div className="mb-8 p-5 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
                          <h4 className="font-bold text-gray-800 mb-4 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                            </svg>
                            AI Consolidated Summary - Key Details
                          </h4>
                          
                          <div className="space-y-3">
                            {/* Vendor Name */}
                            <div className="flex items-start">
                              <div className="min-w-32 flex items-center">
                                <span className="text-indigo-500 mr-2">•</span>
                                <span className="font-medium text-gray-700">Vendor Name:</span>
                              </div>
                              <div className="ml-4">
                                <span className="font-semibold">{parsedResult.vendorName || 'Not specified'}</span>
                              </div>
                            </div>
                            
                            {/* Total Price */}
                            <div className="flex items-start">
                              <div className="min-w-32 flex items-center">
                                <span className="text-indigo-500 mr-2">•</span>
                                <span className="font-medium text-gray-700">Total Price:</span>
                              </div>
                              <div className="ml-4">
                                <span className="font-semibold text-green-600">
                                  {formatPriceDisplay(parsedResult.totalPrice)}
                                </span>
                                {getCurrencyCode(parsedResult.totalPrice) && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Currency: {getCurrencyCode(parsedResult.totalPrice)}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Budget Allocated */}
                            <div className="flex items-start">
                              <div className="min-w-32 flex items-center">
                                <span className="text-indigo-500 mr-2">•</span>
                                <span className="font-medium text-gray-700">Budget Allocated:</span>
                              </div>
                              <div className="ml-4">
                                <span className="font-semibold">
                                  {formatPriceDisplay(parsedResult.budget)}
                                </span>
                                {getCurrencyCode(parsedResult.budget) && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Currency: {getCurrencyCode(parsedResult.budget)}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Items */}
                            <div className="flex items-start">
                              <div className="min-w-32 flex items-center">
                                <span className="text-indigo-500 mr-2">•</span>
                                <span className="font-medium text-gray-700">Items:</span>
                              </div>
                              <div className="ml-4">
                                {Array.isArray(parsedResult.items) && parsedResult.items.length > 0 ? (
                                  <ul className="list-disc pl-5 space-y-1">
                                    {parsedResult.items.map((item, index) => (
                                      <li key={index} className="text-gray-700">{item}</li>
                                    ))}
                                  </ul>
                                ) : parsedResult.items && parsedResult.items !== 'Not specified' ? (
                                  <span className="text-gray-700">{parsedResult.items}</span>
                                ) : (
                                  <span className="text-gray-500 italic">Not specified</span>
                                )}
                              </div>
                            </div>
                            
                            {/* Quantity */}
                            <div className="flex items-start">
                              <div className="min-w-32 flex items-center">
                                <span className="text-indigo-500 mr-2">•</span>
                                <span className="font-medium text-gray-700">Quantity:</span>
                              </div>
                              <div className="ml-4">
                                <span className="font-semibold">{parsedResult.quantity || 'Not specified'}</span>
                              </div>
                            </div>
                            
                            {/* Warranty */}
                            <div className="flex items-start">
                              <div className="min-w-32 flex items-center">
                                <span className="text-indigo-500 mr-2">•</span>
                                <span className="font-medium text-gray-700">Warranty:</span>
                              </div>
                              <div className="ml-4">
                                <span className="text-gray-700">{parsedResult.warranty || 'Not specified'}</span>
                              </div>
                            </div>
                            
                            {/* Delivery Date/Timeline */}
                            <div className="flex items-start">
                              <div className="min-w-32 flex items-center">
                                <span className="text-indigo-500 mr-2">•</span>
                                <span className="font-medium text-gray-700">Delivery Timeline:</span>
                              </div>
                              <div className="ml-4">
                                <span className="text-gray-700">{parsedResult.deliveryTimeline || 'Not specified'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Proposal Details in Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                          {/* Left Column - Basic Info */}
                          <div className="space-y-6">
                            {/* Vendor Information */}
                            <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
                              <h4 className="font-bold text-gray-800 mb-4 flex items-center">
                                <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                                </svg>
                                Vendor Details
                              </h4>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Vendor Name:</span>
                                  <span className="font-semibold">{parsedResult.vendorName || 'Not specified'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Proposal Title:</span>
                                  <span className="font-semibold">{parsedResult.title || 'Not specified'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">RFP Reference:</span>
                                  <span className="font-semibold">{parsedResult.rfpReference || 'Not specified'}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Financial Summary */}
                            <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
                              <h4 className="font-bold text-gray-800 mb-4 flex items-center">
                                <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                Financial Summary
                              </h4>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                                  <span className="text-gray-700">Total Price:</span>
                                  <div className="text-right">
                                    <span className="text-xl font-bold text-green-600">
                                      {formatPriceDisplay(parsedResult.totalPrice)}
                                    </span>
                                    {getCurrencyCode(parsedResult.totalPrice) && (
                                      <div className="text-xs text-gray-500">
                                        {getCurrencyCode(parsedResult.totalPrice)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600">Budget:</span>
                                  <div className="text-right">
                                    <span className="font-semibold">
                                      {formatPriceDisplay(parsedResult.budget)}
                                    </span>
                                    {getCurrencyCode(parsedResult.budget) && (
                                      <div className="text-xs text-gray-500">
                                        {getCurrencyCode(parsedResult.budget)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Quantity:</span>
                                  <span className="font-semibold">{parsedResult.quantity || 'Not specified'}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Middle Column - Items & Specifications */}
                          <div className="space-y-6">
                            {/* Items/Services */}
                            <div className="bg-white p-5 rounded-lg shadow border border-gray-200 h-full">
                              <h4 className="font-bold text-gray-800 mb-4 flex items-center">
                                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                                </svg>
                                Items & Services
                              </h4>
                              <div className="space-y-2">
                                {Array.isArray(parsedResult.items) && parsedResult.items.length > 0 ? (
                                  parsedResult.items.map((item, index) => (
                                    <div key={index} className="p-3 bg-blue-50 rounded border border-blue-100">
                                      <div className="flex items-start">
                                        <span className="text-blue-500 mr-2">•</span>
                                        <span className="text-gray-700">{item}</span>
                                      </div>
                                    </div>
                                  ))
                                ) : parsedResult.items && parsedResult.items !== 'Not specified' ? (
                                  <div className="p-3 bg-blue-50 rounded border border-blue-100">
                                    {parsedResult.items}
                                  </div>
                                ) : (
                                  <div className="p-3 bg-gray-50 rounded border text-gray-500 italic">
                                    No items specified
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Right Column */}
                          <div className="space-y-6">
                            {/* Payment Terms */}
                            <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
                              <h4 className="font-bold text-gray-800 mb-4 flex items-center">
                                <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                                </svg>
                                Payment Terms
                              </h4>
                              <div className="p-3 bg-gray-50 rounded border border-gray-200">
                                {parsedResult.paymentTerms || 'Not specified'}
                              </div>
                            </div>
                            
                            {/* Specifications Section - Separated from AI Summary */}
                            <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
                              <h4 className="font-bold text-gray-800 mb-4 flex items-center">
                                <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                </svg>
                                Specifications
                              </h4>
                              <div className="p-3 bg-gray-50 rounded border border-gray-200">
                                {parsedResult.specifications && parsedResult.specifications !== 'Not specified' ? (
                                  <div className="space-y-2">
                                    {parsedResult.specifications.split(',').map((spec, index) => (
                                      <div key={index} className="flex items-start">
                                        <span className="text-purple-500 mr-2">•</span>
                                        <span className="text-gray-700">{spec.trim()}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-gray-500 italic">No specifications provided</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Currency Analysis Section */}
                        {parsedResult.totalPrice?.currency && parsedResult.budget?.currency && 
                         parsedResult.totalPrice.currency !== parsedResult.budget.currency && (
                          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-center mb-2">
                              <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                              </svg>
                              <h5 className="font-bold text-yellow-800">⚠️ Currency Mismatch</h5>
                            </div>
                            <p className="text-sm text-yellow-700">
                              Proposal price is in <strong>{getCurrencyName(parsedResult.totalPrice) || parsedResult.totalPrice.currency}</strong> 
                              but budget is in <strong>{getCurrencyName(parsedResult.budget) || parsedResult.budget.currency}</strong>. 
                              Currency conversion may be required for accurate comparison.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'compare' && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">🤖 AI Proposal Comparison</h2>
              <p className="text-gray-600 mb-8">
                Select an RFP and upload multiple vendor proposals (.txt files) for AI-powered comparison
              </p>
              
              {/* RFP Selection */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📋 Select RFP to Compare Against
                </label>
                <select
                  value={selectedRFPId}
                  onChange={(e) => setSelectedRFPId(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">-- Select an RFP --</option>
                  {rfps.map(rfp => (
                    <option key={rfp._id} value={rfp._id}>
                      {rfp.title} | Budget: {rfp.budget} | Status: {rfp.status}
                    </option>
                  ))}
                </select>
                
                {/* Display Selected RFP Details */}
                {selectedRFPId && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-bold text-blue-800 mb-2">Selected RFP Details:</h4>
                    {(() => {
                      const selectedRFP = rfps.find(r => r._id === selectedRFPId);
                      return selectedRFP ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <span className="text-gray-600">Title:</span>
                            <span className="ml-2 font-semibold">{selectedRFP.title}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Budget:</span>
                            <span className="ml-2 font-semibold">{selectedRFP.budget}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Delivery:</span>
                            <span className="ml-2 font-semibold">{selectedRFP.deliveryTimeline}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Items:</span>
                            <span className="ml-2 font-semibold">{selectedRFP.items.length} items</span>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
              
              {/* File Upload Section */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📄 Upload Vendor Proposal Files (.txt only)
                </label>
                <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg">
                  <div className="flex flex-col items-center justify-center">
                    <svg className="w-12 h-12 text-indigo-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    
                    <label className="cursor-pointer bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors mb-2">
                      <span className="font-semibold">Select Files</span>
                      <input
                        type="file"
                        accept=".txt"
                        multiple
                        onChange={handleProposalFilesChange}
                        className="hidden"
                        id="proposal-files"
                      />
                    </label>
                    
                    <p className="text-sm text-gray-500">or drag and drop .txt files here</p>
                    <p className="mt-1 text-xs text-gray-400">Max 10 files, 10MB each</p>
                  </div>
                  
                  {/* Selected Files List */}
                  {proposalFiles.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium text-gray-700 mb-3">Selected Files ({proposalFiles.length}):</h4>
                      <div className="space-y-2">
                        {proposalFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                            <div className="flex items-center">
                              <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                              </svg>
                              <span className="font-medium">{file.name}</span>
                              <span className="ml-2 text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                            </div>
                            <button
                              onClick={() => removeProposalFile(index)}
                              className="text-red-500 hover:text-red-700 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Compare Button */}
              <div className="flex justify-center">
                <button
                  onClick={handleAIComparison}
                  disabled={!selectedRFPId || proposalFiles.length === 0 || comparisonLoading}
                  className={`
                    px-8 py-3 rounded-lg font-semibold text-lg
                    transition-all duration-300 transform hover:scale-105
                    ${!selectedRFPId || proposalFiles.length === 0 || comparisonLoading
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'}
                  `}
                >
                  {comparisonLoading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin h-5 w-5 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      AI is comparing proposals...
                    </div>
                  ) : '🤖 Compare with AI'}
                </button>
              </div>
              
              {/* Progress Bar */}
              {comparisonLoading && (
                <div className="mt-6">
                  <div className="flex justify-between text-sm mb-1">
                    <span>AI is analyzing and comparing...</span>
                    <span>{comparisonProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${comparisonProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {/* Comparison Results Section */}
              {comparisonData && (
                <div id="comparison-results" className="mt-8">
                  <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                    {/* Results Header */}
                    <div className="px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          ✅ AI Comparison Complete
                          <span className="ml-4 px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm">
                            {comparisonData.proposals?.length || 0} Proposals Analyzed
                          </span>
                        </div>
                        <button 
                          onClick={() => setComparisonData(null)}
                          className="text-white hover:text-gray-200 text-lg"
                          title="Clear results"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    
                    {/* Best Proposal Card */}
                    {comparisonData.bestProposal && (
                      <div className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-yellow-200">
                        <div className="flex items-center mb-4">
                          <div className="p-2 bg-yellow-100 rounded-lg mr-3">
                            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
                            </svg>
                          </div>
                          <h3 className="text-xl font-bold text-yellow-800">🏆 Best Vendor Proposal</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="p-3 bg-white rounded border">
                            <div className="text-sm text-gray-500">Recommended Vendor</div>
                            <div className="text-lg font-bold text-green-600">
                              {comparisonData.bestProposal.vendorName || 'Unknown'}
                            </div>
                            {comparisonData.bestProposal.price && (
                              <div className="text-sm text-gray-600 mt-1">
                                Price: {comparisonData.bestProposal.price}
                              </div>
                            )}
                          </div>
                          <div className="p-3 bg-white rounded border">
                            <div className="text-sm text-gray-500">Proposal File</div>
                            <div className="text-lg font-semibold text-blue-600">
                              {comparisonData.bestProposal.fileName || 'Unknown file'}
                            </div>
                          </div>
                          <div className="p-3 bg-white rounded border">
                            <div className="text-sm text-gray-500">AI Recommendation</div>
                            <div className="text-sm text-gray-700 mt-1">
                              {comparisonData.bestProposal.reason || 'AI recommendation'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Comparison Summary */}
                    <div className="p-6">
                      <h4 className="font-bold text-gray-800 mb-4">📊 AI Comparison Summary</h4>
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-6">
                        <p className="text-gray-700">{comparisonData.comparison?.summary || 'AI comparison completed successfully.'}</p>
                      </div>
                      
                      {/* Detailed Comparison Table */}
                      <h4 className="font-bold text-gray-800 mb-4">📋 Detailed Proposal Analysis</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border border-gray-300">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-3 text-left">Vendor</th>
                              <th className="px-4 py-3 text-left">Compatibility</th>
                              <th className="px-4 py-3 text-left">Price Analysis</th>
                              <th className="px-4 py-3 text-left">Spec Match</th>
                              <th className="px-4 py-3 text-left">Delivery</th>
                              <th className="px-4 py-3 text-left">Strengths</th>
                            </tr>
                          </thead>
                          <tbody>
                            {comparisonData.comparison?.comparisonResults?.map((result, index) => (
                              <tr key={index} className={`border-t ${result.proposalIndex === comparisonData.bestProposal?.index ? 'bg-green-50' : ''}`}>
                                <td className="px-4 py-3 font-semibold">
                                  {comparisonData.proposals?.[index]?.vendorName || `Vendor ${index + 1}`}
                                  {result.proposalIndex === comparisonData.bestProposal?.index && (
                                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">🏆 Best</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center">
                                    <div className="w-24 bg-gray-200 rounded-full h-2.5 mr-3">
                                      <div 
                                        className={`h-2.5 rounded-full ${result.compatibilityScore >= 70 ? 'bg-green-500' : result.compatibilityScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                        style={{ width: `${result.compatibilityScore || 0}%` }}
                                      ></div>
                                    </div>
                                    <span className={`font-bold ${result.compatibilityScore >= 70 ? 'text-green-600' : result.compatibilityScore >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                                      {result.compatibilityScore || 0}%
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="space-y-1">
                                    <span className={`px-2 py-1 rounded text-xs ${result.priceAnalysis?.includes('Over') ? 'bg-red-100 text-red-800' : result.priceAnalysis?.includes('Within') ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                      {result.priceAnalysis || 'Not analyzed'}
                                    </span>
                                    {comparisonData.proposals?.[index]?.price && (
                                      <div className="text-xs text-gray-600 font-medium">
                                        ({comparisonData.proposals[index].price})
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center">
                                    <div className="w-20 bg-gray-200 rounded-full h-2 mr-3">
                                      <div 
                                        className="h-2 rounded-full bg-blue-500"
                                        style={{ width: `${result.specMatchPercentage || 0}%` }}
                                      ></div>
                                    </div>
                                    <span>{result.specMatchPercentage || 0}%</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="space-y-1">
                                    <span className={`px-2 py-1 rounded text-xs ${result.deliveryMatch?.includes('Late') ? 'bg-red-100 text-red-800' : result.deliveryMatch?.includes('Exceeds') ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                      {result.deliveryMatch || 'Not specified'}
                                    </span>
                                    {result.deliveryMatch && result.deliveryMatch !== 'Not specified' && (
                                      <div className="text-xs text-gray-600">
                                        Timeline: {result.deliveryMatch}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="space-y-1">
                                    {result.strengths?.slice(0, 2).map((strength, idx) => (
                                      <div key={idx} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                                        {strength}
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* AI Comments Section */}
                      {comparisonData.comparison?.comparisonResults?.some(r => r.aiComments) && (
                        <div className="mt-6 p-5 bg-blue-50 rounded-xl border border-blue-200">
                          <h4 className="font-bold text-gray-800 mb-3">💡 AI Analysis Comments</h4>
                          <div className="space-y-3">
                            {comparisonData.comparison?.comparisonResults?.map((result, index) => (
                              result.aiComments && (
                                <div key={index} className="p-3 bg-white rounded border">
                                  <div className="font-medium text-gray-700 mb-1">
                                    {comparisonData.proposals?.[index]?.vendorName || `Proposal ${index + 1}`}:
                                  </div>
                                  <div className="text-sm text-gray-600">{result.aiComments}</div>
                                  {comparisonData.proposals?.[index]?.price && (
                                    <div className="text-sm text-gray-700 mt-2 font-medium">
                                      Price: {comparisonData.proposals[index].price}
                                    </div>
                                  )}
                                </div>
                              )
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600 border-t pt-4">
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