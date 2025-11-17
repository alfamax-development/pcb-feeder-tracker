import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req, [Role.ADMIN]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pageParam = Number(req.nextUrl.searchParams.get("page") || "1");
  const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const pageSize = 10;

  const total = await prisma.audit.count();

  const logs = await prisma.audit.findMany({
    include: {
      user: { select: { id: true, username: true } },
      feeder: { select: { id: true, label: true } },
      machine: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return NextResponse.json({ logs, total, page, pageSize });
}
