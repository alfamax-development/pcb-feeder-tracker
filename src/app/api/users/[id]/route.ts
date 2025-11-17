import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let adminId: number | undefined;
  try {
    const { user } = await requireAuth(req, [Role.ADMIN]);
    adminId = user.id;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = Number(id);
  if (Number.isNaN(userId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  const body = await req.json();
  const data: { username?: string; role?: Role; password?: string } = {};

  if (body.username) data.username = body.username;
  if (body.role) {
    if (!["ADMIN", "OPERATOR"].includes(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    data.role = body.role;
  }
  if (body.password) data.password = await bcrypt.hash(body.password, 10);

  if (!data.username && !data.role && !data.password) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, username: true, role: true, createdAt: true, updatedAt: true },
    });

    await logAudit({
      action: "UPDATE_USER",
      details: `Updated user ${updated.username}`,
      userId: adminId,
    });

    return NextResponse.json({ user: updated });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 });
    }
    if (err.code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let adminId: number | undefined;
  try {
    const { user } = await requireAuth(req, [Role.ADMIN]);
    adminId = user.id;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = Number(id);
  if (Number.isNaN(userId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  if (userId === adminId) {
    return NextResponse.json({ error: "Kendi hesabını silemezsin" }, { status: 400 });
  }

  try {
    const deleted = await prisma.user.delete({
      where: { id: userId },
      select: { id: true, username: true, role: true },
    });

    await logAudit({
      action: "DELETE_USER",
      details: `Deleted user ${deleted.username}`,
      userId: adminId,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
