import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const PORT = process.env.SOCKET_PORT || 5001;

app.use(cors({ origin: "*" }));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

io.on("connection", (socket) => {
  console.log("Socket client connected:", socket.id);

  socket.on("join", (room) => {
    if (room) {
      const normalizedRoom = String(room).toLowerCase().trim();
      socket.join(normalizedRoom);
      console.log(`Socket client ${socket.id} joined room: ${normalizedRoom}`);
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket client disconnected:", socket.id);
  });
});

// Endpoint for PHP backend to post events to
app.post("/emit", (req, res) => {
  const { room, event, data } = req.body;
  if (!room || !event) {
    return res.status(400).json({ error: "Missing room or event" });
  }

  const normalizedRoom = String(room).toLowerCase().trim();
  io.to(normalizedRoom).emit(event, data);
  
  // Also send to original case just in case
  if (normalizedRoom !== String(room)) {
    io.to(room).emit(event, data);
  }

  console.log(`[Bridge] Emitted event "${event}" to room "${room}"`);
  return res.status(200).json({ success: true });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "bridge healthy" });
});

httpServer.listen(PORT, () => {
  console.log(`Socket Bridge Server is running on port ${PORT}`);
});
