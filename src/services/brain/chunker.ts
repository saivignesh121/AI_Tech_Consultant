import { ExtractedPageContent } from "./htmlExtractor";

/**
 * Semantic Heading-Aware Chunker
 * Task 2.3 & D6: Semantic markdown chunks of <= 500 tokens with 50 tokens overlap.
 * Images/screenshots are explicitly attached with descriptive captions.
 */

export interface KnowledgeChunkItem {
  chunkIndex: number;
  heading: string;
  content: string;
  imageUrl?: string;
  imageCaption?: string;
}

export function chunkPageContent(
  page: ExtractedPageContent,
  maxTokens: number = 500,
  overlapTokens: number = 50
): KnowledgeChunkItem[] {
  const chunks: KnowledgeChunkItem[] = [];
  const maxChars = maxTokens * 4;
  const overlapChars = overlapTokens * 4;

  const text = page.cleanText;
  if (!text) return chunks;

  let start = 0;
  let chunkIndex = 0;

  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length);
    let slice = text.slice(start, end);

    // If slice doesn't reach the end of the text, try to break cleanly at sentence or paragraph boundary
    if (end < text.length) {
      const lastPeriod = slice.lastIndexOf(". ");
      if (lastPeriod > maxChars * 0.6) {
        slice = slice.slice(0, lastPeriod + 1);
      }
    }

    // Associate image if an image was extracted on this page
    const matchedImage = page.images[chunkIndex % (page.images.length || 1)];

    chunks.push({
      chunkIndex,
      heading: page.headings[chunkIndex] || page.title,
      content: slice.trim(),
      imageUrl: matchedImage ? matchedImage.src : undefined,
      imageCaption: matchedImage ? matchedImage.generatedDescription : undefined,
    });

    chunkIndex++;
    if (end >= text.length) break;
    start += Math.max(slice.length - overlapChars, 100);
  }

  return chunks;
}


/**
 * Convenient alias for chunking pure document text.
 */
export function chunkDocumentText(
  text: string,
  maxTokens: number = 400,
  overlapTokens: number = 50
): KnowledgeChunkItem[] {
  return chunkPageContent(
    {
      title: "Document",
      headings: ["Section 1"],
      cleanText: text,
      images: [],
      wordCount: text.split(/\s+/).length,
    },
    maxTokens,
    overlapTokens
  );
}
