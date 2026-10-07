let ioInstance = null;

function initSocket(io) {
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Join room based on user role or user ID
    socket.on('join:user', (userId) => {
      if (userId) {
        socket.join(`user:${userId}`);
        console.log(`[Socket.io] Socket ${socket.id} joined user:${userId}`);
      }
    });

    socket.on('join:city', (city) => {
      if (city) {
        const normalizedCity = city.trim().toLowerCase();
        socket.join(`city:${normalizedCity}`);
        console.log(`[Socket.io] Socket ${socket.id} joined city:${normalizedCity}`);
      }
    });

    socket.on('join:role', (role) => {
      if (role) {
        socket.join(`role:${role}`);
        console.log(`[Socket.io] Socket ${socket.id} joined role:${role}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  return ioInstance;
}

function getIO() {
  return ioInstance;
}

/**
 * Emit real-time events to all relevant clients
 */
function emitEvent(event, data, room = null) {
  if (!ioInstance) return;
  if (room) {
    ioInstance.to(room).emit(event, data);
  } else {
    ioInstance.emit(event, data);
  }
}

module.exports = {
  initSocket,
  getIO,
  emitEvent,
};
