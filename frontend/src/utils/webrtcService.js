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
        serverUrl = 'https://api.live-translate.org';
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
          withCredentials: true
        });

        this.socket.on('connect', () => {
          clearTimeout(timeout);
          console.log('Connected to signaling server');
          this.connectionFailed = false;
          resolve(this.socket.id);
        });

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
                
        this.socket.on('disconnect', (reason) => {
          console.warn('Socket disconnected:', reason);
          if (reason === 'io server disconnect') {
            // Server disconnected us, try to reconnect
            this.socket.connect();
          }
        });
        
      } catch (error) {
        console.error('Error connecting to signaling server:', error);
        this.connectionFailed = true;
        reject(error);
      }
    });
  }

  async startLocalStream() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
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

  addPeer(userId, initiator) {
    try {
      console.log(`Adding peer ${userId}, initiator: ${initiator}`);
      
      const peer = new SimplePeer({
        initiator,
        stream: this.localStream,
        trickle: true
      });

      peer.on('signal', signal => {
        console.log(`Sending signal to ${userId}`);
        this.socket.emit('signal', {
          userId,
          signal
        });
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
