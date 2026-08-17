import type { APIContext, APIRoute } from "astro";
import { ApiError, toErrorMessage } from "./errors";
import { json } from "./json";

type Handler = (ctx: APIContext) => Promise<Response> | Response;

function toErrorResponse(err: unknown): Response {
  if (err instanceof ApiError) {
    return json({ ok: false, error: err.message }, err.status);
  }
  return json({ ok: false, error: toErrorMessage(err) }, 400);
}

/** Endpoints JSON protegidos: exige sesión y mapea errores a respuestas JSON. */
export function jsonApi(handler: Handler): APIRoute {
  return async (ctx) => {
    if (!ctx.locals.user) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }
    try {
      return await handler(ctx);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

/** Endpoints de formulario protegidos: exige sesión (los errores redirigen). */
export function formApi(handler: Handler): APIRoute {
  return async (ctx) => {
    if (!ctx.locals.user) {
      return new Response("Unauthorized", { status: 401 });
    }
    return handler(ctx);
  };
}