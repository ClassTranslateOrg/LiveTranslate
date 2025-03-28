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
  
  const currentUser = {
    id: webRTCService.socket?.id || 'local',
    name: user?.name || user?.email || 'You'
  };
  
  useEffect(() => {
    if (!process.env.REACT_APP_OPENAI_API_KEY) {
      console.warn('OpenAI API key not found. Translation service will not work.');
      setIsApiAvailable(false);
    }
  }, []);
  
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
    
    webRTCService.onChatMessage(handleChatMessage);
    
    // Clean up
    return () => {
    };
  }, [isTranslatingChat]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isTranslatingChat && selectedLanguage && isApiAvailable) {
      const translateMessages = async () => {
        // Only translate messages that don't have translations in this language
        const messagesToTranslate = messages.filter(
          msg => !msg.translated || msg.translationLanguage !== selectedLanguage
        );
        
        if (messagesToTranslate.length === 0) return;
        
        setMessages(prev => 
          prev.map(msg => {
            if (!msg.translated || msg.translationLanguage !== selectedLanguage) {
              return { ...msg, isTranslating: true };
            }
            return msg;
          })
        );
        
        for (const msg of messagesToTranslate) {
          try {
            const translatedText = await translateChatMessage(msg.text, selectedLanguage);
            
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
    
    if (webRTCService.isConnected()) {
      webRTCService.sendMessage({
        text: newMessage,
        userName: currentUser.name,
        id: messageData.id,
        timestamp: messageData.timestamp
      });
    }
    
    if (isTranslatingChat && selectedLanguage && isApiAvailable) {
      try {
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
