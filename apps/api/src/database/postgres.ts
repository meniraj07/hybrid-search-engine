import { Pool } from "pg";
import { env } from "../config/env.js";

export const postgresPool = new Pool ({
  host: env.DATABASE_HOST,
  port: env.DATABASE_PORT,
  database: env.DATABASE_NAME,
  user: env.DATABASE_USER,
  password: env.DATABASE_PASSWORD,
  max: 10
})