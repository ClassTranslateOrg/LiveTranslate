import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Check for root element to prevent errors
const rootElement = document.getElementById('root');

if (!rootElement) {
  // Create root element if it doesn't exist
  const root = document.createElement('div');
  root.id = 'root';
  document.body.appendChild(root);
  console.warn('Root element was not found, created one dynamically');
}

// Create zoom container for the SDK to attach to in a safer way
if (!document.getElementById('zoom-container')) {
  const zoomContainer = document.createElement('div');
  zoomContainer.id = 'zoom-container';
  document.body.appendChild(zoomContainer);
  console.log('Created zoom container element');
}

// Log environment status
console.log('Application starting in environment:', 
  process.env.REACT_APP_ENV || 'development');
console.log('API URL:', process.env.REACT_APP_API_URL || 'http://localhost:3000');

// Create root with safeguard
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // Remove StrictMode to prevent double rendering which might cause issues with Zoom SDK
  <App />
);

// If you want to start measuring performance in your app, pass a function
reportWebVitals();
