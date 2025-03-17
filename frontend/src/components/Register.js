import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../contexts/AuthContext';
import googleIcon from '../assets/google-icon.png';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  
  const { signInWithGoogle } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const { name, email, username, password, confirmPassword } = formData;

    // Form validation
    if (!name || !email || !username || !password) {
      setError('All fields are required');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      // For now, just redirect to the AWS Cognito hosted UI
      const apiUrl = process.env.REACT_APP_API_URL || 
        (process.env.NODE_ENV === 'production' ? 'https://api.live-translate.org' : 'http://localhost:3001');
      
      window.location.href = `${apiUrl}/auth/login?redirect=${encodeURIComponent(window.location.origin)}`;
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
      console.error(error);
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    // Use the signInWithGoogle function from context if available
    if (typeof signInWithGoogle === 'function') {
      signInWithGoogle();
    } else {
      // Fallback for when the context function isn't available
      const apiUrl = process.env.REACT_APP_API_URL || 
        (process.env.NODE_ENV === 'production' ? 'https://api.live-translate.org' : 'http://localhost:3001');
      
      window.location.href = `${apiUrl}/auth/login?redirect=${encodeURIComponent(window.location.origin)}`;
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{isVerifying ? 'Verify Your Email' : 'Create an Account'}</h2>
        
        {error && <div className="auth-error">{error}</div>}
        
        {!isVerifying ? (
          <>
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  disabled={isLoading}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  disabled={isLoading}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Create a username"
                  disabled={isLoading}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a password"
                  disabled={isLoading}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  disabled={isLoading}
                />
              </div>
              
              <button 
                type="submit" 
                className="auth-button primary-button"
                disabled={isLoading}
              >
                {isLoading ? 'Registering...' : 'Register'}
              </button>
            </form>
            
            <div className="auth-separator">
              <span>OR</span>
            </div>
            
            <button 
              onClick={handleGoogleSignIn} 
              className="auth-button google-button"
              disabled={isLoading}
            >
              <img src={googleIcon} alt="Google" className="google-icon" />
              Sign up with Google
            </button>
          </>
        ) : (
          <form onSubmit={(e) => e.preventDefault()} className="auth-form">
            <div className="form-group">
              <label htmlFor="verificationCode">Verification Code</label>
              <input
                id="verificationCode"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter the verification code sent to your email"
                disabled={isLoading}
              />
            </div>
            
            <button 
              type="submit" 
              className="auth-button primary-button"
              disabled={isLoading}
            >
              {isLoading ? 'Verifying...' : 'Verify'}
            </button>
          </form>
        )}
        
        <div className="auth-links">
          <p>
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
