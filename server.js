import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();

const PORT = process.env.PORT || 5173;

// Allow your front-end origin
const allowedOrigins = ["https://realspot.ezimone.com"];

app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Store Admin/GM sockets
const adminSockets = new Map();

// Store all users to track login/logout
const userSockets = new Map();

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("registerAdmin", ({ role }) => {
    if (role === "Admin" || role === "General Manager") {
      adminSockets.set(socket.id, role);
      console.log(`${role} registered:`, socket.id);
    }
  });

  socket.on("registerUser", ({ userId, name }) => {
    userSockets.set(socket.id, { userId, name });
    console.log(`User ${name} logged in:`, socket.id);

    // Notify Admin/GM about login
    adminSockets.forEach((role, adminId) => {
      io.to(adminId).emit("adminNotification", {
        title: "User Login",
        message: `${name} logged in`,
        user: name,
        type: "login",
      });
    });
  });

  socket.on("disconnect", () => {
    if (userSockets.has(socket.id)) {
      const { name } = userSockets.get(socket.id);

      // Notify Admin/GM about logout
      adminSockets.forEach((role, adminId) => {
        io.to(adminId).emit("adminNotification", {
          title: "User Logout",
          message: `${name} logged out`,
          user: name,
          type: "logout",
        });
      });

      userSockets.delete(socket.id);
      console.log(`User ${name} disconnected:`, socket.id);
    }

    if (adminSockets.has(socket.id)) {
      console.log(`${adminSockets.get(socket.id)} disconnected:`, socket.id);
      adminSockets.delete(socket.id);
    }

    console.log("Client disconnected:", socket.id);
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    adminsOnline: adminSockets.size,
    usersOnline: userSockets.size,
  });
});

server.listen(PORT, () => {
  console.log(`✅ Socket.IO server running on port ${PORT}`);
});
