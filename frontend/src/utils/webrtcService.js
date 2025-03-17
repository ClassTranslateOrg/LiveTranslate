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
    this.connectionFailed = false;
    this.connectionAttempted = false;
    
    // Check if running in GitHub Codespaces
    this.isGitHubCodespaces = window.location.hostname.includes('github.dev') || 
                              window.location.hostname.includes('app.github.dev');
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
        }, 3000); // Reduced timeout for better UX
        
        this.socket = io(serverUrl, {
          reconnectionAttempts: 2, // Reduced reconnection attempts
          timeout: 3000,
          forceNew: true
        });

        this.socket.on('connect', () => {
          clearTimeout(timeout);
          console.log('Connected to signaling server');
          this.connectionFailed = false;
          resolve(this.socket.id);
        });

        this.socket.on('user-joined', userId => {
          console.log(`User joined: ${userId}`);
          this.onUserJoinedCallbacks.forEach(callback => callback(userId));
          this.addPeer(userId, false);
        });

        this.socket.on('user-left', userId => {
          console.log(`User left: ${userId}`);
          this.onUserLeftCallbacks.forEach(callback => callback(userId));
          this.removePeer(userId);
        });

        this.socket.on('signal', data => {
          if (!this.peers[data.userId]) {
            this.addPeer(data.userId, false);
          }
          this.peers[data.userId].signal(data.signal);
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
    this.socket.emit('join-room', roomId);
    return true;
  }

  addPeer(userId, initiator) {
    try {
      const peer = new SimplePeer({
        initiator,
        stream: this.localStream,
        trickle: true
      });

      peer.on('signal', signal => {
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
        console.error('Peer connection error:', err);
      });

      this.peers[userId] = peer;
    } catch (error) {
      console.error('Error adding peer:', error);
    }
  }

  removePeer(userId) {
    if (this.peers[userId]) {
      this.peers[userId].destroy();
      delete this.peers[userId];
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

  disconnect() {
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
  }
  
  isConnected() {
    return this.socket && this.socket.connected && !this.connectionFailed;
  }
}

export default new WebRTCService();
