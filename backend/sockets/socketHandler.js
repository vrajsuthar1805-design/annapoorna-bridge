// Socket.io Real-Time Handler for Annapoorna Bridge

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    // console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Join city room for localized food alerts
    socket.on('join:city', (city) => {
      if (city) {
        socket.join(`city:${city}`);
        // console.log(`[Socket.io] ${socket.id} joined city room: city:${city}`);
      }
    });

    // Leave city room
    socket.on('leave:city', (city) => {
      if (city) {
        socket.leave(`city:${city}`);
      }
    });

    // Join private user room for targeted notifications (claims, handoff OTPs)
    socket.on('join:user', (userId) => {
      if (userId) {
        socket.join(`user:${userId}`);
        // console.log(`[Socket.io] ${socket.id} joined personal room: user:${userId}`);
      }
    });

    // Join admin room
    socket.on('join:admin', () => {
      socket.join('room:admin');
    });

    // Heartbeat / ping
    socket.on('ping', () => {
      socket.emit('pong', { serverTime: Date.now() });
    });

    socket.on('disconnect', () => {
      // client disconnected
    });
  });
};

module.exports = socketHandler;
