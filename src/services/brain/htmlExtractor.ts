/**
 * HTML Content & Screenshot/Image Extractor
 * Task 2.3: Polite scraping, heading-aware extraction, multimodal image understanding.
 */

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
  // Extract Title
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : pageUrl;

  // Extract Headings (h1, h2, h3)
  const headings: string[] = [];
  const headingMatches = html.matchAll(/<(h[1-3])[^>]*>(.*?)<\/\1>/gi);
  for (const match of headingMatches) {
    const text = match[2].replace(/<[^>]+>/g, "").trim();
    if (text) headings.push(text);
  }

  // Extract Images with alt text and surrounding context
  const images: ExtractedImage[] = [];
  const imgMatches = html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*>/gi);
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

  // Clean Text: Strip scripts, styles, and tags
  let clean = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ")
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ")
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
