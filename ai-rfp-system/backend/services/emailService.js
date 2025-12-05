import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

class EmailService {
  constructor() {
    // Create transporter for REAL MailHog SMTP
    this.transporter = nodemailer.createTransport({
      host: 'localhost',
      port: 1025,
      secure: false,
      auth: null, // MailHog doesn't require auth
      tls: {
        rejectUnauthorized: false
      }
    });
    
    console.log("=".repeat(60));
    console.log("📧 EMAIL SERVICE: Using REAL MailHog");
    console.log("   SMTP: localhost:1025");
    console.log("   Web UI: http://localhost:8025");
    console.log("=".repeat(60));
  }

  // Generate RFP email content
  generateRFPEmail(rfp, vendor) {
    const itemsList = rfp.items.map(item => 
      `${item.quantity}x ${item.itemName} - ${item.specs}`
    ).join('\n');

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    return {
      subject: `RFP: ${rfp.title} - Reference #RFP-${rfp._id.toString().slice(-6).toUpperCase()}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .section { margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background: #f2f2f2; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Request for Proposal</h1>
              <h2>${rfp.title}</h2>
            </div>
            
            <div class="content">
              <div class="section">
                <h3>Dear ${vendor.name},</h3>
                <p>We invite you to submit a proposal for:</p>
              </div>
              
              <div class="section">
                <h4>Requirements</h4>
                <table>
                  <tr><th>Item</th><th>Quantity</th><th>Specifications</th></tr>
                  ${rfp.items.map(item => `
                    <tr>
                      <td>${item.itemName}</td>
                      <td>${item.quantity}</td>
                      <td>${item.specs}</td>
                    </tr>
                  `).join('')}
                </table>
              </div>
              
              <div class="section">
                <h4>Key Details</h4>
                <ul>
                  <li><strong>Budget:</strong> ${rfp.budget}</li>
                  <li><strong>Delivery:</strong> ${rfp.deliveryTimeline}</li>
                  <li><strong>Payment:</strong> ${rfp.paymentTerms}</li>
                  <li><strong>Warranty:</strong> ${rfp.warranty}</li>
                </ul>
              </div>
              
              <div class="section">
                <h4>Submission</h4>
                <p>Please <strong>reply to this email</strong> with your proposal including:</p>
                <ol>
                  <li>Detailed pricing</li>
                  <li>Delivery timeline</li>
                  <li>Terms and warranty</li>
                </ol>
                <p><strong>Deadline:</strong> ${dueDate.toLocaleDateString()}</p>
              </div>
              
              <div class="section">
                <p>Best regards,<br>
                Procurement Team<br>
                AI RFP System</p>
              </div>
              
              <div class="footer">
                <p>RFP ID: ${rfp._id} | Reference: RFP-${rfp._id.toString().slice(-6).toUpperCase()}</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        REQUEST FOR PROPOSAL: ${rfp.title}
        
        Dear ${vendor.name},
        
        Requirements:
        ${itemsList}
        
        Key Details:
        - Budget: ${rfp.budget}
        - Delivery: ${rfp.deliveryTimeline}
        - Payment: ${rfp.paymentTerms}
        - Warranty: ${rfp.warranty}
        
        Please reply to this email with your proposal.
        Deadline: ${dueDate.toLocaleDateString()}
        
        Regards,
        Procurement Team
        
        RFP ID: ${rfp._id}
        Reference: RFP-${rfp._id.toString().slice(-6).toUpperCase()}
      `
    };
  }

  // Send RFP to a single vendor
  async sendRFP(rfp, vendor) {
    try {
      const emailContent = this.generateRFPEmail(rfp, vendor);
      
      const mailOptions = {
        from: '"Procurement Team" <procurement@rfp-system.com>',
        to: vendor.email,
        replyTo: 'rfp-responses@rfp-system.com',
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
        headers: {
          'X-RFP-ID': rfp._id.toString(),
          'X-Vendor-ID': vendor._id.toString(),
          'References': `<RFP-${rfp._id.toString().slice(-6).toUpperCase()}@rfp-system>`
        }
      };

      console.log(`📤 Sending to: ${vendor.name} <${vendor.email}>`);
      const info = await this.transporter.sendMail(mailOptions);
      
      console.log(`✅ Sent: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId,
        vendorId: vendor._id,
        vendorEmail: vendor.email,
        vendorName: vendor.name
      };
    } catch (error) {
      console.error(`❌ Failed to send to ${vendor.email}:`, error.message);
      return {
        success: false,
        error: error.message,
        vendorId: vendor._id,
        vendorEmail: vendor.email
      };
    }
  }

  // Send RFP to multiple vendors
  async sendRFPToVendors(rfp, vendors) {
    console.log("\n" + "=".repeat(60));
    console.log("🚀 SENDING RFP VIA MAILHOG");
    console.log("=".repeat(60));
    console.log(`RFP: "${rfp.title}"`);
    console.log(`Vendors: ${vendors.length}`);
    console.log(`View emails: http://localhost:8025`);
    console.log("=".repeat(60) + "\n");
    
    const results = [];
    
    for (const vendor of vendors) {
      const result = await this.sendRFP(rfp, vendor);
      results.push(result);
      
      // Small delay between emails
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const successful = results.filter(r => r.success).length;
    
    console.log("\n" + "=".repeat(60));
    console.log("📊 EMAIL SENDING COMPLETE");
    console.log("=".repeat(60));
    console.log(`Successful: ${successful}/${vendors.length}`);
    console.log(`View in MailHog: http://localhost:8025`);
    console.log("=".repeat(60) + "\n");
    
    return {
      total: vendors.length,
      successful,
      failed: vendors.length - successful,
      details: results
    };
  }
}

// Create singleton instance
const emailService = new EmailService();
export default emailService;