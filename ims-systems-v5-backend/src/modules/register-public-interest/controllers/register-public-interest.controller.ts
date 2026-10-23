import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import { registerPublicInterestBodySchema } from "../schemas";
import type { RegisterPublicInterestService } from "../services/register-public-interest.service";

export type RegisterPublicInterestController = {
  register: RequestHandler;
};

export function createRegisterPublicInterestController(
  service: RegisterPublicInterestService
): RegisterPublicInterestController {
  const register: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(registerPublicInterestBodySchema, req.body);
      const data = await service.register(req.identity, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  return { register };
}
