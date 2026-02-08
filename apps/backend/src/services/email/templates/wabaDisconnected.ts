import type { EmailTemplate } from '../types.js';

interface WABADisconnectedParams {
  wabaId: string;
  businessName: string;
  reason: string;
}

export const wabaDisconnectedTemplate: EmailTemplate = (params: WABADisconnectedParams) => {
  const { wabaId, businessName, reason } = params;
  
  return {
    subject: `[URGENT] WhatsApp Account Disconnected - ${businessName}`,
    body: `
      <h2>WhatsApp Business Account Disconnected</h2>
      <p>Your WhatsApp Business Account has been disconnected from the platform.</p>
      
      <h3>Details:</h3>
      <ul>
        <li><strong>Business:</strong> ${businessName}</li>
        <li><strong>WABA ID:</strong> ${wabaId}</li>
        <li><strong>Reason:</strong> ${reason}</li>
        <li><strong>Time:</strong> ${new Date().toISOString()}</li>
      </ul>
      
      <h3>Impact:</h3>
      <p>Your messaging services have been interrupted. You cannot:</p>
      <ul>
        <li>Send or receive WhatsApp messages</li>
        <li>Access message templates</li>
        <li>View customer conversations</li>
      </ul>
      
      <h3>Action Required:</h3>
      <p>To restore your messaging services, please reconnect your WhatsApp Business Account:</p>
      <ol>
        <li>Log in to your dashboard at https://kirim.chat/dashboard</li>
        <li>Navigate to WhatsApp Settings</li>
        <li>Click "Reconnect WhatsApp"</li>
        <li>Complete the authorization flow</li>
      </ol>
      
      <p>If you did not request this disconnection or need assistance, please contact support immediately.</p>
      
      <p>Best regards,<br>Kirim.Chat Team</p>
    `
  };
};
