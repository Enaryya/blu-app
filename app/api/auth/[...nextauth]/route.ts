// app/api/auth/[...nextauth]/route.ts
// This file hands all /api/auth/* requests to NextAuth.
// NextAuth handles: login, logout, session refresh, etc.
// The [...nextauth] folder name is a Next.js "catch-all" route — it catches
// /api/auth/signin, /api/auth/signout, /api/auth/session, and so on.

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

// Next.js App Router requires named exports for each HTTP method
export { handler as GET, handler as POST };
