import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import TranslationPanel from './TranslationPanel';
import ChatPanel from './ChatPanel';
import generateSignature from '../utils/zoomSignature';

const Meeting = () => {
  const { id } = useParams();
  const [isJoined, setIsJoined] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('es'); // Default to Spanish
  const [error, setError] = useState('');
  const zoomContainerRef = useRef(null);
  
  // Join the Zoom meeting
  useEffect(() => {
    if (!id) return;
    
    const joinMeeting = async () => {
      try {
        // Get Zoom SDK key from .env
        const sdkKey = process.env.REACT_APP_ZOOM_SDK_KEY;
        const sdkSecret = process.env.REACT_APP_ZOOM_SDK_SECRET;
        
        // Check if we have necessary credentials
        if (!sdkKey || !sdkSecret) {
          throw new Error('Zoom SDK credentials are missing. Check your .env file.');
        }

        // In production, you'd make an API call to your backend which would generate this signature securely
        // This is just a placeholder - implement proper signature generation on your backend
        const signature = await generateSignature(sdkKey, sdkSecret, id, 0);
        
        const meetingNumber = id;
        const userName = "Test User"; // Ideally from user input or auth system
        const passWord = "";
        const userEmail = "test@example.com"; // Ideally from auth system
        const registrantToken = "";
        const tk = "";
        const zak = "";
        
        await window.zoomClient.join({
          signature: signature,
          meetingNumber: meetingNumber,
          userName: userName,
          password: passWord,
          userEmail: userEmail,
          tk: tk,
          zak: zak
        });
        
        setIsJoined(true);
        console.log("Joined the meeting successfully");
      } catch (error) {
        console.error("Failed to join the meeting", error);
        setError(error.message || 'Failed to join meeting');
      }
    };
    
    joinMeeting();
    
    // Cleanup function
    return () => {
      if (isJoined) {
        window.zoomClient.leave();
      }
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
        <div id="zoom-container" ref={zoomContainerRef}></div>
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
