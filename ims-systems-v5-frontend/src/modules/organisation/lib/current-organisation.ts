import { DEV_STUB_ORGANIZATION_ID } from "@/security";
import type { OrganisationProfileView } from "../types";

/**
 * Development stand-in for the session organisation until
 * GET /organisations/:id (or equivalent) is available in V5.
 */
export function getCurrentOrganisationProfile(
  organizationId: string = DEV_STUB_ORGANIZATION_ID
): OrganisationProfileView {
  return {
    id: organizationId,
    reference: "ORG-DEV-001",
    name: "Demo Organisation",
    industry: "Information technology",
    sizeOfOrganisation: "51–200",
    officeEmail: "ops@demo.local",
    contactNumber: "+44 20 7946 0000",
    companyNumber: "12345678",
    vatNumber: "GB123456789",
    address: {
      line1: "1 Demo Street",
      line2: "",
      city: "London",
      county: "Greater London",
      postCode: "EC2A 4BX",
      country: "United Kingdom",
    },
    isCustomer: true,
    status: "Running",
  };
}
