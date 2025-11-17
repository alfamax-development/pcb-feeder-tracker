import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const machines = await prisma.machine.findMany({
    include: {
      feeders: {
        include: { feederType: true },
        orderBy: { label: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ machines });
}

export async function POST(req: NextRequest) {
  let userId: number | undefined;
  try {
    const { user } = await requireAuth(req, [Role.ADMIN, Role.OPERATOR]);
    userId = user.id;
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: (err as Error).message === "Forbidden" ? 403 : 401 }
    );
  }

  const { name } = await req.json();
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const machine = await prisma.machine.create({ data: { name } });

  await logAudit({
    action: "CREATE_MACHINE",
    details: `Created machine ${name}`,
    userId,
    machineId: machine.id,
  });

  return NextResponse.json({ machine });
}
