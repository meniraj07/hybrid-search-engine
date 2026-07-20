import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

const app = createApp();

describe("API application", () => {
  it("returns a healthy API response", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        status: "ok",
      }),
    );
  });

  it("returns a JSON 404 response for an unknown route", async () => {
    const response = await request(app).get("/api/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "The route GET /api/does-not-exist does not exist.",
      },
    });
  });

  it("returns a validation error for an empty search query", async () => {
    const response = await request(app)
      .get("/api/search")
      .query({ q: "" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "q",
        }),
      ]),
    );
  });

  it("adds a browser security header", async () => {
    const response = await request(app).get("/api/health");

    expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });
});