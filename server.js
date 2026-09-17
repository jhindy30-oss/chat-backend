const http = require('http');
const { Server } = require('socket.io');

// Create a standard HTTP server
const server = http.createServer();

const io = new Server(server, { 
  cors: { origin: "*" } 
});

let availableHosts = new Set(); 
let waitingGuests = []; 

io.on('connection', (socket) => {
  socket.on('register-host', () => {
    availableHosts.add(socket.id);
    socket.emit('queue-update', waitingGuests);
  });

 socket.on('request-agent', (guestData) => {
  const guestRequest = { 
    guestId: socket.id, 
    source: guestData.source,
    profile: guestData.profile // Captures the new form data
  };
  waitingGuests.push(guestRequest);
  io.to(Array.from(availableHosts)).emit('new-guest-waiting', guestRequest);
});

  socket.on('accept-guest', (guestId) => {
    const roomId = `room_${guestId}_${socket.id}`;
    waitingGuests = waitingGuests.filter(g => g.guestId !== guestId);
    
    socket.join(roomId);
    io.sockets.sockets.get(guestId)?.join(roomId);
    
    io.to(roomId).emit('chat-started', { roomId });
    io.to(Array.from(availableHosts)).emit('queue-update', waitingGuests);
  });

  socket.on('send-message', ({ roomId, text }) => {
    socket.to(roomId).emit('receive-message', { text, senderId: socket.id });
  });

  socket.on('disconnect', () => {
    availableHosts.delete(socket.id);
    waitingGuests = waitingGuests.filter(g => g.guestId !== socket.id);
  });
});

// Listen on Render's assigned port OR 3001 for local development
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
