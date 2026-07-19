import type { Request, Response } from "express";

export function notFoundHandler(req: Request, res: Response) {
  return res.status(400).json({
    error: {
      code: "NOT_FOUND",
      message: `The route ${req.method} ${req.path} does not exist.`,
    },
  });
}