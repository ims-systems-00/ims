import type { RequestHandler } from "express";
import { sendSuccess } from "../../../shared";
import type { FilesService } from "../services/files.service";

export type FilesController = {
  getUploadUrl: RequestHandler;
  getViewUrl: RequestHandler;
  deleteFile: RequestHandler;
};

function header(req: { header: (name: string) => string | undefined }, name: string): string {
  return req.header(name) ?? "";
}

/**
 * File Handler HTTP controllers.
 * Request shape mirrors V4 headers (x-file-*) for FE compatibility.
 */
export function createFilesController(service: FilesService): FilesController {
  const getUploadUrl: RequestHandler = async (req, res, next) => {
    try {
      const data = await service.createUploadUrl(req.identity, {
        fileName: header(req, "x-file-key"),
        path: header(req, "x-file-path") || undefined,
        publicBucket: header(req, "x-file-public") || undefined,
      });
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const getViewUrl: RequestHandler = async (req, res, next) => {
    try {
      const data = await service.createViewUrl(req.identity, {
        bucket: header(req, "x-file-bucket"),
        key: header(req, "x-file-key"),
        fileName: header(req, "x-file-name") || undefined,
      });
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const deleteFile: RequestHandler = async (req, res, next) => {
    try {
      const data = await service.deleteFile(req.identity, {
        key: header(req, "x-file-key"),
        bucket: header(req, "x-file-bucket") || undefined,
      });
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  return { getUploadUrl, getViewUrl, deleteFile };
}
