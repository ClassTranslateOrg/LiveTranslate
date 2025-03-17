const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const { Issuer, generators } = require('openid-client');

// Initialize Express app
const app = express();
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://live-translate.org' 
    : 'http://localhost:3000',
  credentials: true
}));

// Configure session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'live-translate-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Set view engine (for auth pages)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? 'https://live-translate.org' 
      : 'http://localhost:3000',
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000
});

// Store room-user mappings
const rooms = {};

// Store user language preferences
const userLanguages = {};

// Initialize OpenID Client
let client;
async function initializeClient() {
  try {
    const cognitoRegion = process.env.AWS_REGION || 'us-east-1';
    const userPoolId = process.env.COGNITO_USER_POOL_ID || 'us-east-1_Dr3AFoo3j';
    const clientId = process.env.COGNITO_CLIENT_ID || '4cjk56hs0n3ght6n1bjes86d2e';
    const domain = process.env.APP_DOMAIN || 'live-translate.org';
    
    // Discover the OpenID configuration
    const issuer = await Issuer.discover(`https://cognito-idp.${cognitoRegion}.amazonaws.com/${userPoolId}`);
    
    client = new issuer.Client({
      client_id: clientId,
      // Only set client_secret if you're using a confidential client
      ...(process.env.COGNITO_CLIENT_SECRET && { 
        client_secret: process.env.COGNITO_CLIENT_SECRET 
      }),
      redirect_uris: [
        process.env.NODE_ENV === 'production' 
          ? `https://${domain}/auth/callback` 
          : 'http://localhost:3000/auth/callback'
      ],
      response_types: ['code']
    });
    
    console.log('OpenID Client initialized successfully');
  } catch (error) {
    console.error('Error initializing OpenID Client:', error);
  }
}

// Initialize the client
initializeClient().catch(console.error);

// Authentication middleware
const checkAuth = (req, res, next) => {
  if (!req.session.userInfo) {
    req.isAuthenticated = false;
  } else {
    req.isAuthenticated = true;
  }
  next();
};

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Auth routes
app.get('/auth/login', (req, res) => {
  try {
    const nonce = generators.nonce();
    const state = generators.state();

    req.session.nonce = nonce;
    req.session.state = state;

    // Store the original URL to redirect back after login
    if (req.query.redirect) {
      req.session.redirectUrl = req.query.redirect;
    }

    const authUrl = client.authorizationUrl({
      scope: 'openid email profile',
      state: state,
      nonce: nonce,
    });

    res.redirect(authUrl);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Authentication error', details: error.message });
  }
});

app.get('/auth/callback', async (req, res) => {
  try {
    const params = client.callbackParams(req);
    const tokenSet = await client.callback(
      process.env.NODE_ENV === 'production' 
        ? `https://${process.env.APP_DOMAIN || 'live-translate.org'}/auth/callback`
        : 'http://localhost:3000/auth/callback',
      params,
      {
        nonce: req.session.nonce,
        state: req.session.state
      }
    );

    const userInfo = await client.userinfo(tokenSet.access_token);
    req.session.userInfo = userInfo;
    req.session.tokens = {
      access_token: tokenSet.access_token,
      id_token: tokenSet.id_token,
      refresh_token: tokenSet.refresh_token
    };

    // Redirect back to the original URL or default to home page
    const redirectUrl = req.session.redirectUrl || '/';
    delete req.session.redirectUrl;
    
    res.redirect(redirectUrl);
  } catch (err) {
    console.error('Callback error:', err);
    res.status(500).json({ error: 'Authentication callback error', details: err.message });
  }
});

