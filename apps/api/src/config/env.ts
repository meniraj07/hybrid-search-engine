import dotenv from 'dotenv';
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().url().default("http://localhost:4200"),

  DATABASE_HOST: z.string().default("localhost"),
  DATABASE_PORT: z.coerce.number().int().positive().default(5432),
  DATABASE_NAME: z.string().default("DB_NAME"),
  DATABASE_USER: z.string().default("DB_USER"),
  DATABASE_PASSWORD: z.string().default("DB_PASSWORD"),
  ARXIV_DATASET_PATH: z.string().min(1).optional(),

});

export const env = envSchema.parse(process.env);