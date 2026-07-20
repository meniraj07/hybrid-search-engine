import { Server } from "node:http";
import { env } from "./config/env.js";
import { postgresPool } from "./database/postgres.js";
import { createApp } from "./http/app.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`API server listening on port ${env.PORT}`);
});

function closeServer(httpServer: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    httpServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

let shutdownStarted = false;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shutdownStarted) {
    return;
  }

  shutdownStarted = true;
  console.log(`${signal} received. Shutting down gracefully...`);

  const forceExitTimer = setTimeout(() => {
    console.error("Graceful shutdown timed out. Forcing exit.");
    process.exit(1);
  }, 10_000);

  forceExitTimer.unref();

  try {
    await closeServer(server);
    await postgresPool.end();

    console.log("HTTP server and PostgreSQL pool closed.");
    process.exitCode = 0;
  } catch (error) {
    console.error("Graceful shutdown failed:", error);
    process.exitCode = 1;
  } finally {
    clearTimeout(forceExitTimer);
  }
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});