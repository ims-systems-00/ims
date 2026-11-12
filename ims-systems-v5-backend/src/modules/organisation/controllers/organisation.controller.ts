import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import {
  composeOrganisationMailBodySchema,
  createOrganisationBodySchema,
  goLiveOrganisationBodySchema,
  organisationIdParamSchema,
  updateDocumentReviewRemindersBodySchema,
  updateIncidentResolutionTargetsBodySchema,
  previewOrganisationEmailBrandingBodySchema,
  updateOrganisationEmailBrandingBodySchema,
  updateOrganisationLogoBodySchema,
} from "../schemas";
import type { OrganisationService } from "../services/organisation.service";

export type OrganisationController = {
  create: RequestHandler;
  goLive: RequestHandler;
  getCurrent: RequestHandler;
  getById: RequestHandler;
  ensureAuth0Link: RequestHandler;
  listMine: RequestHandler;
  createCardPaymentSession: RequestHandler;
  createSmeLicenceCheckoutSession: RequestHandler;
  createBillingPortalSession: RequestHandler;
  updateDocumentReviewReminders: RequestHandler;
  updateIncidentResolutionTargets: RequestHandler;
  updateLogo: RequestHandler;
  updateEmailBranding: RequestHandler;
  previewEmailBranding: RequestHandler;
  composeMail: RequestHandler;
};

export function createOrganisationController(
  service: OrganisationService
): OrganisationController {
  const create: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(createOrganisationBodySchema, req.body);
      const data = await service.create(req.identity, body);
      sendSuccess(res, data, 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const goLive: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(organisationIdParamSchema, req.params);
      const body = parseWithSchema(goLiveOrganisationBodySchema, req.body);
      const data = await service.goLive(req.identity, id, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const getCurrent: RequestHandler = async (req, res, next) => {
    try {
      const data = await service.getCurrent(req.identity);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const getById: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(organisationIdParamSchema, req.params);
      const data = await service.getById(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const ensureAuth0Link: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(organisationIdParamSchema, req.params);
      const data = await service.ensureAuth0Link(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const listMine: RequestHandler = async (req, res, next) => {
    try {
      const data = await service.listMine(req.identity);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const createCardPaymentSession: RequestHandler = async (req, res, next) => {
    try {
      const { id } = parseWithSchema(organisationIdParamSchema, req.params);
      const data = await service.createCardPaymentSession(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const createSmeLicenceCheckoutSession: RequestHandler = async (
    req,
    res,
    next
  ) => {
    try {
      const { id } = parseWithSchema(organisationIdParamSchema, req.params);
      const data = await service.createSmeLicenceCheckoutSession(
        req.identity,
        id
      );
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const createBillingPortalSession: RequestHandler = async (
    req,
    res,
    next
  ) => {
    try {
      const { id } = parseWithSchema(organisationIdParamSchema, req.params);
      const data = await service.createBillingPortalSession(req.identity, id);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const updateLogo: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(updateOrganisationLogoBodySchema, req.body);
      const data = await service.updateLogo(req.identity, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const updateEmailBranding: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(
        updateOrganisationEmailBrandingBodySchema,
        req.body
      );
      const data = await service.updateEmailBranding(req.identity, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const previewEmailBranding: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(
        previewOrganisationEmailBrandingBodySchema,
        req.body
      );
      const data = await service.previewEmailBranding(req.identity, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const updateDocumentReviewReminders: RequestHandler = async (
    req,
    res,
    next
  ) => {
    try {
      const body = parseWithSchema(
        updateDocumentReviewRemindersBodySchema,
        req.body
      );
      const data = await service.updateDocumentReviewReminders(
        req.identity,
        body
      );
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const updateIncidentResolutionTargets: RequestHandler = async (
    req,
    res,
    next
  ) => {
    try {
      const body = parseWithSchema(
        updateIncidentResolutionTargetsBodySchema,
        req.body
      );
      const data = await service.updateIncidentResolutionTargets(
        req.identity,
        body
      );
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  const composeMail: RequestHandler = async (req, res, next) => {
    try {
      const body = parseWithSchema(composeOrganisationMailBodySchema, req.body);
      const data = await service.composeMail(req.identity, body);
      sendSuccess(res, data, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };

  return {
    create,
    goLive,
    getCurrent,
    getById,
    ensureAuth0Link,
    listMine,
    createCardPaymentSession,
    createSmeLicenceCheckoutSession,
    createBillingPortalSession,
    updateDocumentReviewReminders,
    updateIncidentResolutionTargets,
    updateLogo,
    updateEmailBranding,
    previewEmailBranding,
    composeMail,
  };
}
