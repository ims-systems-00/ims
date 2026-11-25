import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import {
  confirmSightingBodySchema,
  createInventoryAssetBodySchema,
  createStockBodySchema,
  idParamSchema,
  listInventoryAssetsQuerySchema,
  listScheduleQuerySchema,
  markLabelledBodySchema,
  moveLocationBodySchema,
  moveStageBodySchema,
  publicScanParamSchema,
  recordCheckBodySchema,
  recordEachUseBodySchema,
  reportFaultBodySchema,
  stockMoveBodySchema,
  updateInventoryAssetBodySchema,
  updateInventorySettingsBodySchema,
  updateStockBodySchema,
} from "../schemas";
import type { InventoryService } from "../services/inventory.service";

function scanNameFrom(req: { header: (name: string) => string | undefined }) {
  return req.header("x-scan-name")?.trim() || undefined;
}

export type InventoryController = {
  categories: RequestHandler;
  getSettings: RequestHandler;
  updateSettings: RequestHandler;
  overview: RequestHandler;
  list: RequestHandler;
  create: RequestHandler;
  getById: RequestHandler;
  update: RequestHandler;
  moveStage: RequestHandler;
  recordCheck: RequestHandler;
  reportFault: RequestHandler;
  moveLocation: RequestHandler;
  confirmSighting: RequestHandler;
  recordEachUse: RequestHandler;
  markLabelled: RequestHandler;
  schedule: RequestHandler;
  listStock: RequestHandler;
  createStock: RequestHandler;
  updateStock: RequestHandler;
  moveStock: RequestHandler;
  exportRegisterCsv: RequestHandler;
  exportScheduleCsv: RequestHandler;
  exportFixedAssetsCsv: RequestHandler;
  exportModelJson: RequestHandler;
  complianceMap: RequestHandler;
  auditorPack: RequestHandler;
  listCalibrationLabs: RequestHandler;
  publicGet: RequestHandler;
  publicFault: RequestHandler;
  publicEachUse: RequestHandler;
  publicMove: RequestHandler;
  publicSighting: RequestHandler;
  publicChecks: RequestHandler;
};

