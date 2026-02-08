import type { EmailTemplate } from '../types.js';

interface QualityRatingDropParams {
  phoneNumber: string;
  oldRating: string;
  newRating: string;
  businessName: string;
}

export const qualityRatingDropTemplate: EmailTemplate = (params: QualityRatingDropParams) => {
  const { phoneNumber, oldRating, newRating, businessName } = params;
  
  return {
    subject: `[WARNING] WhatsApp Quality Rating Dropped - ${businessName}`,
    body: `
      <h2>WhatsApp Phone Number Quality Rating Dropped</h2>
      <p>The quality rating for your WhatsApp Business phone number has decreased.</p>
      
      <h3>Details:</h3>
      <ul>
        <li><strong>Business:</strong> ${businessName}</li>
        <li><strong>Phone Number:</strong> ${phoneNumber}</li>
        <li><strong>Previous Rating:</strong> ${oldRating}</li>
        <li><strong>New Rating:</strong> ${newRating}</li>
        <li><strong>Time:</strong> ${new Date().toISOString()}</li>
      </ul>
      
      <h3>What This Means:</h3>
      <p>Quality ratings are based on how customers interact with your messages. A lower rating may result in:</p>
      <ul>
        <li>Reduced messaging limits</li>
        <li>Increased message delivery delays</li>
        <li>Potential account restrictions</li>
      </ul>
      
      <h3>How to Improve:</h3>
      <ul>
        <li>Only send messages to customers who have opted in</li>
        <li>Send relevant, timely messages</li>
        <li>Respond quickly to customer inquiries</li>
        <li>Avoid sending spam or promotional content</li>
        <li>Monitor block and report rates</li>
      </ul>
      
      <p>For more information, visit the <a href="https://developers.facebook.com/docs/whatsapp/messaging-limits">WhatsApp Business Quality Rating documentation</a>.</p>
      
      <p>Best regards,<br>Kirim.Chat Team</p>
    `
  };
};
