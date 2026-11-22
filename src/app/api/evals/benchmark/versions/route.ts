import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import { getBenchmarkVersions, loadBenchmarkCasesByVersion } from "@/services/eval/benchmarkManager";

/**
 * Benchmark Versions & Cases API (Task 4.1)
 * Returns the versioned test sets from the repository.
 */
export async function GET(req: NextRequest) {
  try {
    await getTenantContext();
    const { searchParams } = new URL(req.url);
    const version = searchParams.get("version");

    const manifest = getBenchmarkVersions();

    if (version) {
      const dataset = loadBenchmarkCasesByVersion(version);
      return NextResponse.json({
        success: true,
        manifest,
        dataset,
      });
    }

    return NextResponse.json({
      success: true,
      manifest,
    });
  } catch (error) {
    console.error("Error fetching benchmark versions:", error);
    return NextResponse.json(
      { error: "Failed to fetch benchmark versions" },
      { status: 500 }
    );
  }
}
