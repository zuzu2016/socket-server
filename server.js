import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

const app = express();
const PORT = process.env.PORT || 5173;

const ALLOWED_ORIGINS = ["https://realspot.ezimone.com"];

app.use(cors({
  origin: ALLOWED_ORIGINS,
  methods: ["GET", "POST"],
  credentials: true
}));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket", "polling"]
});

// Store Admin/GM sockets
const adminSockets = new Map();
// Store regular user info
const userSockets = new Map();

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Register Admin or GM
  socket.on("registerAdmin", ({ role }) => {
    if (role === "Admin" || role === "General Manager") {
      adminSockets.set(socket.id, role);
      console.log(`${role} registered:`, socket.id);
    }
  });

  // Register normal user
  socket.on("registerUser", ({ userId, name }) => {
    userSockets.set(socket.id, { userId, name });
    console.log(`User registered: ${name} (${socket.id})`);

    // Notify Admins/GM about login
    adminSockets.forEach((role, adminSocketId) => {
      io.to(adminSocketId).emit("adminNotification", {
        title: "User Login",
        message: `${name} logged in`,
        user: name,
        action: "logged in"
      });
    });
  });

  socket.on("disconnect", () => {
    if (adminSockets.has(socket.id)) {
      console.log(`${adminSockets.get(socket.id)} disconnected:`, socket.id);
      adminSockets.delete(socket.id);
    } else if (userSockets.has(socket.id)) {
      const user = userSockets.get(socket.id);
      console.log(`User disconnected: ${user.name} (${socket.id})`);
      
      // Notify Admins/GM about logout
      adminSockets.forEach((role, adminSocketId) => {
        io.to(adminSocketId).emit("adminNotification", {
          title: "User Logout",
          message: `${user.name} logged out`,
          user: user.name,
          action: "logged out"
        });
      });

      userSockets.delete(socket.id);
    } else {
      console.log("Client disconnected:", socket.id);
    }
  });
});

server.listen(PORT, () => {
  console.log(`✅ Socket.IO server running on port ${PORT}`);
});
