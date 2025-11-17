import { NextRequest, NextResponse } from "next/server";
import { login } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  try {
    const result = await login(username, password);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
}
