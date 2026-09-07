import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { notifyOwner } from "./_core/notification";
import { sendStreamerRequestEmail } from "./requestEmail";
import { streamerRequests, streamerTenants } from "../drizzle/schema";

export async function createStreamerRequest(input: { userId: number; tenant: string; channel: string; note?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(streamerRequests).values({ userId: input.userId, requestedTenant: input.tenant, requestedChannel: input.channel, note: input.note });
  await Promise.allSettled([
    notifyOwner({ title: "New Oni streamer access request", content: `Streamer access request for ${input.tenant} / #${input.channel}. Direct approval correspondence to lakimmo@protonmail.com. Note: ${input.note ?? "none"}` }),
    sendStreamerRequestEmail(input),
  ]).then((results) => {
    for (const result of results) {
      if (result.status === "rejected") console.warn("[streamers] request notification unavailable:", result.reason);
    }
  });
  const rows = await db.select().from(streamerRequests).where(and(eq(streamerRequests.userId, input.userId), eq(streamerRequests.requestedTenant, input.tenant))).orderBy(desc(streamerRequests.id)).limit(1);
  return rows[0];
}

export async function listRequests() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(streamerRequests).orderBy(desc(streamerRequests.id));
}

export async function reviewRequest(input: { requestId: number; status: "approved" | "rejected" | "revoked"; reviewerId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select().from(streamerRequests).where(eq(streamerRequests.id, input.requestId)).limit(1);
  const request = rows[0];
  if (!request) throw new Error("Streamer request not found");
  await db.update(streamerRequests).set({ status: input.status, reviewedBy: input.reviewerId, reviewedAt: new Date() }).where(eq(streamerRequests.id, input.requestId));
  if (input.status === "approved") {
    await db.insert(streamerTenants).values({ ownerUserId: request.userId, slug: request.requestedTenant, displayName: request.requestedTenant, channel: request.requestedChannel, allowedOrigin: process.env.PUBLIC_APP_ORIGIN ?? "https://oni.laiki.fi" }).onDuplicateKeyUpdate({ set: { ownerUserId: request.userId, channel: request.requestedChannel, allowedOrigin: process.env.PUBLIC_APP_ORIGIN ?? "https://oni.laiki.fi" } });
  }
}

export async function listTenantsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: streamerTenants.id, slug: streamerTenants.slug, displayName: streamerTenants.displayName, channel: streamerTenants.channel, twitchLogin: streamerTenants.twitchLogin, allowedOrigin: streamerTenants.allowedOrigin, hasTwitchCredentials: sql<boolean>`CASE WHEN ${streamerTenants.encryptedRefreshToken} IS NULL THEN false ELSE true END` }).from(streamerTenants).where(eq(streamerTenants.ownerUserId, userId));
}

export async function getTenantBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(streamerTenants).where(eq(streamerTenants.slug, slug)).limit(1);
  return rows[0];
}

export async function getTenantByOwner(slug: string, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(streamerTenants).where(and(eq(streamerTenants.slug, slug), eq(streamerTenants.ownerUserId, userId))).limit(1);
  return rows[0];
}
