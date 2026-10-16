import { OpenFgaClient, CredentialsMethod } from "@openfga/sdk";
import type { AppConfig } from "../../config";
import type {
  OpenFgaCheckRequest,
  OpenFgaGateway,
  OpenFgaTupleKey,
} from "./types";

export function createOpenFgaSdkGateway(config: AppConfig): OpenFgaGateway {
  const client = new OpenFgaClient({
    apiUrl: config.OPENFGA_API_URL,
    storeId: config.OPENFGA_STORE_ID,
    authorizationModelId: config.OPENFGA_MODEL_ID,
    ...(config.OPENFGA_API_TOKEN.trim()
      ? {
          credentials: {
            method: CredentialsMethod.ApiToken,
            config: {
              token: config.OPENFGA_API_TOKEN,
            },
          },
        }
      : {}),
  });

  return {
    async check(request: OpenFgaCheckRequest): Promise<boolean> {
      const result = await client.check({
        user: request.user,
        relation: request.relation,
        object: request.object,
      });
      return Boolean(result.allowed);
    },

    async writeTuples(writes: OpenFgaTupleKey[]): Promise<void> {
      if (writes.length === 0) return;
      await client.write({
        writes: writes.map((tuple) => ({
          user: tuple.user,
          relation: tuple.relation,
          object: tuple.object,
        })),
      });
    },

    async deleteTuples(deletes: OpenFgaTupleKey[]): Promise<void> {
      if (deletes.length === 0) return;
      await client.write({
        deletes: deletes.map((tuple) => ({
          user: tuple.user,
          relation: tuple.relation,
          object: tuple.object,
        })),
      });
    },
  };
}
