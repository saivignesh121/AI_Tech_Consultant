/**
 * Recursive Sitemap Parser & Ingestion Planner
 * Task 2.2: Nested sitemaps discovery, pre-flight summaries, duplicate URL tracking.
 */

export interface SitemapSummary {
  rootUrl: string;
  totalSitemapsFound: number;
  nestedSitemaps: string[];
  totalUrls: number;
  uniqueUrls: number;
  duplicateUrlsCount: number;
  duplicates: Array<{ url: string; foundIn: string[] }>;
  firstUrl: string | null;
  lastUrl: string | null;
  estimatedPagesPerHour: number;
  estimatedHours: number;
  estimatedCompletionTime: string;
}

export interface DiscoveredUrl {
  url: string;
  sitemapSource: string;
  lastmod?: string;
}

/**
 * Extracts all URLs (<loc>) from an XML string.
 */
function extractLocTags(xml: string): string[] {
  const matches = xml.match(/<loc>(.*?)<\/loc>/g) || [];
  return matches.map((m) => m.replace(/<\/?loc>/g, "").trim());
}

/**
 * Determines whether XML is a sitemap index (holding nested sitemaps) or a urlset.
 */
export function isSitemapIndex(xml: string): boolean {
  return /<sitemapindex/i.test(xml);
}

/**
 * Parses XML sitemap content and extracts child sitemaps or page URLs.
 */
export function parseSitemapXml(xml: string, sourceUrl: string): {
  isIndex: boolean;
  urls: DiscoveredUrl[];
  childSitemaps: string[];
} {
  const isIndex = isSitemapIndex(xml);
  const locs = extractLocTags(xml);

  if (isIndex) {
    return {
      isIndex: true,
      urls: [],
      childSitemaps: locs,
    };
  } else {
    const urls: DiscoveredUrl[] = locs.map((loc) => ({
      url: loc,
      sitemapSource: sourceUrl,
    }));
    return {
      isIndex: false,
      urls,
      childSitemaps: [],
    };
  }
}

/**
 * Computes pre-flight read plan, detecting nested sitemaps, duplicates, and completion ETA.
 */
export function generatePreFlightSummary(
  rootUrl: string,
  discoveredUrls: DiscoveredUrl[],
  nestedSitemapUrls: string[],
  pagesPerHour: number = 450
): SitemapSummary {
  const urlMap = new Map<string, string[]>();

  for (const item of discoveredUrls) {
    const existing = urlMap.get(item.url) || [];
    existing.push(item.sitemapSource);
    urlMap.set(item.url, existing);
  }

  const duplicates: Array<{ url: string; foundIn: string[] }> = [];
  let uniqueCount = 0;

  for (const [url, sources] of urlMap.entries()) {
    uniqueCount++;
    if (sources.length > 1) {
      duplicates.push({ url, foundIn: sources });
    }
  }

  const uniqueUrlsList = Array.from(urlMap.keys());
  const firstUrl = uniqueUrlsList.length > 0 ? uniqueUrlsList[0] : null;
  const lastUrl = uniqueUrlsList.length > 0 ? uniqueUrlsList[uniqueUrlsList.length - 1] : null;

  const estimatedHours = Number((uniqueCount / pagesPerHour).toFixed(2));
  const finishDate = new Date(Date.now() + estimatedHours * 3600 * 1000);

  return {
    rootUrl,
    totalSitemapsFound: 1 + nestedSitemapUrls.length,
    nestedSitemaps: nestedSitemapUrls,
    totalUrls: discoveredUrls.length,
    uniqueUrls: uniqueCount,
    duplicateUrlsCount: duplicates.length,
    duplicates,
    firstUrl,
    lastUrl,
    estimatedPagesPerHour: pagesPerHour,
    estimatedHours,
    estimatedCompletionTime: finishDate.toISOString(),
  };
}
