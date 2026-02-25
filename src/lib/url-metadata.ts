/**
 * URL detection and metadata extraction utilities.
 * Pure functions shared by client (detection) and server (fetching).
 */

export type UrlSource = "youtube" | "wikipedia" | "goodreads";

export function detectUrlSource(url: string): UrlSource | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");

    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtu.be" ||
      host === "music.youtube.com"
    ) {
      return "youtube";
    }

    if (host.endsWith("wikipedia.org")) {
      return "wikipedia";
    }

    if (host === "goodreads.com" || host.endsWith(".goodreads.com")) {
      return "goodreads";
    }

    return null;
  } catch {
    return null;
  }
}

export function extractWikipediaTitle(url: string): string | null {
  try {
    const u = new URL(url);
    const match = u.pathname.match(/^\/wiki\/(.+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export function extractWikipediaLang(url: string): string {
  try {
    const u = new URL(url);
    const langMatch = u.hostname.match(/^(\w+)\.wikipedia\.org$/);
    return langMatch ? langMatch[1] : "en";
  } catch {
    return "en";
  }
}

export function extractGoodreadsId(url: string): string | null {
  try {
    const u = new URL(url);
    const match = u.pathname.match(/\/book\/show\/(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export interface UrlMetadataResult {
  source: UrlSource | null;
  title?: string;
  author?: string;
  description?: string;
  resourceType?: string;
  goodreadsId?: string;
  isbn?: string;
}
