import type { RequestHandler } from "express";
import path from "node:path";
import { AppError } from "../../../shared";
import type { LocalObjectStorageAdapter } from "../local-object-storage";

function contentTypeForKey(key: string): string {
  const ext = path.extname(key).toLowerCase();
  switch (ext) {
    case ".pdf":
      return "application/pdf";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".txt":
      return "text/plain; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

function sanitizeDownloadName(name: string | undefined): string | undefined {
  if (!name?.trim()) return undefined;
  return name.replace(/[\r\n"]/g, "").slice(0, 255);
}

export function createLocalFilesController(storage: LocalObjectStorageAdapter): {
  putObject: RequestHandler;
  getObject: RequestHandler;
} {
  const putObject: RequestHandler = async (req, res, next) => {
    try {
      const { bucket, key } = storage.verifySignedRequest(
        req.query as Record<string, unknown>,
        "upload"
      );
      const body = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(req.body ?? "");
      if (body.length === 0) {
        throw new AppError({
          message: "Upload body is empty",
          statusCode: 400,
          code: "VALIDATION_ERROR",
        });
      }
      await storage.writeObject({ bucket, key, body });
      res.status(204).end();
    } catch (error) {
      if (error instanceof Error && error.message.includes("signed URL")) {
        next(
          new AppError({
            message: error.message,
            statusCode: 403,
            code: "FORBIDDEN",
          })
        );
        return;
      }
      next(error);
    }
  };

  const getObject: RequestHandler = async (req, res, next) => {
    try {
      const { bucket, key, downloadFileName } = storage.verifySignedRequest(
        req.query as Record<string, unknown>,
        "view"
      );
      const data = await storage.readObject({ bucket, key });
      const safeName = sanitizeDownloadName(downloadFileName);
      res.setHeader("Content-Type", contentTypeForKey(key));
      if (safeName) {
        res.setHeader(
          "Content-Disposition",
          `inline; filename="${safeName}"`
        );
      }
      res.send(data);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("signed URL")) {
          next(
            new AppError({
              message: error.message,
              statusCode: 403,
              code: "FORBIDDEN",
            })
          );
          return;
        }
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          next(
            new AppError({
              message: "File not found",
              statusCode: 404,
              code: "NOT_FOUND",
            })
          );
          return;
        }
      }
      next(error);
    }
  };

  return { putObject, getObject };
}
