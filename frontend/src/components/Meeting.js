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
  const [participants, setParticipants] = useState([]);
  const localVideoRef = useRef(null);
  const remoteVideosRef = useRef({});

  // Join the WebRTC meeting
  useEffect(() => {
    if (!id) return;
    
    const joinMeeting = async () => {
      try {
        // Connect to signaling server
        await webRTCService.connect();
        
        // Get local media stream
        const localStream = await webRTCService.startLocalStream();
        
        // Display local video
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
        
        // Join the room with meeting ID
        webRTCService.joinRoom(id);
        
        // Handle remote streams
        webRTCService.onRemoteStream((userId, stream) => {
          console.log(`Received stream from user ${userId}`);
          
          // Create a new video element for this remote stream
          if (!remoteVideosRef.current[userId]) {
            remoteVideosRef.current[userId] = document.createElement('video');
            remoteVideosRef.current[userId].autoplay = true;
            remoteVideosRef.current[userId].playsInline = true;
            remoteVideosRef.current[userId].id = `remote-video-${userId}`;
            document.getElementById('remote-videos-container').appendChild(remoteVideosRef.current[userId]);
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
        console.log("Joined the meeting successfully with WebRTC");
      } catch (error) {
        console.error("Failed to join the meeting", error);
        setError(error.message || 'Failed to join meeting');
      }
    };
    
    joinMeeting();
    
    // Cleanup function
    return () => {
      webRTCService.disconnect();
      setIsJoined(false);
    };
  }, [id]);
  
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
      return;
    }
    // Implementation will go here
  };
  
  const stopTranslation = () => {
    setIsTranslating(false);
    // Stop the translation process
  };

  return (
    <div className="meeting-container">
      {error && <div className="error-message">{error}</div>}
      
      <div className="video-container">
        <div className="local-video-wrapper">
          <video ref={localVideoRef} autoPlay playsInline muted className="local-video" />
        </div>
        <div id="remote-videos-container" className="remote-videos-container">
          {/* Remote videos will be inserted here dynamically */}
        </div>
      </div>
      
      {/* Display a local development notice */}
      <div className="local-dev-notice">
        Running WebRTC on localhost
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
