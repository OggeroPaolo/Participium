import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Server as HTTPServer } from "node:http";
import { initializeRealtime, getRealtimeGateway } from "../../../src/realtime/realtimeGateway.js";
import { ROLES } from "../../../src/models/userRoles.js";

// --------------------
// Spies & mocks
// --------------------
const emitSpy = vi.fn();
const toSpy = vi.fn(() => ({ emit: emitSpy }));
const useSpy = vi.fn();

// --------------------
// Mock Socket.IO
// --------------------
const socketEventCallbacks: Record<string, Function> = {};

vi.mock("socket.io", () => ({
  Server: vi.fn().mockImplementation(() => ({
    to: toSpy,
    emit: emitSpy,
    use: useSpy,
    engine: { clientsCount: 0 },
    on: (event: string, cb: Function) => {
      socketEventCallbacks[event] = cb; // store every callback
    },
  })),
}));


// --------------------
// Mock UUID
// --------------------
vi.mock("node:crypto", async () => ({
  default: { randomUUID: vi.fn(() => "mock-uuid") },
}));

// --------------------
// Helper to create a mock socket
// --------------------
const createSocket = (data: any = {}) => {
  const callbacks: Record<string, Function> = {};
  return {
    id: "socket-1",
    data,
    join: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn().mockImplementation((event, cb) => (callbacks[event] = cb)),
    _callbacks: callbacks,
  };
};

// --------------------
// Test Suite
// --------------------
describe("RealtimeGateway", () => {
  let server: HTTPServer;
  let gateway: ReturnType<typeof getRealtimeGateway>;

  beforeEach(() => {
    vi.clearAllMocks();
    server = {} as HTTPServer;
  });


  // --------------------
  // Notification Tests
  // --------------------
  it("notifyUser emits to user room with enriched payload", () => {
    initializeRealtime(server);
    gateway = getRealtimeGateway();

    gateway.notifyUser("uid-123", {
      type: "report.accepted",
      title: "Approved",
      message: "Your report was approved",
    });

    expect(toSpy).toHaveBeenCalledWith("uid-123");
    expect(emitSpy).toHaveBeenCalledWith(
      "notifications:new",
      expect.objectContaining({
        id: "mock-uuid",
        type: "report.accepted",
        title: "Approved",
        message: "Your report was approved",
        createdAt: expect.any(String),
      })
    );
  });

  it("notifyRole emits to role room", () => {
    initializeRealtime(server);
    gateway = getRealtimeGateway();

    gateway.notifyRole(ROLES.CITIZEN, {
      type: "announcement",
      title: "Hello",
      message: "Message for citizens",
    });

    expect(toSpy).toHaveBeenCalledWith("role:citizen");
    expect(emitSpy).toHaveBeenCalled();
  });

  it("broadcast emits to all sockets", () => {
    initializeRealtime(server);
    gateway = getRealtimeGateway();

    gateway.broadcast({
      type: "system",
      title: "Maintenance",
      message: "System maintenance",
    });

    expect(emitSpy).toHaveBeenCalledWith(
      "notifications:new",
      expect.objectContaining({ id: "mock-uuid", type: "system" })
    );
  });

  it("does not override provided createdAt", () => {
    initializeRealtime(server);
    gateway = getRealtimeGateway();

    gateway.notifyUser("uid-1", {
      type: "custom",
      title: "Test",
      message: "Test",
      createdAt: "2024-01-01T00:00:00.000Z",
    });

    expect(emitSpy).toHaveBeenCalledWith(
      "notifications:new",
      expect.objectContaining({ createdAt: "2024-01-01T00:00:00.000Z" })
    );
  });

  // --------------------
  // Connection Handler Tests
  // --------------------
  it("disconnects socket if uid or user missing", () => {
    initializeRealtime(server);


    const socket = createSocket({ uid: undefined, user: undefined });

    // ⚡ trigger connection manually
    const connectionCb = socketEventCallbacks["connection"];
    if (!connectionCb) throw new Error("Connection callback not registered");
    connectionCb(socket);

    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });
  it("joins socket to uid and role rooms and tracks socket", () => {
    initializeRealtime(server);
    const gateway = getRealtimeGateway();

    // spy on track/release
    const trackSpy = vi.spyOn(gateway as any, "trackSocket");
    vi.spyOn(gateway as any, "releaseSocket");

    const socket = createSocket({ uid: "uid-123", role: "citizen", user: { id: 1 } });

    // ⚡ trigger connection manually using our map
    const connectionCb = socketEventCallbacks["connection"];
    if (!connectionCb) throw new Error("Connection callback not registered");
    connectionCb(socket);

    expect(socket.join).toHaveBeenCalledWith("uid-123");
    expect(socket.join).toHaveBeenCalledWith("role:citizen");
    expect(trackSpy).toHaveBeenCalledWith("uid-123", "socket-1");
  });

  it("calls releaseSocket on disconnect", () => {
    initializeRealtime(server);
    const gateway = getRealtimeGateway();

    // spy on track/release
    vi.spyOn(gateway as any, "trackSocket");
    const releaseSpy = vi.spyOn(gateway as any, "releaseSocket");

    const socket = createSocket({ uid: "uid-123", role: "citizen", user: { id: 1 } });

    // ⚡ trigger connection manually
    const connectionCb = socketEventCallbacks["connection"];
    if (!connectionCb) throw new Error("Connection callback not registered");
    connectionCb(socket);

    // trigger disconnect manually
    const disconnectCb = socket._callbacks["disconnect"];
    if (!disconnectCb) throw new Error("Disconnect callback not registered");
    disconnectCb("client disconnect");

    expect(releaseSpy).toHaveBeenCalledWith("uid-123", "socket-1");
  });
});
