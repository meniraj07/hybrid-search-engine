import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "One or more request values are invalid.",
        details: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
  }

  req.log?.error?.({ error }, "An unexpected error occurred.");

  return res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred. Please try again later.",
    },
  });
}