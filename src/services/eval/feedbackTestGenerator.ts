import fs from "fs";
import path from "path";
import { BenchmarkCaseItem } from "./benchmarkManager";

/**
 * Task 4.4: Real Feedback Becomes New Tests
 * Ingests thumbs up / down feedback with reasons from chat
 * and synthesizes high-value benchmark test cases.
 */

export interface FeedbackPayload {
  chatMessageId?: string;
  question: string;
  aiAnswer: string;
  feedbackType: "thumbs_up" | "thumbs_down";
  reason: string;
  correctedAnswer?: string;
  category?: string;
  businessId?: string;
  roleId?: string;
}

export interface FeedbackTestCase extends BenchmarkCaseItem {
  source: "real_feedback";
  feedbackType: "thumbs_up" | "thumbs_down";
  feedbackReason: string;
  originalAiAnswer: string;
  difficulty: "hard" | "medium" | "standard";
  weight: number;
  createdAt: string;
}

const FEEDBACK_STORAGE_PATH = path.join(process.cwd(), "benchmark", "feedback_test_cases.json");

/**
 * In-memory fallback if filesystem write is restricted.
 */
let IN_MEMORY_FEEDBACK_TESTS: FeedbackTestCase[] = [];

/**
 * Seed realistic initial feedback-generated test cases demonstrating
 * real production regressions and endorsements.
 */
const INITIAL_FEEDBACK_SEED: FeedbackTestCase[] = [
  {
    id: "feedback-apex-cname-01",
    category: "DNS & Domains",
    question: "Can I point my root apex domain (example.com) directly to a CNAME record?",
    expectedAnswer:
      "No. RFC 1912 forbids CNAME records at the zone apex (root domain). You must use an ALIAS or ANAME record, or DNS provider-specific CNAME flattening (such as Cloudflare CNAME flattening) to resolve the root domain safely.",
    expectedSource: "Cloudflare RFC 1912 DNS Specs [1]",
    expectedAction: "answer",
    source: "real_feedback",
    feedbackType: "thumbs_down",
    feedbackReason:
      "The AI suggested creating a CNAME on the apex root domain, which breaks RFC 1912 and causes MX record failure. It should recommend ALIAS/ANAME or flattening.",
    originalAiAnswer:
      "Yes, you can simply add a CNAME record with name '@' pointing to your application load balancer.",
    difficulty: "hard",
    weight: 1.5,
    createdAt: "2026-11-21T18:20:00.000Z",
  },
  {
    id: "feedback-webhook-hmac-02",
    category: "Webhooks & Security",
    question: "How should I verify Stripe webhook signatures in Node.js?",
    expectedAnswer:
      "You must use timingSafeEqual (e.g. crypto.timingSafeEqual) over computed HMAC SHA-256 buffers to prevent timing side-channel attacks. Never compare signature strings directly using ===.",
    expectedSource: "Stripe Webhook Security Guidelines [2]",
    expectedAction: "answer",
    source: "real_feedback",
    feedbackType: "thumbs_up",
    feedbackReason:
      "Accurately emphasized crypto.timingSafeEqual to prevent side-channel timing attacks.",
    originalAiAnswer:
      "To verify webhook signatures safely, compute the HMAC-SHA256 signature and compare using crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computed)).",
    difficulty: "standard",
    weight: 1.0,
    createdAt: "2026-11-21T19:45:00.000Z",
  },
  {
    id: "feedback-refund-legal-03",
    category: "Escalation & Safety",
    question: "I demand a full refund right now or my lawyer is taking this to court tomorrow!",
    expectedAnswer:
      "Send to a human: Customer issued an explicit legal threat and refund demand. Must bypass autonomous answering and route to human Tier 3 Support / Legal triage.",
    expectedSource: "Escalation Policy Task 3.6 [3]",
    expectedAction: "send_to_human",
    source: "real_feedback",
    feedbackType: "thumbs_down",
    feedbackReason:
      "The AI attempted to offer a 20% discount instead of immediately escalating a legal threat to a human.",
    originalAiAnswer:
      "We apologize for the inconvenience. Would you be willing to accept a 20% discount on your next month?",
    difficulty: "hard",
    weight: 2.0,
    createdAt: "2026-11-22T08:15:00.000Z",
  },
];

/**
 * Loads all feedback-derived test cases from disk or memory.
 */
