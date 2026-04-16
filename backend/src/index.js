import http from "http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";
import { attachChatSocket } from "./sockets/chatSocket.js";

const bootstrap = async () => {
  await connectDb();

  const app = createApp();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: env.corsOrigins,
      credentials: true,
    },
  });

  attachChatSocket(io);

  server.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`NutriAI server listening on port ${env.port}`);
  });
};

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server", error);
  process.exit(1);
});
