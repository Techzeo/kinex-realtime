const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

app.get("/", (req, res) => {
  res.json({
    status: "online",
    service: "Kinex Realtime Server",
  });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"]
});

// Track users per room manually
const roomUsers = {}; // { roomId: [socketId, socketId] }

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  // JOIN ROOM - for chat + video sync
  socket.on("join-room", (roomId) => {
    socket.join(roomId);

    if (!roomUsers[roomId]) {
      roomUsers[roomId] = [];
    }

    // Prevent duplicates
    if (!roomUsers[roomId].includes(socket.id)) {
      roomUsers[roomId].push(socket.id);
    }

    // 1. Send existing users to the new user for WebRTC offers
    socket.emit("existing-users", roomUsers[roomId].filter(id => id!== socket.id));

    // 2. Tell others someone joined
    socket.to(roomId).emit("user-joined", { socketId: socket.id });

    // 3. Update member count
    io.to(roomId).emit("member-count", { count: roomUsers[roomId].length });

    console.log(`${socket.id} joined room ${roomId}`);
  });

  // JOIN ROOM VOICE - separate event for webrtc
  socket.on("join-room-voice", ({ roomId, username }) => {
    socket.join(roomId);
    console.log(`${socket.id} joined voice in ${roomId}`);

    const othersInRoom = roomUsers[roomId]?.filter(id => id!== socket.id) || [];

    // Tell new user who is already here
    socket.emit("all-users", othersInRoom);

    // Tell everyone else that new user joined
    socket.to(roomId).emit("user-joined", { socketId: socket.id });
  });

  // CHAT
  socket.on("chat-message", (data) => {
    io.to(data.roomId).emit("new-message", data);
  });

  // REACTIONS
  socket.on("reaction", (data) => {
    socket.to(data.roomId).emit("reaction-received", data);
  });

  // VIDEO SYNC
  socket.on("sync-play", (data) => {
    socket.to(data.roomId).emit("sync-play");
  });

  socket.on("sync-pause", (data) => {
    socket.to(data.roomId).emit("sync-pause");
  });

  socket.on("sync-seek", (data) => {
    socket.to(data.roomId).emit("sync-seek", data);
  });

  // WEBRTC SIGNALING - FIXED: use target instead of targetId
  socket.on("webrtc-offer", ({ target, caller, signal }) => {
    io.to(target).emit("webrtc-offer", { signal, caller });
  });

  socket.on("webrtc-answer", ({ target, signal }) => {
    io.to(target).emit("webrtc-answer", { signal, id: socket.id });
  });

  socket.on("webrtc-candidate", ({ target, signal }) => {
    io.to(target).emit("webrtc-candidate", { signal, id: socket.id });
  });

  // DISCONNECT HANDLER
  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);

    Object.keys(roomUsers).forEach((roomId) => {
      const wasInRoom = roomUsers[roomId].includes(socket.id);

      roomUsers[roomId] = roomUsers[roomId].filter(id => id!== socket.id);

      if (wasInRoom) {
        socket.to(roomId).emit("user-left", { socketId: socket.id });
        io.to(roomId).emit("member-count", { count: roomUsers[roomId].length });

        if (roomUsers[roomId].length === 0) {
          delete roomUsers[roomId];
        }
      }
    });
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Realtime running on port ${PORT}`);
});