/**
 * Public surface for the IMS Forms module.
 */

export {
  createFormsModule,
  createFormsRouter,
} from "./routes/form.routes";
export type { FormRouterDeps } from "./routes/form.routes";
export { createFormService } from "./services/form.service";
export type { FormService } from "./services/form.service";
export {
  FORMS_RESOURCE,
  FORM_STATUSES,
  FORM_ELEMENT_TYPES,
} from "./types";
export type {
  Form,
  FormElement,
  FormSubmission,
  FormResponse,
  FormStatus,
  FormElementType,
  CreateFormInput,
  UpdateFormInput,
  ListFormsQuery,
  PaginatedForms,
} from "./types";
