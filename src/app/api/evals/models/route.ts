import { NextRequest, NextResponse } from "next/server";
import { runModelMatrixEvaluation } from "@/services/eval/benchmarkRunner";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const localOnly = cookieStore.get("local_only_mode")?.value === "true";

    const matrix = runModelMatrixEvaluation(localOnly);

    return NextResponse.json({
      localOnlyMode: localOnly,
      matrix,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to evaluate models matrix", details: String(error) },
      { status: 500 }
    );
  }
}
