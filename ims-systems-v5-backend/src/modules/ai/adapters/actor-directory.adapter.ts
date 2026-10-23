/**
 * Resolve user display names for Alice activity messages.
 */

import { createUserRepository } from "../../users/repositories/user.repository";
import type { AiActorDirectoryPort } from "../ports";

export function createAiActorDirectoryAdapter(): AiActorDirectoryPort {
  const users = createUserRepository();
  return {
    async getDisplayName(userId) {
      const id = userId.trim();
      if (!id) return "A user";
      const user = await users.findById(id);
      const name = user?.name?.trim();
      return name && name.length > 0 ? name : id;
    },
  };
}
