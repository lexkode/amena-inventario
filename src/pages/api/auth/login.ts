import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { db } from "@db/client";
import { users } from "@db/schema";
import { verifyPassword } from "@features/auth/password.service";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  cleanupExpiredSessions,
  createSession,
} from "@features/auth/session.service";
import { loginSchema } from "@features/auth/auth.types";
import { formToObject, parse } from "@core/validation/parse";
import { json, redirect } from "@core/http/json";

const errorRedirect = (code: "missing" | "invalid" | "error"): Response =>
  redirect(`/admin/login?error=${code}`);

export const POST: APIRoute = async ({ request, cookies }) => {
  const contentType = request.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  let body: unknown;
  if (isJson) {
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: "Invalid request body" }, 400);
    }
  } else {
    body = formToObject(await request.formData());
  }

  let email = "";
  let password = "";
  try {
    const input = parse(body, loginSchema);
    email = input.email;
    password = input.password;
  } catch {
    if (isJson) {
      return json({ ok: false, error: "Email and password are required" }, 400);
    }
    return errorRedirect("missing");
  }

  const user = (
    await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
  )[0];

  const valid = user ? verifyPassword(password, user.passwordHash) : false;

  if (!user || !valid) {
    if (isJson) {
      return json({ ok: false, error: "Invalid email or password" }, 401);
    }
    return errorRedirect("invalid");
  }

  await cleanupExpiredSessions();

  const token = await createSession(user.id);

  cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: import.meta.env.PROD,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  if (isJson) {
    return json(
      {
        ok: true,
        user: { id: user.id, email: user.email, role: user.role },
      },
      200,
    );
  }

  return redirect("/admin");
};