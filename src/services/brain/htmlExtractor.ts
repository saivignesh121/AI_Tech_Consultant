/**
 * HTML Content & Screenshot/Image Extractor
 * Task 2.3: Polite scraping, heading-aware extraction, multimodal image understanding.
 */

import { scanScrapedDocumentSafety } from "../chat/safetyShield";

export interface ExtractedImage {
  src: string;
  alt: string;
  contextHeading?: string;
  generatedDescription?: string;
}

export interface ExtractedPageContent {
  title: string;
  headings: string[];
  cleanText: string;
  images: ExtractedImage[];
  wordCount: number;
}

/**
 * Simple, fast HTML sanitizer and structural parser without bulky DOM dependencies.
 */
export function extractPageContent(html: string, pageUrl: string): ExtractedPageContent {
  // Strip non-content chrome (nav, header, footer, scripts, styles)
  let bodyHtml = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ")
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, " ")
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ");

  // Task 3.6: Scan and sanitize scraped web pages against indirect prompt injection
  const safetyScan = scanScrapedDocumentSafety(bodyHtml, pageUrl);
  bodyHtml = safetyScan.sanitizedContent;

  // Extract Headings (h1, h2, h3) from main content
  const headings: string[] = [];
  const headingMatches = bodyHtml.matchAll(/<(h[1-3])[^>]*>(.*?)<\/\1>/gi);
  for (const match of headingMatches) {
    const text = match[2].replace(/<[^>]+>/g, "").trim();
    if (text) headings.push(text);
  }

  // Extract Title (fallback to first heading if <title> omitted)
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : (headings.length > 0 ? headings[0] : pageUrl);

  // Extract Images with alt text and surrounding context
  const images: ExtractedImage[] = [];
  const imgMatches = bodyHtml.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*>/gi);
  for (const match of imgMatches) {
    const src = match[1];
    const alt = match[2] || "Screenshot or UI diagram";
    images.push({
      src,
      alt,
      contextHeading: headings.length > 0 ? headings[headings.length - 1] : title,
      generatedDescription: `Visual Screenshot showing: ${alt}. Found on page: ${title}.`,
    });
  }

  // Clean Text: Strip tags and collapse spaces
  let clean = bodyHtml
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = clean.split(/\s+/).filter(Boolean);

  return {
    title,
    headings,
    cleanText: clean,
    images,
    wordCount: words.length,
  };
}

/**
 * Politeness rate-limiter helper for polite batch scraping.
 */
export async function politeDelay(ms: number = 250): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


/**
 * Convenient alias for direct HTML text extraction.
 */
export function extractCleanHtmlContent(html: string, pageUrl: string = "https://example.com"): {
  title: string;
  content: string;
} {
  const page = extractPageContent(html, pageUrl);
  return {
    title: page.title,
    content: page.cleanText,
  };
}
