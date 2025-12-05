import React, { useState, useEffect } from 'react';
import { rfpApi } from '../services/api';

const RFPChat = () => {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [structuredRFP, setStructuredRFP] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [vendorsLoaded, setVendorsLoaded] = useState(false);

  // New states for sending loader + modal result
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState(null); // { success: boolean, title: string, message: string }
  const [showModal, setShowModal] = useState(false);

  // Fetch vendors on component mount
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const result = await rfpApi.getVendors();
        const vendorData = result.data.data || [];
        setVendors(vendorData);
        setVendorsLoaded(true);
      } catch (error) {
        console.error('Error fetching vendors:', error);
        setVendorsLoaded(true);
      }
    };
    fetchVendors();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsLoading(true);
    setResponse('Processing your request...');

    try {
      // Call backend AI API
      const result = await rfpApi.generate(message);
      const rfpData = result.data.data;
      
      setResponse(`✅ RFP Created: "${rfpData.title}"\n\n📊 Details:\n• Budget: ${rfpData.budget}\n• Delivery: ${rfpData.deliveryTimeline}\n• Warranty: ${rfpData.warranty}\n\n🛒 Items:\n${rfpData.items.map(item => `  - ${item.quantity}x ${item.itemName} (${item.specs})`).join('\n')}`);
      
      setStructuredRFP(rfpData);
      setSelectedVendors([]); // Reset vendor selection
      setMessage(''); // Clear input
      
    } catch (error) {
      setResponse(`❌ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVendorToggle = (vendorId) => {
    setSelectedVendors(prev =>
      prev.includes(vendorId)
        ? prev.filter(id => id !== vendorId)
        : [...prev, vendorId]
    );
  };

  const handleSelectAllVendors = () => {
    setSelectedVendors(vendors.map(v => v._id));
  };

  const handleClearAllVendors = () => {
    setSelectedVendors([]);
  };

  const handleSendToVendors = async () => {
    if (!structuredRFP || selectedVendors.length === 0) {
      setResponse('❌ Please select at least one vendor');
      return;
    }
    
    try {
      // show loader in response area
      setIsSending(true);
      setResponse(''); // clear existing message while sending

      const result = await rfpApi.sendToVendors(structuredRFP._id, selectedVendors);
      
      const responseData = result.data;
      const successfulCount = responseData.data?.emailResults?.successful ?? selectedVendors.length;
      const selectedVendorNames = vendors
        .filter(v => selectedVendors.includes(v._id))
        .map(v => v.name)
        .join(', ');

      const fullMessage =
        `✅ RFP sent to ${successfulCount} vendor(s) successfully\n\n` +
        `📌 Vendors: ${selectedVendorNames}\n`;

      setSendResult({
        success: true,
        title: `📧 RFP sent to ${successfulCount} vendors!`,
        message: fullMessage
      });
      setShowModal(true);
    } catch (error) {
      console.error('Send to vendors error:', error.response?.data || error.message);
      const errMsg = error.response?.data?.error || error.message || 'Unknown error';
      setSendResult({
        success: false,
        title: '❌ Failed to send RFP',
        message: `Error: ${errMsg}`
      });
      setShowModal(true);
    } finally {
      setIsSending(false);
    }
  };

  // modal OK handler: rollback to main page
  const handleModalOk = () => {
    setShowModal(false);
    setStructuredRFP(null);
    setSelectedVendors([]);
    setSendResult(null);
    setResponse('Ready for new RFP...');
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-indigo-600 text-white p-4">
        <h2 className="text-xl font-bold">AI RFP Assistant</h2>
        <p className="text-sm opacity-90">Describe what you need in plain English</p>
      </div>

      {/* Response Area */}
      <div className="p-4 bg-gray-50 min-h-64">
        <div className="whitespace-pre-line font-mono text-sm bg-white p-4 rounded border">
          {/* show loader when sending, otherwise show response or example */}
          {isSending ? (
            <div className="flex items-center space-x-2">
              <span className="inline-block animate-spin h-5 w-5 border-2 border-t-transparent rounded-full border-indigo-600" />
              <span>Sending RFPs to selected vendors...</span>
            </div>
          ) : (
            response || 'Example: "I need 10 laptops with 16GB RAM for $15,000. Delivery in 2 weeks. 3-year warranty."'
          )}
        </div>
        
        {structuredRFP && (
          <div className="mt-4 p-4 bg-blue-50 rounded border border-blue-200">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold">Structured RFP Ready</h3>
              <div className="space-x-2">
                <button
                  onClick={() => {
                    setStructuredRFP(null);
                    setSelectedVendors([]);
                    setResponse('Ready for new RFP...');
                  }}
                  className="bg-gray-500 text-white px-4 py-1 rounded text-sm hover:bg-gray-600"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p><span className="font-semibold">Title:</span> {structuredRFP.title}</p>
                <p><span className="font-semibold">Budget:</span> {structuredRFP.budget}</p>
              </div>
              <div>
                <p><span className="font-semibold">Delivery:</span> {structuredRFP.deliveryTimeline}</p>
                <p><span className="font-semibold">Warranty:</span> {structuredRFP.warranty}</p>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-600">
              RFP ID: {structuredRFP._id}
            </div>

            {/* Vendor Selection */}
            <div className="mt-4 p-3 bg-white rounded border">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-sm">Select Vendors to Send RFP:</h4>
                <div className="space-x-2">
                  <button
                    onClick={handleSelectAllVendors}
                    disabled={vendors.length === 0}
                    className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleClearAllVendors}
                    disabled={selectedVendors.length === 0}
                    className="text-xs bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              {vendorsLoaded && vendors.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                  {vendors.map((vendor) => (
                    <label key={vendor._id} className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedVendors.includes(vendor._id)}
                        onChange={() => handleVendorToggle(vendor._id)}
                        className="mr-2"
                        disabled={isSending}
                      />
                      <div className="flex-grow">
                        <p className="text-sm font-medium">{vendor.name}</p>
                        <p className="text-xs text-gray-500">{vendor.category} • ⭐ {vendor.rating}</p>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Loading vendors...</p>
              )}
              <button
                onClick={handleSendToVendors}
                disabled={selectedVendors.length === 0 || isSending}
                className="w-full bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <span className="flex items-center justify-center space-x-2">
                    <span className="inline-block animate-spin h-4 w-4 border-2 border-t-transparent rounded-full border-white" />
                    <span>Sending...</span>
                  </span>
                ) : (
                  <>Send RFP to {selectedVendors.length} Selected Vendor{selectedVendors.length !== 1 ? 's' : ''}</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your procurement request here..."
            className="flex-grow border rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !message.trim()}
            className="bg-indigo-600 text-white px-6 py-2 rounded-r-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processing...' : 'Send'}
          </button>
        </form>
        <div className="mt-2 text-xs text-gray-500">
          Try: "Need 50 office chairs with lumbar support. Budget $10,000. Delivery in 3 weeks."
        </div>
      </div>

      {/* Modal / Notification */}
      {showModal && sendResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold mb-2">{sendResult.title}</h3>
            <pre className="whitespace-pre-wrap text-sm text-gray-700 mb-4">{sendResult.message}</pre>
            <div className="flex justify-end">
              <button
                onClick={handleModalOk}
                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RFPChat;