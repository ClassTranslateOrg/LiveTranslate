import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = ({ isLoggedIn }) => {
  const [meetingId, setMeetingId] = useState('');
  const [name, setName] = useState('');
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);
  const navigate = useNavigate();

  const handleJoinMeeting = (e) => {
    e.preventDefault();
    if (meetingId) {
      navigate(`/meeting/${meetingId}`);
    }
  };

  const handleCreateMeeting = async () => {
    setIsCreatingMeeting(true);
    
    try {
      // In a real app, this would be an API call to create a meeting
      const mockMeetingId = Math.floor(100000000 + Math.random() * 900000000);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      navigate(`/meeting/${mockMeetingId}`);
    } catch (error) {
      console.error('Failed to create meeting:', error);
      alert('Failed to create meeting. Please try again.');
    } finally {
      setIsCreatingMeeting(false);
    }
  };

  return (
    <div className="home-container">
      <div className="hero-section">
        <h1>Live Translation for Video Meetings</h1>
        <p>Connect with anyone, anywhere, in any language with real-time translation powered by AI.</p>
      </div>
      
      <div className="meeting-actions">
        <div className="join-meeting">
          <h2>Join a Meeting</h2>
          <form onSubmit={handleJoinMeeting}>
            <input
              type="text"
              placeholder="Meeting ID"
              value={meetingId}
              onChange={(e) => setMeetingId(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <button type="submit">Join</button>
          </form>
        </div>
        
        <div className="create-meeting">
          <h2>Start a New Meeting</h2>
          <p>Create an instant meeting and invite others to join</p>
          <button 
            onClick={handleCreateMeeting}
            disabled={isCreatingMeeting}
          >
            {isCreatingMeeting ? 'Creating...' : 'Create Meeting'}
          </button>
        </div>
      </div>
      
      <div className="features-section">
        <h2>Key Features</h2>
        <div className="features-grid">
          <div className="feature">
            <h3>Live Translation</h3>
            <p>Real-time translation powered by OpenAI's Whisper in multiple languages</p>
          </div>
          <div className="feature">
            <h3>High Quality Video</h3>
            <p>Crystal clear video and audio through Zoom SDK integration</p>
          </div>
          <div className="feature">
            <h3>Built-In Chat</h3>
            <p>Text with participants during your meeting</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
