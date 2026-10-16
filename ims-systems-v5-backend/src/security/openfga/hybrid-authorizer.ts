import type { AuthorizationCheck, Authorizer } from "../authorizer";

/**
 * Routes enforced resource types to OpenFGA; everything else uses the fallback.
 * M7: fallback should deny (unknown types fail closed).
 */
export class HybridAuthorizer implements Authorizer {
  constructor(
    private readonly openfga: Authorizer,
    private readonly fallback: Authorizer,
    private readonly enforcedResourceTypes: ReadonlySet<string>
  ) {}

  async allow(check: AuthorizationCheck): Promise<boolean> {
    if (this.enforcedResourceTypes.has(check.resourceType)) {
      return this.openfga.allow(check);
    }
    return this.fallback.allow(check);
  }
}

/** Fail-closed authorizer for resource types outside the enforced set. */
export class DenyAuthorizer implements Authorizer {
  async allow(_check: AuthorizationCheck): Promise<boolean> {
    void _check;
    return false;
  }
}
