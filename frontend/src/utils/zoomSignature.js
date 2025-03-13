import crypto from 'crypto';

/**
 * Generates a signature for Zoom SDK
 * Note: In a production environment, this should be done server-side
 * This is a simplified version for development only
 */
const generateSignature = (sdkKey, sdkSecret, meetingNumber, role) => {
  // This is a temporary client-side implementation
  // In production, move this to your server
  
  try {
    const timestamp = new Date().getTime() - 30000;
    const msg = Buffer.from(sdkKey + meetingNumber + timestamp + role).toString('base64');
    const hash = crypto.createHmac('sha256', sdkSecret).update(msg).digest('base64');
    const signature = Buffer.from(`${sdkKey}.${meetingNumber}.${timestamp}.${role}.${hash}`).toString('base64');
    
    return signature;
  } catch (error) {
    console.error('Error generating signature:', error);
    return '';
  }
};

export default generateSignature;
