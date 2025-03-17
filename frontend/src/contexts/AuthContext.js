import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Get API URL based on environment
  const getApiUrl = () => {
    if (process.env.REACT_APP_API_URL) {
      return process.env.REACT_APP_API_URL;
    }
    return process.env.NODE_ENV === 'production' 
      ? 'https://api.live-translate.org' 
      : 'http://localhost:3001';
  };

  // Check authentication status on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setIsLoading(true);
        const apiUrl = getApiUrl();
        
        const response = await axios.get(`${apiUrl}/auth/user`, {
          withCredentials: true
        });
        
        if (response.data.isAuthenticated && response.data.user) {
          setUser(response.data.user);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error checking authentication status:', error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuthStatus();
  }, []);

  // Sign in function (redirects to Cognito login)
  const signIn = (redirectUrl = window.location.href) => {
    const apiUrl = getApiUrl();
    const encodedRedirect = encodeURIComponent(redirectUrl);
    window.location.href = `${apiUrl}/auth/login?redirect=${encodedRedirect}`;
  };

  // Sign in with Google (uses Cognito's federated login)
  const signInWithGoogle = (redirectUrl = window.location.href) => {
    // The Google option will be available in the Cognito hosted UI
    signIn(redirectUrl);
  };

  // Sign out function
  const signOut = () => {
    const apiUrl = getApiUrl();
    window.location.href = `${apiUrl}/auth/logout`;
  };

  const authContextValue = {
    user,
    isAuthenticated,
    isLoading,
    authError,
    signIn,
    signInWithGoogle,
    signOut
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
