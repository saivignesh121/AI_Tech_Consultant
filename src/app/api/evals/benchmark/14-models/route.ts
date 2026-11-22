import { NextRequest, NextResponse } from "next/server";
import { runMultiModelBenchmark } from "@/services/eval/multiModelBenchmark";
import { cookies } from "next/headers";

/**
 * Task 4.2: Compare the 14 models API
 * - Evaluates all 14 models on at least 100 benchmark cases.
 * - Supports human notes per case and per model.
 * - Provides step-by-step breakdown (Quality, Cost per 100 runs, Speed Avg/P95).
 * - Supports Local-Only switch with quality drop report.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const version = searchParams.get("version") || "2.0.0";
    const caseLimit = parseInt(searchParams.get("limit") || "100", 10);
    const modelFilter = searchParams.get("modelId");

    const cookieStore = await cookies();
    const cookieLocalOnly = cookieStore.get("local_only_mode")?.value === "true";
    const paramLocalOnly = searchParams.get("localOnly") === "true";
    const localOnly = paramLocalOnly || cookieLocalOnly;

    const result = runMultiModelBenchmark({
      version,
      caseLimit,
      localOnly,
      selectedModelIds: modelFilter ? [modelFilter] : undefined,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to execute multi-model benchmark", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      version = "2.0.0",
      caseLimit = 100,
      localOnly = false,
      selectedModelIds,
    } = body;

    const result = runMultiModelBenchmark({
      version,
      caseLimit: Math.max(caseLimit, 20),
      localOnly,
      selectedModelIds,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to run 14-model benchmark", details: String(error) },
      { status: 500 }
    );
  }
}
