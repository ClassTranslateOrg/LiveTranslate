import OpenAI from 'openai';

// Initialize OpenAI client with browser compatibility and proper error handling
let openai;
try {
  openai = new OpenAI({
    apiKey: process.env.REACT_APP_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true, // Allow browser usage with warning
  });
} catch (error) {
  console.error('Error initializing OpenAI client:', error);
}

// Check if OpenAI API is functioning
export const isOpenAIAvailable = async () => {
  if (!openai || !process.env.REACT_APP_OPENAI_API_KEY) {
    return false;
  }
  
  try {
    // Send a minimal request to test connectivity
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch (error) {
    console.error('OpenAI API availability check failed:', error);
    return false;
  }
};

/**
 * Process audio for translation using OpenAI's Whisper API
 * @param {Blob} audioBlob - The audio recording to translate
 * @param {string} targetLanguage - The target language code
 * @returns {Object} The original and translated text
 */
export const processAudioForTranslation = async (audioBlob, targetLanguage) => {
  try {
    if (!openai || !process.env.REACT_APP_OPENAI_API_KEY) {
      throw new Error('OpenAI client not initialized or API key missing');
    }
    
    // Convert the audio blob to a file object that OpenAI can process
    const file = new File([audioBlob], "recording.webm", {
      type: audioBlob.type,
    });

    // First, transcribe the audio to get the original text
    const transcriptionResponse = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
    });

    const originalText = transcriptionResponse.text;
    
    if (!originalText || originalText.trim() === '') {
      return {
        original: '',
        translated: '',
        timestamp: new Date().toISOString(),
      };
    }

    // Then translate the text to the target language
    const translationResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a translator. Translate the following text to ${getLanguageName(targetLanguage)}.`,
        },
        {
          role: "user",
          content: originalText,
        },
      ],
      // Add timeout to prevent hanging requests
      timeout: 10000,
    });

    const translatedText = translationResponse.choices[0].message.content;

    return {
      original: originalText,
      translated: translatedText,
      timestamp: new Date().toISOString(),
    };
    
  } catch (error) {
    console.error('Translation error:', error);
    // Return a useful error object instead of just throwing
    return {
      original: 'Error transcribing audio',
      translated: `Translation failed: ${error.message || 'Unknown error'}`,
      timestamp: new Date().toISOString(),
      error: true,
    };
  }
};

/**
 * Translate chat message text with fallback to mock translation
 * @param {string} text - The text to translate
 * @param {string} targetLanguage - The target language code
 * @returns {Promise<string>} The translated text
 */
export const translateChatMessage = async (text, targetLanguage) => {
  if (!text || text.trim() === '') {
    return '';
  }
  
  try {
    if (!openai || !process.env.REACT_APP_OPENAI_API_KEY) {
      // Fallback to mock translation if API isn't available
      return `[Mock translation to ${getLanguageName(targetLanguage)}]: ${text}`;
    }
    
    const translationResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a translator. Translate the following text to ${getLanguageName(targetLanguage)}.`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      // Add timeout to prevent hanging requests
      timeout: 10000,
    });

    return translationResponse.choices[0].message.content;
  } catch (error) {
    console.error('Chat translation error:', error);
    // Return a message indicating error rather than throwing
    return `[Translation failed: ${error.message || 'Unknown error'}]`;
  }
};

/**
 * Get the language name from the language code
 */
function getLanguageName(languageCode) {
  const languages = {
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'zh': 'Chinese',
    'ja': 'Japanese',
    // Add more languages as needed
  };
  
  return languages[languageCode] || 'English';
}
