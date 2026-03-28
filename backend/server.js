require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const driverRoutes = require('./routes/driver');
const trackingRoutes = require('./routes/tracking');

// Import models
const Location = require('./models/Location');
const Bus = require('./models/Bus');

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/tracking', trackingRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Driver sends location
  socket.on('sendLocation', async (data) => {
    try {
      const { busId, lat, lng, availableSeats } = data;

      // Save location to database
      await Location.create({
        busId,
        lat,
        lng
      });

      // Update available seats if provided
      if (availableSeats !== undefined) {
        await Bus.findByIdAndUpdate(busId, { availableSeats });
      }

      // Broadcast to all connected clients
      io.emit('receiveLocation', {
        busId,
        lat,
        lng,
        availableSeats,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error saving location:', error);
      socket.emit('locationError', { message: 'Failed to save location' });
    }
  });

  // Driver starts trip
  socket.on('tripStarted', async (data) => {
    try {
      const { busId } = data;
      await Bus.findByIdAndUpdate(busId, { isActive: true });
      io.emit('busStatusChanged', { busId, isActive: true });
    } catch (error) {
      console.error('Error starting trip:', error);
    }
  });

  // Driver stops trip
  socket.on('tripStopped', async (data) => {
    try {
      const { busId } = data;
      await Bus.findByIdAndUpdate(busId, { isActive: false });
      io.emit('busStatusChanged', { busId, isActive: false });
    } catch (error) {
      console.error('Error stopping trip:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Create default admin if not exists
const User = require('./models/User');
const createDefaultAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      await User.create({
        name: 'Admin',
        email: 'admin@trackit.com',
        password: 'admin123',
        role: 'admin',
        phoneNumber: '0000000000'
      });
      console.log('Default admin created: admin@trackit.com / admin123');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
};

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  createDefaultAdmin();
});
