import express from "express";
import { Server } from "socket.io";
import http from "http";

const app = express();
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" } // allow all origins for testing
});

const adminSockets = new Set();

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("registerAdmin", (data) => {
    if (data.role === "Admin" || data.role === "General Manager") {
      adminSockets.add(socket.id);
      console.log("Admin registered:", socket.id);
    }
  });

  socket.on("disconnect", () => {
    adminSockets.delete(socket.id);
    console.log("Client disconnected:", socket.id);
  });
});

app.post("/notifyAdmin", (req, res) => {
  const data = req.body;
  console.log("Notify Admin:", data);

  adminSockets.forEach((id) => io.to(id).emit("adminNotification", data));

  res.json({ status: "ok", sentTo: adminSockets.size });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});
