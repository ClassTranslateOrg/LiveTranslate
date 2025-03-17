import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import './App.css';

// AWS Amplify configuration
import awsconfig from './aws-exports';

// Components
import Header from './components/Header';
import Home from './components/Home';
import Meeting from './components/Meeting';
import NotFound from './components/NotFound';

// Configure Amplify
Amplify.configure(awsconfig);

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState({ name: 'Guest User' });

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
