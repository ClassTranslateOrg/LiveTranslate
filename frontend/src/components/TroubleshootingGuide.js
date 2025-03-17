import React from 'react';

const TroubleshootingGuide = ({ onClose }) => {
  const checkServerConnection = async () => {
    try {
      // Try different URLs to see which ones are working
      const urls = [
        process.env.REACT_APP_API_URL || 'http://localhost:3001',
        'https://api.live-translate.org',
        'http://api.live-translate.org'
      ];
      
      const results = await Promise.all(urls.map(async (url) => {
        try {
          const response = await fetch(`${url}/api/health`, { 
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache'
          });
          return { url, status: response.status, ok: response.ok };
        } catch (error) {
          return { url, error: error.message, ok: false };
        }
      }));
      
      alert(`Server connection test results:\n\n${
        results.map(r => `${r.url}: ${r.ok ? '✅ Connected' : `❌ Failed (${r.error || r.status})`}`).join('\n')
      }`);
    } catch (error) {
      alert(`Error checking server connections: ${error.message}`);
    }
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}></div>
      <div className="troubleshooting-modal">
        <button className="close-button" onClick={onClose}>×</button>
        <h2>Connection Troubleshooting</h2>
        
        <p>If you're experiencing connection issues, try these steps:</p>
        
        <ol className="troubleshooting-list">
          <li>
            <strong>Check your internet connection</strong>
            <p>Make sure you have a stable internet connection. Try opening other websites to confirm.</p>
          </li>
          
          <li>
            <strong>DNS resolution issues</strong>
            <p>If you see "ERR_NAME_NOT_RESOLVED" errors, your DNS might not be resolving api.live-translate.org correctly.</p>
            <p>Try adding this entry to your hosts file: <code>3.22.183.29 api.live-translate.org</code></p>
          </li>
          
          <li>
            <strong>Allow camera and microphone</strong>
            <p>Make sure your browser has permission to access your camera and microphone.</p>
          </li>
          
          <li>
            <strong>Try a different browser</strong>
            <p>Chrome and Edge have the best WebRTC support. Firefox is also good.</p>
          </li>
          
          <li>
            <strong>Firewall or network restrictions</strong>
            <p>Some networks block WebRTC traffic. Try a different network if possible.</p>
          </li>
        </ol>
        
        <div>
          <button className="troubleshooting-button" onClick={checkServerConnection}>
            Test Server Connection
          </button>
        </div>
      </div>
    </>
  );
};

export default TroubleshootingGuide;
