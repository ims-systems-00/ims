/**
 * Cross-module ports for Business Premise.
 * Spec: docs/module-specifications/business-premise.md §5
 */

export type FunctionalUnitRef = {
  id: string;
  name: string;
  accessType: string;
};

/**
 * Resolve Functional Units for association validation.
 * Implemented via Functional Units public repository in route composition.
 */
export type BusinessPremiseFunctionalUnitPort = {
  findByIds(
    organizationId: string,
    ids: string[]
  ): Promise<FunctionalUnitRef[]>;
};

/**
 * Development stub — treats every id as a valid Internal business function.
 * Used in unit tests; HTTP composition wires the real Functional Units adapter.
 */
export class DevAcceptFunctionalUnitAdapter
  implements BusinessPremiseFunctionalUnitPort
{
  async findByIds(
    _organizationId: string,
    ids: string[]
  ): Promise<FunctionalUnitRef[]> {
    return ids.map((id) => ({
      id,
      name: `Unit ${id.slice(-4)}`,
      accessType: "Internal business function",
    }));
  }
}
