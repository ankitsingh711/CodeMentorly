import { auth } from "@/lib/auth";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/** Throws UnauthorizedError unless a valid admin session is present. Use in API routes. */
export async function requireAdminSession() {
  const session = await auth();
  if (!session?.user) throw new UnauthorizedError();
  return session;
}
