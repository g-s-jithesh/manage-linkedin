export interface GrabbedLinkedInPost {
  id: string;
  urn: string;
  url: string;
  authorName?: string;
  authorHeadline?: string;
  authorImage?: string;
  content: string;
  mediaUrl?: string;
  publishedAt?: string;
  source: "embed" | "oembed" | "opengraph" | "html" | "fallback";
}

export interface ParsedLinkedInInput {
  isValid: boolean;
  id?: string;
  urn?: string;
  canonicalUrl?: string;
  originalInput: string;
  error?: string;
}

/**
 * Normalizes and parses various LinkedIn URL formats and IDs:
 * - Direct Activity ID: 7219434359085252608
 * - Direct URN: urn:li:activity:7219434359085252608 or urn:li:share:...
 * - Feed update URL: https://www.linkedin.com/feed/update/urn:li:activity:7219434359085252608/
 * - Posts slug URL: https://www.linkedin.com/posts/username_headline-activity-7219434359085252608-abcd
 * - Mobile / shortened / pulse URLs
 */
export function parseLinkedInPostInput(rawInput: string): ParsedLinkedInInput {
  const input = rawInput.trim();
  if (!input) {
    return {
      isValid: false,
      originalInput: input,
      error: "Please enter a LinkedIn post URL or post ID.",
    };
  }

  // 1. Pure numeric ID (LinkedIn activity/share IDs are typically 16-21 digits)
  const numericMatch = input.match(/^(\d{16,21})$/);
  if (numericMatch) {
    const id = numericMatch[1];
    return {
      isValid: true,
      id,
      urn: `urn:li:activity:${id}`,
      canonicalUrl: `https://www.linkedin.com/feed/update/urn:li:activity:${id}/`,
      originalInput: input,
    };
  }

  // 2. Direct URN string (e.g. urn:li:activity:1234567890123456789 or urn:li:share:...)
  const urnMatch = input.match(/^urn:li:(?:activity|share|ugcPost):(\d{16,21})$/i);
  if (urnMatch) {
    const id = urnMatch[1];
    return {
      isValid: true,
      id,
      urn: `urn:li:activity:${id}`,
      canonicalUrl: `https://www.linkedin.com/feed/update/urn:li:activity:${id}/`,
      originalInput: input,
    };
  }

  // 3. URL format: check if it's a linkedin.com URL
  const isLinkedInUrl = input.includes("linkedin.com") || input.includes("lnkd.in");
  if (!isLinkedInUrl && !input.startsWith("http://") && !input.startsWith("https://")) {
    return {
      isValid: false,
      originalInput: input,
      error: "Input does not appear to be a valid LinkedIn URL or numeric post ID.",
    };
  }

  // Look for activity/share ID embedded inside the URL
  const activityMatch =
    input.match(/urn:li:(?:activity|share|ugcPost):(\d{16,21})/i) ||
    input.match(/activity[-:](\d{16,21})/i) ||
    input.match(/(\d{16,21})/);

  let id: string | undefined;
  let urn: string | undefined;
  let canonicalUrl = input;

  if (activityMatch) {
    id = activityMatch[1];
    urn = `urn:li:activity:${id}`;
    canonicalUrl = `https://www.linkedin.com/feed/update/urn:li:activity:${id}/`;
  } else {
    if (!canonicalUrl.startsWith("http://") && !canonicalUrl.startsWith("https://")) {
      canonicalUrl = `https://${canonicalUrl}`;
    }
  }

  return {
    isValid: true,
    id: id || "post",
    urn: urn || (id ? `urn:li:activity:${id}` : "urn:li:activity:unknown"),
    canonicalUrl,
    originalInput: input,
  };
}

/**
 * Decode common HTML entities
 */
