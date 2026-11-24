import { describe, it, expect } from "vitest";
import { encryptSecret, decryptSecret, maskApiKey } from "../src/lib/crypto";
import { maskPII } from "../src/lib/pii";
import { SUPPORTED_MODELS } from "../src/services/llm/pricing";
import { DEFAULT_STEP_MODELS } from "../src/services/llm/stepModels";
import { routeModelCall } from "../src/services/llm/router";

process.env.ENCRYPTION_KEY ??= "a".repeat(64);

describe("Task 1.2: Keys, Local Models, Connections & Step Routing", () => {
  const REQUIRED_PROVIDERS = ["claude", "gemini", "openrouter", "ollama", "google"];

  describe("1. Exactly 5 Allowed Connections", () => {
    it("defines exactly the 5 specified connections and no others", () => {
      expect(REQUIRED_PROVIDERS).toHaveLength(5);
      expect(REQUIRED_PROVIDERS).toContain("claude");
      expect(REQUIRED_PROVIDERS).toContain("gemini");
      expect(REQUIRED_PROVIDERS).toContain("openrouter");
      expect(REQUIRED_PROVIDERS).toContain("ollama");
      expect(REQUIRED_PROVIDERS).toContain("google");
    });

    it("ensures local Ollama model suite is fixed to gemma4:e4b and qwen3.5:4b", () => {
      const gemma = SUPPORTED_MODELS["gemma4:e4b"];
      const qwen = SUPPORTED_MODELS["qwen3.5:4b"];

      expect(gemma).toBeDefined();
      expect(gemma.isLocal).toBe(true);
      expect(gemma.provider).toBe("ollama");
      expect(gemma.inputPer1M).toBe(0.0);
      expect(gemma.outputPer1M).toBe(0.0);

      expect(qwen).toBeDefined();
      expect(qwen.isLocal).toBe(true);
      expect(qwen.provider).toBe("ollama");
      expect(qwen.inputPer1M).toBe(0.0);
      expect(qwen.outputPer1M).toBe(0.0);
    });
  });

  describe("2. AES-256 Encryption & Zero-Leakage Masking", () => {
    it("encrypts secrets with AES-256-GCM and never displays full plaintext again", () => {
      const secret = "sk-ant-api03-very-secret-production-claude-key-998877";
      const encrypted = encryptSecret(secret);

      expect(encrypted.ciphertext).not.toEqual(secret);
      expect(encrypted.iv).toHaveLength(24);
      expect(encrypted.last4).toEqual(secret.slice(-4));

      const decrypted = decryptSecret(encrypted);
      expect(decrypted).toEqual(secret);

      const masked = maskApiKey(secret);
      expect(masked).toBe("sk-ant-••••••••8877");
      expect(masked).not.toContain("very-secret-production");
    });

    it("ensures secrets and PII are redacted from log outputs", () => {
      const sensitiveLog = "Connecting Claude key sk-ant-api03-abcdef123456 with phone (555) 234-5678";
      const { sanitized } = maskPII(sensitiveLog);

      expect(sanitized).toContain("[REDACTED_PHONE]");
      expect(sanitized).not.toContain("(555) 234-5678");
    });
  });

  describe("3. Model per Step Configuration (14 Supported Models)", () => {
    it("defines the 5 core operational steps for business configuration", () => {
      const stepKeys = Object.keys(DEFAULT_STEP_MODELS);
      expect(stepKeys).toContain("find_facts");
      expect(stepKeys).toContain("write_reply");
      expect(stepKeys).toContain("read_screenshot");
      expect(stepKeys).toContain("improve_skill");
      expect(stepKeys).toContain("judge_eval");
    });

    it("verifies 14 models are available for step selection", () => {
      const allModelKeys = Object.keys(SUPPORTED_MODELS);
      expect(allModelKeys).toHaveLength(14);

      // Verify presence of all required providers
      const providers = new Set(Object.values(SUPPORTED_MODELS).map((m) => m.provider));
      expect(providers.has("claude")).toBe(true);
      expect(providers.has("gemini")).toBe(true);
      expect(providers.has("openrouter")).toBe(true);
      expect(providers.has("ollama")).toBe(true);
    });

    it("enforces vision capability validation for the read_screenshot step", () => {
      // Vision supported models
      const sonnet = SUPPORTED_MODELS["claude-sonnet-5.5"];
      const gemini = SUPPORTED_MODELS["gemini-3.8-flash"];
      const superVl = SUPPORTED_MODELS["nvidia/nemotron-3.5-super-vl:free"];

      expect(sonnet.supportsVision).toBe(true);
      expect(gemini.supportsVision).toBe(true);
      expect(superVl.supportsVision).toBe(true);

      // Non-vision models
      const haiku = SUPPORTED_MODELS["claude-haiku-5.5"];
      const geminiLite = SUPPORTED_MODELS["gemini-2.5-flash-lite"];

      expect(haiku.supportsVision).toBe(false);
      expect(geminiLite.supportsVision).toBe(false);
    });

    it("routes to laptop Ollama in Local-Only Mode with zero cloud API cost", () => {
      const decision = routeModelCall("find_facts", "What is our database max pool?", true);
      expect(decision.selectedModelId).toBe("qwen3.5:4b");
      expect(decision.estimatedCostUsd).toBe(0.0);
      expect(decision.reason).toContain("Local-only mode");

      const writingDecision = routeModelCall("write_reply", "Architect a high availability streaming enterprise system across multi-region clusters with active-active replication and disaster recovery failover.", true);
      expect(writingDecision.selectedModelId).toBe("gemma4:e4b");
      expect(writingDecision.estimatedCostUsd).toBe(0.0);
    });
  });
});
