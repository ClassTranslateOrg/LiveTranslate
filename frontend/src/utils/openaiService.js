import OpenAI from 'openai';

// Initialize OpenAI client with browser compatibility
const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Allow browser usage with warning
});

/**
 * Process audio for translation using OpenAI's Whisper API
 * @param {Blob} audioBlob - The audio recording to translate
 * @param {string} targetLanguage - The target language code
 * @returns {Object} The original and translated text
 */
export const processAudioForTranslation = async (audioBlob, targetLanguage) => {
  try {
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
    });

    const translatedText = translationResponse.choices[0].message.content;

    return {
      original: originalText,
      translated: translatedText,
      timestamp: new Date().toISOString(),
    };
    
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
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
