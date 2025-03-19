import React from 'react';
import { Link } from 'react-router-dom';

const About = () => {
  return (
    <div className="about-container">
      <div className="about-header">
        <h1>About LiveTranslate</h1>
      </div>
      
      <div className="about-section">
        <h2>Our Mission</h2>
        <p>
          LiveTranslate aims to break down language barriers in virtual communication by providing real-time translation
          of speech and text.
        </p>
      </div>
      
      <div className="about-section">
        <h2>Technology Stack</h2>
        <div className="tech-stack-grid">
          <div className="tech-item">
            <h3>Real-time Translation</h3>
            <p>OpenAI's Whisper API with real-time translation across multiple languages.</p>
          </div>
          
          <div className="tech-item">
            <h3>Video Conferencing</h3>
            <p>Update later</p>
          </div>
          
          <div className="tech-item">
            <h3>Cloud Infrastructure</h3>
            <p>N/A</p>
          </div>
        </div>
      </div>
      
      <div className="about-section">
        <h2>How it Works</h2>
        <ol>
          <li><strong>Start or Join a Meeting</strong> - Create a new meeting or join an existing one with a meeting ID</li>
          <li><strong>Select Your Language</strong> - Choose your preferred language for translation</li>
          <li><strong>Speak Naturally</strong> - Our system will automatically detect and translate speech</li>
          <li><strong>View Translations</strong> - See translations in real-time in the translation panel</li>
          <li><strong>Chat with Translation</strong> - Send and receive text messages with automatic translation</li>
        </ol>
      </div>
      
      <div className="about-section">
        <h2>Get Started</h2>
        <p>
          Ready to experience seamless communication across languages? <Link to="/">Start a meeting</Link> now or 
          <Link to="/contact"> contact us</Link> for more information.
        </p>
      </div>
    </div>
  );
};

export default About;
