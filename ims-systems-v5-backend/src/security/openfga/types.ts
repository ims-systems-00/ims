export type OpenFgaTupleKey = {
  user: string;
  relation: string;
  object: string;
};

export type OpenFgaCheckRequest = {
  user: string;
  relation: string;
  object: string;
};

/**
 * Minimal OpenFGA client surface used by adapters (real SDK or test double).
 */
export interface OpenFgaGateway {
  check(request: OpenFgaCheckRequest): Promise<boolean>;
  writeTuples(writes: OpenFgaTupleKey[]): Promise<void>;
  deleteTuples(deletes: OpenFgaTupleKey[]): Promise<void>;
}
