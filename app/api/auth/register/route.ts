// app/api/auth/register/route.ts
// Called when a new user submits the registration form.
// Creates the User record in the database (and a WorkerProfile if they chose
// the WORKER role). After this, the login page calls NextAuth signIn() to
// create the session.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  phone: z.string().regex(/^\+233[0-9]{9}$/, "Invalid phone number"),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long"),
  role: z.enum(["CLIENT", "WORKER"], {
    message: "Role must be CLIENT or WORKER",
  }),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, name, role } = bodySchema.parse(body);

    // Prevent duplicate registrations
    const existing = await prisma.user.findUnique({
      where: { phoneNumber: phone },
    });
    if (existing) {
      return NextResponse.json(
        { error: "This phone number is already registered. Please log in." },
        { status: 409 }
      );
    }

    // Create the user record
    const user = await prisma.user.create({
      data: {
        phoneNumber: phone,
        name: name.trim(),
        role,
      },
    });

    // Workers automatically get a blank profile they can fill in later
    if (role === "WORKER") {
      await prisma.workerProfile.create({
        data: {
          userId: user.id,
          tradeCategories: [],
          yearsExperience: 0,
        },
      });
    }

    return NextResponse.json(
      { success: true, userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("[register] error:", error);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
