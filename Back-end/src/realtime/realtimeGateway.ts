import crypto from "node:crypto";
import type { Server as HTTPServer } from "http";
import { Server as SocketIOServer, type Socket } from "socket.io";
import firebaseAdmin from "../config/firebaseAdmin.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import UserDAO from "../dao/UserDAO.js";

type SocketUser = Awaited<ReturnType<UserDAO["findUserByUid"]>>;

type NotificationPayload = {
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
};

const ROLE_ROOM_PREFIX = "role:";

class RealtimeGateway {
  private io: SocketIOServer;
  private userDAO = new UserDAO();
  private userToSockets = new Map<string, Set<string>>();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: env.CORS_ORIGIN,
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    this.registerAuthMiddleware();
    this.registerConnectionHandlers();
  }

  private registerAuthMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = this.extractToken(socket);
        if (!token) {
          return next(new Error("Unauthorized"));
        }
        const decoded = await firebaseAdmin.auth().verifyIdToken(token);
        const user = await this.userDAO.findUserByUid(decoded.uid);
        if (!user) {
          return next(new Error("User not found"));
        }

        socket.data.uid = decoded.uid;
        socket.data.role = user.role_type;
        socket.data.user = user;
        next();
      } catch (error) {
        logger.warn({ error }, "Realtime auth failed");
        next(new Error("Unauthorized"));
      }
    });
  }

  private registerConnectionHandlers() {
    this.io.on("connection", (socket) => {
      const uid = socket.data.uid as string | undefined;
      const role = socket.data.role as string | undefined;
      const user = socket.data.user as SocketUser | undefined;

      if (!uid || !user) {
        socket.disconnect(true);
        return;
      }

      this.trackSocket(uid, socket.id);
      socket.join(uid);
      if (role) {
        socket.join(this.roleRoom(role));
      }

      logger.info(
        { uid, socketId: socket.id },
        "Realtime connection established"
      );

      socket.on("disconnect", (reason) => {
        this.releaseSocket(uid, socket.id);
        logger.info(
          { uid, socketId: socket.id, reason },
          "Realtime connection closed"
        );
      });
    });
  }

  private extractToken(socket: Socket): string | null {
    const authToken = socket.handshake.auth?.token;
    if (typeof authToken === "string" && authToken.length > 0) {
      return this.normalizeToken(authToken);
    }

    const header = socket.handshake.headers.authorization;
    if (typeof header === "string" && header.startsWith("Bearer ")) {
      return this.normalizeToken(header);
    }
    return null;
  }

  private normalizeToken(token: string) {
    return token.startsWith("Bearer ") ? token.slice(7) : token;
  }

  private roleRoom(role: string) {
    return `${ROLE_ROOM_PREFIX}${role}`;
  }

  private trackSocket(uid: string, socketId: string) {
    const sockets = this.userToSockets.get(uid) ?? new Set<string>();
    sockets.add(socketId);
    this.userToSockets.set(uid, sockets);
  }

  private releaseSocket(uid: string, socketId: string) {
    const sockets = this.userToSockets.get(uid);
    if (!sockets) {
      return;
    }
    sockets.delete(socketId);
    if (sockets.size === 0) {
      this.userToSockets.delete(uid);
    } else {
      this.userToSockets.set(uid, sockets);
    }
  }

  notifyUser(uid: string, payload: NotificationPayload) {
    const enrichedPayload = this.enrichPayload(payload);
    this.io.to(uid).emit("notifications:new", enrichedPayload);
  }

  notifyRole(role: string, payload: NotificationPayload) {
    const enrichedPayload = this.enrichPayload(payload);
    this.io.to(this.roleRoom(role)).emit("notifications:new", enrichedPayload);
  }

  broadcast(payload: NotificationPayload) {
    const enrichedPayload = this.enrichPayload(payload);
    this.io.emit("notifications:new", enrichedPayload);
  }

  get connectionsCount() {
    return this.io.engine.clientsCount;
  }

  private enrichPayload(payload: NotificationPayload) {
    return {
      id: crypto.randomUUID(),
      createdAt: payload.createdAt ?? new Date().toISOString(),
      ...payload,
    };
  }
}

let gatewayInstance: RealtimeGateway | null = null;

export function initializeRealtime(server: HTTPServer) {
  if (!gatewayInstance) {
    gatewayInstance = new RealtimeGateway(server);
  }
  return gatewayInstance;
}

export function getRealtimeGateway() {
  if (!gatewayInstance) {
    throw new Error("Realtime gateway not initialized");
  }
  return gatewayInstance;
}

export type { NotificationPayload };

