import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import { db } from "@/db";
import { businesses } from "@/db/schema/business";
import { SUPPORTED_MODELS } from "@/services/llm/pricing";
import { DEFAULT_STEP_MODELS } from "@/services/llm/stepModels";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const tenant = await getTenantContext();

    const [biz] = await db
      .select({ stepModels: businesses.stepModels })
      .from(businesses)
      .where(eq(businesses.id, tenant.businessId))
      .limit(1);

    const stored = biz?.stepModels || {};

    const steps = Object.entries(DEFAULT_STEP_MODELS).map(([stepKey, meta]) => ({
      key: stepKey,
      label: meta.label,
      description: meta.description,
      selectedModel: stored[stepKey] || meta.defaultModel,
      defaultModel: meta.defaultModel,
    }));

    const modelsList = Object.values(SUPPORTED_MODELS).map((m) => ({
      id: m.id,
      displayName: m.displayName,
      provider: m.provider,
      inputPer1M: m.inputPer1M,
      outputPer1M: m.outputPer1M,
      supportsVision: m.supportsVision,
      isFree: m.isFree,
      isLocal: m.isLocal,
      primaryJob: m.primaryJob,
    }));

    return NextResponse.json({
      success: true,
      steps,
      models: modelsList,
    });
  } catch (error) {
    console.error("Failed to fetch step models:", error);
    return NextResponse.json(
      { error: "Failed to retrieve step models", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();

    // Verify owner role
    if (tenant.userRole !== "owner") {
      return NextResponse.json(
        { error: "Forbidden. Only the Business Owner can configure model routing." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { stepModels } = body;

    if (!stepModels || typeof stepModels !== "object") {
      return NextResponse.json(
        { error: "Invalid payload: stepModels object is required." },
        { status: 400 }
      );
    }

    // Validate that each model selected is in the 14 supported models
    for (const [step, modelId] of Object.entries(stepModels)) {
      if (!DEFAULT_STEP_MODELS[step]) {
        return NextResponse.json(
          { error: `Invalid step: '${step}'. Supported steps: ${Object.keys(DEFAULT_STEP_MODELS).join(", ")}` },
          { status: 400 }
        );
      }

      if (!SUPPORTED_MODELS[modelId as string]) {
        return NextResponse.json(
          { error: `Invalid model: '${modelId}'. Must be one of the 14 supported models.` },
          { status: 400 }
        );
      }

      // Check vision requirement for read_screenshot
      if (step === "read_screenshot" && !SUPPORTED_MODELS[modelId as string].supportsVision) {
        return NextResponse.json(
          { error: `Model '${modelId}' does not support vision. Please select a multimodal model (Claude Opus, Claude Sonnet, Gemini 3.8 Flash, Gemini 3 Flash, or Nemotron Super VL).` },
          { status: 400 }
        );
      }
    }

    // Task 4.5: Release Gate Enforcer — Model routing cannot go live if score falls below last version
    if (body.candidateScore !== undefined && body.baselineScore !== undefined) {
      const { evaluateModelReleaseGate } = await import("@/services/eval/releaseGate");
      const gate = evaluateModelReleaseGate(
        "step_models_configuration",
        Number(body.candidateScore),
        Number(body.baselineScore)
      );
      if (!gate.allowed) {
        return NextResponse.json(
          {
            error: `Blocked by Release Gate: step models benchmark score (${gate.candidateScore}%) fell below baseline (${gate.baselineScore}%). Cannot go live.`,
            releaseGate: gate,
          },
          { status: 422 }
        );
      }
    }

    // Persist to database
    await db
      .update(businesses)
      .set({
        stepModels,
        updatedAt: new Date(),
      })
      .where(eq(businesses.id, tenant.businessId));

    return NextResponse.json({
      success: true,
      stepModels,
      message: "Model per step routing saved successfully.",
    });
  } catch (error) {
    console.error("Failed to save step models:", error);
    return NextResponse.json(
      { error: "Failed to save step models", details: String(error) },
      { status: 500 }
    );
  }
}
