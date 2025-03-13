import React from 'react';
import { Link } from 'react-router-dom';

const Header = ({ isLoggedIn, setIsLoggedIn, user }) => {
  const handleLogout = () => {
    // Handle logout logic
    setIsLoggedIn(false);
  };

  return (
    <header className="header">
      <div className="logo-container">
        <Link to="/">
          {/* Replace image with text logo for now */}
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
        {isLoggedIn ? (
          <>
            <span className="user-name">Hello, {user?.name}</span>
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
