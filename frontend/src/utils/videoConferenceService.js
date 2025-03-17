/**
 * Generic video conferencing service
 * Currently using WebRTC peer-to-peer for video conferencing
 */

import webRTCService from './webrtcService';

const videoConferenceService = {
  /**
   * Initialize the video conference
   * @param {Object} options - Configuration options
   * @returns {Promise} - Promise that resolves when initialization is complete
   */
  initializeConference: async (options = {}) => {
    try {
      // Try multiple server URLs if the primary one fails
      const servers = [
        options.serverUrl || null,
        process.env.REACT_APP_API_URL,
        'https://api.live-translate.org',
        'http://localhost:3001'
      ].filter(Boolean);
      
      let connected = false;
      let error = null;
      
      // Try each server until one connects
      for (const server of servers) {
        if (connected) break;
        
        try {
          await webRTCService.connect(server);
          connected = true;
        } catch (err) {
          console.warn(`Failed to connect to ${server}:`, err);
          error = err;
          // Continue to next server
        }
      }

      if (!connected) {
        console.warn('Failed to connect to any signaling server, continuing in local-only mode');
        // Throw the last error to be handled by the caller
        throw error || new Error('Failed to connect to any signaling server');
      }
      
      // Get local stream
      const localStream = await webRTCService.startLocalStream();
      
      return {
        success: true,
        localStream
      };
    } catch (error) {
      console.error('Failed to initialize conference:', error);
      return {
        success: false,
        error: error.message,
        localStream: await webRTCService.startLocalStream().catch(e => {
          console.error('Failed to get local stream in fallback mode:', e);
          return null;
        })
      };
    }
  },

  /**
   * Join a meeting room
   * @param {string} roomId - The ID of the room to join
   * @param {Object} userData - User data to share with participants
   * @returns {boolean} - Success indicator
   */
  joinMeeting: (roomId, userData = {}) => {
    return webRTCService.joinRoom(roomId);
  },

  /**
   * Leave the current meeting
   */
  leaveMeeting: () => {
    webRTCService.disconnect();
  },
  
  /**
   * Share screen with meeting participants
   * @returns {Promise<MediaStream>} The screen sharing stream
   */
  shareScreen: async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      
      // If connected to signaling server, notify peers
      if (webRTCService.isConnected()) {
        webRTCService.sendScreenSharingStatus(true);
      }
      
      return stream;
    } catch (error) {
      console.error('Screen sharing error:', error);
      throw error;
    }
  },
  
  /**
   * Stop sharing screen
   * @param {MediaStream} stream - The screen sharing stream to stop
   */
  stopScreenSharing: (stream) => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      
      // If connected to signaling server, notify peers
      if (webRTCService.isConnected()) {
        webRTCService.sendScreenSharingStatus(false);
      }
    }
  }
};

export default videoConferenceService;
