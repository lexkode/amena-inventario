import type { APIRoute } from "astro";
import { SESSION_COOKIE, invalidateSession } from "@modules/auth/session";

export const POST: APIRoute = async ({ cookies, request }) => {
  const contentType = request.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  const token = cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    await invalidateSession(token);
  }
  cookies.delete(SESSION_COOKIE, { path: "/" });

  if (isJson) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(null, {
    status: 303,
    headers: { Location: "/admin/login" },
  });
};
