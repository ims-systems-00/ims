import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess, ValidationAppError } from "../../../shared";
import {
  addAuthoriserBodySchema,
  addRevisionBodySchema,
  addVersionBodySchema,
  authorisationParamsSchema,
  changeRepositoryBodySchema,
  copyFolderStructureBodySchema,
  createFileNodesBodySchema,
  createFolderBodySchema,
  createRepositoryBodySchema,
  decideAuthorisationBodySchema,
  idParamSchema,
  listPublishedDocumentsQuerySchema,
  listRepoNodesQuerySchema,
  listRepositoriesQuerySchema,
  moveNodeBodySchema,
  normalizeFileMeta,
  repoNodeParamsSchema,
  updateDocumentBodySchema,
  updateFolderBodySchema,
  updateRepositoryBodySchema,
} from "../schemas";
import type { DocumentManagementService } from "../services/document-management.service";

export type DocumentManagementController = {
  overview: RequestHandler;
  listRepositories: RequestHandler;
  createRepository: RequestHandler;
  getRepository: RequestHandler;
  updateRepository: RequestHandler;
  softDeleteRepository: RequestHandler;
  restoreRepository: RequestHandler;
  hardDeleteRepository: RequestHandler;
  copyFolderStructure: RequestHandler;
  createFolder: RequestHandler;
  createFiles: RequestHandler;
  listNodes: RequestHandler;
  getNode: RequestHandler;
  getNodePath: RequestHandler;
  updateFolder: RequestHandler;
  updateDocument: RequestHandler;
  addVersion: RequestHandler;
  addRevision: RequestHandler;
  moveNode: RequestHandler;
  changeRepository: RequestHandler;
  softDeleteNode: RequestHandler;
  restoreNode: RequestHandler;
  hardDeleteNode: RequestHandler;
  addAuthoriser: RequestHandler;
  decideAuthorisation: RequestHandler;
  removeAuthoriser: RequestHandler;
  listPublished: RequestHandler;
};