function decodeHtmlEntities(text: string): string {
  if (!text) return "";
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract meta tag content by property or name
 */
function extractMeta(html: string, property: string): string | null {
  const propertyRegex = new RegExp(
    `<meta[^>]+(?:property|name)=["'](?:og:)?${property}["'][^>]+content=["']([^"']*)["']`,
    "i"
  );
  const match = html.match(propertyRegex);
  if (match && match[1]) {
    return decodeHtmlEntities(match[1]);
  }

  const contentFirstRegex = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["'](?:og:)?${property}["']`,
    "i"
  );
  const match2 = html.match(contentFirstRegex);
  if (match2 && match2[1]) {
    return decodeHtmlEntities(match2[1]);
  }

  return null;
}

/**
 * Parses author name from og:title if formatted as: "Name on LinkedIn: 'Post text'"
 */
function parseAuthorFromTitle(title?: string | null): { name?: string; headline?: string } {
  if (!title) return {};

  const match = title.match(/^([^|:]+)\s+(?:on\s+LinkedIn|\bon\s+LinkedIn\b)/i);
  if (match && match[1]) {
    return { name: match[1].trim() };
  }

  const pipeMatch = title.split("|");
  if (pipeMatch.length > 1) {
    const candidate = pipeMatch[pipeMatch.length - 1].trim();
    if (candidate.toLowerCase() !== "linkedin") {
      return { name: pipeMatch[0].trim(), headline: candidate };
    }
  }

  return { name: title.replace(/\|\s*LinkedIn$/i, "").trim() };
}

/**
 * Cleans extracted post text by removing LinkedIn OG metadata suffix
 */
function cleanPostContent(rawContent: string): string {
  let cleaned = decodeHtmlEntities(rawContent);

  cleaned = cleaned.replace(/\s*\|\s*\d+\s+comments?\s+on\s+LinkedIn/gi, "");
  cleaned = cleaned.replace(/\s*\|\s*\d+\s+reactions?\s+on\s+LinkedIn/gi, "");
  cleaned = cleaned.replace(/\s*…\s*See more/gi, "");
  cleaned = cleaned.replace(/\s*\.\.\.\s*See more/gi, "");

  return cleaned.trim();
}

/**
 * Parses LinkedIn Embed HTML endpoint:
 * https://www.linkedin.com/embed/feed/update/urn:li:activity:${id}
 * LinkedIn renders the full public post card inside this embed!
 */
function parseLinkedInEmbedHtml(
  html: string,
  canonicalUrl: string,
  activityId: string
): GrabbedLinkedInPost | null {
  // 1. Post content commentary paragraph
  const commentaryMatch =
    html.match(/data-test-id=["']main-feed-activity-embed-card__commentary["'][^>]*>([\s\S]*?)<\/p>/i) ||
    html.match(/class=["'][^"']*attributed-text-segment-list__content[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);

  let content = "";
  if (commentaryMatch) {
    content = commentaryMatch[1].replace(/<[^>]+>/g, " ").trim();
    content = decodeHtmlEntities(content);
  }

  // 2. Author Name
  const authorNameMatch = html.match(
    /data-tracking-control-name=["']public_post_embed_feed-actor-name["'][^>]*>([\s\S]*?)<\/a>/i
  );
  let authorName = "";
  if (authorNameMatch) {
    authorName = authorNameMatch[1].replace(/<[^>]+>/g, "").trim();
    authorName = decodeHtmlEntities(authorName);
  }

  // 3. Author Headline / subtitle
  const headlineMatch = html.match(/<p[^>]+class=["'][^"']*truncate[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
  let authorHeadline = "";
  if (headlineMatch) {
    authorHeadline = headlineMatch[1].replace(/<[^>]+>/g, "").trim();
    authorHeadline = decodeHtmlEntities(authorHeadline);
  }

  // 4. Author Image
  const actorBlockMatch = html.match(
    /data-tracking-control-name=["']public_post_embed_feed-actor-image["'][\s\S]*?<\/a>/i
  );
  let authorImage: string | undefined;
  if (actorBlockMatch) {
    const imgUrlMatch =
      actorBlockMatch[0].match(/data-delayed-url=["']([^"']+)["']/i) ||
      actorBlockMatch[0].match(/src=["']([^"']+)["']/i) ||
      actorBlockMatch[0].match(/data-ghost-url=["']([^"']+)["']/i);
    if (imgUrlMatch) {
      authorImage = imgUrlMatch[1].replace(/&amp;/g, "&");
    }
  }

  // 5. Media Image
  const mediaMatch =
    html.match(/class=["'][^"']*w-main-feed-card-media[^"']*["'][^>]*data-delayed-url=["']([^"']+)["']/i) ||
    html.match(/data-delayed-url=["']([^"']+)["'][^>]*class=["'][^"']*w-main-feed-card-media/i) ||
    html.match(/class=["'][^"']*w-main-feed-card-media[^"']*["'][^>]*src=["']([^"']+)["']/i);

  let mediaUrl: string | undefined;
  if (mediaMatch) {
    mediaUrl = mediaMatch[1].replace(/&amp;/g, "&");
  }

  // If we extracted either the content or author name from the embed, consider it a successful embed extraction
  if (content || authorName) {
    return {
      id: activityId,
      urn: `urn:li:activity:${activityId}`,
      url: canonicalUrl,
      authorName: authorName || "LinkedIn Author",
      authorHeadline: authorHeadline || undefined,
      authorImage: authorImage || undefined,
      content: content || "LinkedIn post without text caption.",
      mediaUrl: mediaUrl || undefined,
      source: "embed",
    };
  }

  return null;
}

/**
 * Fetches and extracts LinkedIn post data using:
 * 1. Public LinkedIn Embed endpoint (/embed/feed/update/urn:li:activity:...)
 * 2. oEmbed endpoint (/oembed?url=...)
 * 3. Social crawler OpenGraph & Schema JSON-LD metadata
 * 4. Fallback handler
 */
export async function grabLinkedInPost(rawInput: string): Promise<GrabbedLinkedInPost> {
  const parsed = parseLinkedInPostInput(rawInput);
  if (!parsed.isValid || !parsed.canonicalUrl) {
    throw new Error(parsed.error || "Invalid LinkedIn post URL or ID.");
  }

  const postUrl = parsed.canonicalUrl;
  const activityId = parsed.id && parsed.id !== "post" ? parsed.id : null;

  // 1. First attempt: Public LinkedIn Embed endpoint
  if (activityId) {
    try {
      const embedUrl = `https://www.linkedin.com/embed/feed/update/urn:li:activity:${activityId}`;
      const embedRes = await fetch(embedUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (embedRes.ok) {
        const embedHtml = await embedRes.text();
        const embedPost = parseLinkedInEmbedHtml(embedHtml, postUrl, activityId);
        if (embedPost && embedPost.content && embedPost.content !== "LinkedIn post without text caption.") {
          return embedPost;
        }
      }
    } catch (err: unknown) {
      console.warn("LinkedIn embed extraction warning:", err);
    }
  }

  // 2. Second attempt: LinkedIn oEmbed endpoint
  let oembedData: { title?: string; author_name?: string; html?: string } | null = null;
  try {
    const oembedUrl = `https://www.linkedin.com/oembed?url=${encodeURIComponent(postUrl)}&format=json`;
    const oembedRes = await fetch(oembedUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(4000),
    });
    if (oembedRes.ok) {
      oembedData = (await oembedRes.json()) as { title?: string; author_name?: string; html?: string };
    }
  } catch {
    // oEmbed optional
  }

  // 3. Third attempt: Social crawler OpenGraph / Schema metadata
  let html = "";
  try {
    const pageRes = await fetch(postUrl, {
      headers: {
        "User-Agent": "LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient/UNAVAILABLE)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
      },
      signal: AbortSignal.timeout(6000),
    });

    if (pageRes.ok) {
      html = await pageRes.text();
    }
  } catch (err: unknown) {
    console.warn("LinkedIn direct fetch warning:", err);
  }

  // Extract metadata
  const ogTitle = extractMeta(html, "title") || oembedData?.title || null;
  const ogDescription = extractMeta(html, "description") || null;
  const ogImage = extractMeta(html, "image") || null;
  const ogUrl = extractMeta(html, "url") || postUrl;
  const metaAuthor = extractMeta(html, "author") || oembedData?.author_name || null;

  // Check for JSON-LD schema
  let jsonLdContent: string | null = null;
  let jsonLdAuthor: string | null = null;
  let jsonLdImage: string | null = null;
  let jsonLdDate: string | null = null;

  try {
    const jsonLdMatches = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    if (jsonLdMatches) {
      for (const block of jsonLdMatches) {
        const jsonContent = block.replace(/<script[^>]*>|<\/script>/gi, "");
        const parsedJson = JSON.parse(jsonContent);
        if (parsedJson) {
          if (parsedJson.articleBody || parsedJson.text) {
            jsonLdContent = parsedJson.articleBody || parsedJson.text;
          }
          if (parsedJson.author?.name) {
            jsonLdAuthor = parsedJson.author.name;
          }
          if (parsedJson.image) {
            jsonLdImage = typeof parsedJson.image === "string" ? parsedJson.image : parsedJson.image.url;
          }
          if (parsedJson.datePublished) {
            jsonLdDate = parsedJson.datePublished;
          }
        }
      }
    }
  } catch {
    // JSON-LD optional
  }

  // Determine Author
  const authorInfo = parseAuthorFromTitle(ogTitle);
  const authorName = jsonLdAuthor || metaAuthor || authorInfo.name || "LinkedIn User";
  const authorHeadline = authorInfo.headline;

  // Determine Post Content
  let content = jsonLdContent || ogDescription || "";

  // If description contains generic login text, check HTML paragraphs
  if (content && content.includes("Sign in or join now to see posts")) {
    content = "";
  }

  if (!content && html) {
    // Try finding commentary paragraph in standard HTML
    const commentaryMatch =
      html.match(/data-test-id=["']main-feed-activity-embed-card__commentary["'][^>]*>([\s\S]*?)<\/p>/i) ||
      html.match(/class=["'][^"']*attributed-text-segment-list__content[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
    if (commentaryMatch) {
      content = commentaryMatch[1].replace(/<[^>]+>/g, " ").trim();
    }
  }

  if (content) {
    content = cleanPostContent(content);
  }

  if (!content) {
    if (ogTitle && !ogTitle.toLowerCase().includes("see") && !ogTitle.toLowerCase().includes("linkedin")) {
      content = ogTitle;
    } else {
      content = `[Post extracted from LinkedIn ID: ${parsed.id}]. The original post may require authentication or is restricted. You can edit this text or remix the topic.`;
    }
  }

  const mediaUrl = jsonLdImage || ogImage || undefined;
  const authorImage = mediaUrl?.includes("profile-displayphoto") ? mediaUrl : undefined;

  return {
    id: parsed.id || "unknown",
    urn: parsed.urn || "unknown",
    url: ogUrl || postUrl,
    authorName,
    authorHeadline,
    authorImage,
    content,
    mediaUrl: mediaUrl !== authorImage ? mediaUrl : undefined,
    publishedAt: jsonLdDate || undefined,
    source: jsonLdContent ? "html" : ogDescription ? "opengraph" : oembedData ? "oembed" : "fallback",
  };
}
