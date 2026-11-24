/**
 * Dynamic Citation Attribution & Verification Engine
 * Task 2.1 & Task 3.2: Exact paragraph, screenshot, instruction, skill, or email attribution.
 * Attribution Rule: Every answer shows which type of knowledge it used:
 * [sitemap], [page_url], [instruction], [skill], [past_email]
 * 
 * One-Click Citation: "every answer shows its sources, and one click opens the exact
 * paragraph, screenshot, instruction, skill or past email it used."
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
  citationNumber?: number; // alias
  id: string;
  type: KnowledgeSourceType;
  attributionBadge: string;
  title: string;
  sourceTitle?: string; // alias
  sourceUrl?: string;
  url?: string; // alias
  snippet: string;
  verified?: boolean; // true only for contexts backed by a stored knowledge chunk
  paragraphText?: string;
  imageUrl?: string;
  imageCaption?: string;
  instructionRule?: string;
  skillSteps?: string;
  emailDetails?: {
    subject?: string;
    from?: string;
    note?: string;
  };
}

export interface RetrievedContextItem {
  id: string;
  type: KnowledgeSourceType;
  title: string;
  sourceUrl?: string;
  content: string;
  imageUrl?: string;
  imageCaption?: string;
  instructionRule?: string;
  skillSteps?: string;
  emailDetails?: {
    subject?: string;
    from?: string;
    note?: string;
  };
}

export function buildCitations(
  retrievedContexts: RetrievedContextItem[]
): { citations: Citation[]; formattedContext: string } {
  const citations: Citation[] = [];
  const formattedSections: string[] = [];

  retrievedContexts.forEach((item, index) => {
    const citationIndex = index + 1;
    const badge = getAttributionBadge(item.type);

    const citation: Citation = {
      citationIndex,
      citationNumber: citationIndex,
      id: item.id,
      type: item.type,
      attributionBadge: badge,
      title: item.title,
      sourceTitle: item.title,
      sourceUrl: item.sourceUrl,
      url: item.sourceUrl,
      snippet: item.content.slice(0, 200) + (item.content.length > 200 ? "..." : ""),
      verified: /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(item.id) && /^https?:\/\//.test(item.sourceUrl || ""),
      paragraphText: item.content,
      imageUrl: item.imageUrl,
      imageCaption: item.imageCaption,
      instructionRule: item.instructionRule || (item.type === "instruction" ? item.content : undefined),
      skillSteps: item.skillSteps || (item.type === "skill" ? item.content : undefined),
      emailDetails: item.emailDetails,
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
  chunks: Array<{
    id?: string;
    title: string;
    url?: string;
    content?: string;
    type?: string;
    imageUrl?: string;
  }>
): {
  citations: Citation[];
} {
  const citations: Citation[] = chunks.map((c, i) => ({
    citationIndex: i + 1,
    citationNumber: i + 1,
    id: c.id || `chunk-${i + 1}`,
    type: (c.type as KnowledgeSourceType) || "sitemap",
    attributionBadge: getAttributionBadge(c.type || "sitemap"),
    title: c.title,
    sourceTitle: c.title,
    sourceUrl: c.url || "#",
    url: c.url || "#",
    snippet: (c.content || "").slice(0, 200),
    paragraphText: c.content,
    imageUrl: c.imageUrl,
  }));
  return { citations };
}
