import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let userId: number | undefined;
  try {
    const { user } = await requireAuth(req, [Role.ADMIN, Role.OPERATOR]);
    userId = user.id;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const machineId = Number(params.id);
  const { feederId } = await req.json();

  if (!feederId) {
    return NextResponse.json({ error: "feederId is required" }, { status: 400 });
  }

  const machine = await prisma.machine.findUnique({ where: { id: machineId } });
  if (!machine) {
    return NextResponse.json({ error: "Machine not found" }, { status: 404 });
  }

  const feeder = await prisma.feeder.findUnique({
    where: { id: Number(feederId) },
    include: { feederType: true },
  });

  if (!feeder || feeder.machineId !== machineId) {
    return NextResponse.json(
      { error: "Feeder not mounted on this machine" },
      { status: 400 }
    );
  }

  await prisma.feeder.update({
    where: { id: feeder.id },
    data: { machineId: null },
  });

  await logAudit({
    action: "UNASSIGN_FEEDER",
    details: `Unassigned ${feeder.label} (${feeder.feederType.code}) from ${machine.name}`,
    userId,
    feederId: feeder.id,
    machineId,
  });

  return NextResponse.json({ success: true });
}