export function createInventoryController(
  service: InventoryService
): InventoryController {
  const categories: RequestHandler = async (req, res, next) => {
    try {
      sendSuccess(
        res,
        await service.categories(req.identity),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const getSettings: RequestHandler = async (req, res, next) => {
    try {
      sendSuccess(
        res,
        await service.getSettings(req.identity),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const updateSettings: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(updateInventorySettingsBodySchema, req.body);
      sendSuccess(
        res,
        await service.updateSettings(req.identity, {
          ...body,
          scanBase: body.scanBase === "" ? null : body.scanBase,
        }),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const overview: RequestHandler = async (req, res, next) => {
    try {
      sendSuccess(
        res,
        await service.overview(req.identity),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const list: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(listInventoryAssetsQuerySchema, req.query);
      sendSuccess(
        res,
        await service.list(req.identity, query),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const create: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(createInventoryAssetBodySchema, req.body);
      sendSuccess(
        res,
        await service.create(req.identity, {
          ...body,
          purchaseDate: body.purchaseDate || null,
          warrantyEnds: body.warrantyEnds || null,
        }),
        201,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const getById: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      sendSuccess(
        res,
        await service.getById(req.identity, id),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const update: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(updateInventoryAssetBodySchema, req.body);
      sendSuccess(
        res,
        await service.update(req.identity, id, {
          ...body,
          purchaseDate:
            body.purchaseDate === undefined
              ? undefined
              : body.purchaseDate || null,
          warrantyEnds:
            body.warrantyEnds === undefined
              ? undefined
              : body.warrantyEnds || null,
        }),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const moveStage: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(moveStageBodySchema, req.body);
      sendSuccess(
        res,
        await service.moveStage(req.identity, id, body),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const recordCheck: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(recordCheckBodySchema, req.body);
      sendSuccess(
        res,
        await service.recordCheck(req.identity, id, body),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const reportFault: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(reportFaultBodySchema, req.body);
      sendSuccess(
        res,
        await service.reportFault(req.identity, id, body),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const moveLocation: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(moveLocationBodySchema, req.body);
      sendSuccess(
        res,
        await service.moveLocation(req.identity, id, body),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const confirmSighting: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(confirmSightingBodySchema, req.body);
      sendSuccess(
        res,
        await service.confirmSighting(req.identity, id, body),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const recordEachUse: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(recordEachUseBodySchema, req.body);
      sendSuccess(
        res,
        await service.recordEachUse(req.identity, id, body),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const markLabelled: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(markLabelledBodySchema, req.body);
      sendSuccess(
        res,
        await service.markLabelled(req.identity, body),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const schedule: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(listScheduleQuerySchema, req.query);
      sendSuccess(
        res,
        await service.schedule(req.identity, query),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const listStock: RequestHandler = async (req, res, next) => {
    try {
      sendSuccess(
        res,
        await service.listStock(req.identity),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const createStock: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(createStockBodySchema, req.body);
      sendSuccess(
        res,
        await service.createStock(req.identity, {
          ...body,
          expiry: body.expiry || null,
        }),
        201,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const updateStock: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(updateStockBodySchema, req.body);
      sendSuccess(
        res,
        await service.updateStock(req.identity, id, {
          ...body,
          expiry:
            body.expiry === undefined ? undefined : body.expiry || null,
        }),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const moveStock: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(stockMoveBodySchema, req.body);
      sendSuccess(
        res,
        await service.moveStock(req.identity, id, {
          ...body,
          expiry: body.expiry || null,
        }),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const exportRegisterCsv: RequestHandler = async (req, res, next) => {
    try {
      const csv = await service.exportRegisterCsv(req.identity);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="inventory-register.csv"'
      );
      res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  };

  const exportScheduleCsv: RequestHandler = async (req, res, next) => {
    try {
      const csv = await service.exportScheduleCsv(req.identity);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="inventory-schedule.csv"'
      );
      res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  };

  const exportFixedAssetsCsv: RequestHandler = async (req, res, next) => {
    try {
      const csv = await service.exportFixedAssetsCsv(req.identity);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="inventory-fixed-assets.csv"'
      );
      res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  };

  const exportModelJson: RequestHandler = async (req, res, next) => {
    try {
      sendSuccess(
        res,
        await service.exportModelJson(req.identity),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const complianceMap: RequestHandler = async (req, res, next) => {
    try {
      sendSuccess(
        res,
        await service.complianceMap(req.identity),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const auditorPack: RequestHandler = async (req, res, next) => {
    try {
      const format =
        String(req.query.format || "html").toLowerCase() === "pdf"
          ? "pdf"
          : "html";
      const pack = await service.auditorPack(req.identity, format);
      res.setHeader("Content-Type", pack.contentType);
      res.setHeader(
        "Content-Disposition",
        `${format === "pdf" ? "attachment" : "inline"}; filename="${pack.filename}"`
      );
      res.status(200).send(pack.body);
    } catch (error) {
      next(error);
    }
  };

  const listCalibrationLabs: RequestHandler = async (req, res, next) => {
    try {
      sendSuccess(
        res,
        await service.listCalibrationLabs(req.identity),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const publicGet: RequestHandler = async (req, res, next) => {
    try {
      const { organizationId, tag } = parseWithSchema(
        publicScanParamSchema,
        req.params
      );
      sendSuccess(
        res,
        await service.publicGetByTag(organizationId, tag),
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const publicAction =
    (action: "fault" | "each-use" | "move" | "sighting" | "checks"): RequestHandler =>
    async (req, res, next) => {
      try {
        const { organizationId, tag } = parseWithSchema(
          publicScanParamSchema,
          req.params
        );
        sendSuccess(
          res,
          await service.publicMutate(
            organizationId,
            tag,
            action,
            (req.body ?? {}) as Record<string, unknown>,
            req.identity,
            scanNameFrom(req)
          ),
          200,
          req.correlationId
        );
      } catch (error) {
        next(error);
      }
    };

  return {
    categories,
    getSettings,
    updateSettings,
    overview,
    list,
    create,
    getById,
    update,
    moveStage,
    recordCheck,
    reportFault,
    moveLocation,
    confirmSighting,
    recordEachUse,
    markLabelled,
    schedule,
    listStock,
    createStock,
    updateStock,
    moveStock,
    exportRegisterCsv,
    exportScheduleCsv,
    exportFixedAssetsCsv,
    exportModelJson,
    complianceMap,
    auditorPack,
    listCalibrationLabs,
    publicGet,
    publicFault: publicAction("fault"),
    publicEachUse: publicAction("each-use"),
    publicMove: publicAction("move"),
    publicSighting: publicAction("sighting"),
    publicChecks: publicAction("checks"),
  };
}
