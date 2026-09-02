/**
 * Opsional: jalanin Next.js + Socket.IO dalam satu server.
 *
 *   npm run dev:socket
 *
 * Socket.IO dipakai buat live stats & notifikasi realtime.
 * Kalau nggak dipakai, aplikasi otomatis fallback ke SSE (/api/realtime)
 * — jadi fitur live stats tetep jalan di hosting apa pun (termasuk Vercel).
 */
import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOST || "0.0.0.0";

const app = next({ dev, hostname: hostname === "0.0.0.0" ? "localhost" : hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

const server = createServer((req, res) => {
  const parsedUrl = parse(req.url, true);
  handle(req, res, parsedUrl);
});

const io = new Server(server, {
  path: "/api/socket",
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// statistik live sederhana (bisa di-bump dari API route lewat HTTP POST /api/realtime/broadcast)
const stats = { chats: 184320, images: 96540, downloads: 312875, tools: 58210, users: 0, online: 0 };

io.on("connection", (socket) => {
  stats.online = io.engine.clientsCount;
  socket.emit("stats", stats);
  io.emit("stats", stats);

  socket.on("hello", () => socket.emit("stats", stats));
  socket.on("bump", ({ key, amount } = {}) => {
    if (key && stats[key] !== undefined) stats[key] += amount || 1;
    io.emit("stats", stats);
  });
  socket.on("notify", (payload) => io.emit("activity", payload));

  socket.on("disconnect", () => {
    stats.online = io.engine.clientsCount;
    io.emit("stats", stats);
  });
});

server.listen(port, hostname, () => {
  console.log(`▲ Neural AI Studio + Socket.IO ready on http://${hostname}:${port} (ws path: /api/socket)`);
});
