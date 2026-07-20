import cors from "cors";
import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { env } from "../config/env.js";
import { errorHandler } from "./middleware/error-handler.middleware.js";
import { notFoundHandler } from "./middleware/not-found.middleware.js";
import { databaseHealthRouter } from "./routes/database-health.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { hybridSearchRouter } from "./routes/hybrid-search.routes.js";
import { searchRouter } from "./routes/search.routes.js";
import { semanticSearchRouter } from "./routes/semantic-search.routes.js";

const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests. Try again in one minute.",
    },
  },
});

export function createApp() {
  const app = express();

  app.disable("x-powered-by");

  app.use(helmet());

  app.use(pinoHttp());

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ["GET"],
      allowedHeaders: ["Content-Type"],
    }),
  );

  app.use(express.json({ limit: "1mb" }));

  app.use("/api", apiRateLimiter);

  app.use("/api", healthRouter);
  app.use("/api", databaseHealthRouter);
  app.use("/api", searchRouter);
  app.use("/api", semanticSearchRouter);
  app.use("/api", hybridSearchRouter);
  
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}