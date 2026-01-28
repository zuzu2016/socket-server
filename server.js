import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

const app = express();

/* ---------------------------------
   CONFIG
---------------------------------- */
const PORT = process.env.PORT || 5173;
const ALLOWED_ORIGINS = ["https://realspot.ezimone.com"];

/* ---------------------------------
   MIDDLEWARE
---------------------------------- */
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true
}));
app.use(express.json());

/* ---------------------------------
   HTTP SERVER
---------------------------------- */
const server = http.createServer(app);

/* ---------------------------------
   SOCKET.IO
---------------------------------- */
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    credentials: true
  },
  transports: ["polling"] // websocket blocked on your host
});

/* ---------------------------------
   SOCKET EVENTS
---------------------------------- */
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("registerAdmin", ({ role }) => {
    if (role === "Admin") {
      socket.join("admins");
      console.log("Admin joined:", socket.id);
    }

    if (role === "General Manager") {
      socket.join("gms");
      console.log("GM joined:", socket.id);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

/* ---------------------------------
   USER LOGIN / LOGOUT NOTIFIER
---------------------------------- */
app.post("/user-activity", (req, res) => {
  const { user, action } = req.body;

  if (!user || !action) {
    return res.status(400).json({
      status: "error",
      message: "user and action are required"
    });
  }

  const notification = {
    title: "User Activity",
    message: `${user} has ${action}`,
    time: new Date().toISOString()
  };

  // Send ONLY to Admin + GM
  io.to("admins").emit("adminNotification", notification);
  io.to("gms").emit("adminNotification", notification);

  console.log(`🔔 ${user} ${action}`);

  res.json({ status: "ok" });
});

/* ---------------------------------
   HEALTH CHECK
---------------------------------- */
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime()
  });
});

/* ---------------------------------
   START
---------------------------------- */
server.listen(PORT, () => {
  console.log(`✅ Socket server running on port ${PORT}`);
});
