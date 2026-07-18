const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
  });

  socket.on("chat-message", (data) => {
    io.to(data.roomId).emit(
      "new-message",
      data
    );
  });

  socket.on("reaction", (data) => {
    io.to(data.roomId).emit(
      "reaction-received",
      data
    );
  });

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
    console.log("Disconnected");
  });
});

server.listen(
  process.env.PORT || 3001,
  () => {
    console.log("Realtime running");
  }
);