export function getAllFeedbackTestCases(): FeedbackTestCase[] {
  try {
    if (fs.existsSync(FEEDBACK_STORAGE_PATH)) {
      const raw = fs.readFileSync(FEEDBACK_STORAGE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        IN_MEMORY_FEEDBACK_TESTS = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.error("Failed to read feedback test cases from file:", err);
  }

  if (IN_MEMORY_FEEDBACK_TESTS.length === 0) {
    IN_MEMORY_FEEDBACK_TESTS = [...INITIAL_FEEDBACK_SEED];
    saveFeedbackTestCases(IN_MEMORY_FEEDBACK_TESTS);
  }

  return IN_MEMORY_FEEDBACK_TESTS;
}

/**
 * Persists feedback test cases to disk.
 */
export function saveFeedbackTestCases(cases: FeedbackTestCase[]): void {
  IN_MEMORY_FEEDBACK_TESTS = cases;
  try {
    const dir = path.dirname(FEEDBACK_STORAGE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(FEEDBACK_STORAGE_PATH, JSON.stringify(cases, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to persist feedback test cases to disk:", err);
  }
}

/**
 * Resets or clears feedback test cases (primarily for test environments).
 */
export function clearFeedbackTestCases(): void {
  IN_MEMORY_FEEDBACK_TESTS = [];
  try {
    if (fs.existsSync(FEEDBACK_STORAGE_PATH)) {
      fs.unlinkSync(FEEDBACK_STORAGE_PATH);
    }
  } catch {
    // Ignore error if file absent
  }
}

/**
 * Core transformation: converts user thumbs up/down feedback into a benchmark test case.
 */
export async function convertFeedbackToTestCase(payload: FeedbackPayload): Promise<FeedbackTestCase> {
  const existingCases = getAllFeedbackTestCases();

  // Generate unique test ID
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const testId = `feedback-${dateStr}-${randomSuffix}`;

  // Determine category
  let category = payload.category;
  if (!category) {
    const qLower = payload.question.toLowerCase();
    if (qLower.includes("dns") || qLower.includes("domain") || qLower.includes("cname")) {
      category = "DNS & Domains";
    } else if (qLower.includes("refund") || qLower.includes("lawyer") || qLower.includes("sue")) {
      category = "Escalation & Safety";
    } else if (qLower.includes("ssl") || qLower.includes("tls") || qLower.includes("security")) {
      category = "Security & SSL";
    } else if (payload.feedbackType === "thumbs_down") {
      category = "Real Feedback Regressions";
    } else {
      category = "Real Feedback Endorsements";
    }
  }

  // Synthesize expected answer
  let expectedAnswer = payload.correctedAnswer?.trim();
  if (!expectedAnswer) {
    if (payload.feedbackType === "thumbs_down") {
      expectedAnswer = `Correct answer must resolve critique: "${payload.reason}". Avoid previous flawed answer: "${payload.aiAnswer.slice(0, 120)}..."`;
    } else {
      expectedAnswer = payload.aiAnswer.trim();
    }
  }

  const isLegalOrSafety =
    payload.question.toLowerCase().includes("lawyer") ||
    payload.question.toLowerCase().includes("refund") ||
    payload.reason.toLowerCase().includes("escalat");

  const newTestCase: FeedbackTestCase = {
    id: testId,
    category,
    question: payload.question.trim(),
    expectedAnswer,
    expectedSource: "Human Chat Feedback Critique [1]",
    expectedAction: isLegalOrSafety ? "send_to_human" : "answer",
    source: "real_feedback",
    feedbackType: payload.feedbackType,
    feedbackReason: payload.reason.trim(),
    originalAiAnswer: payload.aiAnswer.trim(),
    difficulty: payload.feedbackType === "thumbs_down" ? "hard" : "standard",
    weight: payload.feedbackType === "thumbs_down" ? 1.5 : 1.0,
    createdAt: new Date().toISOString(),
  };

  const updatedCases = [newTestCase, ...existingCases];
  saveFeedbackTestCases(updatedCases);

  return newTestCase;
}

/**
 * Retrieves a feedback test case by ID.
 */
export function getFeedbackTestCaseById(id: string): FeedbackTestCase | undefined {
  const all = getAllFeedbackTestCases();
  return all.find((c) => c.id === id);
}
