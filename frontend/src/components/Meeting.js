import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import TranslationPanel from './TranslationPanel';
import ChatPanel from './ChatPanel';
import webRTCService from '../utils/webrtcService';

const Meeting = () => {
  const { id } = useParams();
  const [isJoined, setIsJoined] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('es');
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [participants, setParticipants] = useState([]);
  const localVideoRef = useRef(null);
  const remoteVideosRef = useRef({});
  
  // Check if running in GitHub Codespaces
  const isGitHubCodespaces = window.location.hostname.includes('github.dev') || 
                             window.location.hostname.includes('app.github.dev');

  // Join the WebRTC meeting
  useEffect(() => {
    if (!id) return;
    
    const joinMeeting = async () => {
      try {
        setConnectionStatus('connecting');
        
        // Skip server connection if in GitHub Codespaces
        if (isGitHubCodespaces) {
          console.log('GitHub Codespaces detected, using local-only mode');
          setConnectionStatus('local-only');
        } else {
          // Connect to signaling server
          await webRTCService.connect()
            .catch(err => {
              console.warn('Signaling server connection failed, continuing in local-only mode', err);
              setConnectionStatus('local-only');
              return null;
            });
        }
        
        // Get local media stream even if server connection failed
        const localStream = await webRTCService.startLocalStream();
        
        // Display local video
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
        
        // Join the room with meeting ID if connection succeeded
        if (!isGitHubCodespaces) {
          const joinSuccess = webRTCService.joinRoom(id);
          if (joinSuccess) {
            setConnectionStatus('connected');
          }
        }
        
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
      webRTCService.disconnect();
      setIsJoined(false);
    };
  }, [id, isGitHubCodespaces]);
  
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
        </div>
      )}
      
      <div className="video-container">
        <div className="local-video-wrapper">
          <video ref={localVideoRef} autoPlay playsInline muted className="local-video" />
        </div>
        <div id="remote-videos-container" className="remote-videos-container">
          {/* Remote videos will be inserted here dynamically */}
          {connectionStatus === 'connecting' && (
            <div className="connecting-message">Connecting to server...</div>
          )}
          {connectionStatus === 'local-only' && (
            <div className="local-only-message">Local video only mode</div>
          )}
        </div>
      </div>
      
      {/* Display a local development notice */}
      <div className="local-dev-notice">
        {isGitHubCodespaces ? 'Running in GitHub Codespaces' : 'Running locally'} - Meeting ID: {id}
      </div>
      
      <div className="controls-container">
        <button 
          className={`translation-btn ${isTranslating ? 'active' : ''}`}
          onClick={isTranslating ? stopTranslation : startTranslation}
          disabled={!!error}
        >
          {isTranslating ? 'Stop Translation' : 'Start Translation'}
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
        <ChatPanel meetingId={id} />
      </div>
    </div>
  );
};

export default Meeting;
