import React, { useState } from 'react';
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

  // Load vendors
  React.useEffect(() => {
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
  React.useEffect(() => {
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

 const handleParseDemoProposal = async () => {
  if (!demoProposalText.trim()) return;
  
  // Use existing RFP and vendor
  const rfpId = rfps[0]?._id || '69306ad0666b5f64831825d9';
  const vendorId = selectedVendor || vendors[0]?._id || '693061f04cf82c175018ee46';
  
  try {
    const result = await proposalApi.parseDemo(vendorId, rfpId, demoProposalText);
    
    // The response has: result.data.data.proposal
    const responseData = result.data;
    const proposal = responseData.data?.proposal;
    
    // if (proposal) {
    //   alert(`✅ ${responseData.message}\n\n📊 Details:\n• Price: $${proposal.totalPrice}\n• AI Score: ${proposal.aiScore}\n• Status: ${proposal.status}`);
    // } else {
    //   alert(`✅ ${responseData.message || 'Proposal parsed successfully!'}`);
    // }
    
    setDemoProposalText('');
  } catch (error) {
    console.error('Parse error:', error.response?.data || error.message);
    alert(`❌ Error: ${error.response?.data?.error || error.message || 'Unknown error'}`);
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
                  <h3 className="font-bold mb-2">��� System Status</h3>
                  <p className="text-sm">Backend: <span className="text-green-600">✅ Running</span></p>
                  <p className="text-sm">Database: <span className="text-green-600">✅ Connected</span></p>
                  <p className="text-sm">AI API: <span className="text-green-600">✅ Ready</span></p>
                </div>
                <div className="bg-white p-4 rounded shadow">
                  <h3 className="font-bold mb-2">��� Quick Links</h3>
                  <p className="text-sm">
                    <a href="http://localhost:8025" className="text-blue-500 hover:underline block">View MailHog</a>
                    <a href="http://localhost:5000/api/rfp" className="text-blue-500 hover:underline block">Backend API</a>
                  </p>
                </div>
                <div className="bg-white p-4 rounded shadow">
                  <h3 className="font-bold mb-2">��� Examples</h3>
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
              <h2 className="text-xl font-bold mb-4">Parse Vendor Proposal</h2>
              
              {/* File Upload */}
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">Upload Proposal File</label>
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setDemoProposalText(file.name);
                    }
                  }}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded file:border-0
                    file:text-sm file:font-semibold
                    file:bg-indigo-600 file:text-white
                    hover:file:bg-indigo-700"
                />
                <p className="text-xs text-gray-500 mt-2">Supported formats: PDF, DOCX</p>
              </div>

              <button
                onClick={handleParseDemoProposal}
                className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 disabled:bg-gray-400"
                disabled={!demoProposalText.trim()}
              >
                Parse with AI
              </button>
            </div>
          )}

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
