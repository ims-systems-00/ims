import { Router } from "express";
import type { MongoConnection } from "../../../infrastructure/mongodb/connection";
import { sendSuccess } from "../../../shared/http/response";

export function createHealthRouter(mongo: MongoConnection): Router {
  const router = Router();

  router.get("/health", (req, res) => {
    const databaseUp = mongo.isConnected();
    const healthy = databaseUp;

    sendSuccess(
      res,
      {
        status: healthy ? "ok" : "degraded",
        checks: {
          database: databaseUp ? "up" : "down",
        },
      },
      healthy ? 200 : 503,
      req.correlationId
    );
  });

  return router;
}
