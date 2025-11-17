import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const feeders = await prisma.feeder.findMany({
    include: {
      feederType: true,
      machine: { select: { id: true, name: true } },
    },
    orderBy: [{ feederType: { code: "asc" } }, { label: "asc" }],
  });

  const feederTypes = await prisma.feederType.findMany({
    orderBy: { code: "asc" },
  });

  return NextResponse.json({ feeders, feederTypes });
}

export async function POST(req: NextRequest) {
  let userId: number | undefined;
  try {
    const { user } = await requireAuth(req, [Role.ADMIN]);
    userId = user.id;
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: (err as Error).message === "Forbidden" ? 403 : 401 }
    );
  }

  const { feederTypeId, quantity } = await req.json();
  const qty = Number(quantity) || 1;

  if (!feederTypeId || qty <= 0) {
    return NextResponse.json(
      { error: "feederTypeId and positive quantity are required" },
      { status: 400 }
    );
  }

  const feederType = await prisma.feederType.findUnique({
    where: { id: Number(feederTypeId) },
  });

  if (!feederType) {
    return NextResponse.json({ error: "Feeder type not found" }, { status: 404 });
  }

  const existingCount = await prisma.feeder.count({
    where: { feederTypeId: feederType.id },
  });

  const newFeeders = Array.from({ length: qty }).map((_, idx) => ({
    label: `${feederType.code}-${existingCount + idx + 1}`,
    feederTypeId: feederType.id,
  }));

  await prisma.feeder.createMany({ data: newFeeders });

  await logAudit({
    action: "ADD_FEEDER_STOCK",
    details: `Added ${qty} feeders for type ${feederType.code}`,
    userId,
  });

  return NextResponse.json({ success: true });
}
