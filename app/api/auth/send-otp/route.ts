// app/api/auth/send-otp/route.ts
// Called when the user clicks "Send OTP" on the login screen.
// It generates a 6-digit code, stores it for 5 minutes, and (in production)
// would send it via SMS. In development, it logs it to the terminal.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { storeOtp, generateOtp } from "@/lib/otp-store";

// Validates the request body — phone must be a valid Ghana number
const bodySchema = z.object({
  phone: z
    .string()
    .regex(
      /^\+233[0-9]{9}$/,
      "Phone must be in format +233XXXXXXXXX (e.g. +233201234567)"
    ),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone } = bodySchema.parse(body);

    const code = generateOtp();
    storeOtp(phone, code);

    if (process.env.NODE_ENV === "development") {
      // In development, print the OTP so you can see it in the terminal
      console.log(`\n🔑 [DEV] OTP for ${phone}: ${code}\n`);
    } else {
      // TODO: Integrate a Ghana SMS provider (e.g. Arkesel, Hubtel)
      // await smsClient.send({ to: phone, message: `Your Blu code: ${code}` });
    }

    return NextResponse.json({
      success: true,
      message:
        process.env.NODE_ENV === "development"
          ? `Development mode: use code 123456`
          : "OTP sent to your phone",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("[send-otp] error:", error);
    return NextResponse.json(
      { error: "Failed to send OTP. Please try again." },
      { status: 500 }
    );
  }
}
