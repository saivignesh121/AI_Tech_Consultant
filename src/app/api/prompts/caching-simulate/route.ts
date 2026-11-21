import { NextRequest, NextResponse } from "next/server";
import { simulatePromptCachingSavings } from "@/services/chat/cachingSimulator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      modelId = "claude-sonnet-5.5",
      taskCount = 100,
      staticPromptTokens = 2500,
      dynamicPromptTokens = 200,
      outputTokensPerCall = 350,
    } = body;

    const result = simulatePromptCachingSavings(
      modelId,
      Number(taskCount),
      Number(staticPromptTokens),
      Number(dynamicPromptTokens),
      Number(outputTokensPerCall)
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to simulate caching savings", details: String(error) },
      { status: 500 }
    );
  }
}
