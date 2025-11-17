import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    await logAudit({
      action: "LOGOUT",
      details: `User ${user.username} logged out`,
      userId: user.id,
    });
  } catch {
    // ignore auth errors, still respond success to simplify client logout
  }

  return NextResponse.json({ success: true });
}
