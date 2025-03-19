import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import TranslationPanel from './TranslationPanel';
import ChatPanel from './ChatPanel';
import TroubleshootingGuide from './TroubleshootingGuide';
import webRTCService from '../utils/webrtcService';
import videoConferenceService from '../utils/videoConferenceService';

const Meeting = () => {
  const { id } = useParams();
  const [isJoined, setIsJoined] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('es');
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [participants, setParticipants] = useState([]);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const localVideoRef = useRef(null);
  const screenShareRef = useRef(null);
  const remoteVideosRef = useRef({});
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  
  const isGitHubCodespaces = window.location.hostname.includes('github.dev') || 
                             window.location.hostname.includes('app.github.dev');

  // Join the meeting
  useEffect(() => {
    if (!id) return;
    
    const joinMeeting = async () => {
      try {
        setConnectionStatus('connecting');
        
        // Initialize conference
        const result = await videoConferenceService.initializeConference();
        
        if (!result.success) {
          setConnectionStatus('local-only');
          console.warn('Failed to connect to signaling server, continuing in local-only mode');
        } else {
          setConnectionStatus('connected');
        }

        // Display local video if we have a stream
        if (result.localStream && localVideoRef.current) {
          localVideoRef.current.srcObject = result.localStream;
        }
        
        // Join the room with meeting ID
        videoConferenceService.joinMeeting(id, {
          language: selectedLanguage
        });
        
        // Handle remote streams
        webRTCService.onRemoteStream((userId, stream) => {
          console.log(`Received stream from user ${userId}`);
          
          // Create a new video element for this remote stream
          if (!remoteVideosRef.current[userId]) {
            remoteVideosRef.current[userId] = document.createElement('video');
            remoteVideosRef.current[userId].autoplay = true;
            remoteVideosRef.current[userId].playsInline = true;
            remoteVideosRef.current[userId].id = `remote-video-${userId}`;
            
            const container = document.getElementById('remote-videos-container');
            if (container) {
              container.appendChild(remoteVideosRef.current[userId]);
            }
          }
          
          // Set the stream to the video element
          remoteVideosRef.current[userId].srcObject = stream;
        });
        
        // Handle screen share signals
        webRTCService.onScreenShareSignal && webRTCService.onScreenShareSignal((userId, data) => {
          console.log(`Received screen share signal from user ${userId}`, data);
          // You can handle incoming screen shares here if needed
        });
        
        // Track user joining
        webRTCService.onUserJoined((userId) => {
          setParticipants(prev => [...prev, userId]);
        });
        
        // Track user leaving
        webRTCService.onUserLeft((userId) => {
          setParticipants(prev => prev.filter(id => id !== userId));
          
          // Remove video element
          if (remoteVideosRef.current[userId]) {
            const videoEl = document.getElementById(`remote-video-${userId}`);
            if (videoEl) {
              videoEl.remove();
            }
            delete remoteVideosRef.current[userId];
          }
        });
        
        setIsJoined(true);
        console.log("Joined the meeting successfully");
      } catch (error) {
        console.error("Failed to join the meeting", error);
        setError(`Media error: ${error.message || 'Could not access camera/mic'}`);
        setConnectionStatus('failed');
      }
    };
    
    joinMeeting();
    
    // Cleanup function
    return () => {
      stopScreenSharing();
      videoConferenceService.leaveMeeting();
      setIsJoined(false);
    };
  }, [id, isGitHubCodespaces]);
  
  // Update language in WebRTC service when selected language changes
  useEffect(() => {
    if (isJoined) {
      webRTCService.setLanguage(selectedLanguage);
    }
  }, [selectedLanguage, isJoined]);
  
  // Setup audio stream for translation
  const startTranslation = () => {
    setIsTranslating(true);
    // Here we would implement the OpenAI Whisper integration
    // with the API key from environment variables
    const openaiKey = process.env.REACT_APP_OPENAI_API_KEY;
    if (!openaiKey) {
      console.error("OpenAI API key is missing. Check your .env file.");
      setError("OpenAI API key is missing. Translation unavailable.");
      setIsTranslating(false);
    }
  };
  
  const stopTranslation = () => {
    setIsTranslating(false);
  };
  
  // Start screen sharing
  const startScreenSharing = async () => {
    try {
      // Request screen sharing stream from the browser
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      
      // Set local screen sharing state
      setIsScreenSharing(true);
      setScreenStream(stream);
      
      // Display screen share in the local reference
      if (screenShareRef.current) {
        screenShareRef.current.srcObject = stream;
      }
      
      // Send screen share to peers if connected
      if (webRTCService.isConnected()) {
        // Notify others we're sharing our screen
        webRTCService.sendScreenSharingStatus(true);
        
        // Share the screen with all peers
        for (const peerId in webRTCService.peers) {
          try {
            // Add the screen share track to each peer connection
            stream.getTracks().forEach(track => {
              webRTCService.peers[peerId].addTrack(track, stream);
            });
          } catch (err) {
            console.error(`Error sharing screen with peer ${peerId}:`, err);
          }
        }
      }
      
      // Handle the end of screen sharing
      stream.getVideoTracks()[0].onended = () => {
        stopScreenSharing();
      };
      
    } catch (err) {
      console.error("Error starting screen sharing:", err);
      setError(`Screen sharing error: ${err.message || 'Could not access screen'}`);
      setIsScreenSharing(false);
    }
  };
  
  // Stop screen sharing
  const stopScreenSharing = () => {
    if (screenStream) {
      // Stop all tracks in the screen share stream
      screenStream.getTracks().forEach(track => track.stop());
      
      // Clear screen share reference
      if (screenShareRef.current) {
        screenShareRef.current.srcObject = null;
      }
      
      // Update state
      setScreenStream(null);
      setIsScreenSharing(false);
      
      // Notify peers we've stopped sharing our screen
      if (webRTCService.isConnected()) {
        webRTCService.sendScreenSharingStatus(false);
      }
    }
  };

  return (
    <div className="meeting-container">
      {error && <div className="error-message">{error}</div>}
      
      {isGitHubCodespaces && (
        <div className="warning-message">
          <strong>GitHub Codespaces Environment Detected:</strong> Running in local-only mode.
          Multi-participant video conferencing requires running the application locally.
        </div>
      )}
      
      {connectionStatus === 'local-only' && !isGitHubCodespaces && (
        <div className="warning-message">
          Running in local-only mode. Signaling server not available. 
          Video conferencing with other participants won't work.
          <br />
          <strong>Troubleshooting:</strong> Make sure the server is running at {process.env.REACT_APP_API_URL || 'http://localhost:3001'}
          and that you have proper DNS resolution if using a custom domain.
          <button 
            className="troubleshooting-button" 
            onClick={() => setShowTroubleshooting(true)}
            style={{ marginLeft: '10px' }}
          >
            Show Troubleshooting Guide
          </button>
        </div>
      )}
      
      <div className="video-container">
        <div className="local-video-wrapper">
          <video ref={localVideoRef} autoPlay playsInline muted className="local-video" />
        </div>
        <div id="remote-videos-container" className="remote-videos-container">
          {/* Screen share video */}
          {isScreenSharing && (
            <div className="screen-share-container">
              <video 
                ref={screenShareRef} 
                autoPlay 
                playsInline 
                className="screen-share-video" 
              />
              <div className="screen-share-label">Your Screen Share</div>
            </div>
          )}
          
          {/* Remote videos will be inserted here dynamically */}
          {connectionStatus === 'connecting' && (
            <div className="connecting-message">Connecting to server...</div>
          )}
          {connectionStatus === 'local-only' && (
            <div className="local-only-message">Local video only mode</div>
          )}
        </div>
      </div>
      
      {/* Display environment notice */}
      <div className="local-dev-notice">
        {process.env.NODE_ENV !== 'production' ? 'Development Environment' : 'Production'} - Meeting ID: {id}
      </div>
      
      <div className="controls-container">
        <button 
          className={`translation-btn ${isTranslating ? 'active' : ''}`}
          onClick={isTranslating ? stopTranslation : startTranslation}
          disabled={!!error}
        >
          {isTranslating ? 'Stop Translation' : 'Start Translation'}
        </button>
        
        <button
          className={`screen-share-btn ${isScreenSharing ? 'active' : ''}`}
          onClick={isScreenSharing ? stopScreenSharing : startScreenSharing}
          disabled={!!error}
        >
          {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
        </button>
        
        <select 
          value={selectedLanguage} 
          onChange={(e) => setSelectedLanguage(e.target.value)}
          className="language-select"
          disabled={!!error || isTranslating}
        >
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
          <option value="zh">Chinese</option>
          <option value="ja">Japanese</option>
        </select>
      </div>
      
      <div className="side-panels">
        <TranslationPanel 
          isTranslating={isTranslating} 
          language={selectedLanguage} 
        />
        <ChatPanel 
          meetingId={id} 
          selectedLanguage={selectedLanguage} 
        />
      </div>
      
      {showTroubleshooting && (
        <TroubleshootingGuide onClose={() => setShowTroubleshooting(false)} />
      )}
    </div>
  );
};

export default Meeting;
