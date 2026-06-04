import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());

// Persistent SQLite-alternative local JSON database file
const DB_FILE = path.join(process.cwd(), "notes_db.json");

// Memory caches
let databaseCache: Record<string, any> = {};

// Load database initially
async function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = await fs.promises.readFile(DB_FILE, "utf-8");
      databaseCache = JSON.parse(raw);
    } else {
      databaseCache = {};
      await saveDatabase();
    }
  } catch (e) {
    console.error("Failed to load local DB, starting with empty", e);
    databaseCache = {};
  }
}

async function saveDatabase() {
  try {
    await fs.promises.writeFile(DB_FILE, JSON.stringify(databaseCache, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save local DB", e);
  }
}

// In-memory list of active client connections for SSE real-time sync
// Map keys are roomId, values are arrays of clients
interface SSEClient {
  deviceId: string;
  deviceName: string;
  response: express.Response;
}
const activeClients = new Map<string, SSEClient[]>();

// Utility to broadcast events to a room
function broadcastToRoom(roomId: string, eventType: string, payload: any) {
  const roomClients = activeClients.get(roomId) || [];
  const message = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
  
  roomClients.forEach((client) => {
    try {
      client.response.write(message);
    } catch (err) {
      console.error(`Error writing to client ${client.deviceId} in room ${roomId}`, err);
    }
  });
}

// Generate device list for presence updates
function broadcastPresence(roomId: string) {
  const roomClients = activeClients.get(roomId) || [];
  const devices = roomClients.map((c) => c.deviceName);
  broadcastToRoom(roomId, "presence", {
    activeDevicesCount: roomClients.length,
    devices: devices,
  });
}

// API: Health probe
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", activeRooms: activeClients.size });
});

// API: Get notes for a room
app.get("/api/rooms/:roomId/notes", (req, res) => {
  const { roomId } = req.params;
  const notes = databaseCache[roomId] || [];
  res.json(notes);
});

// API: Create or update a note
app.post("/api/rooms/:roomId/notes", async (req, res) => {
  const { roomId } = req.params;
  const note = req.body;

  if (!note || !note.id) {
    res.status(400).json({ error: "Missing note payload or id" });
    return;
  }

  if (!databaseCache[roomId]) {
    databaseCache[roomId] = [];
  }

  const existingIndex = databaseCache[roomId].findIndex((n: any) => n.id === note.id);
  const now = new Date().toISOString();

  let finalNote;
  if (existingIndex > -1) {
    // Dynamic merge to avoid discarding fields on partial updates
    const existing = databaseCache[roomId][existingIndex];
    finalNote = {
      ...existing,
      ...note,
      updatedAt: now,
    };
    databaseCache[roomId][existingIndex] = finalNote;
  } else {
    finalNote = {
      ...note,
      createdAt: now,
      updatedAt: now,
    };
    databaseCache[roomId].push(finalNote);
  }

  await saveDatabase();

  // Send real-time broadcast update to all connected devices in this room
  broadcastToRoom(roomId, "note-update", {
    updatedNote: finalNote,
  });

  res.json(finalNote);
});

// API: Delete a note
app.delete("/api/rooms/:roomId/notes/:noteId", async (req, res) => {
  const { roomId, noteId } = req.params;

  if (!databaseCache[roomId]) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  const existingIndex = databaseCache[roomId].findIndex((n: any) => n.id === noteId);
  if (existingIndex === -1) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  databaseCache[roomId].splice(existingIndex, 1);
  await saveDatabase();

  // Broadcast note deletion
  broadcastToRoom(roomId, "note-delete", {
    deletedNoteId: noteId,
  });

  res.json({ success: true, deletedNoteId: noteId });
});

// API: Server-Sent Events real-time sync stream
app.get("/api/rooms/:roomId/sync", (req, res) => {
  const { roomId } = req.params;
  const deviceId = (req.query.deviceId as string) || "unknown-device";
  const deviceName = (req.query.deviceName as string) || "Anonymous Browser";

  // Prevent caching and keep-alive headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
  });

  // Warm-up ping to initiate connection
  res.write(":\n\n");

  const newClient: SSEClient = {
    deviceId,
    deviceName,
    response: res,
  };

  if (!activeClients.has(roomId)) {
    activeClients.set(roomId, []);
  }

  // Add the newly connected client
  activeClients.get(roomId)!.push(newClient);

  // Send current notes initial batch immediately to the current client
  const notes = databaseCache[roomId] || [];
  res.write(`event: initial\ndata: ${JSON.stringify({ notes })}\n\n`);

  // Broadcast updated presence count and device lists to all clients in the room
  broadcastPresence(roomId);

  // Heartbeat ping interval to detect disconnected sockets early
  const heartbeat = setInterval(() => {
    try {
      res.write(":\n\n");
    } catch {
      // Stream failed or closed, clear will occur in 'close' event
    }
  }, 25000);

  // Handle connection closure
  req.on("close", () => {
    clearInterval(heartbeat);
    const clients = activeClients.get(roomId) || [];
    const remaining = clients.filter((c) => c.response !== res);
    
    if (remaining.length === 0) {
      activeClients.delete(roomId);
    } else {
      activeClients.set(roomId, remaining);
      // Broadcast updated presence to the room
      broadcastPresence(roomId);
    }
  });
});

async function runExpressServer() {
  // Ensure database is loaded before starting listeners
  await loadDatabase();

  // Vite integration middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully started on http://0.0.0.0:${PORT}`);
  });
}

runExpressServer();
