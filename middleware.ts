// middleware.ts
// This file runs on EVERY request before the page loads.
// It checks: "Is this user logged in? Do they have permission to see this page?"
// If not, it redirects them to the appropriate screen.
//
// Think of it as a security guard at the door of each room.

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token; // The decoded JWT (null if not logged in)

    // ── Redirect already-logged-in users away from auth pages ──────────────
    if (token && (pathname === "/login" || pathname === "/register")) {
      const destination = token.role === "WORKER" ? "/dashboard" : "/home";
      return NextResponse.redirect(new URL(destination, req.url));
    }

    // ── Protect client-only routes from workers ─────────────────────────────
    // /home, /post-job, /workers, /jobs, /payments, /reviews are client screens
    const clientOnlyPrefixes = ["/home", "/post-job", "/workers", "/jobs", "/payment", "/payments", "/reviews"];
    if (
      token?.role === "WORKER" &&
      clientOnlyPrefixes.some((p) => pathname.startsWith(p))
    ) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // ── Protect worker-only routes from clients ─────────────────────────────
    // /dashboard, /feed, /earnings, /portfolio, /worker/* are worker screens
    const workerOnlyPrefixes = ["/dashboard", "/feed", "/earnings", "/portfolio", "/worker/"];
    if (
      token?.role === "CLIENT" &&
      workerOnlyPrefixes.some((p) => pathname.startsWith(p))
    ) {
      return NextResponse.redirect(new URL("/home", req.url));
    }

    // ── Protect admin routes ────────────────────────────────────────────────
    if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // authorized() decides whether to even run the middleware function above,
      // OR to redirect straight to the login page.
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // These routes are always public — no login needed
        const publicPaths = ["/login", "/register", "/"];
        if (publicPaths.includes(pathname)) return true;

        // NextAuth's own API routes must stay public
        if (pathname.startsWith("/api/auth")) return true;

        // Everything else requires a valid session token
        return !!token;
      },
    },
  }
);

// Tell Next.js which routes this middleware runs on.
// We exclude static files and image optimisation routes to avoid slowing them down.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$|.*\\.ico$).*)",
  ],
};
