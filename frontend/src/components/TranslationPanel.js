import React, { useState, useEffect } from 'react';
import { processAudioForTranslation } from '../utils/openaiService';

const TranslationPanel = ({ isTranslating, language }) => {
  const [translations, setTranslations] = useState([]);
  const [isApiAvailable, setIsApiAvailable] = useState(true);

  // Check for OpenAI API key on component mount
  useEffect(() => {
    if (!process.env.REACT_APP_OPENAI_API_KEY) {
      console.warn('OpenAI API key not found. Translation service will not work.');
      setIsApiAvailable(false);
    }
  }, []);

  // Simulating incoming translations
  useEffect(() => {
    if (!isTranslating || !isApiAvailable) return;
    
    let intervalId;
    
    // In a real implementation, we would process audio and send to OpenAI Whisper
    // This is a placeholder that mimics that behavior for demonstration
    const startTranslationProcess = async () => {
      intervalId = setInterval(async () => {
        try {
          // This would use the actual audio data in production
          // const translationResult = await processAudioForTranslation(audioData, language);
          
          // For now, we'll use mock data
          const mockData = {
            original: "This is a test sentence for our translation demo.",
            translated: getTranslatedText(language),
            timestamp: new Date().toISOString()
          };
          
          setTranslations(prev => [...prev, mockData]);
        } catch (error) {
          console.error("Error in translation process:", error);
        }
      }, 5000);
    };
    
    startTranslationProcess();
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isTranslating, language, isApiAvailable]);

  // Mock function to return translated text based on language
  const getTranslatedText = (lang) => {
    const translations = {
      es: "Esta es una frase de prueba para nuestra demostración de traducción.",
      fr: "C'est une phrase de test pour notre démonstration de traduction.",
      de: "Dies ist ein Testsatz für unsere Übersetzungsdemo.",
      zh: "这是我们翻译演示的测试句子。",
      ja: "これは翻訳デモのテスト文です。"
    };
    
    return translations[lang] || "Translation not available";
  };

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
