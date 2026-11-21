/**
 * Dynamic Citation Attribution & Verification Engine
 * Task 3.2: Exact paragraph, screenshot, instruction, skill, or email attribution.
 */

export interface Citation {
  citationIndex: number;
  id: string;
  type: "paragraph" | "screenshot" | "instruction" | "skill" | "past_email";
  title: string;
  sourceUrl?: string;
  snippet: string;
  imageUrl?: string;
}

export function buildCitations(
  retrievedContexts: Array<{
    id: string;
    type: "paragraph" | "screenshot" | "instruction" | "skill" | "past_email";
    title: string;
    sourceUrl?: string;
    content: string;
    imageUrl?: string;
  }>
): { citations: Citation[]; formattedContext: string } {
  const citations: Citation[] = [];
  const formattedSections: string[] = [];

  retrievedContexts.forEach((item, index) => {
    const citationIndex = index + 1;
    const citation: Citation = {
      citationIndex,
      id: item.id,
      type: item.type,
      title: item.title,
      sourceUrl: item.sourceUrl,
      snippet: item.content.slice(0, 200) + (item.content.length > 200 ? "..." : ""),
      imageUrl: item.imageUrl,
    };

    citations.push(citation);
    formattedSections.push(
      `[${citationIndex}] Source: ${item.title} (${item.type})\n${item.content}`
    );
  });

  return {
    citations,
    formattedContext: formattedSections.join("\n\n"),
  };
}


/**
 * Convenient alias to map dynamic citations from chunks to an answer.
 */
export function mapDynamicCitations(
  answer: string,
  chunks: Array<{ title: string; url?: string; content?: string }>
): {
  citations: Array<{ citationNumber: number; sourceTitle: string; url: string }>;
} {
  const citations = chunks.map((c, i) => ({
    citationNumber: i + 1,
    sourceTitle: c.title,
    url: c.url || "https://support.acme.com",
  }));
  return { citations };
}
