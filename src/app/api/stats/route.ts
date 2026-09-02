import { NextResponse } from "next/server";
import { getStats, loadStats } from "@/lib/realtime";

export const dynamic = "force-dynamic";

export async function GET() {
  await loadStats();
  return NextResponse.json(getStats());
}
