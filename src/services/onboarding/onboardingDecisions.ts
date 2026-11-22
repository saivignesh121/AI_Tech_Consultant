/**
 * Onboarding & Production Readiness Architectural Decisions
 * Feature 6: Go Live in 15 Minutes
 *
 * Formalizes:
 * 1. What the owner must give you vs. what your app can find by itself.
 * 2. What readiness score is good enough to switch on the chat (Trade-off & Threshold Standards).
 */

export interface OnboardingRequirementsBreakdown {
  ownerMustProvide: Array<{
    field: string;
    description: string;
    category: "credentials" | "knowledge_seed" | "persona" | "gate";
    required: boolean;
  }>;
  appFindsAutonomously: Array<{
    capability: string;
    description: string;
    benefit: string;
  }>;
}

export interface ReadinessThresholdPolicy {
  standardThreshold: number; // 85.0%
  tier: "HIGH_RISK" | "SUPERVISED_ONLY" | "PRODUCTION_READY" | "ENTERPRISE_STRICT";
  isUnlocked: boolean;
  explanation: string;
  recommendedAction: string;
}

/**
 * Decision 1: What the owner must give you and what your app can find by itself
 */
export function getOnboardingInputRequirements(): OnboardingRequirementsBreakdown {
  return {
    ownerMustProvide: [
      {
        field: "Account Sign-Up & Business Identity",
        description: "Company name, primary admin email, and workspace slug.",
        category: "credentials",
        required: true,
      },
      {
        field: "Vault API Keys or Local Mode",
        description: "Anthropic Claude / Google Gemini API keys, or Local-Only toggle (Ollama).",
        category: "credentials",
        required: true,
      },
      {
        field: "Documentation Seed",
        description: "Either one public sitemap URL (e.g. https://docs.company.com/sitemap.xml) OR uploaded files (Markdown/PDF).",
        category: "knowledge_seed",
        required: true,
      },
      {
        field: "Gmail Connection",
        description: "Connect support email via OAuth or provide customer support forwarding address.",
        category: "knowledge_seed",
        required: true,
      },
      {
        field: "Agent Role & Tone of Voice",
        description: "Select persona (Support Engineer, Support Executive, AI Consultant) and tone (Empathetic, Technical, Concise).",
        category: "persona",
        required: true,
      },
      {
        field: "Target Readiness Threshold",
        description: "The minimum benchmark pass bar chosen by the owner (default: 85.0%).",
        category: "gate",
        required: false,
      },
    ],
    appFindsAutonomously: [
      {
        capability: "Polite Sitemap & Link Crawler",
        description: "Discovers all sub-pages, checks robots.txt, respects rate limits, and ingests full corpus.",
        benefit: "Zero manual URL entry needed.",
      },
      {
        capability: "Autonomous Content & Image Extraction",
        description: "Strips headers, navbars, and cookie banners. Extracts headings and parses diagrams with Gemini 3.8 Flash.",
        benefit: "Zero data cleaning required.",
      },
      {
        capability: "Automatic Vector & Hybrid Search Ingestion",
        description: "Chunks text, embeds vectors into pgvector, and sets up full-text search indexes.",
        benefit: "Instant sub-second RAG search.",
      },
      {
        capability: "Synthetic Test Set Generator",
        description: "Synthesizes 10-20 realistic domain Q&A test cases with expected answers and source citations.",
        benefit: "Zero manual QA test creation.",
      },
      {
        capability: "Impartial Eval Lab Readiness Benchmark",
        description: "Runs AI Judge evaluation across synthetic tests to verify accuracy before launch.",
        benefit: "Objective proof of quality before customer emails arrive.",
      },
      {
        capability: "Automated Chat Gatekeeper",
        description: "Locks team chat until the readiness threshold is met, preventing hallucinating models from answering.",
        benefit: "Guaranteed brand and customer safety.",
      },
    ],
  };
}

/**
 * Decision 2: What readiness score is good enough to switch on the chat
 * Evaluates trade-offs between speed and accuracy.
 */
export function getReadinessThresholdPolicy(
  score: number,
  targetThreshold: number = 85.0
): ReadinessThresholdPolicy {
  if (score < 70.0) {
    return {
      standardThreshold: targetThreshold,
      tier: "HIGH_RISK",
      isUnlocked: false,
      explanation: "High Hallucination Risk: More than 30% of technical questions failed or lacked citations. Unsafe for customer-facing deployment.",
      recommendedAction: "Crawl additional documentation or upload product manuals before enabling chat.",
    };
  }

  if (score < targetThreshold) {
    return {
      standardThreshold: targetThreshold,
      tier: "SUPERVISED_ONLY",
      isUnlocked: false,
      explanation: `Supervised Staff Only (${score}%): Meets basic competency but falls short of your chosen ${targetThreshold}% pass bar.`,
      recommendedAction: "Allow internal team testing or adjust threshold if lower tolerance is acceptable.",
    };
  }

  if (score >= 95.0) {
    return {
      standardThreshold: targetThreshold,
      tier: "ENTERPRISE_STRICT",
      isUnlocked: true,
      explanation: `Enterprise Strict Excellence (${score}%): Near-flawless factual recall, citation precision, and prompt injection resistance.`,
      recommendedAction: "Full autonomous email and customer chat deployment approved.",
    };
  }

  // 85.0% to 94.9%
  return {
    standardThreshold: targetThreshold,
    tier: "PRODUCTION_READY",
    isUnlocked: true,
    explanation: `Production Ready (${score}%): Meets the 85.0% industry standard. The AI Consultant reliably answers factual inquiries with verified sources and honest 'I don't know' lines on edge cases.`,
    recommendedAction: "Chat UNLOCKED. Team is ready to go live.",
  };
}
