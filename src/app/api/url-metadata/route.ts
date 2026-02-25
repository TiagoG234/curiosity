import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";
import {
  detectUrlSource,
  extractWikipediaTitle,
  extractWikipediaLang,
  extractGoodreadsId,
  type UrlMetadataResult,
} from "@/lib/url-metadata";

const urlSchema = z.object({
  url: z.string().url().max(2000),
});

export async function POST(request: NextRequest) {
  await getCurrentUserId();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Invalid JSON body", 400);
  }

  const parsed = urlSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid URL", 400);
  }

  const { url } = parsed.data;
  const source = detectUrlSource(url);

  if (!source) {
    return apiSuccess({ source: null } satisfies UrlMetadataResult);
  }

  try {
    if (source === "youtube") {
      return apiSuccess(await fetchYouTubeMetadata(url));
    }
    if (source === "wikipedia") {
      return apiSuccess(await fetchWikipediaMetadata(url));
    }
    if (source === "goodreads") {
      return apiSuccess(await fetchGoodreadsMetadata(url));
    }
  } catch {
    // Graceful degradation: return source but no fields
    return apiSuccess({ source } satisfies UrlMetadataResult);
  }

  return apiSuccess({ source: null } satisfies UrlMetadataResult);
}

async function fetchYouTubeMetadata(url: string): Promise<UrlMetadataResult> {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });

  if (!res.ok) {
    return { source: "youtube", resourceType: "VIDEO" };
  }

  const data = await res.json();
  return {
    source: "youtube",
    title: data.title || undefined,
    author: data.author_name || undefined,
    resourceType: "VIDEO",
  };
}

async function fetchWikipediaMetadata(url: string): Promise<UrlMetadataResult> {
  const articleTitle = extractWikipediaTitle(url);
  if (!articleTitle) {
    return { source: "wikipedia", resourceType: "WIKIPEDIA" };
  }

  const lang = extractWikipediaLang(url);
  const apiUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(articleTitle)}`;
  const res = await fetch(apiUrl, { signal: AbortSignal.timeout(5000) });

  if (!res.ok) {
    return { source: "wikipedia", resourceType: "WIKIPEDIA" };
  }

  const data = await res.json();
  return {
    source: "wikipedia",
    title: data.title || undefined,
    description: data.extract || undefined,
    resourceType: "WIKIPEDIA",
  };
}

async function fetchGoodreadsMetadata(url: string): Promise<UrlMetadataResult> {
  const goodreadsId = extractGoodreadsId(url) || undefined;

  const res = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; CuriosityBot/1.0)",
    },
  });

  if (!res.ok) {
    return { source: "goodreads", resourceType: "BOOK", goodreadsId };
  }

  const html = await res.text();

  const title = extractMetaTag(html, "og:title");
  const description = extractMetaTag(html, "og:description");
  const author = extractMetaTag(html, "books:author");
  const isbn = extractMetaTag(html, "books:isbn");

  return {
    source: "goodreads",
    title: title || undefined,
    author: author || undefined,
    description: description ? description.slice(0, 2000) : undefined,
    resourceType: "BOOK",
    goodreadsId,
    isbn: isbn || undefined,
  };
}

function extractMetaTag(html: string, property: string): string | null {
  // Handle both attribute orderings:
  // <meta property="og:title" content="...">
  // <meta content="..." property="og:title">
  const escapedProp = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const pattern1 = new RegExp(
    `<meta[^>]+property=["']${escapedProp}["'][^>]+content=["']([^"']*)["']`,
    "i"
  );
  const match1 = html.match(pattern1);
  if (match1) return decodeHtmlEntities(match1[1]);

  const pattern2 = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${escapedProp}["']`,
    "i"
  );
  const match2 = html.match(pattern2);
  if (match2) return decodeHtmlEntities(match2[1]);

  // Also try name= attribute (some sites use name instead of property)
  const pattern3 = new RegExp(
    `<meta[^>]+name=["']${escapedProp}["'][^>]+content=["']([^"']*)["']`,
    "i"
  );
  const match3 = html.match(pattern3);
  if (match3) return decodeHtmlEntities(match3[1]);

  return null;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}
