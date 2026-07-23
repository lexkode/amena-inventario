import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "@db/client";
import { sessions, users, type User } from "@db/schema";

export const SESSION_COOKIE = "app_session_id";
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_MAX_AGE_SECONDS = SESSION_DURATION_MS / 1000;

export async function createSession(userId: number): Promise<string> {
  const id = crypto.randomUUID();
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  db.insert(sessions).values({ id, userId, expiresAt }).run();
  return id;
}

export async function validateSession(token: string): Promise<User | null> {
  const now = Date.now();
  const row = db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, token), gt(sessions.expiresAt, now)))
    .get();

  if (row) return row.user;

  db.delete(sessions).where(eq(sessions.id, token)).run();
  return null;
}

export async function invalidateSession(token: string): Promise<void> {
  db.delete(sessions).where(eq(sessions.id, token)).run();
}

export async function cleanupExpiredSessions(): Promise<number> {
  const result = db
    .delete(sessions)
    .where(lt(sessions.expiresAt, Date.now()))
    .run();
  return result.changes;
}
