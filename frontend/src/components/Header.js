import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from '../contexts/AuthContext';

const Header = () => {
  const { isAuthenticated, user, signOut, isLoading } = useContext(AuthContext);

  const handleLogout = () => {
    signOut();
  };

  return (
    <header className="header">
      <div className="logo-container">
        <Link to="/">
          <div className="text-logo">LT</div>
        </Link>
        <h1>LiveTranslate</h1>
      </div>
      <nav className="navigation">
        <ul>
          <li><Link to="/">Home</Link></li>
          <li><Link to="/about">About</Link></li>
          <li><Link to="/contact">Contact</Link></li>
        </ul>
      </nav>
      <div className="auth-buttons">
        {isLoading ? (
          <span>Loading...</span>
        ) : isAuthenticated ? (
          <>
            <span className="user-name">Hello, {user?.attributes?.name || user?.username}</span>
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="login-btn">Login</Link>
            <Link to="/register" className="register-btn">Sign Up</Link>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
