import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

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
  const machineId = Number(id);
  if (Number.isNaN(machineId)) {
    return NextResponse.json({ error: "Invalid machine id" }, { status: 400 });
  }

  try {
    const machine = await prisma.machine.findUnique({ where: { id: machineId } });
    if (!machine) {
      return NextResponse.json({ error: "Machine not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.feeder.updateMany({
        where: { machineId },
        data: { machineId: null },
      });
      await tx.machine.delete({ where: { id: machineId } });
    });

    await logAudit({
      action: "DELETE_MACHINE",
      details: `Deleted machine ${machine.name}`,
      userId: adminId,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete machine" }, { status: 500 });
  }
}
