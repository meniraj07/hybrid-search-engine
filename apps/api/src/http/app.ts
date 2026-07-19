import cors from "cors";
import express from "express";
import { pinoHttp } from "pino-http";
import { databaseHealthRouter } from "./routes/database-health.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { searchRouter } from "./routes/search.routes.js";
import { errorHandler } from "./middleware/error-handler.middleware.js";
import { notFoundHandler } from "./middleware/not-found.middleware.js";
import { semanticSearchRouter } from "./routes/semantic-search.routes.js";
import { hybridSearchRouter } from "./routes/hybrid-search.routes.js";

export function createApp() {
  const app = express();

  app.use(pinoHttp());
  app.use(cors());
  app.use(express.json());

  app.use("/api", healthRouter);
  app.use("/api", databaseHealthRouter);
  app.use("/api", searchRouter);
  app.use("/api", semanticSearchRouter);
  app.use("/api", hybridSearchRouter);


  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}