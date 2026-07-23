import { defineMiddleware } from "astro:middleware";
import { SESSION_COOKIE, validateSession } from "@modules/auth/session";

const PROTECTED_PREFIX = "/admin";
const PUBLIC_ADMIN_PATH = "/admin/login";

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.user = null;

  const token = context.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    const user = await validateSession(token);
    if (user) {
      context.locals.user = user;
    }
  }

  const { pathname } = context.url;

  if (pathname === PUBLIC_ADMIN_PATH && context.locals.user) {
    return context.redirect("/admin");
  }

  if (
    pathname.startsWith(PROTECTED_PREFIX) &&
    pathname !== PUBLIC_ADMIN_PATH &&
    !context.locals.user
  ) {
    return context.redirect("/admin/login");
  }

  return next();
});
