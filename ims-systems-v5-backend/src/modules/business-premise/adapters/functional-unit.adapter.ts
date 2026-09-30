/**
 * Functional Units lookup adapter for Business Premise association validation.
 * Uses the Functional Units public repository surface (not private models).
 */

import { createFunctionalUnitRepository } from "../../functional-units";
import type {
  BusinessPremiseFunctionalUnitPort,
  FunctionalUnitRef,
} from "../ports";

export function createBusinessPremiseFunctionalUnitAdapter(): BusinessPremiseFunctionalUnitPort {
  const repository = createFunctionalUnitRepository();

  return {
    async findByIds(
      organizationId: string,
      ids: string[]
    ): Promise<FunctionalUnitRef[]> {
      const unique = [...new Set(ids)];
      const results: FunctionalUnitRef[] = [];
      for (const id of unique) {
        const unit = await repository.findById(organizationId, id);
        if (unit) {
          results.push({
            id: unit.id,
            name: unit.name,
            accessType: unit.accessType,
          });
        }
      }
      return results;
    },
  };
}
