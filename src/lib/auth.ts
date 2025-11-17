import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import prisma from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET;

export type TokenPayload = {
  userId: number;
  username: string;
  role: Role;
  iat?: number;
  exp?: number;
};

export async function login(username: string, password: string) {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET missing");
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    throw new Error("Invalid credentials");
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw new Error("Invalid credentials");
  }

  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  };
}

export function verifyToken(token: string): TokenPayload | null {
  if (!JWT_SECRET) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (err) {
    return null;
  }
}

function getTokenFromRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

export async function getUserFromRequest(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  return prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, username: true, role: true },
  });
}

export async function requireAuth(req: NextRequest, roles?: Role[]) {
  const token = getTokenFromRequest(req);
  if (!token) {
    throw new Error("Unauthorized");
  }

  const payload = verifyToken(token);
  if (!payload) {
    throw new Error("Unauthorized");
  }

  if (roles && !roles.includes(payload.role)) {
    throw new Error("Forbidden");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, username: true, role: true },
  });

  if (!user) {
    throw new Error("Unauthorized");
  }

  return { user, payload };
}
