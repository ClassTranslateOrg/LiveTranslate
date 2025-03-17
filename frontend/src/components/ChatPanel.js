import React, { useState, useEffect, useRef, useContext } from 'react';
import { translateChatMessage } from '../utils/openaiService';
import AuthContext from '../contexts/AuthContext';
import webRTCService from '../utils/webrtcService';

const ChatPanel = ({ meetingId, selectedLanguage }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTranslatingChat, setIsTranslatingChat] = useState(false);
  const [isApiAvailable, setIsApiAvailable] = useState(true);
  const messagesEndRef = useRef(null);
  const { user } = useContext(AuthContext);
  
  // Current user info
  const currentUser = {
    id: webRTCService.socket?.id || 'local',
    name: user?.name || user?.email || 'You'
  };
  
  // Check for OpenAI API key on component mount
  useEffect(() => {
    if (!process.env.REACT_APP_OPENAI_API_KEY) {
      console.warn('OpenAI API key not found. Translation service will not work.');
      setIsApiAvailable(false);
    }
  }, []);
  
  // Register WebSocket event handlers
  useEffect(() => {
    // Skip if we're not connected to the signaling server
    if (!webRTCService.isConnected()) {
      console.log('Not connected to signaling server, chat will only work locally');
      
      // Add a mock message for local testing
      setTimeout(() => {
        const mockMessage = {
          id: Date.now(),
          user: {
            id: '456',
            name: 'Other Participant'
          },
          text: 'Hello! How are you doing today?',
          timestamp: new Date().toISOString(),
          translated: null,
          isTranslating: false
        };
        
        setMessages(prev => [...prev, mockMessage]);
      }, 2000);
      
      return;
    }
    
    // Handle incoming chat messages
    const handleChatMessage = (userId, messageData) => {
      setMessages(prev => [...prev, {
        ...messageData,
        user: {
          id: userId,
          name: messageData.userName || 'Remote User'
        },
        isTranslating: isTranslatingChat,
        translated: null
      }]);
    };
    
    // Register chat message handler
    webRTCService.onChatMessage(handleChatMessage);
    
    // Clean up
    return () => {
      // In a real implementation, we would unregister listeners here
    };
  }, [isTranslatingChat]);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle changes to selected language - translate existing messages when needed
  useEffect(() => {
    if (isTranslatingChat && selectedLanguage && isApiAvailable) {
      const translateMessages = async () => {
        // Only translate messages that don't have translations in this language
        const messagesToTranslate = messages.filter(
          msg => !msg.translated || msg.translationLanguage !== selectedLanguage
        );
        
        if (messagesToTranslate.length === 0) return;
        
        // Mark messages as being translated
        setMessages(prev => 
          prev.map(msg => {
            if (!msg.translated || msg.translationLanguage !== selectedLanguage) {
              return { ...msg, isTranslating: true };
            }
            return msg;
          })
        );
        
        // Translate each message one by one
        for (const msg of messagesToTranslate) {
          try {
            const translatedText = await translateChatMessage(msg.text, selectedLanguage);
            
            // Update the message with the translation
            setMessages(prev => 
              prev.map(m => {
                if (m.id === msg.id) {
                  return { 
                    ...m, 
                    translated: translatedText,
                    translationLanguage: selectedLanguage,
                    isTranslating: false
                  };
                }
                return m;
              })
            );
          } catch (error) {
            console.error(`Failed to translate message: ${msg.id}`, error);
            
            // Mark message as not translating (error occurred)
            setMessages(prev => 
              prev.map(m => {
                if (m.id === msg.id) {
                  return { ...m, isTranslating: false };
                }
                return m;
              })
            );
          }
        }
      };
      
      translateMessages();
    }
  }, [isTranslatingChat, selectedLanguage, messages, isApiAvailable]);
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    const messageData = {
      id: Date.now(),
      user: currentUser,
      text: newMessage,
      timestamp: new Date().toISOString(),
      translated: null,
      translationLanguage: null
    };
    
    setMessages(prev => [...prev, messageData]);
    setNewMessage('');
    
    // Send message to other participants if connected
    if (webRTCService.isConnected()) {
      webRTCService.sendMessage({
        text: newMessage,
        userName: currentUser.name,
        id: messageData.id,
        timestamp: messageData.timestamp
      });
    }
    
    // If translation is enabled, translate the sent message right away
    if (isTranslatingChat && selectedLanguage && isApiAvailable) {
      try {
        // Mark the message as translating
        setMessages(prev => 
          prev.map(m => {
            if (m.id === messageData.id) {
              return { ...m, isTranslating: true };
            }
            return m;
          })
        );
        
        const translatedText = await translateChatMessage(newMessage, selectedLanguage);
        
        setMessages(prev => 
          prev.map(m => {
            if (m.id === messageData.id) {
              return { 
                ...m, 
                translated: translatedText,
                translationLanguage: selectedLanguage,
                isTranslating: false
              };
            }
            return m;
          })
        );
      } catch (error) {
        console.error('Failed to translate message:', error);
        
        // Mark message as not translating (error occurred)
        setMessages(prev => 
          prev.map(m => {
            if (m.id === messageData.id) {
              return { ...m, isTranslating: false };
            }
            return m;
          })
        );
      }
    }
  };

  const toggleChatTranslation = () => {
    setIsTranslatingChat(prev => !prev);
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h3>Chat</h3>
        <div className="chat-controls">
          {isApiAvailable ? (
            <button 
              className={`translation-toggle ${isTranslatingChat ? 'active' : ''}`}
              onClick={toggleChatTranslation}
            >
              {isTranslatingChat ? 'Translation ON' : 'Translation OFF'}
            </button>
          ) : (
            <span className="api-missing-notice">Translation unavailable</span>
          )}
        </div>
      </div>
      
      <div className="chat-messages">
        {messages.length === 0 ? (
          <p className="no-messages">No messages yet</p>
        ) : (
          messages.map(message => (
            <div 
              key={message.id} 
              className={`message ${message.user.id === currentUser.id ? 'sent' : 'received'}`}
            >
              <div className="message-header">
                <span className="user-name">{message.user.name}</span>
                <span className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="message-body">{message.text}</div>
              
              {isTranslatingChat && (
                <div className="message-translation">
                  {message.isTranslating ? (
                    <span className="translating-indicator">Translating...</span>
                  ) : message.translated ? (
                    message.translated
                  ) : (
                    <span className="not-translated">Not translated yet</span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form className="chat-input" onSubmit={handleSendMessage}>
        <input 
          type="text" 
          placeholder="Type your message..." 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default ChatPanel;
