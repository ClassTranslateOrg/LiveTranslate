import React, { useState, useEffect, useRef } from 'react';

const ChatPanel = ({ meetingId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  
  // Mock user data
  const currentUser = {
    id: '123',
    name: 'Current User'
  };
  
  // Simulate receiving messages
  useEffect(() => {
    // This would actually be implemented using WebSockets or similar
    const mockIncomingMessage = setTimeout(() => {
      const mockMessage = {
        id: Date.now(),
        user: {
          id: '456',
          name: 'Other Participant'
        },
        text: 'Hello! How are you doing today?',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, mockMessage]);
    }, 2000);
    
    return () => clearTimeout(mockIncomingMessage);
  }, []);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    const message = {
      id: Date.now(),
      user: currentUser,
      text: newMessage,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  return (
    <div className="chat-panel">
      <h3>Chat</h3>
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
