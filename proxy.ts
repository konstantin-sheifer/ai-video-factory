import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/studio(.*)",
  "/loading(.*)",
  "/api(.*)",
]);

const isPublicApiRoute = createRouteMatcher([
  "/api/generate",
  "/api/health/db",
  "/api/health/live",
  "/api/health/ready",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req) && !isPublicApiRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|.*\\..*).*)",
    "/",
  ],
};
