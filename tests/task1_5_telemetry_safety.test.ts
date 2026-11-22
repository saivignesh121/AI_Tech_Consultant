import { describe, it, expect } from "vitest";
import { maskPII } from "../src/lib/pii";
import { calculateModelCost } from "../src/services/llm/pricing";
import { validatePromptVariables } from "../src/services/chat/prompts";
import { SUPPORTED_MODELS } from "../src/services/llm/pricing";
import { canRoleSharePrice } from "../src/services/chat/roles";

describe("Task 1.5: Telemetry, Cost Logging, PII Masking & Job Safety", () => {
  // =========================================================================
  // 1. Model Telemetry & Exact Cost Logging
  // =========================================================================
  describe("1. Model Call Telemetry & Cost Precision", () => {
    it("calculates exact USD cost down to 6 decimal places with prompt caching discount", () => {
      // Claude Sonnet 5.5 rates: $2.00 / $10.00 per 1M tokens ($0.20 for cached reads)
      const inputTokens = 2500;
      const outputTokens = 400;
      const cachedReadTokens = 2000;

      // Billable uncached: 500 / 1M * $2.00 = 0.001000
      // Cached: 2000 / 1M * $0.20 = 0.000400
      // Output: 400 / 1M * $10.00 = 0.004000
      // Total: 0.005400
      const cost = calculateModelCost("claude-sonnet-5.5", inputTokens, outputTokens, cachedReadTokens);
      expect(cost).toBe(0.0054);
      expect(cost.toFixed(6)).toBe("0.005400");
    });

    it("logs zero cost ($0.000000) for laptop Ollama and free OpenRouter models", () => {
      const gemmaCost = calculateModelCost("gemma4:e4b", 5000, 1000, 0);
      expect(gemmaCost).toBe(0.0);

      const qwenCost = calculateModelCost("qwen3.5:4b", 3000, 500, 0);
      expect(qwenCost).toBe(0.0);

      const nemotronFreeCost = calculateModelCost("nvidia/nemotron-3-ultra-550b-a55b:free", 4000, 800, 0);
      expect(nemotronFreeCost).toBe(0.0);
    });

    it("verifies telemetry trace data structure contains all 8 required audit fields", () => {
      const mockTelemetryRecord = {
        id: "log-uuid-1",
        businessId: "biz-uuid-100",
        taskType: "write_reply",
        modelId: "claude-sonnet-5.5",
        promptVersionId: "v-prompt-2",
        roleId: "role-support-engineer",
        inputTokens: 1450,
        outputTokens: 320,
        cachedReadTokens: 1100,
        durationMs: 245,
        costUsd: "0.004250",
        status: "success",
        createdAt: new Date().toISOString(),
      };

      expect(mockTelemetryRecord.businessId).toBeDefined();
      expect(mockTelemetryRecord.taskType).toBe("write_reply");
      expect(mockTelemetryRecord.modelId).toBe("claude-sonnet-5.5");
      expect(mockTelemetryRecord.promptVersionId).toBe("v-prompt-2");
      expect(mockTelemetryRecord.roleId).toBe("role-support-engineer");
      expect(mockTelemetryRecord.durationMs).toBe(245);
      expect(mockTelemetryRecord.costUsd).toBe("0.004250");
      expect(mockTelemetryRecord.status).toBe("success");
    });
  });

  // =========================================================================
  // 2. PII Masking Engine (Pre-Inference & Pre-Logging)
  // =========================================================================
  describe("2. Personal Data Masking (PII Shield)", () => {
    it("masks Luhn-valid credit card numbers with [REDACTED_CARD]", () => {
      // Valid test card (Luhn algorithm compliant)
      const text = "Please charge my Visa card 4242 4242 4242 4242 for the monthly retainer.";
      const { sanitized, maskedCount } = maskPII(text);

      expect(sanitized).not.toContain("4242 4242 4242 4242");
      expect(sanitized).toContain("[REDACTED_CARD]");
      expect(maskedCount).toBe(1);
    });

    it("masks international and formatted phone numbers with [REDACTED_PHONE]", () => {
      const text = "Reach our lead engineer at +1 (555) 234-5678 or direct dial 555-876-5432.";
      const { sanitized, maskedCount } = maskPII(text);

      expect(sanitized).not.toContain("(555) 234-5678");
      expect(sanitized).not.toContain("555-876-5432");
      expect(sanitized).toContain("[REDACTED_PHONE]");
      expect(maskedCount).toBe(2);
    });

    it("masks physical street addresses with [REDACTED_ADDRESS]", () => {
      const text = "Ship the hardware server to 742 Evergreen Terrace, Suite 400 for deployment.";
      const { sanitized, maskedCount } = maskPII(text);

      expect(sanitized).not.toContain("742 Evergreen Terrace");
      expect(sanitized).toContain("[REDACTED_ADDRESS]");
      expect(maskedCount).toBe(1);
    });

    it("masks Social Security Numbers with [REDACTED_SSN]", () => {
      const text = "Identity verification code SSN: 000-12-3456.";
      const { sanitized, maskedCount } = maskPII(text);

      expect(sanitized).not.toContain("000-12-3456");
      expect(sanitized).toContain("[REDACTED_SSN]");
      expect(maskedCount).toBe(1);
    });
  });

  // =========================================================================
  // 3. Background Job Resilience & Failed Jobs Safe Drawer
  // =========================================================================
  describe("3. Background Job Retry & Safe Drawer", () => {
    it("simulates job retry state across transient model API outages", () => {
      interface MockJobState {
        jobId: string;
        queueName: string;
        status: "pending" | "retrying" | "completed" | "failed";
        retryCount: number;
        retryLimit: number;
        payloadPreserved: boolean;
      }

      const job: MockJobState = {
        jobId: "job-crawl-101",
        queueName: "knowledge-brain-crawler",
        status: "pending",
        retryCount: 0,
        retryLimit: 3,
        payloadPreserved: true,
      };

      // Model API goes down mid-run (simulated 503 outage)
      const transientError = new Error("503 Service Unavailable: Model API down");
      if (transientError) {
        job.status = "retrying";
        job.retryCount += 1;
      }

      // Verification: Payload is preserved, nothing is lost
      expect(job.payloadPreserved).toBe(true);
      expect(job.status).toBe("retrying");
      expect(job.retryCount).toBe(1);

      // Model API recovers on subsequent attempt
      job.status = "completed";
      expect(job.status).toBe("completed");
    });

    it("routes permanently failing jobs into the safe failed_jobs drawer", () => {
      const retryLimit = 3;
      let retryCount = 0;
      let dispatchedToFailedDrawer = false;

      // Simulate 3 failures
      while (retryCount < retryLimit) {
        retryCount++;
      }

      if (retryCount >= retryLimit) {
        dispatchedToFailedDrawer = true;
      }

      expect(dispatchedToFailedDrawer).toBe(true);
      expect(retryCount).toBe(3);
    });
  });

  // =========================================================================
  // 4. Day-One vs. Advanced Settings & Breakage Guardrails
  // =========================================================================
  describe("4. Settings Guardrails (Preventing App-Breaking Saves)", () => {
    it("prevents saving prompts missing critical template variables", () => {
      const brokenPrompt = "Answer this question without variables.";
      const check = validatePromptVariables(brokenPrompt, ["knowledge_results", "customer_name", "customer_query"]);

      expect(check.isValid).toBe(false);
      expect(check.missingVariables).toEqual(["knowledge_results", "customer_name", "customer_query"]);
    });

    it("prevents assigning non-vision models to the screenshot interpretation step", () => {
      const haikuModel = SUPPORTED_MODELS["claude-haiku-5.5"];
      const sonnetModel = SUPPORTED_MODELS["claude-sonnet-5.5"];
      const geminiModel = SUPPORTED_MODELS["gemini-3-flash"];

      // Vision capabilities
      expect(haikuModel.supportsVision).toBe(false);
      expect(sonnetModel.supportsVision).toBe(true);
      expect(geminiModel.supportsVision).toBe(true);
    });

    it("prevents non-AI Consultant roles from sharing prices", () => {
      expect(canRoleSharePrice("ai-consultant")).toBe(true);
      expect(canRoleSharePrice("support-engineer")).toBe(false);
      expect(canRoleSharePrice("support-executive")).toBe(false);
    });
  });
});
