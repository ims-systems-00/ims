import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import { bookDateBodySchema, getStartedBodySchema } from "../schemas";
import type { ContactImsService } from "../services/contact-ims.service";

export type ContactImsController = {
  bookedDates: RequestHandler;
  bookDate: RequestHandler;
  getStarted: RequestHandler;
};

export function createContactImsController(
  service: ContactImsService
): ContactImsController {
  const bookedDates: RequestHandler = async (req, res, next) => {
    try {
      const data = await service.getBookedDates(req.identity);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const bookDate: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(bookDateBodySchema, req.body);
      const data = await service.bookDate(req.identity, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const getStarted: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(getStartedBodySchema, req.body);
      const data = await service.getStarted(req.identity, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  return { bookedDates, bookDate, getStarted };
}
