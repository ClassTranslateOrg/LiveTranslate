import SimplePeer from 'simple-peer';
import io from 'socket.io-client';

class WebRTCService {
  constructor() {
    this.socket = null;
    this.localStream = null;
    this.peers = {};
    this.onRemoteStreamCallbacks = [];
    this.onUserJoinedCallbacks = [];
    this.onUserLeftCallbacks = [];
    this.onChatMessageCallbacks = [];
    this.onTranslationResultCallbacks = [];
    this.onLanguageChangedCallbacks = [];
    this.onScreenShareSignalCallbacks = [];
    this.onScreenSharingStatusCallbacks = [];
    this.connectionFailed = false;
    this.connectionAttempted = false;
    this.userData = {
      name: 'Anonymous',
      language: 'en'
    };
    
    // Check if running in GitHub Codespaces
    this.isGitHubCodespaces = window.location.hostname.includes('github.dev') || 
                             window.location.hostname.includes('app.github.dev');
  }

  setUserData(userData) {
    this.userData = { ...this.userData, ...userData };
    
    // Update language preference if connected
    if (this.socket && this.userData.language) {
      this.socket.emit('set-language', this.userData.language);
    }
  }
  
  connect(serverUrl = null) {
    // If we've already tried to connect and failed, don't try again
    if (this.connectionAttempted && this.connectionFailed) {
      return Promise.reject(new Error('Previous connection attempt failed, operating in local-only mode'));
    }
    
    this.connectionAttempted = true;
    
    // Determine server URL based on environment
    if (!serverUrl) {
      if (this.isGitHubCodespaces) {
        console.log('Running in GitHub Codespaces, switching to local-only mode');
        this.connectionFailed = true;
        return Promise.reject(new Error('GitHub Codespaces environment detected, operating in local-only mode'));
      } else if (process.env.REACT_APP_API_URL) {
        serverUrl = process.env.REACT_APP_API_URL;
      } else if (process.env.NODE_ENV === 'production') {
        // Try both https and http versions as fallbacks
        const domain = 'api.live-translate.org';
        if (this.isUrlReachable(`https://${domain}`)) {
          serverUrl = `https://${domain}`;
        } else {
          serverUrl = `http://${domain}`;
        }
      } else {
        serverUrl = 'http://localhost:3001';
      }
    }
    
    return new Promise((resolve, reject) => {
      try {
        console.log('Attempting to connect to signaling server at:', serverUrl);
                
        // Set a connection timeout
        const timeout = setTimeout(() => {
          console.warn('Socket connection timeout');
          this.connectionFailed = true;
          reject(new Error('Connection timeout - server may be down'));
        }, 5000);
        
        this.socket = io(serverUrl, {
          reconnectionAttempts: 3,
          timeout: 5000,
          withCredentials: true,
          transports: ['websocket', 'polling'] // Try WebSocket first, fall back to polling
        });

        this.socket.on('connect', () => {
          clearTimeout(timeout);
          console.log('Connected to signaling server');
          this.connectionFailed = false;
          resolve(this.socket.id);
        });

        this.socket.on('connect_error', (err) => {
          clearTimeout(timeout);
          console.error('Socket connection error:', err);
          this.connectionFailed = true;
           
          // Disconnect socket to prevent continuous reconnection attempts
          if (this.socket) {
            this.socket.disconnect();
          }
          
          reject(err);
        });

        // Handle disconnect that might happen later
        this.socket.on('disconnect', (reason) => {
          console.warn('Socket disconnected:', reason);
          if (reason === 'io server disconnect') {
            // Server disconnected us, try to reconnect
            this.socket.connect();
          }
        });

        // Socket event handlers
        this.setupSocketEventHandlers();
        
      } catch (error) {
        console.error('Error connecting to signaling server:', error);
        this.connectionFailed = true;
        reject(error);
      }
    });
  }

