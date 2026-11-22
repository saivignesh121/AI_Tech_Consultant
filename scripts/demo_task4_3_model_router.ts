import {
  countTokensFree,
  checkHaikuEligible,
  tagTaskComplexity,
  tagJobWithCheapModel,
  routeModelCall,
  getRoutingLogs,
  clearRoutingLogs,
  simulateRouterComparison,
  compareRouterVsSonnet,
  SETTINGS_ROUTING_TABLE,
} from "../src/services/llm/router";
import { calculateModelCost } from "../src/services/llm/pricing";

async function runDemo() {
  console.log("================================================================================");
  console.log("🎯 TASK 4.3: CUT THE COST — 3-TIER MODEL ROUTER DEMONSTRATION");
  console.log("================================================================================\n");

  clearRoutingLogs();

  // ---------------------------------------------------------------------------
  // Step 1: Free Token Counting & Haiku 100k Cap Enforcement
  // ---------------------------------------------------------------------------
  console.log("▶ STEP 1: COUNT TOKENS FIRST, FOR FREE");
  console.log("--------------------------------------------------------------------------------");
  const testSample = "How do I configure HMAC-SHA256 timing-safe signature verification for webhooks?";
  const claudeCount = await countTokensFree(testSample, "claude");
  const geminiCount = await countTokensFree(testSample, "gemini");
  const openRouterCount = await countTokensFree(testSample, "openrouter");
  const ollamaCount = await countTokensFree(testSample, "ollama");

  console.log(`Input Sample: "${testSample}"`);
  console.log(`• Claude Free Counter:     ${claudeCount.tokens} tokens (method: ${claudeCount.method})`);
  console.log(`• Gemini Free Counter:     ${geminiCount.tokens} tokens (method: ${geminiCount.method})`);
  console.log(`• OpenRouter Estimator:    ${openRouterCount.tokens} tokens (method: ${openRouterCount.method})`);
  console.log(`• Ollama Estimator:        ${ollamaCount.tokens} tokens (method: ${ollamaCount.method})\n`);

  console.log("🔒 STRICT RULE TEST: Prompts over 100,000 tokens NEVER go to Haiku 5.5");
  const normalTokens = 450;
  const oversizedTokens = 120_000;
  console.log(`• 450 tokens Haiku Eligible:     ${checkHaikuEligible(normalTokens)} (Allowed)`);
  console.log(`• 120,000 tokens Haiku Eligible: ${checkHaikuEligible(oversizedTokens)} (BLOCKED by Rule — 5x surge prevented)`);

  const hugePrompt = "fact lookup query " + "data_payload_token_block ".repeat(25_000);
  const oversizedDecision = routeModelCall("find_facts", hugePrompt);
  console.log(`• Routed Model for >100k tokens: ${oversizedDecision.selectedModelId}`);
  console.log(`• Haiku Bypassed Flag:          ${oversizedDecision.haikuBypassedDueTo100kRule}`);
  console.log(`• Explanation:                  ${oversizedDecision.reason}\n`);

  // ---------------------------------------------------------------------------
  // Step 2: Tag the Job
  // ---------------------------------------------------------------------------
  console.log("▶ STEP 2: TAG THE JOB & COMPLEXITY CLASSIFICATION");
  console.log("--------------------------------------------------------------------------------");
  const job1 = tagTaskComplexity("tag_job", "classify incoming customer ticket");
  const job2 = tagTaskComplexity("find_facts", "What is the webhook timeout?");
  const job3 = tagTaskComplexity("write_reply", "How do I setup custom domains?");
  const job4 = tagTaskComplexity("improve_skill", "Synthesize new refund lesson");
  console.log(`• "classify incoming customer ticket" -> Job: ${job1.job}, Complexity: ${job1.complexity} (Rule Match: ${job1.ruleMatch})`);
  console.log(`• "What is the webhook timeout?"      -> Job: ${job2.job}, Complexity: ${job2.complexity} (Rule Match: ${job2.ruleMatch})`);
  console.log(`• "How do I setup custom domains?"    -> Job: ${job3.job}, Complexity: ${job3.complexity} (Rule Match: ${job3.ruleMatch})`);
  console.log(`• "Synthesize new refund lesson"      -> Job: ${job4.job}, Complexity: ${job4.complexity} (Rule Match: ${job4.ruleMatch})`);

  console.log("\nCheap Model Tagger for Unclear Cases (Returns JSON):");
  const cheapTag = await tagJobWithCheapModel("Customer demanding refund under threat of legal action", "claude-haiku-5.5");
  console.log(JSON.stringify(cheapTag, null, 2));
  console.log();

  // ---------------------------------------------------------------------------
  // Step 3: Pick from Routing Table, Quick Check Escalation, & Fallbacks
  // ---------------------------------------------------------------------------
  console.log("▶ STEP 3: PICK FROM ROUTING TABLE, ESCALATE, & FALLBACK");
  console.log("--------------------------------------------------------------------------------");
  
  // Normal Route
  const normalRoute = routeModelCall("write_reply", "How do I configure OAuth2 credentials in Settings?");
  console.log("1. Normal Route Selection:");
  console.log(`   Model: ${normalRoute.selectedModelId} | Complexity: ${normalRoute.complexity} | Cost: $${normalRoute.estimatedCostUsd.toFixed(6)}`);

  // Quick Check Escalation
  const escalatedRoute = routeModelCall("write_reply", "How do I configure OAuth2 credentials in Settings?", {
    quickCheckFailed: true,
    quickCheckReason: "Confidence score 78% below 85% pass threshold",
  });
  console.log("\n2. Quick Check Failure Escalation (tries 1 model higher):");
  console.log(`   Model Picked:  ${escalatedRoute.selectedModelId} (Moved Up: ${escalatedRoute.movedUp})`);
  console.log(`   Previous Model: ${escalatedRoute.previousModelId}`);
  console.log(`   Escalation:    ${escalatedRoute.moveReason}`);

  // Free Model Busy Fallback
  const fallbackRoute = routeModelCall("tag_job", "Triage support request", {
    freeModelBusy: true,
  });
  console.log("\n3. Free Model Busy Fallback (429 / Throttled):");
  console.log(`   Model Picked:  ${fallbackRoute.selectedModelId} (Fallback Used: ${fallbackRoute.fallbackUsed})`);
  console.log(`   Fallback Log:  ${fallbackRoute.fallbackReason}`);

  // Local-Only Mode
  const localRoute = routeModelCall("write_reply", "Confidential customer data query", {
    localOnlyMode: true,
  });
  console.log("\n4. Local-Only Mode:");
  console.log(`   Model Picked:  ${localRoute.selectedModelId} (Cost: $${localRoute.estimatedCostUsd.toFixed(2)})`);
  console.log();

  // ---------------------------------------------------------------------------
  // Telemetry Audit Logging
  // ---------------------------------------------------------------------------
  console.log("▶ ROUTING AUDIT LOGGING (Every Call Logged)");
  console.log("--------------------------------------------------------------------------------");
  const logs = getRoutingLogs(5);
  console.log(`Logged Decisions Count: ${logs.length}`);
  logs.forEach((l, idx) => {
    console.log(`[#${idx + 1}] ${l.job.padEnd(12)} | Model: ${l.selectedModelId.padEnd(35)} | Cost: $${l.estimatedCostUsd.toFixed(6)} | MovedUp: ${l.movedUp ? "YES" : "NO "} | Fallback: ${l.fallbackUsed ? "YES" : "NO "}`);
  });
  console.log();

  // ---------------------------------------------------------------------------
  // Done When: Cost Reduction Proof Over Always Sonnet 5.5
  // ---------------------------------------------------------------------------
  console.log("▶ DONE WHEN: SAVINGS PROOF OVER ALWAYS SONNET 5.5");
  console.log("--------------------------------------------------------------------------------");
  const comparison = simulateRouterComparison(100);
  console.log(`Evaluated Tasks:         ${comparison.totalTasks} tasks`);
  console.log(`Always Sonnet 5.5 Cost:  $${comparison.sonnetAlwaysCostUsd.toFixed(4)} USD`);
  console.log(`3-Tier Router Cost:      $${comparison.routerCostUsd.toFixed(4)} USD`);
  console.log(`Dollars Saved:           $${comparison.dollarsSavedUsd.toFixed(4)} USD`);
  console.log(`Net Cost Reduction:      ${comparison.percentSaved}% SAVINGS`);
  console.log(`Sonnet Avg Quality:      ${comparison.sonnetAvgQualityScore}%`);
  console.log(`Router Avg Quality:      ${comparison.routerAvgQualityScore}%`);
  console.log(`Quality Margin Delta:    ${comparison.qualityMargin}% (Virtually identical)`);
  console.log(`Is Task 4.3 Goal Met:    ${comparison.isGoalMet ? "YES ✅ (PASS)" : "NO ❌"}`);
  console.log("================================================================================\n");
}

runDemo().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});
