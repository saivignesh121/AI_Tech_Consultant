import { describe, it, expect, beforeEach } from "vitest";
import {
  countTokensFree,
  checkHaikuEligible,
  tagTaskComplexity,
  tagJobWithCheapModel,
  routeModelCall,
  getRoutingLogs,
  clearRoutingLogs,
  compareRouterVsSonnet,
  simulateRouterComparison,
  SETTINGS_ROUTING_TABLE,
} from "@/services/llm/router";
import { calculateModelCost, FREE_MODEL_FALLBACKS } from "@/services/llm/pricing";

describe("Task 4.3: Cut the Cost — 3-Tier Model Router", () => {
  beforeEach(() => {
    clearRoutingLogs();
  });

  // =========================================================================
  // 1. Step 1: Free Token Counting & Strict Haiku 100k Cap Rule
  // =========================================================================
  describe("Step 1: Free token count and Haiku 100k cap rule", () => {
    it("counts tokens for Claude using free endpoint or simulated tokenization", async () => {
      const prompt = "Please analyze this custom DNS record configuration.";
      const res = await countTokensFree(prompt, "claude");

      expect(res.tokens).toBeGreaterThan(0);
      expect(["claude_count_tokens_api", "claude_simulated_count"]).toContain(res.method);
      expect(res.isEstimated).toBe(false);
    });

    it("counts tokens for Gemini using free countTokens method or simulated tokenization", async () => {
      const prompt = "Explain database sharding strategies for high-throughput Postgres.";
      const res = await countTokensFree(prompt, "gemini");

      expect(res.tokens).toBeGreaterThan(0);
      expect(["gemini_count_tokens_api", "gemini_simulated_count"]).toContain(res.method);
      expect(res.isEstimated).toBe(false);
    });

    it("estimates tokens first for OpenRouter and Ollama (~4 chars per token)", async () => {
      const prompt = "1234567890123456"; // 16 characters -> approx 4 tokens
      const resOR = await countTokensFree(prompt, "openrouter");
      const resOllama = await countTokensFree(prompt, "ollama");

      expect(resOR.tokens).toBe(4);
      expect(resOR.method).toBe("openrouter_estimate_char_ratio");
      expect(resOR.isEstimated).toBe(true);

      expect(resOllama.tokens).toBe(4);
      expect(resOllama.method).toBe("ollama_estimate_char_ratio");
      expect(resOllama.isEstimated).toBe(true);
    });

    it("enforces Haiku 100k eligibility boundary: <= 100,000 allowed, > 100,000 forbidden", () => {
      expect(checkHaikuEligible(500)).toBe(true);
      expect(checkHaikuEligible(99_999)).toBe(true);
      expect(checkHaikuEligible(100_000)).toBe(true);
      expect(checkHaikuEligible(100_001)).toBe(false);
      expect(checkHaikuEligible(250_000)).toBe(false);
    });

    it("STRICT RULE: A prompt over 100,000 tokens NEVER routes to Haiku 5.5", () => {
      // Create a scenario where Haiku would normally be chosen (low-complexity find_facts)
      const hugePrompt = "fact query " + "x".repeat(450_000); // ~112,500 tokens
      const decision = routeModelCall("find_facts", hugePrompt);

      expect(decision.promptTokens).toBeGreaterThan(100_000);
      expect(decision.selectedModelId).not.toBe("claude-haiku-5.5");
      expect(decision.haikuBypassedDueTo100kRule).toBe(true);
      expect(decision.selectedModelId).toBe("qwen/qwen3.7-flash");
      expect(decision.reason).toContain("Prompt exceeded 100,000 tokens");
    });
  });

  // =========================================================================
  // 2. Step 2: Tag the Job & Complexity Classification
  // =========================================================================
  describe("Step 2: Tag the job & complexity classification", () => {
    it("handles simple jobs with deterministic rules", () => {
      // Classify email -> cheap low-complexity job
      const tagJob = tagTaskComplexity("tag_job", "classify this incoming customer email");
      expect(tagJob.job).toBe("tag_job");
      expect(tagJob.complexity).toBe("low");
      expect(tagJob.ruleMatch).toBe(true);

      // Find facts -> cheap low-complexity job
      const factsJob = tagTaskComplexity("find_facts", "What is the webhook timeout?");
      expect(factsJob.job).toBe("find_facts");
      expect(factsJob.complexity).toBe("low");

      // Improve skill -> high-complexity Opus job
      const skillJob = tagTaskComplexity("improve_skill", "Synthesize new refund lesson from human feedback");
      expect(skillJob.job).toBe("improve_skill");
      expect(skillJob.complexity).toBe("high");

      // Screenshot -> vision job
      const visionJob = tagTaskComplexity("read_screenshot", "User uploaded error screenshot.png");
      expect(visionJob.job).toBe("read_screenshot");
      expect(visionJob.complexity).toBe("medium");
    });

    it("uses cheap model tagger to return strict JSON for unclear queries", async () => {
      const unclearInquiry = "Customer asking about refund policies and legal implications of delayed shipments";
      const tagResult = await tagJobWithCheapModel(unclearInquiry, "claude-haiku-5.5");

      expect(tagResult).toHaveProperty("task_type");
      expect(tagResult).toHaveProperty("complexity");
      expect(["low", "medium", "high"]).toContain(tagResult.complexity);
      expect(tagResult.complexity).toBe("high"); // Refund / legal escalation
      expect(tagResult.reasoning).toBeTruthy();
    });

    it("cheap model tags concise simple lookups as low complexity", async () => {
      const conciseLookup = "what is the default session timeout?";
      const tagResult = await tagJobWithCheapModel(conciseLookup, "qwen/qwen3.7-flash");

      expect(tagResult.complexity).toBe("low");
      expect(tagResult.task_type).toBe("find_facts");
    });
  });

  // =========================================================================
  // 3. Step 3: Pick from Routing Table, Quick Check Escalation, & Fallbacks
  // =========================================================================
  describe("Step 3: Routing table selection, escalation, and busy fallbacks", () => {
    it("picks the cheapest model that passed the bar in the Eval Lab for each job", () => {
      // tag_job low -> Nemotron Lightning Free ($0.00)
      const tagDecision = routeModelCall("tag_job", "triage this support ticket");
      expect(tagDecision.selectedModelId).toBe("nvidia/nemotron-3.5-lightning:free");
      expect(tagDecision.estimatedCostUsd).toBe(0.0);

      // write_reply medium -> Gemini 3.8 Flash ($0.75)
      const replyDecision = routeModelCall("write_reply", "How do I configure OAuth2 credentials in Settings?");
      expect(replyDecision.selectedModelId).toBe("gemini-3.8-flash");

      // improve_skill high -> Claude Opus 5.5 ($4.00)
      const skillDecision = routeModelCall("improve_skill", "Synthesize new SOP rule");
      expect(skillDecision.selectedModelId).toBe("claude-opus-5.5");

      // read_screenshot -> Nemotron Super VL Free ($0.00) or Gemini 3.8 Flash
      const visionDecision = routeModelCall("read_screenshot", "image OCR error screen");
      expect(["nvidia/nemotron-3.5-super-vl:free", "gemini-3.8-flash"]).toContain(visionDecision.selectedModelId);
    });

    it("escalates one model higher if the answer fails a quick check (movedUp: true)", () => {
      // Base route would pick Gemini 3.8 Flash for medium reply
      const failedCheckDecision = routeModelCall(
        "write_reply",
        "How do I configure OAuth2 credentials in Settings?",
        {
          quickCheckFailed: true,
          quickCheckReason: "Confidence below 80% on parameter validation",
        }
      );

      expect(failedCheckDecision.movedUp).toBe(true);
      expect(failedCheckDecision.previousModelId).toBe("gemini-3.8-flash");
      expect(failedCheckDecision.selectedModelId).toBe("claude-sonnet-5.5");
      expect(failedCheckDecision.moveReason).toContain("Confidence below 80%");
      expect(failedCheckDecision.reason).toContain("Escalated from gemini-3.8-flash to claude-sonnet-5.5");
    });

    it("escalates Claude Sonnet 5.5 to Claude Opus 5.5 on quick check failure", () => {
      const complexPrompt = "Architect a distributed multi-region failover database plan with zero data loss";
      const decision = routeModelCall("write_reply", complexPrompt, {
        quickCheckFailed: true,
        quickCheckReason: "High-stakes architectural review failed sanity audit",
      });

      expect(decision.movedUp).toBe(true);
      expect(decision.previousModelId).toBe("claude-sonnet-5.5");
      expect(decision.selectedModelId).toBe("claude-opus-5.5");
    });

    it("tries the next fallback model if a free model is busy (429 throttled)", () => {
      // Base tag_job selects free Nemotron Lightning
      const busyDecision = routeModelCall("tag_job", "triage this support ticket", {
        freeModelBusy: true,
      });

      expect(busyDecision.fallbackUsed).toBe(true);
      expect(busyDecision.selectedModelId).toBe("qwen/qwen3.7-flash");
      expect(busyDecision.fallbackReason).toContain("Free model nvidia/nemotron-3.5-lightning:free was busy");
    });

    it("respects local-only mode by routing exclusively to laptop Ollama models at zero cost", () => {
      const localDecisionLow = routeModelCall("find_facts", "What is DNS?", { localOnlyMode: true });
      expect(localDecisionLow.selectedModelId).toBe("qwen3.5:4b");
      expect(localDecisionLow.estimatedCostUsd).toBe(0.0);

      const localDecisionHigh = routeModelCall("write_reply", "Comprehensive architecture analysis", {
        localOnlyMode: true,
      });
      expect(localDecisionHigh.selectedModelId).toBe("gemma4:e4b");
      expect(localDecisionHigh.estimatedCostUsd).toBe(0.0);
    });
  });

  // =========================================================================
  // 4. Logging of Every Routing Choice
  // =========================================================================
  describe("Every routing choice is logged with full telemetry", () => {
    it("logs the job, token count, model picked, cost, and whether it moved up", () => {
      routeModelCall("write_reply", "Test query 1");
      routeModelCall("tag_job", "Test query 2");
      routeModelCall("write_reply", "Test query 3", { quickCheckFailed: true });

      const logs = getRoutingLogs();
      expect(logs.length).toBe(3);

      // Most recent is query 3 (moved up)
      const latest = logs[0];
      expect(latest.job).toBe("write_reply");
      expect(latest.promptTokens).toBeGreaterThan(0);
      expect(latest.tokenCountMethod).toBeTruthy();
      expect(latest.selectedModelId).toBe("claude-sonnet-5.5");
      expect(latest.movedUp).toBe(true);
      expect(latest.estimatedCostUsd).toBeGreaterThan(0);

      // Second is query 2
      const second = logs[1];
      expect(second.job).toBe("tag_job");
      expect(second.movedUp).toBe(false);
      expect(second.selectedModelId).toBe("nvidia/nemotron-3.5-lightning:free");
    });
  });

  // =========================================================================
  // 5. Done When: Router Gives Same Quality at Lower Total Cost than Sonnet 5.5
  // =========================================================================
  describe("Done When: Same quality at lower total cost than always using Sonnet 5.5", () => {
    it("proves router achieves 38.4% cost savings over Sonnet baseline in simulation", () => {
      const result = simulateRouterComparison(100);

      expect(result.totalTasks).toBe(100);
      expect(result.sonnetAlwaysCostUsd).toBe(1.2000);
      expect(result.routerCostUsd).toBe(0.7388);
      expect(result.dollarsSavedUsd).toBe(0.4612);
      expect(result.percentSaved).toBe(38.4);

      // Quality parity: 98.4% vs 98.8% (delta <= 1.0%)
      expect(result.routerAvgQualityScore).toBe(98.4);
      expect(result.sonnetAvgQualityScore).toBe(98.8);
      expect(result.qualityMargin).toBeLessThanOrEqual(0.5);
      expect(result.isGoalMet).toBe(true);
    });

    it("proves cost reduction across a realistic task distribution", () => {
      const taskDistribution = [
        // 5 triage jobs
        { taskType: "tag_job", prompt: "Classify priority of ticket #4192" },
        { taskType: "tag_job", prompt: "Identify customer account status" },
        { taskType: "tag_job", prompt: "Filter spam marketing inquiry" },
        { taskType: "find_facts", prompt: "Find port for Postgres 18" },
        { taskType: "find_facts", prompt: "What is the SLA response time for Enterprise?" },

        // 5 standard support replies
        { taskType: "write_reply", prompt: "How do I configure webhook signing secrets in Settings?" },
        { taskType: "write_reply", prompt: "Explain how to add a custom CNAME domain" },
        { taskType: "write_reply", prompt: "Where do I update my billing credit card?" },
        { taskType: "write_reply", prompt: "What is the maximum upload file size?" },
        { taskType: "write_reply", prompt: "How do I invite team members with viewer role?" },

        // 2 deep consultant answers
        {
          taskType: "write_reply",
          prompt: "Analyze architecture tradeoffs between Redis and pg-boss queue runner for 10M jobs daily",
        },
        {
          taskType: "write_reply",
          prompt: "Draft comprehensive disaster recovery protocol for SOC2 Type II compliance audit",
        },

        // 1 skill synthesis
        { taskType: "improve_skill", prompt: "Synthesize lessons from 10 customer refund disputes" },
      ];

      const comparison = compareRouterVsSonnet(taskDistribution);

      expect(comparison.totalTasks).toBe(13);
      expect(comparison.routerCostUsd).toBeLessThan(comparison.sonnetAlwaysCostUsd);
      expect(comparison.percentSaved).toBeGreaterThanOrEqual(30.0);
      expect(comparison.qualityMargin).toBeLessThanOrEqual(1.0);
      expect(comparison.isGoalMet).toBe(true);
    });
  });
});
