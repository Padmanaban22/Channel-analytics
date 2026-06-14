export { default } from "next-auth/middleware";

/**
 * Protect the authenticated areas of the app. Unauthenticated users hitting
 * these routes are redirected to /login by next-auth's middleware.
 */
export const config = {
  matcher: ["/dashboard/:path*", "/channels/:path*"],
};
