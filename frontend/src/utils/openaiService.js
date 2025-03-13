import OpenAI from 'openai';

/**
 * Process audio for translation using OpenAI Whisper API
 * @param {Blob} audioBlob - The audio data to translate
 * @param {string} targetLanguage - The language code to translate to
 * @returns {Promise<Object>} - The translation result
 */
export const processAudioForTranslation = async (audioBlob, targetLanguage) => {
  try {
    const openaiKey = process.env.REACT_APP_OPENAI_API_KEY;
    
    if (!openaiKey) {
      throw new Error('OpenAI API key is not configured');
    }
    
    const openai = new OpenAI({
      apiKey: openaiKey,
    });
    
    // Convert audio blob to file
    const audioFile = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });
    
    // Transcribe the audio
    const transcriptionResponse = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en', // Source language, or 'auto' to detect
    });
    
    const originalText = transcriptionResponse.text;
    
    // Translate the transcription
    const translationResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a translator. Translate the text into ${targetLanguage}. Return only the translation, nothing else.`
        },
        {
          role: 'user',
          content: originalText
        }
      ]
    });
    
    const translatedText = translationResponse.choices[0].message.content;
    
    return {
      original: originalText,
      translated: translatedText,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
};
