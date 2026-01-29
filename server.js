import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

const app = express();
const PORT = process.env.PORT || 5173;

/* ---------------------------------
   CORS CONFIG
---------------------------------- */
const ALLOWED_ORIGINS = ["https://realspot.ezimone.com"];

app.use(cors({
  origin: ALLOWED_ORIGINS,
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(express.json());

/* ---------------------------------
   HTTP + SOCKET SERVER
---------------------------------- */
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket", "polling"]
});

/* ---------------------------------
   SOCKET STORES
---------------------------------- */
// socket.id => role
const adminSockets = new Map();

// socket.id => { userId, name }
const userSockets = new Map();

/* ---------------------------------
   SOCKET EVENTS
---------------------------------- */
io.on("connection", (socket) => {
  console.log("🔌 Connected:", socket.id);

  /* -------- Admin / GM -------- */
  socket.on("registerAdmin", ({ role }) => {
    if (role === "Admin" || role === "General Manager") {
      adminSockets.set(socket.id, role);
      console.log(`🛡 ${role} registered:`, socket.id);
    }
  });

  /* -------- Normal User -------- */
  socket.on("registerUser", ({ userId, name }) => {
    userSockets.set(socket.id, { userId, name });

    console.log(`👤 User logged in: ${name}`);

    notifyAdmins({
      title: "User Login",
      message: `${name} logged in`,
      event: "login",
      user: name
    });
  });

  /* -------- Disconnect -------- */
  socket.on("disconnect", () => {

    /* Admin / GM disconnect */
    if (adminSockets.has(socket.id)) {
      console.log(`🛡 ${adminSockets.get(socket.id)} disconnected`);
      adminSockets.delete(socket.id);
      return;
    }

    /* User disconnect */
    if (userSockets.has(socket.id)) {
      const user = userSockets.get(socket.id);
      console.log(`👤 User logged out: ${user.name}`);

      notifyAdmins({
        title: "User Logout",
        message: `${user.name} logged out`,
        event: "logout",
        user: user.name
      });

      userSockets.delete(socket.id);
      return;
    }

    console.log("❌ Unknown socket disconnected:", socket.id);
  });
});

/* ---------------------------------
   HELPER: NOTIFY ADMINS
---------------------------------- */
function notifyAdmins(payload) {
  adminSockets.forEach((role, adminSocketId) => {
    io.to(adminSocketId).emit("adminNotification", {
      ...payload,
      role,
      time: new Date().toISOString()
    });
  });

  console.log(
    `📢 Notification sent to ${adminSockets.size} admin(s)`
  );
}

/* ---------------------------------
   START SERVER
---------------------------------- */
server.listen(PORT, () => {
  console.log(`✅ Socket.IO server running on port ${PORT}`);
});
