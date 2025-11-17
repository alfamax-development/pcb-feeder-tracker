import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req, [Role.ADMIN]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true, createdAt: true, updatedAt: true },
    orderBy: { username: "asc" },
  });

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  let adminId: number | undefined;
  try {
    const { user } = await requireAuth(req, [Role.ADMIN]);
    adminId = user.id;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { username, password, role } = await req.json();

  if (!username || !password || !role) {
    return NextResponse.json(
      { error: "username, password, and role are required" },
      { status: 400 }
    );
  }

  if (!["ADMIN", "OPERATOR"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.create({
      data: { username, password: passwordHash, role },
      select: { id: true, username: true, role: true, createdAt: true, updatedAt: true },
    });

    await logAudit({
      action: "CREATE_USER",
      details: `Created user ${username} (${role})`,
      userId: adminId,
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
