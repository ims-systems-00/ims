/**
 * Public surface for the Legal register module (ISO 14001 / 45001 6.1.3, 9.1.2).
 */
export { createLegalRegisterModule } from "./routes/legal-register.routes";
export {
  createLegalRegisterService,
  type LegalRegisterService,
} from "./services/legal-register.service";
export * from "./types";
