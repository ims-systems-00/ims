/**
 * Seed email→userId and V4→V5 user remaps from existing V5 users + V4 users.
 *
 * Auth0 JIT users (e.g. jim@) often pre-exist with a different _id than V4.
 * Without this seed, wave1 email dedupe only works within a single migration
 * run and wave2/3 alone leave assignee/createdBy pointing at V4 ids.
 */

import type { Connection } from "mongoose";
import { getUserModel } from "../../src/modules/users/repositories/user.model";
import type { MigrateContext } from "./types";
import { asId } from "./transforms/common";

export async function seedUserIdentityMaps(
  ctx: MigrateContext,
  v4Connection: Connection
): Promise<{ v5Emails: number; remapped: number }> {
  const User = getUserModel();
  const v5Users = await User.find({})
    .select({ _id: 1, email: 1 })
    .lean()
    .exec();

  for (const user of v5Users) {
    const email = String(user.email ?? "")
      .trim()
      .toLowerCase();
    if (!email) continue;
    const id = String(user._id);
    // Prefer keeping the first (usually Auth0 JIT) canonical id for an email.
    if (!ctx.emailToUserId.has(email)) {
      ctx.emailToUserId.set(email, id);
    }
  }

  let remapped = 0;
  const cursor = v4Connection.db.collection("users").find({});
  for await (const raw of cursor) {
    const v4Id = asId(raw._id);
    const email = String(raw.email ?? "")
      .trim()
      .toLowerCase();
    if (!v4Id || !email) continue;
    const canonical = ctx.emailToUserId.get(email);
    if (canonical && canonical !== v4Id) {
      if (!ctx.userIdRemap.has(v4Id)) {
        ctx.userIdRemap.set(v4Id, canonical);
        remapped += 1;
      }
    } else if (!ctx.emailToUserId.has(email)) {
      ctx.emailToUserId.set(email, v4Id);
    }
  }

  return { v5Emails: ctx.emailToUserId.size, remapped };
}
