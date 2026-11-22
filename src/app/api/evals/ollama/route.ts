import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import {
  checkOllamaStatus,
  executeLocalModelInference,
  LOCAL_MODELS_CATALOG,
} from "@/services/llm/ollamaClient";

/**
 * Feature 4: Ollama Local Models API
 * Connects to http://localhost:11434 for free on-device model execution.
 */
export async function GET(req: NextRequest) {
  try {
    await getTenantContext();
    const { searchParams } = new URL(req.url);
    const hostUrl = searchParams.get("hostUrl") || undefined;

    const status = await checkOllamaStatus(hostUrl);

    return NextResponse.json({
      success: true,
      status,
      modelsCatalog: LOCAL_MODELS_CATALOG,
    });
  } catch (error) {
    console.error("Error checking Ollama status:", error);
    return NextResponse.json(
      { error: "Failed to check local Ollama status" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await getTenantContext();
    const body = await req.json().catch(() => ({}));
    const { modelId = "gemma4:e4b", prompt = "Summarize local database connection options." } = body;

    const result = await executeLocalModelInference({
      modelId,
      prompt,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Error executing local inference:", error);
    return NextResponse.json(
      { error: "Failed to execute local model inference" },
      { status: 500 }
    );
  }
}
