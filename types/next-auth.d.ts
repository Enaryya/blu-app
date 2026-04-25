// types/next-auth.d.ts
// TypeScript needs to know about the extra fields we added to the session
// (role, phone, profilePhotoUrl). Without this file, TypeScript would
// complain that session.user.role doesn't exist.

import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email?: string;
      role: string;        // "CLIENT" | "WORKER" | "ADMIN"
      phone: string;       // e.g. "+233201234567"
      profilePhotoUrl?: string;
    };
  }

  interface User {
    id: string;
    name: string;
    email?: string;
    role: string;
    phone: string;
    profilePhotoUrl?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    phone: string;
    profilePhotoUrl?: string;
  }
}
