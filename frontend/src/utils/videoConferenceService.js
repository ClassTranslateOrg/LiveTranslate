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
      // Connect to signaling server
      await webRTCService.connect(options.serverUrl);
      
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
        localStream: null
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
  }
};

export default videoConferenceService;
