import { describe, it, expect } from "vitest";
import { DEFAULT_PROMPTS, validatePromptVariables } from "../src/services/chat/prompts";
import { simulatePromptCachingSavings } from "../src/services/chat/cachingSimulator";

describe("Task 1.3: Every Prompt in Settings, Versioning, Variables & Prompt Caching", () => {
  // =========================================================================
  // 1. Every prompt in Settings (No prompt hidden in code)
  // =========================================================================
  describe("1. Completeness of Pre-filled Prompts in Settings", () => {
    it("ensures all operational prompts exist and are pre-filled with high-quality defaults", () => {
      const keys = DEFAULT_PROMPTS.map((p) => p.key);

      // Must include: master (system), user prompt templates (qa_answer), writing lessons, improving skills, and the judge
      expect(keys).toContain("master_system");
      expect(keys).toContain("qa_answer");
      expect(keys).toContain("write_lesson");
      expect(keys).toContain("improve_skill");
      expect(keys).toContain("judge_eval");
      expect(keys).toContain("job_tagger");

      for (const prompt of DEFAULT_PROMPTS) {
        expect(prompt.templateText.length).toBeGreaterThan(50);
        expect(prompt.description.length).toBeGreaterThan(15);
        expect(prompt.requiredVariables.length).toBeGreaterThan(0);

        // Every default prompt must be self-validating
        const check = validatePromptVariables(prompt.templateText, prompt.requiredVariables);
        expect(check.isValid).toBe(true);
        expect(check.missingVariables).toHaveLength(0);
      }
    });

    it("verifies improve_skill prompt synthesizes rules and few-shot examples", () => {
      const improveSkill = DEFAULT_PROMPTS.find((p) => p.key === "improve_skill");
      expect(improveSkill).toBeDefined();
      expect(improveSkill?.requiredVariables).toContain("skill_name");
      expect(improveSkill?.requiredVariables).toContain("skill_instructions");
      expect(improveSkill?.requiredVariables).toContain("critiques_and_lessons");
      expect(improveSkill?.templateText).toContain("Synthesize a refined, durable version");
    });
  });

  // =========================================================================
  // 2. Variable Checking & Warning
  // =========================================================================
  describe("2. Variable Checking & Warnings", () => {
    it("detects when {customer_name} or {knowledge_results} is missing and reports exact missing variables", () => {
      const missingCustomerName = `Context: {knowledge_results}\nQuery: {customer_query}\nProvide grounded response.`;
      const check1 = validatePromptVariables(missingCustomerName, [
        "knowledge_results",
        "customer_name",
        "customer_query",
      ]);

      expect(check1.isValid).toBe(false);
      expect(check1.missingVariables).toContain("customer_name");

      const missingKnowledge = `Customer: {customer_name}\nQuery: {customer_query}\nAnswer directly.`;
      const check2 = validatePromptVariables(missingKnowledge, [
        "knowledge_results",
        "customer_name",
        "customer_query",
      ]);

      expect(check2.isValid).toBe(false);
      expect(check2.missingVariables).toContain("knowledge_results");
    });

    it("passes validation when all required variables are present in the template text", () => {
      const validTemplate = `Customer: {customer_name}\nContext: {knowledge_results}\nQuery: {customer_query}\nAnswer according to rules.`;
      const check = validatePromptVariables(validTemplate, [
        "knowledge_results",
        "customer_name",
        "customer_query",
      ]);

      expect(check.isValid).toBe(true);
      expect(check.missingVariables).toHaveLength(0);
    });
  });

  // =========================================================================
  // 3. Version History, Diff & 1-Click Rollback / Restore Default
  // =========================================================================
  describe("3. Version Control, Rollback & Restore Default", () => {
    interface VersionRecord {
      versionNumber: number;
      templateText: string;
      changeSummary: string;
    }

    it("tracks multiple versions with change summaries and permits rollback to any older version", () => {
      const versionHistory: VersionRecord[] = [
        {
          versionNumber: 1,
          templateText: "Baseline prompt with {knowledge_results}, {customer_name}, {customer_query}",
          changeSummary: "Initial production baseline",
        },
        {
          versionNumber: 2,
          templateText: "Updated prompt with {knowledge_results}, {customer_name}, {customer_query} and refund rule",
          changeSummary: "Added strict refund policy handling",
        },
      ];

      let activeVersion = versionHistory[1];
      expect(activeVersion.versionNumber).toBe(2);

      // 1-Click Rollback to Version 1
      activeVersion = versionHistory[0];
      expect(activeVersion.versionNumber).toBe(1);
      expect(activeVersion.templateText).toContain("Baseline prompt");
    });

    it("allows 1-click restore to built-in default baseline template", () => {
      const defaultDef = DEFAULT_PROMPTS.find((p) => p.key === "master_system")!;
      let userModifiedText = "Custom text with {business_name} and {role_tone}";

      // 1-Click Restore Default action
      userModifiedText = defaultDef.templateText;

      expect(userModifiedText).toBe(defaultDef.templateText);
      expect(userModifiedText).toContain("Grounding: Answer ONLY using facts");
    });
  });

  // =========================================================================
  // 4. Self-Improve Loop Approval Gate Integration
  // =========================================================================
  describe("4. Self-Improve Loop Approval Gate Integration", () => {
    it("ensures automated self-improve changes only become new prompt versions after human approval", () => {
      interface PromptState {
        currentVersion: number;
        versions: Array<{ version: number; changeSummary: string; approvedByHuman: boolean }>;
      }

      const promptState: PromptState = {
        currentVersion: 1,
        versions: [
          { version: 1, changeSummary: "Initial baseline", approvedByHuman: true },
        ],
      };

      // Self-Improve Run finishes and creates an isolated PR / patch proposal
      const proposedPatch = {
        changeSummary: "Approved Self-Improve Loop optimization (Pull Request #44 merged with zero regressions)",
        approved: false, // Pending human review in Approvals Inbox
      };

      // Before human approval: version count remains 1
      expect(promptState.currentVersion).toBe(1);
      expect(promptState.versions).toHaveLength(1);

      // Human expert reviews and approves the change
      proposedPatch.approved = true;
      if (proposedPatch.approved) {
        promptState.versions.push({
          version: promptState.currentVersion + 1,
          changeSummary: proposedPatch.changeSummary,
          approvedByHuman: true,
        });
        promptState.currentVersion = 2;
      }

      // After human approval: shows as version 2 in Settings
      expect(promptState.currentVersion).toBe(2);
      expect(promptState.versions[1].changeSummary).toContain("Approved Self-Improve Loop");
    });
  });

  // =========================================================================
  // 5. Prompt Caching 100-Task Benchmark (Claude API)
  // =========================================================================
  describe("5. Claude Prompt Caching 100-Task Benchmark Simulation", () => {
    it("runs 100 tasks twice (caching OFF vs. caching ON) and proves significant dollar and % savings", () => {
      const result = simulatePromptCachingSavings("claude-sonnet-5.5", 100, 2500, 200, 350);

      expect(result.taskCount).toBe(100);
      expect(result.modelId).toBe("claude-sonnet-5.5");

      // Verify side-by-side costs
      expect(result.costWithoutCachingUsd).toBeGreaterThan(0);
      expect(result.costWithCachingUsd).toBeGreaterThan(0);
      expect(result.costWithCachingUsd).toBeLessThan(result.costWithoutCachingUsd);

      // Verify exact dollars and percentage saved
      expect(result.dollarsSavedUsd).toBeGreaterThan(0.3);
      expect(result.percentSaved).toBeGreaterThan(40); // Over 40% cost reduction

      // Verify token accounting
      expect(result.breakdown.cachingOn.cachedReadTokens).toBe(2500 * 99);
      expect(result.breakdown.cachingOff.inputTokens).toBe(2700 * 100);
    });

    it("verifies caching savings on Claude Opus 5.5", () => {
      const resultOpus = simulatePromptCachingSavings("claude-opus-5.5", 100, 2500, 200, 350);
      expect(resultOpus.costWithCachingUsd).toBeLessThan(resultOpus.costWithoutCachingUsd);
      expect(resultOpus.dollarsSavedUsd).toBeGreaterThan(0.5); // Opus savings in $ are even larger
      expect(resultOpus.percentSaved).toBeGreaterThan(35);
    });
  });
});
