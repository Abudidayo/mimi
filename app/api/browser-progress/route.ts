import { NextResponse } from "next/server";
import { listBrowserProgressRuns } from "@/lib/browser/progress-store";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    runs: listBrowserProgressRuns(),
  });
}
