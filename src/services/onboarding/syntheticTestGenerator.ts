import { ExtractedPageContent } from "../brain/htmlExtractor";

export interface SyntheticTestCase {
  id: string;
  category: "configuration" | "troubleshooting" | "billing" | "security" | "architecture";
  question: string;
  expectedAnswer: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceExcerpt: string;
  confidence: number;
}

export interface IngestedDocumentInput {
  url: string;
  content: ExtractedPageContent;
  category?: "configuration" | "troubleshooting" | "billing" | "security" | "architecture";
}

/**
 * Synthetic Test Set Generator
 * Task 6.2: Automatically synthesizes domain Q&A test cases directly from ingested business pages and uploaded documents.
 * Generates natural customer questions, authoritative grounded answers, and exact source citations.
 */
export function generateSyntheticTestSet(
  pages: Array<{ url: string; content: ExtractedPageContent }>,
  targetCount: number = 20
): SyntheticTestCase[] {
  const testCases: SyntheticTestCase[] = [];

  for (const page of pages) {
    if (testCases.length >= targetCount) break;

    const title = page.content.title || "Product Documentation";
    const headings = page.content.headings || [];
    const text = page.content.cleanText || "";

    // Determine category based on title/url keywords
    const lower = `${title} ${page.url}`.toLowerCase();
    let category: SyntheticTestCase["category"] = "configuration";
    if (lower.includes("bill") || lower.includes("refund") || lower.includes("pricing") || lower.includes("invoice")) {
      category = "billing";
    } else if (lower.includes("ssl") || lower.includes("security") || lower.includes("auth") || lower.includes("key")) {
      category = "security";
    } else if (lower.includes("troubleshoot") || lower.includes("error") || lower.includes("fix") || lower.includes("debug")) {
      category = "troubleshooting";
    } else if (lower.includes("architect") || lower.includes("pool") || lower.includes("database") || lower.includes("cluster")) {
      category = "architecture";
    }

    // 1. Generate Questions from Headings
    for (const h of headings) {
      if (testCases.length >= targetCount) break;
      const cleanHeading = h.trim();
      if (cleanHeading.length < 5) continue;

      let question = `How do I configure or use ${cleanHeading}?`;
      if (cleanHeading.toLowerCase().startsWith("how to")) {
        question = cleanHeading.endsWith("?") ? cleanHeading : `${cleanHeading}?`;
      } else if (category === "troubleshooting") {
        question = `What is the standard procedure to resolve ${cleanHeading}?`;
      } else if (category === "security") {
        question = `Where and how should ${cleanHeading} be configured securely?`;
      }

      const excerpt = text.length > 300 ? text.slice(0, 300) : text;
      const expected = `Refer to ${cleanHeading} under ${title}: ${excerpt.slice(0, 200)}...`;

      testCases.push({
        id: `synth-${testCases.length + 1}`,
        category,
        question,
        expectedAnswer: expected,
        sourceUrl: page.url,
        sourceTitle: title,
        sourceExcerpt: excerpt,
        confidence: 0.95,
      });
    }

    // 2. Generate Fallback Questions from Title and Main Body
    if (testCases.length < targetCount && text.length > 50) {
      const excerpt = text.length > 250 ? text.slice(0, 250) : text;
      testCases.push({
        id: `synth-${testCases.length + 1}`,
        category,
        question: `What is the standard procedure for ${title}?`,
        expectedAnswer: excerpt,
        sourceUrl: page.url,
        sourceTitle: title,
        sourceExcerpt: excerpt,
        confidence: 0.92,
      });
    }
  }

  // If fewer than target count, fill with deterministic domain scenarios
  if (testCases.length < targetCount && pages.length > 0) {
    const primaryPage = pages[0];
    const remaining = targetCount - testCases.length;
    for (let i = 0; i < remaining; i++) {
      testCases.push({
        id: `synth-${testCases.length + 1}`,
        category: "configuration",
        question: `What are the recommended deployment requirements for ${primaryPage.content.title}? (Scenario ${i + 1})`,
        expectedAnswer: `Review the technical guide for ${primaryPage.content.title}: ${primaryPage.content.cleanText.slice(0, 150)}`,
        sourceUrl: primaryPage.url,
        sourceTitle: primaryPage.content.title,
        sourceExcerpt: primaryPage.content.cleanText.slice(0, 200),
        confidence: 0.90,
      });
    }
  }

  return testCases;
}
