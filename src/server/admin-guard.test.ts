import { describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));

describe("requireAdminSession", () => {
  it("throws UnauthorizedError when there is no session", async () => {
    authMock.mockResolvedValueOnce(null);
    const { requireAdminSession, UnauthorizedError } = await import("@/server/admin-guard");
    await expect(requireAdminSession()).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("throws UnauthorizedError when the session has no user", async () => {
    authMock.mockResolvedValueOnce({ user: undefined });
    const { requireAdminSession, UnauthorizedError } = await import("@/server/admin-guard");
    await expect(requireAdminSession()).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("resolves the session when an admin user is present", async () => {
    const session = { user: { email: "admin@example.com" } };
    authMock.mockResolvedValueOnce(session);
    const { requireAdminSession } = await import("@/server/admin-guard");
    await expect(requireAdminSession()).resolves.toEqual(session);
  });
});
