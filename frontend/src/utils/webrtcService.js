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
  }

  connect(serverUrl = 'http://localhost:3001') {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(serverUrl);

        this.socket.on('connect', () => {
          console.log('Connected to signaling server');
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
          console.error('Socket connection error:', err);
          reject(err);
        });
      } catch (error) {
        console.error('Error connecting to signaling server:', error);
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
    if (!this.socket) {
      throw new Error('Not connected to signaling server');
    }
    this.socket.emit('join-room', roomId);
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

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export default new WebRTCService();
