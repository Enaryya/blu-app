// lib/otp-store.ts
// Stores one-time password codes temporarily so we can verify them when the
// user submits the 6-digit code they received.
//
// In development: always accepts "123456" for any phone number so you can
// test without a real SMS provider.
// In production: replace this Map with Redis for multi-server support.

interface OtpEntry {
  code: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

// In-memory store: lives as long as the server process is running
const store = new Map<string, OtpEntry>();

/** Save an OTP code for a phone number. Expires in 5 minutes. */
export function storeOtp(phone: string, code: string): void {
  store.set(phone, {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });
}

/**
 * Check if the submitted code matches what we stored for this phone.
 * Returns true if valid, false if wrong/expired.
 * Does NOT delete the code — call clearOtp() after a successful sign-in.
 */
export function verifyOtp(phone: string, code: string): boolean {
  // Development shortcut: accept "123456" for any phone
  if (process.env.NODE_ENV === "development" && code === "123456") {
    return true;
  }

  const entry = store.get(phone);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    store.delete(phone);
    return false;
  }
  return entry.code === code;
}

/** Remove the OTP after it has been successfully used. */
export function clearOtp(phone: string): void {
  store.delete(phone);
}

/** Generate a 6-digit OTP. In development, always returns "123456". */
export function generateOtp(): string {
  if (process.env.NODE_ENV === "development") return "123456";
  return Math.floor(100000 + Math.random() * 900000).toString();
}
