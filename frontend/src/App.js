import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ZoomMtgEmbedded } from '@zoomus/websdk/embedded';
import './App.css';

// Components
import Header from './components/Header';
import Home from './components/Home';
import Meeting from './components/Meeting';
import NotFound from './components/NotFound';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // Fix the ESLint warning by using a destructuring pattern with _ prefix
  const [user, _setUser] = useState({ name: 'Guest User' }); // eslint-disable-line no-unused-vars
  
  // Initialize Zoom client
  useEffect(() => {
    try {
      const client = ZoomMtgEmbedded.createClient();
      
      // Store the client in window object for global access
      window.zoomClient = client;
      
      // Add localhost domain to ensure proper testing
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
      
      // Initialize the Zoom client
      client.init({
        debug: true,
        zoomAppRoot: document.getElementById('zoom-container'),
        language: 'en-US',
        // Add localhost to allowed domains for testing
        customLocalization: {
          locale: 'en-US',
          resources: {}
        },
        customize: {
          video: {
            isResizable: true,
            viewSizes: {
              default: {
                width: 1000,
                height: 600
              },
              ribbon: {
                width: 300,
                height: 700
              }
            }
          },
          meetingInfo: ['topic', 'host', 'mn', 'pwd', 'telPwd', 'invite', 'participant', 'dc', 'enctype'],
          toolbar: {
            buttons: [
              {
                text: 'Custom Button',
                className: 'CustomButton',
                onClick: () => {
                  console.log('custom button clicked');
                }
              }
            ]
          }
        }
      });
      
      console.log('Zoom SDK initialized with key from env:', process.env.REACT_APP_ZOOM_SDK_KEY ? 'Available' : 'Not Available');
      console.log('Using API URL for development:', apiUrl);
    } catch (err) {
      console.error('Failed to initialize Zoom SDK:', err);
    }
  }, []);

  return (
    <Router>
      <div className="App">
        <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} user={user} />
        <div className="container">
          <Routes>
            <Route path="/" element={<Home isLoggedIn={isLoggedIn} />} />
            <Route path="/meeting/:id" element={<Meeting />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
