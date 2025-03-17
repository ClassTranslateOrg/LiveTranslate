const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Store room-user mappings
const rooms = {};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join-room', (roomId) => {
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

    // Notify existing users in the room
    socket.to(roomId).emit('user-joined', socket.id);

    // Send existing users to the new user
    const usersInRoom = rooms[roomId].filter(id => id !== socket.id);
    usersInRoom.forEach(userId => {
      socket.emit('user-joined', userId);
    });

    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on('signal', (data) => {
    io.to(data.userId).emit('signal', {
      userId: socket.id,
      signal: data.signal
    });
  });

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
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
