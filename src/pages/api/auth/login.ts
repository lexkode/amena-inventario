import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { db } from "@db/client";
import { users } from "@db/schema";
import { verifyPassword } from "@modules/auth/password";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSession,
} from "@modules/auth/session";

const errorRedirect = (code: "missing" | "invalid" | "error"): Response =>
  new Response(null, {
    status: 303,
    headers: { Location: `/admin/login?error=${code}` },
  });

export const POST: APIRoute = async ({ request, cookies }) => {
  const contentType = request.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  let email = "";
  let password = "";

  try {
    if (isJson) {
      const body = (await request.json()) as Record<string, unknown>;
      email = typeof body.email === "string" ? body.email.trim() : "";
      password = typeof body.password === "string" ? body.password : "";
    } else {
      const form = await request.formData();
      email = (form.get("email")?.toString() ?? "").trim();
      password = form.get("password")?.toString() ?? "";
    }
  } catch {
    if (isJson) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid request body" }),
        { status: 400, headers: { "content-type": "application/json" } },
      );
    }
    return errorRedirect("error");
  }

  if (!email || !password) {
    if (isJson) {
      return new Response(
        JSON.stringify({ ok: false, error: "Email and password are required" }),
        { status: 400, headers: { "content-type": "application/json" } },
      );
    }
    return errorRedirect("missing");
  }

  const user = db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .get();

  const valid = user ? verifyPassword(password, user.passwordHash) : false;

  if (!user || !valid) {
    if (isJson) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid email or password" }),
        { status: 401, headers: { "content-type": "application/json" } },
      );
    }
    return errorRedirect("invalid");
  }

  const token = await createSession(user.id);

  cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: import.meta.env.PROD,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  if (isJson) {
    return new Response(
      JSON.stringify({
        ok: true,
        user: { id: user.id, email: user.email, role: user.role },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }

  return new Response(null, {
    status: 303,
    headers: { Location: "/admin" },
  });
};
