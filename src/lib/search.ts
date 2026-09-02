import { resolveKey } from "./ai";

export type SearchResult = { title: string; url: string; content: string; score?: number };

/** Web search: Tavily kalau ada key, fallback DuckDuckGo HTML. */
export async function webSearch(
  query: string,
  userId?: string | null,
  maxResults = 5,
): Promise<{ results: SearchResult[]; provider: string }> {
  const tavily = await resolveKey(userId, "tavily", "TAVILY_API_KEY");
  if (tavily) {
    try {
      const r = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: tavily,
          query,
          max_results: maxResults,
          search_depth: "basic",
          include_answer: true,
        }),
      });
      if (r.ok) {
        const j = await r.json();
        return {
          provider: "tavily",
          results: (j.results || []).map((x: any) => ({
            title: x.title,
            url: x.url,
            content: x.content,
            score: x.score,
          })),
        };
      }
    } catch {}
  }

  // Fallback: DuckDuckGo lite
  try {
    const r = await fetch("https://lite.duckduckgo.com/lite/?q=" + encodeURIComponent(query), {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36" },
    });
    const html = await r.text();
    const results: SearchResult[] = [];
    const re =
      /<a[^>]+class="result-link"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result-snippet">([\s\S]*?)<\/td>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) && results.length < maxResults) {
      results.push({
        url: decodeDDG(m[1]),
        title: strip(m[2]).slice(0, 160),
        content: strip(m[3]).slice(0, 400),
      });
    }
    if (results.length) return { provider: "duckduckgo", results };
  } catch {}

  return { provider: "none", results: [] };
}

function strip(s: string) {
  return s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/\s+/g, " ").trim();
}

function decodeDDG(u: string) {
  try {
    if (u.includes("uddg=")) return decodeURIComponent(u.split("uddg=")[1].split("&")[0]);
    return u;
  } catch {
    return u;
  }
}

/** Ambil isi teks sebuah halaman web (scraper sederhana). */
export async function scrapeUrl(url: string) {
  const r = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });
  const html = await r.text();
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim();
  const desc =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
    "";
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] || "";

  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

  const links = Array.from(html.matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi))
    .map((m) => m[1])
    .filter((l) => /^https?:\/\//i.test(l))
    .slice(0, 40);

  const images = Array.from(html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi))
    .map((m) => m[1])
    .slice(0, 25);

  return {
    url,
    finalUrl: r.url,
    status: r.status,
    title: strip(title),
    description: desc,
    ogImage,
    contentLength: html.length,
    text: text.slice(0, 20000),
    links: Array.from(new Set(links)),
    images: Array.from(new Set(images)),
    htmlHead: html.slice(0, 4000),
  };
}
