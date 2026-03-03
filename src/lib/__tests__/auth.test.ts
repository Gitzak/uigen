// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";

vi.mock("server-only", () => ({}));

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

// Must import after mocks are registered
const { createSession, getSession, deleteSession, verifySession } = await import(
  "@/lib/auth"
);

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

async function makeToken(
  payload: Record<string, unknown>,
  secret = JWT_SECRET,
  expiresIn: string | number = "7d"
) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(secret);
}

describe("createSession", () => {
  beforeEach(() => vi.clearAllMocks());

  test("sets auth-token cookie with httpOnly and correct options", async () => {
    await createSession("user-1", "a@b.com");

    expect(mockCookieStore.set).toHaveBeenCalledOnce();
    const [name, , opts] = mockCookieStore.set.mock.calls[0];
    expect(name).toBe("auth-token");
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe("lax");
    expect(opts.path).toBe("/");
    expect(opts.secure).toBe(false); // NODE_ENV is not "production" in tests
  });

  test("cookie expires in approximately 7 days", async () => {
    const before = Date.now();
    await createSession("user-1", "a@b.com");
    const after = Date.now();

    const [, , opts] = mockCookieStore.set.mock.calls[0];
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    expect(opts.expires.getTime()).toBeGreaterThanOrEqual(before + sevenDays - 1000);
    expect(opts.expires.getTime()).toBeLessThanOrEqual(after + sevenDays + 1000);
  });

  test("JWT token contains userId and email", async () => {
    await createSession("user-1", "a@b.com");

    const [, token] = mockCookieStore.set.mock.calls[0];
    const { payload } = await jwtVerify(token, JWT_SECRET);
    expect(payload.userId).toBe("user-1");
    expect(payload.email).toBe("a@b.com");
  });
});

describe("getSession", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns null when cookie is absent", async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    expect(await getSession()).toBeNull();
  });

  test("returns session payload for a valid token", async () => {
    const token = await makeToken({ userId: "user-1", email: "a@b.com" });
    mockCookieStore.get.mockReturnValue({ value: token });

    const session = await getSession();
    expect(session?.userId).toBe("user-1");
    expect(session?.email).toBe("a@b.com");
  });

  test("returns null for a malformed token", async () => {
    mockCookieStore.get.mockReturnValue({ value: "not.a.jwt" });
    expect(await getSession()).toBeNull();
  });

  test("returns null for an expired token", async () => {
    const expiredAt = Math.floor(Date.now() / 1000) - 60; // 1 minute ago
    const token = await makeToken({ userId: "user-1" }, JWT_SECRET, expiredAt);
    mockCookieStore.get.mockReturnValue({ value: token });
    expect(await getSession()).toBeNull();
  });

  test("returns null for a token signed with the wrong secret", async () => {
    const wrongSecret = new TextEncoder().encode("wrong-secret");
    const token = await makeToken({ userId: "user-1" }, wrongSecret);
    mockCookieStore.get.mockReturnValue({ value: token });
    expect(await getSession()).toBeNull();
  });

  test("reads from the auth-token cookie name", async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    await getSession();
    expect(mockCookieStore.get).toHaveBeenCalledWith("auth-token");
  });
});

describe("deleteSession", () => {
  beforeEach(() => vi.clearAllMocks());

  test("deletes the auth-token cookie", async () => {
    await deleteSession();
    expect(mockCookieStore.delete).toHaveBeenCalledOnce();
    expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
  });
});

describe("verifySession", () => {
  function makeRequest(token: string | undefined) {
    return { cookies: { get: vi.fn().mockReturnValue(token ? { value: token } : undefined) } } as any;
  }

  test("returns null when request has no auth-token cookie", async () => {
    expect(await verifySession(makeRequest(undefined))).toBeNull();
  });

  test("returns session payload for a valid token", async () => {
    const token = await makeToken({ userId: "user-2", email: "b@c.com" });
    const session = await verifySession(makeRequest(token));
    expect(session?.userId).toBe("user-2");
    expect(session?.email).toBe("b@c.com");
  });

  test("returns null for a malformed token", async () => {
    expect(await verifySession(makeRequest("garbage"))).toBeNull();
  });

  test("returns null for an expired token", async () => {
    const expiredAt = Math.floor(Date.now() / 1000) - 60;
    const token = await makeToken({ userId: "user-2" }, JWT_SECRET, expiredAt);
    expect(await verifySession(makeRequest(token))).toBeNull();
  });

  test("returns null for a token signed with the wrong secret", async () => {
    const wrongSecret = new TextEncoder().encode("wrong-secret");
    const token = await makeToken({ userId: "user-2" }, wrongSecret);
    expect(await verifySession(makeRequest(token))).toBeNull();
  });

  test("reads from the auth-token cookie name on the request", async () => {
    const mockGet = vi.fn().mockReturnValue(undefined);
    await verifySession({ cookies: { get: mockGet } } as any);
    expect(mockGet).toHaveBeenCalledWith("auth-token");
  });
});
