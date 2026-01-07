import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Server as HTTPServer } from "node:http";
import { initializeRealtime } from "../../../src/realtime/realtimeGateway.js";
import firebaseAdmin from "../../../src/config/firebaseAdmin.js";
import UserDAO from "../../../src/dao/UserDAO.js";

let authMiddleware: Function;

vi.mock("socket.io", () => ({
  Server: vi.fn().mockImplementation(() => ({
    use: (fn: Function) => {
      authMiddleware = fn; // capture middleware
    },
    on: vi.fn(),
    to: vi.fn().mockReturnThis(),
    emit: vi.fn().mockReturnThis(),
    engine: { clientsCount: 0 },
  })),
}));

const createSocket = (overrides: any = {}) => ({
  handshake: {
    auth: {},
    headers: {},
  },
  data: {},
  ...overrides,
});

describe("RealtimeGateway auth middleware", () => {
  let server: HTTPServer;
  let next: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    server = {} as HTTPServer;
    next = vi.fn();
  });

  it("rejects connection if token is missing", async () => {
    initializeRealtime(server);
    const socket = createSocket();

    await authMiddleware(socket, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "Unauthorized" }));
  });

  it("rejects connection if Firebase token verification fails", async () => {
    vi.spyOn(firebaseAdmin.auth(), "verifyIdToken").mockRejectedValueOnce(new Error("Invalid token"));

    initializeRealtime(server);
    const socket = createSocket({ handshake: { auth: { token: "bad-token" } } });

    await authMiddleware(socket, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "Unauthorized" }));
  });

  it("rejects connection if user is not found", async () => {
    vi.spyOn(firebaseAdmin.auth(), "verifyIdToken").mockResolvedValue({
      uid: "uid-123",
      aud: "",
      auth_time: 0,
      exp: 0,
      firebase: {
        identities: {},
        sign_in_provider: "",
        sign_in_second_factor: undefined,
        second_factor_identifier: undefined,
        tenant: undefined
      },
      iat: 0,
      iss: "",
      sub: ""
    });
    vi.spyOn(UserDAO.prototype, "findUserByUid").mockResolvedValue(undefined);

    initializeRealtime(server);
    const socket = createSocket({ handshake: { auth: { token: "valid-token" } } });

    await authMiddleware(socket, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "User not found" }));
  });

  it("accepts connection and populates socket data on success", async () => {
    vi.spyOn(firebaseAdmin.auth(), "verifyIdToken").mockResolvedValue({
      uid: "uid-123",
      aud: "",
      auth_time: 0,
      exp: 0,
      firebase: {
        identities: {},
        sign_in_provider: "",
        sign_in_second_factor: undefined,
        second_factor_identifier: undefined,
        tenant: undefined
      },
      iat: 0,
      iss: "",
      sub: ""
    });
    vi.spyOn(UserDAO.prototype, "findUserByUid").mockResolvedValue({
      id: 1,
      firebase_uid: "uid-123",
      role_type: "citizen",
      email: "",
      username: "",
      first_name: "",
      last_name: "",
      roles: []
    });

    initializeRealtime(server);
    const socket = createSocket({ handshake: { auth: { token: "valid-token" } } });

    await authMiddleware(socket, next);

    expect(socket.data).toMatchObject({
      uid: "uid-123",
      role: "citizen",
      user: expect.objectContaining({ id: 1 }),
    });

    expect(next).toHaveBeenCalledWith();
  });
});
