import { ExtractedPageContent } from "../brain/htmlExtractor";

export interface SyntheticTestCase {
  id: string;
  question: string;
  expectedAnswer: string;
  sourceUrl: string;
  sourceTitle: string;
}

/**
 * Synthetic Test Set Generator
 * Task 6.2: Automatically synthesizes domain Q&A test cases directly from ingested business pages.
 */
export function generateSyntheticTestSet(
  pages: Array<{ url: string; content: ExtractedPageContent }>,
  targetCount: number = 20
): SyntheticTestCase[] {
  const testCases: SyntheticTestCase[] = [];

  for (const page of pages) {
    if (testCases.length >= targetCount) break;

    const title = page.content.title;
    const headings = page.content.headings;
    const text = page.content.cleanText;

    // 1. Generate Question from Heading
    for (const h of headings) {
      if (testCases.length >= targetCount) break;

      testCases.push({
        id: `synth-${testCases.length + 1}`,
        question: `How do I configure or use ${h}?`,
        expectedAnswer: `Refer to ${h} under ${title}: ${text.slice(0, 150)}...`,
        sourceUrl: page.url,
        sourceTitle: title,
      });
    }

    // 2. Fallback Question from Title
    if (testCases.length < targetCount && text.length > 50) {
      testCases.push({
        id: `synth-${testCases.length + 1}`,
        question: `What is the standard procedure for ${title}?`,
        expectedAnswer: text.slice(0, 200),
        sourceUrl: page.url,
        sourceTitle: title,
      });
    }
  }

  return testCases;
}