export function createDocumentManagementController(
  service: DocumentManagementService
): DocumentManagementController {
  const overview: RequestHandler = async (req, res, next) => {
    try {
      const data = await service.overview(req.identity);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const listRepositories: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(listRepositoriesQuerySchema, req.query);
      const data = await service.listRepositories(req.identity, query);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const createRepository: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(createRepositoryBodySchema, req.body);
      const data = await service.createRepository(req.identity, {
        name: body.name,
        description: body.description ?? undefined,
        privacy: body.privacy,
        businessUnitId: body.businessUnitId,
        owners: body.owners,
        sharedWith: body.sharedWith,
        reviewInterval: body.reviewInterval,
        copyFolderStructureFromId: body.copyFolderStructureFromId,
      });
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const getRepository: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const data = await service.getRepository(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const updateRepository: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(updateRepositoryBodySchema, req.body);
      const data = await service.updateRepository(req.identity, id, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const softDeleteRepository: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const data = await service.softDeleteRepository(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const restoreRepository: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const data = await service.restoreRepository(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const hardDeleteRepository: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const data = await service.hardDeleteRepository(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const copyFolderStructure: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(copyFolderStructureBodySchema, req.body);
      const data = await service.copyFolderStructure(req.identity, id, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const createFolder: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(createFolderBodySchema, req.body);
      const data = await service.createFolder(req.identity, id, {
        name: body.name,
        parentNodeId: body.parentNodeId ?? body.parentNode ?? null,
        reviewDate: body.reviewDate ?? body.data?.reviewDate,
      });
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const createFiles: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(createFileNodesBodySchema, req.body);
      const data = await service.createFileNodes(req.identity, id, {
        parentNodeId: body.parentNodeId ?? body.parentNode ?? null,
        data: body.data.map((item) => ({
          ...item,
          storageInfo: normalizeFileMeta(item.storageInfo),
        })),
      });
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const listNodes: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const query = parseWithSchema(listRepoNodesQuerySchema, req.query);
      const data = await service.listRepoNodes(req.identity, id, query);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const getNode: RequestHandler = async (req, res, next) => {
    try {
      const { id, nodeId } = parseWithSchema(repoNodeParamsSchema, req.params);
      const data = await service.getNode(req.identity, id, nodeId);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const getNodePath: RequestHandler = async (req, res, next) => {
    try {
      const { id, nodeId } = parseWithSchema(repoNodeParamsSchema, req.params);
      const data = await service.getNodePath(req.identity, id, nodeId);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const updateFolder: RequestHandler = async (req, res, next) => {
    try {
      const { id, nodeId } = parseWithSchema(repoNodeParamsSchema, req.params);
      const body = parseWithSchema(updateFolderBodySchema, req.body);
      const data = await service.updateFolder(req.identity, id, nodeId, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const updateDocument: RequestHandler = async (req, res, next) => {
    try {
      const { id, nodeId } = parseWithSchema(repoNodeParamsSchema, req.params);
      const body = parseWithSchema(updateDocumentBodySchema, req.body);
      const data = await service.updateDocument(req.identity, id, nodeId, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const addVersion: RequestHandler = async (req, res, next) => {
    try {
      const { id, nodeId } = parseWithSchema(repoNodeParamsSchema, req.params);
      const body = parseWithSchema(addVersionBodySchema, req.body);
      const data = await service.addVersion(req.identity, id, nodeId, {
        parentNodeId: body.parentNodeId ?? body.parentNode ?? null,
        storageInfo: normalizeFileMeta(body.data.storageInfo),
        owners: body.data.owners,
        authorisation: body.data.authorisation,
      });
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const addRevision: RequestHandler = async (req, res, next) => {
    try {
      const { id, nodeId } = parseWithSchema(repoNodeParamsSchema, req.params);
      const body = parseWithSchema(addRevisionBodySchema, req.body);
      const data = await service.addRevision(req.identity, id, nodeId, {
        storageInfo: normalizeFileMeta(body.storageInfo),
      });
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const moveNode: RequestHandler = async (req, res, next) => {
    try {
      const { id, nodeId } = parseWithSchema(repoNodeParamsSchema, req.params);
      const body = parseWithSchema(moveNodeBodySchema, req.body);
      const data = await service.moveNode(req.identity, id, nodeId, {
        parentNodeId: body.parentNodeId ?? body.parentNode ?? null,
      });
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const changeRepository: RequestHandler = async (req, res, next) => {
    try {
      const { id, nodeId } = parseWithSchema(repoNodeParamsSchema, req.params);
      const body = parseWithSchema(changeRepositoryBodySchema, req.body);
      const targetId = body.repositoryId ?? body.repository;
      if (!targetId) {
        throw new ValidationAppError("Target repository id is required");
      }
      const data = await service.changeRepository(req.identity, id, nodeId, {
        repositoryId: targetId,
        parentNodeId: body.parentNodeId ?? body.parentNode ?? null,
      });
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const softDeleteNode: RequestHandler = async (req, res, next) => {
    try {
      const { id, nodeId } = parseWithSchema(repoNodeParamsSchema, req.params);
      const data = await service.softDeleteNode(req.identity, id, nodeId);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const restoreNode: RequestHandler = async (req, res, next) => {
    try {
      const { id, nodeId } = parseWithSchema(repoNodeParamsSchema, req.params);
      const data = await service.restoreNode(req.identity, id, nodeId);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const hardDeleteNode: RequestHandler = async (req, res, next) => {
    try {
      const { id, nodeId } = parseWithSchema(repoNodeParamsSchema, req.params);
      const data = await service.hardDeleteNode(req.identity, id, nodeId);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const addAuthoriser: RequestHandler = async (req, res, next) => {
    try {
      const { id, nodeId } = parseWithSchema(repoNodeParamsSchema, req.params);
      const body = parseWithSchema(addAuthoriserBodySchema, req.body);
      const data = await service.addAuthoriser(
        req.identity,
        id,
        nodeId,
        body.userId ?? body.user
      );
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const decideAuthorisation: RequestHandler = async (req, res, next) => {
    try {
      const { id, nodeId, authorisationId } = parseWithSchema(
        authorisationParamsSchema,
        req.params
      );
      const body = parseWithSchema(decideAuthorisationBodySchema, req.body);
      const data = await service.decideAuthorisation(
        req.identity,
        id,
        nodeId,
        authorisationId,
        body
      );
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const removeAuthoriser: RequestHandler = async (req, res, next) => {
    try {
      const { id, nodeId, authorisationId } = parseWithSchema(
        authorisationParamsSchema,
        req.params
      );
      const data = await service.removeAuthoriser(
        req.identity,
        id,
        nodeId,
        authorisationId
      );
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const listPublished: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(
        listPublishedDocumentsQuerySchema,
        req.query
      );
      const data = await service.listPublishedDocuments(req.identity, query);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  return {
    overview,
    listRepositories,
    createRepository,
    getRepository,
    updateRepository,
    softDeleteRepository,
    restoreRepository,
    hardDeleteRepository,
    copyFolderStructure,
    createFolder,
    createFiles,
    listNodes,
    getNode,
    getNodePath,
    updateFolder,
    updateDocument,
    addVersion,
    addRevision,
    moveNode,
    changeRepository,
    softDeleteNode,
    restoreNode,
    hardDeleteNode,
    addAuthoriser,
    decideAuthorisation,
    removeAuthoriser,
    listPublished,
  };
}
