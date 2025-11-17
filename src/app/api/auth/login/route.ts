import { NextRequest, NextResponse } from "next/server";
import { login } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  try {
    const result = await login(username, password);
    await logAudit({
      action: "LOGIN",
      details: `User ${result.user.username} logged in`,
      userId: result.user.id,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
}
