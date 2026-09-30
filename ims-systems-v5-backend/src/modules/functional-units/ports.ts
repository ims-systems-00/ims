/**
 * Cross-module ports required by Functional Units.
 * Real Organisation / Dashboard / Invitation modules must replace stub adapters later.
 */

export class InsufficientGroupLicenceError extends Error {
  constructor(
    message = "You don't have enough licenses to create a business unit, please request for more licenses via license management."
  ) {
    super(message);
    this.name = "InsufficientGroupLicenceError";
  }
}

export interface GroupLicencePort {
  assertCanCreateUnit(organizationId: string): Promise<void>;
  consumeUnitLicence(organizationId: string): Promise<void>;
}

/** Development adapter — always allows creation (Organisation module missing). */
export class AlwaysAllowGroupLicenceAdapter implements GroupLicencePort {
  async assertCanCreateUnit(_organizationId: string): Promise<void> {
    return;
  }

  async consumeUnitLicence(_organizationId: string): Promise<void> {
    return;
  }
}

export type DashboardInitInput = {
  organizationId: string;
  functionalUnitId: string;
  accessType: string;
};

export interface DashboardInitPort {
  initialiseBusinessFunctionDashboard(input: DashboardInitInput): Promise<void>;
}

/** Development adapter — no-op until Dashboard module exists. */
export class NoOpDashboardInitAdapter implements DashboardInitPort {
  async initialiseBusinessFunctionDashboard(
    _input: DashboardInitInput
  ): Promise<void> {
    return;
  }
}

/**
 * Invitation capability reserved for a future “invite then assign to unit” flow.
 *
 * Per invitations.md, invitations onboard people to the *organisation* and do
 * not assign Functional Units. Current Add members only uses existing org Users
 * via the Users public FunctionalUnitUsersPort — Invitation is never called on
 * that path.
 *
 * Stubbed: invitations are unavailable until the Invitation module ships.
 */
export interface InvitationPort {
  /** Whether the Invitation module can send organisation invitations. */
  isAvailable(): Promise<boolean>;
}

/** Development adapter — Invitation module is not implemented yet. */
export class UnavailableInvitationAdapter implements InvitationPort {
  async isAvailable(): Promise<boolean> {
    return false;
  }
}
