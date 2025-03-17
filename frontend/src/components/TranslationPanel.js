import React, { useState, useEffect } from 'react';
import { processAudioForTranslation } from '../utils/openaiService';

const TranslationPanel = ({ isTranslating, language }) => {
  const [translations, setTranslations] = useState([]);
  const [isApiAvailable, setIsApiAvailable] = useState(true);
  const [audioProcessor, setAudioProcessor] = useState(null);

  // Check for OpenAI API key on component mount
  useEffect(() => {
    if (!process.env.REACT_APP_OPENAI_API_KEY) {
      console.warn('OpenAI API key not found. Translation service will not work.');
      setIsApiAvailable(false);
    }
  }, []);

  // Setup real audio processing when translation starts/stops
  useEffect(() => {
    if (!isTranslating || !isApiAvailable) {
      // Cleanup any existing audio processor
      if (audioProcessor) {
        audioProcessor.stop();
        setAudioProcessor(null);
      }
      return;
    }
    
    // Start capturing audio for translation
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
            setTranslations(prev => [...prev, result]);
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

  return (
    <div className="translation-panel">
      <h3>Live Translation</h3>
      {!isApiAvailable && (
        <div className="api-warning">
          OpenAI API key not configured. Translation service unavailable.
        </div>
      )}
      
      <div className="translations-container">
        {translations.length === 0 && !isTranslating ? (
          <p>Start translation to see content here</p>
        ) : translations.length === 0 && isTranslating ? (
          <p>Waiting for speech to translate...</p>
        ) : (
          translations.map((item, index) => (
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
