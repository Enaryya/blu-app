// lib/auth.ts
// NextAuth configuration. This is the single source of truth for how
// authentication works in Blu. It tells NextAuth:
//   1. How to verify a phone + OTP login
//   2. What to store in the session token (role, phone, etc.)
//   3. Which pages to use for login and errors

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyOtp, clearOtp } from "@/lib/otp-store";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "phone-otp",
      name: "Phone OTP",
      // These are the fields NextAuth sends to the authorize() function
      credentials: {
        phone: { label: "Phone Number", type: "text" },
        code: { label: "OTP Code", type: "text" },
      },

      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.code) return null;

        const { phone, code } = credentials;

        // Step 1: Check if the OTP is correct
        const isValid = verifyOtp(phone, code);
        if (!isValid) return null;

        // Step 2: Look up the user in the database
        const user = await prisma.user.findUnique({
          where: { phoneNumber: phone },
          include: { workerProfile: true },
        });

        // If no user exists, we throw a special error so the login page
        // can redirect to the registration page instead.
        if (!user) {
          throw new Error("USER_NOT_FOUND");
        }

        if (!user.isActive) {
          throw new Error("ACCOUNT_SUSPENDED");
        }

        // Step 3: Clear the OTP now that it's been used successfully
        clearOtp(phone);

        // Return the user object — NextAuth will put this in the JWT token
        return {
          id: user.id,
          name: user.name,
          email: user.email ?? undefined,
          role: user.role,
          phone: user.phoneNumber,
          profilePhotoUrl: user.profilePhotoUrl ?? undefined,
        };
      },
    }),
  ],

  // Use JWT strategy: the session is stored in a cookie, not the database.
  // This is faster and doesn't require a sessions table.
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    // jwt() runs every time a JWT is created or refreshed.
    // We copy extra user fields (role, phone) into the token here.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
        token.phone = (user as { phone: string }).phone;
        token.profilePhotoUrl = (user as { profilePhotoUrl?: string })
          .profilePhotoUrl;
      }
      return token;
    },

    // session() runs every time getServerSession() or useSession() is called.
    // We expose the extra fields to the client.
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.phone = token.phone as string;
        session.user.profilePhotoUrl = token.profilePhotoUrl as
          | string
          | undefined;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",  // Custom login page
    error: "/login",   // Show errors on the login page
  },

  secret: process.env.NEXTAUTH_SECRET,
};
