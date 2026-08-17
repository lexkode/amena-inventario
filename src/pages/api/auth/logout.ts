import type { APIRoute } from "astro";
import { SESSION_COOKIE, invalidateSession } from "@features/auth/session.service";
import { json, redirect } from "@core/http/json";

export const POST: APIRoute = async ({ cookies, request }) => {
  const contentType = request.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  const token = cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    await invalidateSession(token);
  }
  cookies.delete(SESSION_COOKIE, { path: "/" });

  if (isJson) {
    return json({ ok: true }, 200);
  }

  return redirect("/admin/login");
};