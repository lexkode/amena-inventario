import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "@core/db/client";
import { sessions, users, type User } from "@core/db/schema";

export const SESSION_COOKIE = "app_session_id";
export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;
export const SESSION_MAX_AGE_SECONDS = SESSION_DURATION_MS / 1000;

export async function createSession(userId: number): Promise<string> {
  const id = crypto.randomUUID();
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  await db.insert(sessions).values({ id, userId, expiresAt });
  return id;
}

export async function validateSession(token: string): Promise<User | null> {
  const now = Date.now();
  const row = (
    await db
      .select({ user: users })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.id, token), gt(sessions.expiresAt, now)))
      .limit(1)
  )[0];

  if (row) return row.user;

  await db.delete(sessions).where(eq(sessions.id, token));
  return null;
}

export async function invalidateSession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, token));
}

export async function cleanupExpiredSessions(): Promise<number> {
  const deleted = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, Date.now()))
    .returning({ id: sessions.id });
  return deleted.length;
}