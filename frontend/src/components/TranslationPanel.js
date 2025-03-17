import React, { useState, useEffect, useContext } from 'react';
import { processAudioForTranslation } from '../utils/openaiService';
import AuthContext from '../contexts/AuthContext';
import webRTCService from '../utils/webrtcService';

const TranslationPanel = ({ isTranslating, language }) => {
  const [translations, setTranslations] = useState([]);
  const [isApiAvailable, setIsApiAvailable] = useState(true);
  const [audioProcessor, setAudioProcessor] = useState(null);
  const [remoteTranslations, setRemoteTranslations] = useState({});
  const { user } = useContext(AuthContext);

  // Check for OpenAI API key on component mount
  useEffect(() => {
    if (!process.env.REACT_APP_OPENAI_API_KEY) {
      console.warn('OpenAI API key not found. Translation service will not work.');
      setIsApiAvailable(false);
    }
  }, []);

  // Setup WebRTC event listeners for remote translations
  useEffect(() => {
    if (!webRTCService.isConnected()) return;

    // Handle remote translations
    const handleTranslationResult = (userId, translationData) => {
      // Update the remote translations state
      setRemoteTranslations(prev => ({
        ...prev,
        [userId]: [...(prev[userId] || []), translationData]
      }));
    };

    // Register the callback
    webRTCService.onTranslationResult(handleTranslationResult);

    // Clean up on unmount
    return () => {
      // There's no way to remove specific callbacks with our current implementation
      // In a production app, we would implement a removeListener method
    };
  }, []);

  // Handle audio translation when isTranslating changes
  useEffect(() => {
    if (!isTranslating || !isApiAvailable) {
      // Stop translation if necessary
      if (audioProcessor) {
        audioProcessor.stop();
        setAudioProcessor(null);
      }
      return;
    }

    const startAudioCapture = async () => {
      try {
        // Get audio from the microphone
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Set up audio recorder with 5-second intervals
        const mediaRecorder = new MediaRecorder(stream);
        let audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          audioChunks = [];
          
          try {
            // Process the audio with OpenAI
            const result = await processAudioForTranslation(audioBlob, language);
            
            // Add to local translations
            setTranslations(prev => [...prev, result]);
            
            // Share with others in the room if connected
            if (webRTCService.isConnected()) {
              webRTCService.sendTranslationResult(result);
            }
          } catch (error) {
            console.error('Error processing audio:', error);
          }
          
          // Start recording again if still translating
          if (isTranslating) {
            mediaRecorder.start();
            setTimeout(() => mediaRecorder.stop(), 5000); // Record in 5-second chunks
          }
        };
        
        // Start recording
        mediaRecorder.start();
        setTimeout(() => mediaRecorder.stop(), 5000); // Record first 5 seconds
        
        setAudioProcessor({
          stop: () => {
            mediaRecorder.stop();
            stream.getTracks().forEach(track => track.stop());
          }
        });
      } catch (error) {
        console.error('Error starting audio capture:', error);
        setIsApiAvailable(false);
      }
    };
    
    startAudioCapture();
    
    return () => {
      // Cleanup function
      if (audioProcessor) {
        audioProcessor.stop();
      }
    };
  }, [isTranslating, language, isApiAvailable]);

  // Combine local and remote translations
  const allTranslations = [
    ...translations,
    ...Object.values(remoteTranslations).flat()
  ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return (
    <div className="translation-panel">
      <h3>Live Translation</h3>
      {!isApiAvailable && (
        <div className="api-warning">
          OpenAI API key not configured. Translation service unavailable.
        </div>
      )}
      
      <div className="translations-container">
        {allTranslations.length === 0 && !isTranslating ? (
          <p>Start translation to see content here</p>
        ) : allTranslations.length === 0 && isTranslating ? (
          <p>Waiting for speech to translate...</p>
        ) : (
          allTranslations.map((item, index) => (
            <div key={index} className="translation-item">
              <div className="original-text">{item.original}</div>
              <div className="translated-text">{item.translated}</div>
              <div className="translation-timestamp">{new Date(item.timestamp).toLocaleTimeString()}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TranslationPanel;
