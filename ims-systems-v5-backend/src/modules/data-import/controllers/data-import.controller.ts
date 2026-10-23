import type { NextFunction, Request, Response } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import {
  importSheetBodySchema,
  moduleParamSchema,
} from "../schemas";
import type { DataImportService } from "../services/data-import.service";

export function createDataImportController(service: DataImportService) {
  const wrap =
    <T>(
      run: (req: Request) => Promise<T>,
      status = 200
    ) =>
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const data = await run(req);
        sendSuccess(res, data, status, req.correlationId);
      } catch (error) {
        next(error);
      }
    };

  return {
    listModules: wrap((req) => service.listModules(req.identity)),
    getSchema: wrap((req) =>
      service.getSchema(
        req.identity,
        parseWithSchema(moduleParamSchema, req.params).module
      )
    ),
    validate: wrap((req) => {
      const body = parseWithSchema(importSheetBodySchema, req.body);
      return service.validate(req.identity, {
        module: body.module,
        dateFormat: body.dateFormat,
        dataMap: body.dataMap,
        dataSet: body.dataSet,
      });
    }),
    startImport: wrap((req) => {
      const body = parseWithSchema(importSheetBodySchema, req.body);
      return service.startImport(req.identity, {
        module: body.module,
        dateFormat: body.dateFormat,
        dataMap: body.dataMap,
        dataSet: body.dataSet,
        importerName: req.identity?.email,
      });
    }, 200),
  };
}
