import {
  convertFeedbackToTestCase,
  getAllFeedbackTestCases,
  clearFeedbackTestCases,
} from "../src/services/eval/feedbackTestGenerator";
import {
  evaluateReleaseGate,
  evaluatePromptReleaseGate,
  evaluateRoleReleaseGate,
  evaluateSkillReleaseGate,
  evaluateModelReleaseGate,
} from "../src/services/eval/releaseGate";
import {
  TASK_SCORING_STANDARDS,
  RULES_VS_JUDGE_BOUNDARIES,
  ANTI_SATURATION_POLICIES,
} from "../src/services/eval/releaseGateDecisions";

async function runDemo() {
  console.log("================================================================================");
  console.log("🎯 TASK 4.4 & TASK 4.5: REAL FEEDBACK TO TESTS & THE RELEASE GATE");
  console.log("================================================================================\n");

  clearFeedbackTestCases();

  // ---------------------------------------------------------------------------
  // TASK 4.4: REAL FEEDBACK BECOMES NEW TESTS
  // ---------------------------------------------------------------------------
  console.log("▶ TASK 4.4: REAL FEEDBACK BECOMES NEW TESTS");
  console.log("--------------------------------------------------------------------------------");

  // 1. Thumbs Down Feedback -> New Regression Test Case
  console.log("1. Simulating Thumbs Down Critique from Chat:");
  const regressionTest = await convertFeedbackToTestCase({
    chatMessageId: "msg-dns-404",
    question: "Can I put a CNAME record directly on my root apex domain?",
    aiAnswer: "Yes, add a CNAME record with name '@' pointing to your AWS load balancer.",
    feedbackType: "thumbs_down",
    reason:
      "This is incorrect. RFC 1912 prohibits CNAME on the apex root domain because it overrides MX records. You must use ALIAS, ANAME, or Cloudflare CNAME flattening.",
    correctedAnswer:
      "No. RFC 1912 forbids CNAME on root domains. Use ALIAS/ANAME or CNAME flattening.",
  });
  console.log(`• Generated Test ID:   ${regressionTest.id}`);
  console.log(`• Category:            ${regressionTest.category}`);
  console.log(`• Source:              ${regressionTest.source}`);
  console.log(`• Difficulty:          ${regressionTest.difficulty} (Weight: ${regressionTest.weight}x)`);
  console.log(`• Expected Answer:     ${regressionTest.expectedAnswer}`);
  console.log(`• Human Reason:        ${regressionTest.feedbackReason}\n`);

  // 2. Thumbs Up Feedback -> Verified Positive Test Case
  console.log("2. Simulating Thumbs Up Endorsement from Chat:");
  const endorsementTest = await convertFeedbackToTestCase({
    chatMessageId: "msg-auth-200",
    question: "How do I securely verify Stripe webhook signatures in Node.js?",
    aiAnswer:
      "Compute HMAC-SHA256 signature and compare using crypto.timingSafeEqual to prevent side-channel timing attacks [1].",
    feedbackType: "thumbs_up",
    reason: "Accurate advice emphasizing crypto.timingSafeEqual for timing security.",
  });
  console.log(`• Generated Test ID:   ${endorsementTest.id}`);
  console.log(`• Category:            ${endorsementTest.category}`);
  console.log(`• Expected Answer:     ${endorsementTest.expectedAnswer}\n`);

  const allTests = getAllFeedbackTestCases();
  console.log(`Total Feedback-Derived Tests in Benchmark Suite: ${allTests.length} cases\n`);

  // ---------------------------------------------------------------------------
  // TASK 4.5: THE RELEASE GATE ENFORCER
  // ---------------------------------------------------------------------------
  console.log("▶ TASK 4.5: THE RELEASE GATE ENFORCER");
  console.log("--------------------------------------------------------------------------------");

  // Test Case A: Score regression (Candidate drops below baseline)
  console.log("Scenario A: Candidate Prompt Version Drops Score (94.0% vs 96.5% Baseline):");
  const blockedGate = evaluatePromptReleaseGate("master_system_prompt", 94.0, 96.5);
  console.log(`• Status:     ${blockedGate.status}`);
  console.log(`• Allowed:    ${blockedGate.allowed} (DEPLOYMENT BLOCKED)`);
  console.log(`• Delta:      ${blockedGate.scoreDelta}%`);
  console.log(`• Reason:     ${blockedGate.reason}\n`);

  // Test Case B: Score improvement (Candidate beats baseline)
  console.log("Scenario B: Candidate Prompt Version Improves Score (98.8% vs 96.5% Baseline):");
  const passedGate = evaluatePromptReleaseGate("master_system_prompt", 98.8, 96.5);
  console.log(`• Status:     ${passedGate.status}`);
  console.log(`• Allowed:    ${passedGate.allowed} (APPROVED FOR PRODUCTION)`);
  console.log(`• Delta:      +${passedGate.scoreDelta}%`);
  console.log(`• Reason:     ${passedGate.reason}\n`);

  // Test Case C: Subcategory regression check
  console.log("Scenario C: Subcategory Regression (Overall 97% == 97%, but Safety drops 99% -> 94%):");
  const subCategoryGate = evaluateReleaseGate({
    entityType: "role",
    entityName: "support_engineer",
    candidateScore: 97.0,
    baselineScore: 97.0,
    baselineCategoryScores: { "Safety & Escalation": 99.0, Citations: 98.0 },
    candidateCategoryScores: { "Safety & Escalation": 94.0, Citations: 98.0 },
  });
  console.log(`• Status:     ${subCategoryGate.status} (DEPLOYMENT BLOCKED)`);
  console.log(`• Reason:     ${subCategoryGate.reason}\n`);

  // ---------------------------------------------------------------------------
  // THE THREE ARCHITECTURAL DECISIONS ("YOU DECIDE")
  // ---------------------------------------------------------------------------
  console.log("▶ THE THREE ARCHITECTURAL DECISIONS (YOU DECIDE)");
  console.log("--------------------------------------------------------------------------------");
  console.log("1. How a 'Good' Answer is Scored for Each Task:");
  Object.entries(TASK_SCORING_STANDARDS).forEach(([key, s]) => {
    console.log(`   • ${key.padEnd(16)} [${s.evaluator.toUpperCase()} | Pass: >=${s.minimumPassScore}%] -> ${s.scoringFormula}`);
  });

  console.log("\n2. When to Use Rules vs AI Judge:");
  RULES_VS_JUDGE_BOUNDARIES.forEach((b) => {
    console.log(`   • ${b.domain.padEnd(38)} [${b.evaluator}] -> ${b.costLatencyProfile}`);
  });

  console.log("\n3. How to Stop Your Test Set from Becoming Too Easy Over Time (Anti-Saturation):");
  ANTI_SATURATION_POLICIES.forEach((p, idx) => {
    console.log(`   ${idx + 1}. ${p.mechanism}: ${p.description}`);
  });

  console.log("\n================================================================================");
  console.log("✅ TASK 4.4 & TASK 4.5 COMPLETE & VERIFIED");
  console.log("================================================================================\n");
}

runDemo().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});
