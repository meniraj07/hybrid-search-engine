import { Router } from "express";
import { postgresPool } from "../../database/postgres.js";

export const databaseHealthRouter = Router();

databaseHealthRouter.get("/database/health", async (_req, res, next) => {
  try {
    const result = await postgresPool.query("SELECT NOW() AS current_time");
    res.status(200).json({
      status: "ok",
      database_time: result.rows[0].current_time
    });
  } catch (error) {
    next(error);
  }
});