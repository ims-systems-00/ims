import { Router } from "express";
import type { MongoConnection } from "../../../infrastructure/mongodb/connection";
import { createHealthRouter } from "./health";

/**
 * Centralized /api/v1 route registration (D-03).
 * Business modules will mount here later; keep this as the single version root.
 */
export function createV1Router(mongo: MongoConnection): Router {
  const router = Router();
  router.use(createHealthRouter(mongo));
  return router;
}
