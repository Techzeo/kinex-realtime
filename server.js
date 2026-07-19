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
});

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  // JOIN ROOM
  socket.on("join-room", (roomId) => {
    socket.join(roomId);

    const room =
      io.sockets.adapter.rooms.get(roomId);

    io.to(roomId).emit("member-count", {
      count: room ? room.size : 1,
    });

    console.log(
      `${socket.id} joined room ${roomId}`
    );
  });

  // CHAT
  socket.on("chat-message", (data) => {
    io.to(data.roomId).emit(
      "new-message",
      data
    );
  });

  // REACTIONS
  socket.on("reaction", (data) => {
    io.to(data.roomId).emit(
      "reaction-received",
      data
    );
  });

  // VIDEO SYNC
  socket.on("sync-play", (data) => {
    socket.to(data.roomId).emit(
      "sync-play",
      data
    );
  });

  socket.on("sync-pause", (data) => {
    socket.to(data.roomId).emit(
      "sync-pause",
      data
    );
  });

  socket.on("sync-seek", (data) => {
    socket.to(data.roomId).emit(
      "sync-seek",
      data
    );
  });

  // WEBRTC SIGNALING
  socket.on("webrtc-offer", (data) => {
    socket.to(data.roomId).emit(
      "webrtc-offer",
      data
    );
  });

  socket.on("webrtc-answer", (data) => {
    socket.to(data.roomId).emit(
      "webrtc-answer",
      data
    );
  });

  socket.on("webrtc-candidate", (data) => {
    socket.to(data.roomId).emit(
      "webrtc-candidate",
      data
    );
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);

    io.emit("user-left", {
      socketId: socket.id,
    });
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(
    `Realtime running on port ${PORT}`
  );
});