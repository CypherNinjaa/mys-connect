import { clerkMiddleware } from "@clerk/nextjs/server";

// Next 16 deprecated the `middleware` file convention in favour of `proxy`.
// A default export satisfies the new convention, so clerkMiddleware() is
// unchanged — Clerk 7.6.1 already looks for `proxy.ts` on Next 16+.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
