/**
 * Dynamic Citation Attribution & Verification Engine
 * Task 2.1 & Task 3.2: Exact paragraph, screenshot, instruction, skill, or email attribution.
 * Attribution Rule: Every answer shows which type of knowledge it used:
 * [sitemap], [page_url], [instruction], [skill], [past_email]
 */

export type KnowledgeSourceType =
  | "sitemap"
  | "page_url"
  | "instruction"
  | "skill"
  | "past_email"
  | "paragraph"
  | "screenshot";

export function getAttributionBadge(type: string): string {
  switch (type) {
    case "page_url":
      return "[page_url]";
    case "instruction":
      return "[instruction]";
    case "skill":
      return "[skill]";
    case "past_email":
    case "email":
      return "[past_email]";
    case "sitemap":
    case "paragraph":
    case "screenshot":
    default:
      return "[sitemap]";
  }
}

export interface Citation {
  citationIndex: number;
  id: string;
  type: KnowledgeSourceType;
  attributionBadge: string;
  title: string;
  sourceUrl?: string;
  snippet: string;
  imageUrl?: string;
}

export function buildCitations(
  retrievedContexts: Array<{
    id: string;
    type: KnowledgeSourceType;
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
    const badge = getAttributionBadge(item.type);
    const citation: Citation = {
      citationIndex,
      id: item.id,
      type: item.type,
      attributionBadge: badge,
      title: item.title,
      sourceUrl: item.sourceUrl,
      snippet: item.content.slice(0, 200) + (item.content.length > 200 ? "..." : ""),
      imageUrl: item.imageUrl,
    };

    citations.push(citation);
    formattedSections.push(
      `[${citationIndex}] Source: ${item.title} (${badge})\n${item.content}`
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
  chunks: Array<{ title: string; url?: string; content?: string; type?: string }>
): {
  citations: Array<{ citationNumber: number; sourceTitle: string; url: string; attributionBadge: string }>;
} {
  const citations = chunks.map((c, i) => ({
    citationNumber: i + 1,
    sourceTitle: c.title,
    url: c.url || "#",
    attributionBadge: getAttributionBadge(c.type || "sitemap"),
  }));
  return { citations };
}