  // Helper method to check if a URL is reachable
  isUrlReachable(url) {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('HEAD', `${url}/api/health`, false);
      xhr.send();
      return xhr.status >= 200 && xhr.status < 300;
    } catch (e) {
      return false;
    }
  }

  setupSocketEventHandlers() {
    if (!this.socket) return;

    this.socket.on('room-users', (users) => {
      console.log('Existing users in room:', users);
      users.forEach(user => {
        this.onUserJoinedCallbacks.forEach(callback => 
          callback(user.userId, user.userData)
        );
        this.addPeer(user.userId, true);
      });
    });

    this.socket.on('user-joined', (data) => {
      const { userId, userData } = data;
      console.log(`User joined: ${userId}`, userData);
      this.onUserJoinedCallbacks.forEach(callback => callback(userId, userData));
      this.addPeer(userId, false);
    });

    this.socket.on('user-left', (userId) => {
      console.log(`User left: ${userId}`);
      this.onUserLeftCallbacks.forEach(callback => callback(userId));
      this.removePeer(userId);
    });

    this.socket.on('signal', (data) => {
      console.log(`Signal received from ${data.userId}`);
      if (!this.peers[data.userId]) {
        this.addPeer(data.userId, false);
      }
      this.peers[data.userId].signal(data.signal);
    });
    
    this.socket.on('chat-message', (data) => {
      console.log(`Chat message from ${data.userId}:`, data.message);
      this.onChatMessageCallbacks.forEach(callback => 
        callback(data.userId, data.message)
      );
    });

    this.socket.on('user-language-changed', (data) => {
      console.log(`User ${data.userId} changed language to ${data.language}`);
      this.onLanguageChangedCallbacks.forEach(callback => 
        callback(data.userId, data.language)
      );
    });
    
    this.socket.on('translation-result', (data) => {
      console.log(`Translation result from ${data.userId}:`, data);
      this.onTranslationResultCallbacks.forEach(callback => 
        callback(data.userId, data)
      );
    });

    // Screen sharing handlers
    this.socket.on('screen-share-signal', (data) => {
      console.log(`Screen share signal from ${data.userId}:`, data);
      this.onScreenShareSignalCallbacks.forEach(callback => 
        callback(data.userId, data)
      );
    });

    this.socket.on('screen-sharing-status', (data) => {
      console.log(`Screen sharing status from ${data.userId}:`, data.isSharing);
      this.onScreenSharingStatusCallbacks.forEach(callback => 
        callback(data.userId, data.isSharing)
      );
    });
  }

  async startLocalStream() {
    try {
      // First try to get both video and audio
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
      } catch (fullMediaError) {
        console.warn('Could not get both camera and microphone, trying with just camera:', fullMediaError);
        
        // Try with just video
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        } catch (videoOnlyError) {
          console.warn('Could not get camera, trying with just audio:', videoOnlyError);
          
          // Try with just audio
          this.localStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true
          });
        }
      }
      
      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }

  joinRoom(roomId) {
    if (!this.socket || this.connectionFailed) {
      console.warn('Not connected to signaling server, operating in local-only mode');
      return false;
    }
    
    this.socket.emit('join-room', roomId, this.userData);
    return true;
  }

  sendMessage(message) {
    if (!this.socket || this.connectionFailed) {
      console.warn('Not connected to signaling server, message not sent');
      return false;
    }
        
    this.socket.emit('chat-message', message);
    return true;
  }
  
  sendTranslationResult(translationData) {
    if (!this.socket || this.connectionFailed) {
      return false;
    }
     
    this.socket.emit('translation-result', translationData);
    return true;
  }
  
  setLanguage(language) {
    this.userData.language = language;
    
    if (!this.socket || this.connectionFailed) {
      return false;
    }
    
    this.socket.emit('set-language', language);
    return true;
  }

  // Screen sharing methods
  sendScreenShareSignal(data) {
    if (!this.socket || this.connectionFailed) {
      return false;
    }
    
    this.socket.emit('screen-share-signal', data);
    return true;
  }

  sendScreenSharingStatus(isSharing) {
    if (!this.socket || this.connectionFailed) {
      return false;
    }
    
    this.socket.emit('screen-sharing-status', isSharing);
    return true;
  }

  addPeer(userId, initiator) {
    try {
      console.log(`Adding peer ${userId}, initiator: ${initiator}`);
      
      const peer = new SimplePeer({
        initiator,
        stream: this.localStream,
        trickle: true,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      peer.on('signal', signal => {
        console.log(`Sending signal to ${userId}`);
        if (this.socket && !this.connectionFailed) {
          this.socket.emit('signal', {
            userId,
            signal
          });
        }
      });

      peer.on('stream', stream => {
        console.log(`Received stream from ${userId}`);
        this.onRemoteStreamCallbacks.forEach(callback => callback(userId, stream));
      });

      peer.on('error', err => {
        console.error(`Peer connection error with ${userId}:`, err);
      });

      this.peers[userId] = peer;
      console.log(`Peer ${userId} added successfully`);
    } catch (error) {
      console.error(`Error adding peer ${userId}:`, error);
    }
  }

  removePeer(userId) {
    console.log(`Removing peer ${userId}`);
    if (this.peers[userId]) {
      this.peers[userId].destroy();
      delete this.peers[userId];
      console.log(`Peer ${userId} removed`);
    }
  }

  onRemoteStream(callback) {
    this.onRemoteStreamCallbacks.push(callback);
  }

  onUserJoined(callback) {
    this.onUserJoinedCallbacks.push(callback);
  }

  onUserLeft(callback) {
    this.onUserLeftCallbacks.push(callback);
  }
  
  onChatMessage(callback) {
    this.onChatMessageCallbacks.push(callback);
  }
  
  onTranslationResult(callback) {
    this.onTranslationResultCallbacks.push(callback);
  }
  
  onLanguageChanged(callback) {
    this.onLanguageChangedCallbacks.push(callback);
  }

  // Screen sharing callbacks
  onScreenShareSignal(callback) {
    this.onScreenShareSignalCallbacks.push(callback);
  }

  onScreenSharingStatus(callback) {
    this.onScreenSharingStatusCallbacks.push(callback);
  }

  disconnect() {
    console.log('Disconnecting WebRTC service');
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    Object.keys(this.peers).forEach(userId => {
      this.peers[userId].destroy();
    });
    this.peers = {};

    if (this.socket && !this.connectionFailed) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    console.log('WebRTC service disconnected');
  }
  
  isConnected() {
    return this.socket && this.socket.connected && !this.connectionFailed;
  }
}

export default new WebRTCService();
