import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import {
  addLocationBodySchema,
  assignToolkitsBodySchema,
  changePasswordBodySchema,
  createUserBodySchema,
  expiredUsersBodySchema,
  idParamSchema,
  listUsersQuerySchema,
  locationIdParamSchema,
  ownershipTransferBodySchema,
  preferencesBodySchema,
  profileImageBodySchema,
  signatureBodySchema,
  systemAccessBodySchema,
  updateUserProfileBodySchema,
} from "../schemas";
import type { UsersService } from "../services/users.service";

export type UsersController = {
  list: RequestHandler;
  create: RequestHandler;
  getClassified: RequestHandler;
  getBasic: RequestHandler;
  updateProfile: RequestHandler;
  changePassword: RequestHandler;
  resetPassword: RequestHandler;
  updatePreferences: RequestHandler;
  updateSystemAccess: RequestHandler;
  getProfileImage: RequestHandler;
  updateProfileImage: RequestHandler;
  updateSignature: RequestHandler;
  addLocation: RequestHandler;
  removeLocation: RequestHandler;
  remove: RequestHandler;
  blockExpired: RequestHandler;
  assignToolkits: RequestHandler;
  resendVerification: RequestHandler;
  checkOwnership: RequestHandler;
  transferOwnership: RequestHandler;
};

export function createUsersController(
  service: UsersService
): UsersController {
  const list: RequestHandler = async (req, res, next) => {
    try {
      const query = parseWithSchema(listUsersQuerySchema, req.query);
      const data = await service.list(req.identity, query);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const create: RequestHandler = async (req, res, next) => {
    try {
      parseWithSchema(createUserBodySchema, req.body ?? {});
      await service.rejectDirectCreate();
    } catch (error) {
      next(error);
    }
  };

  const getClassified: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const data = await service.getClassified(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const getBasic: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const data = await service.getBasic(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const updateProfile: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(updateUserProfileBodySchema, req.body);
      const data = await service.updateProfile(req.identity, id, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const changePassword: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(changePasswordBodySchema, req.body);
      await service.changePassword(req.identity, id, {
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
      });
      sendSuccess(
        res,
        { message: "Password changed successfully" },
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const resetPassword: RequestHandler = async (req, res, next) => {
    try {
      await service.resetPasswordStub();
      res.status(200).end();
    } catch (error) {
      next(error);
    }
  };

  const updatePreferences: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(preferencesBodySchema, req.body);
      const data = await service.updatePreferences(req.identity, id, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const updateSystemAccess: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(systemAccessBodySchema, {
        ...req.body,
        ...req.query,
      });
      const data = await service.updateSystemAccess(req.identity, id, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const getProfileImage: RequestHandler = async (req, res, next) => {
    try {
      parseWithSchema(idParamSchema, req.params);
      const data = await service.getProfileImageStub();
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const updateProfileImage: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(profileImageBodySchema, req.body);
      const data = await service.updateProfileImage(req.identity, id, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const updateSignature: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(signatureBodySchema, req.body);
      const data = await service.updateSignature(req.identity, id, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const addLocation: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(addLocationBodySchema, req.body);
      const data = await service.addWorkingLocation(req.identity, id, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const removeLocation: RequestHandler = async (req, res, next) => {
    try {
      const { id, locationId } = parseWithSchema(
        locationIdParamSchema,
        req.params
      );
      const data = await service.removeWorkingLocation(
        req.identity,
        id,
        locationId
      );
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const remove: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      await service.softDelete(req.identity, id);
      sendSuccess(
        res,
        { message: "User deleted successfully" },
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const blockExpired: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(expiredUsersBodySchema, req.body);
      const data = await service.blockExpiredUsers(
        req.identity,
        body.userIds
      );
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const assignToolkits: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(assignToolkitsBodySchema, req.body);
      const data = await service.assignComplianceToolkits(
        req.identity,
        id,
        body.toolkitIds
      );
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const resendVerification: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      await service.resendVerification(req.identity, id);
      sendSuccess(
        res,
        { message: "Verification email resent" },
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  const checkOwnership: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const data = await service.checkOwnership(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const transferOwnership: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(idParamSchema, req.params);
      const body = parseWithSchema(ownershipTransferBodySchema, req.body);
      await service.transferOwnership(
        req.identity,
        id,
        body.destinationUserId
      );
      sendSuccess(
        res,
        { message: "Ownership transfer started" },
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  };

  return {
    list,
    create,
    getClassified,
    getBasic,
    updateProfile,
    changePassword,
    resetPassword,
    updatePreferences,
    updateSystemAccess,
    getProfileImage,
    updateProfileImage,
    updateSignature,
    addLocation,
    removeLocation,
    remove,
    blockExpired,
    assignToolkits,
    resendVerification,
    checkOwnership,
    transferOwnership,
  };
}
