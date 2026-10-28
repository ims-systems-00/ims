/**
 * Resolve user display names and avatars for Alice history / activity.
 */

import { createUserRepository } from "../../users/repositories/user.repository";
import type { AiActorDirectoryPort, AiActorProfile } from "../ports";

const PLACEHOLDER_AVATAR =
  "https://assets.imssystems.tech/images/system/avatar-placeholder.jpg";

function toProfile(
  userId: string,
  user: {
    name?: string | null;
    profileImage?: { url?: string | null } | null;
  } | null
): AiActorProfile {
  const id = userId.trim() || "unknown";
  const name = user?.name?.trim();
  const avatarUrl = user?.profileImage?.url?.trim() || null;
  return {
    id,
    name: name && name.length > 0 ? name : id,
    avatarUrl:
      avatarUrl && avatarUrl !== PLACEHOLDER_AVATAR ? avatarUrl : null,
  };
}

export function createAiActorDirectoryAdapter(): AiActorDirectoryPort {
  const users = createUserRepository();

  async function getProfile(userId: string): Promise<AiActorProfile> {
    const id = userId.trim();
    if (!id) return { id: "unknown", name: "A user", avatarUrl: null };
    const user = await users.findById(id);
    return toProfile(id, user);
  }

  return {
    async getDisplayName(userId) {
      const profile = await getProfile(userId);
      return profile.name;
    },

    getProfile,

    async getProfiles(userIds) {
      const unique = [
        ...new Set(userIds.map((id) => id.trim()).filter(Boolean)),
      ];
      const entries = await Promise.all(
        unique.map(async (id) => {
          const user = await users.findById(id);
          return [id, toProfile(id, user)] as const;
        })
      );
      return new Map(entries);
    },
  };
}