app.get('/auth/logout', (req, res) => {
  const logoutUrl = `https://${process.env.COGNITO_DOMAIN || 'auth.live-translate.org'}/logout?client_id=${
    process.env.COGNITO_CLIENT_ID || '4cjk56hs0n3ght6n1bjes86d2e'
  }&logout_uri=${
    process.env.NODE_ENV === 'production'
      ? `https://${process.env.APP_DOMAIN || 'live-translate.org'}`
      : 'http://localhost:3000'
  }`;
  
  req.session.destroy();
  res.redirect(logoutUrl);
});

app.get('/auth/user', checkAuth, (req, res) => {
  if (req.isAuthenticated) {
    res.json({ 
      isAuthenticated: true, 
      user: req.session.userInfo 
    });
  } else {
    res.json({ 
      isAuthenticated: false, 
      user: null 
    });
  }
});

// Socket.io event handlers
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // When a user joins a meeting room
  socket.on('join-room', (roomId, userData = {}) => {
    // Leave previous rooms
    if (socket.roomId) {
      socket.leave(socket.roomId);
      if (rooms[socket.roomId]) {
        rooms[socket.roomId] = rooms[socket.roomId].filter(id => id !== socket.id);
        
        // Notify others that this user has left
        socket.to(socket.roomId).emit('user-left', socket.id);
      }
    }

    // Join new room
    socket.join(roomId);
    socket.roomId = roomId;

    // Add user to room
    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }
    rooms[roomId].push(socket.id);
    
    // Store user language preference if provided
    if (userData.language) {
      userLanguages[socket.id] = userData.language;
    }

    // Notify existing users in the room
    socket.to(roomId).emit('user-joined', {
      userId: socket.id,
      userData: {
        name: userData.name || 'Anonymous',
        language: userData.language || 'en',
        // Include other user data as needed
      }
    });

    // Send existing users to the new user
    const usersInRoom = rooms[roomId]
      .filter(id => id !== socket.id)
      .map(id => ({
        userId: id,
        userData: {
          name: 'Remote User', // This would come from a user store in a real app
          language: userLanguages[id] || 'en'
        }
      }));
      
    socket.emit('room-users', usersInRoom);
    
    console.log(`User ${socket.id} joined room ${roomId} with language ${userData.language || 'en'}`);
  });

  // WebRTC signaling
  socket.on('signal', (data) => {
    io.to(data.userId).emit('signal', {
      userId: socket.id,
      signal: data.signal
    });
  });
  
  // Handle chat messages
  socket.on('chat-message', (message) => {
    if (socket.roomId) {
      // Broadcast the message to all users in the room
      io.to(socket.roomId).emit('chat-message', {
        userId: socket.id,
        message: {
          ...message,
          timestamp: new Date().toISOString()
        }
      });
      
      console.log(`Message in room ${socket.roomId} from ${socket.id}:`, message.text.substring(0, 50));
    }
  });
  
  // Handle language preference changes
  socket.on('set-language', (language) => {
    userLanguages[socket.id] = language;
    
    // Notify room members of language change
    if (socket.roomId) {
      socket.to(socket.roomId).emit('user-language-changed', {
        userId: socket.id,
        language
      });
      
      console.log(`User ${socket.id} changed language to ${language}`);
    }
  });
  
  // Handle translations from one user that can be shared with others
  socket.on('translation-result', (data) => {
    if (socket.roomId) {
      // Share translation results with other users in the room
      socket.to(socket.roomId).emit('translation-result', {
        userId: socket.id,
        ...data
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Remove user from room
    if (socket.roomId && rooms[socket.roomId]) {
      rooms[socket.roomId] = rooms[socket.roomId].filter(id => id !== socket.id);
      
      // Notify others that this user has left
      socket.to(socket.roomId).emit('user-left', socket.id);
      
      // Clean up empty rooms
      if (rooms[socket.roomId].length === 0) {
        delete rooms[socket.roomId];
      }
    }
    
    // Clean up user language preference
    if (userLanguages[socket.id]) {
      delete userLanguages[socket.id];
    }
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Mode: ${process.env.NODE_ENV || 'development'}`);
});

// Handle process shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down server');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
