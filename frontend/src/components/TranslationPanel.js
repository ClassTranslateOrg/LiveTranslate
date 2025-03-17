import React, { useState, useEffect, useContext } from 'react';
import { processAudioForTranslation, isOpenAIAvailable } from '../utils/openaiService';
import AuthContext from '../contexts/AuthContext';
import webRTCService from '../utils/webrtcService';

const TranslationPanel = ({ isTranslating, language }) => {
  const [translations, setTranslations] = useState([]);
  const [isApiAvailable, setIsApiAvailable] = useState(true);
  const [audioProcessor, setAudioProcessor] = useState(null);
  const [remoteTranslations, setRemoteTranslations] = useState({});
  const [translationError, setTranslationError] = useState(null);
  const { user } = useContext(AuthContext);

  // Check for OpenAI API availability
  useEffect(() => {
    const checkApiAvailability = async () => {
      try {
        // First check if API key is provided
        if (!process.env.REACT_APP_OPENAI_API_KEY) {
          console.warn('OpenAI API key not found. Translation service will not work.');
          setIsApiAvailable(false);
          return;
        }
        
        // Then check if we can actually connect to OpenAI
        const available = await isOpenAIAvailable();
        setIsApiAvailable(available);
        
        if (!available) {
          setTranslationError('OpenAI API is currently unavailable. Please try again later.');
        }
      } catch (error) {
        console.error('Error checking API availability:', error);
        setIsApiAvailable(false);
        setTranslationError(`Error connecting to OpenAI API: ${error.message}`);
      }
    };
    
    checkApiAvailability();
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

  // Add error handling for audio capture
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
        // Request user permission for audio
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          .catch(err => {
            console.error('Microphone access error:', err);
            setTranslationError(`Microphone access denied: ${err.message}`);
            throw err;
          });
        
        // Set up audio recorder with 5-second intervals
        const mediaRecorder = new MediaRecorder(stream);
        let audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = async () => {
          if (!isTranslating) return; // Skip processing if we've stopped translation
          
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          audioChunks = [];
          
          try {
            // Process the audio with OpenAI
            const result = await processAudioForTranslation(audioBlob, language);
            
            // Check for errors in the result
            if (result.error) {
              setTranslationError(`Translation error: ${result.translated}`);
            } else {
              // Clear any previous errors
              setTranslationError(null);
            }
            
            // Add to local translations
            if (result.original && result.original.trim() !== '') {
              setTranslations(prev => [...prev, result]);
              
              // Share with others in the room if connected
              if (webRTCService.isConnected()) {
                webRTCService.sendTranslationResult(result);
              }
            }
          } catch (error) {
            console.error('Error processing audio:', error);
            setTranslationError(`Error processing audio: ${error.message}`);
          }
          
          // Start recording again if still translating
          if (isTranslating) {
            try {
              mediaRecorder.start();
              setTimeout(() => {
                if (mediaRecorder.state === 'recording') {
                  mediaRecorder.stop();
                }
              }, 5000); // Record in 5-second chunks
            } catch (error) {
              console.error('Error restarting recording:', error);
            }
          }
        };
        
        // Start recording
        try {
          mediaRecorder.start();
          setTimeout(() => {
            if (mediaRecorder.state === 'recording') {
              mediaRecorder.stop();
            }
          }, 5000); // Record first 5 seconds
          
          setAudioProcessor({
            stop: () => {
              try {
                if (mediaRecorder.state === 'recording') {
                  mediaRecorder.stop();
                }
                stream.getTracks().forEach(track => track.stop());
              } catch (error) {
                console.error('Error stopping audio processor:', error);
              }
            }
          });
        } catch (error) {
          console.error('Error starting MediaRecorder:', error);
          setTranslationError(`Recording error: ${error.message}`);
        }
      } catch (error) {
        console.error('Error starting audio capture:', error);
        setIsApiAvailable(false);
        setTranslationError(`Audio capture error: ${error.message}`);
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
      
      {translationError && (
        <div className="translation-error-banner">
          {translationError}
        </div>
      )}
      
      {!isApiAvailable && (
        <div className="api-warning">
          OpenAI API unavailable. Translation service will not work.
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
