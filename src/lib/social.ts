/**
 * Scraping sosial media / SEO — best effort pakai endpoint publik.
 * Semua fungsi dibungkus try/catch dan balikin null kalau platform ngasih blok.
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function text(url: string, headers: Record<string, string> = {}) {
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,*/*", ...headers }, redirect: "follow" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

async function json<T = any>(url: string, headers: Record<string, string> = {}): Promise<T | null> {
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json", ...headers } });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export type SocialStats = {
  platform: string;
  username: string;
  name?: string;
  followers?: number;
  following?: number;
  posts?: number;
  likes?: number;
  engagementRate?: number;
  avatar?: string;
  bio?: string;
  verified?: boolean;
  source: string;
};

/* ------------------------------- TikTok ------------------------------- */
export async function tiktokStats(username: string): Promise<SocialStats | null> {
  const j = await json<any>(`https://www.tikwm.com/api/user/info?unique_id=${encodeURIComponent(username)}`);
  const u = j?.data?.user;
  const s = j?.data?.stats;
  if (u) {
    return {
      platform: "tiktok",
      username: u.uniqueId || username,
      name: u.nickname,
      followers: s?.followerCount,
      following: s?.followingCount,
      posts: s?.videoCount,
      likes: s?.heartCount || s?.heart,
      avatar: u.avatarLarger || u.avatarThumb,
      bio: u.signature,
      verified: !!u.verified,
      source: "tikwm",
    };
  }
  // fallback: parse HTML
  try {
    const html = await text(`https://www.tiktok.com/@${username}`);
    const m = html.match(/"followerCount":(\d+)/);
    const v = html.match(/"videoCount":(\d+)/);
    const h = html.match(/"heartCount":(\d+)/);
    if (m)
      return {
        platform: "tiktok",
        username,
        followers: Number(m[1]),
        posts: v ? Number(v[1]) : undefined,
        likes: h ? Number(h[1]) : undefined,
        source: "tiktok-html",
      };
  } catch {}
  return null;
}

/* ----------------------------- Instagram ------------------------------ */
export async function instagramStats(username: string): Promise<SocialStats | null> {
  try {
    const html = await text(`https://www.instagram.com/${username}/?__a=1&__d=dis`);
    const j = JSON.parse(html);
    const u = j?.graphql?.user;
    if (u)
      return {
        platform: "instagram",
        username: u.username,
        name: u.full_name,
        followers: u.edge_followed_by?.count,
        following: u.edge_follow?.count,
        posts: u.edge_owner_to_timeline_media?.count,
        avatar: u.profile_pic_url_hd,
        bio: u.biography,
        verified: u.is_verified,
        source: "instagram-json",
      };
  } catch {}

  // fallback embed page
  try {
    const html = await text(`https://www.instagram.com/${username}/embed/`);
    const m = html.match(/([\d.,KMB]+)\s+Followers/i);
    if (m)
      return {
        platform: "instagram",
        username,
        followers: parseCount(m[1]),
        source: "instagram-embed",
      };
  } catch {}
  return null;
}

/* ------------------------------- Twitter ------------------------------ */
export async function twitterStats(username: string): Promise<SocialStats | null> {
  try {
    const html = await text(`https://syndication.twitter.com/srv/timeline-profile/screen-name/${username}`);
    const j = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (j) {
      const data = JSON.parse(j[1]);
      const user = data?.props?.pageProps?.profile || data?.props?.pageProps?.userInfo;
      if (user)
        return {
          platform: "twitter",
          username: user.screen_name,
          name: user.name,
          followers: user.followers_count,
          following: user.friends_count,
          posts: user.statuses_count,
          avatar: user.profile_image_url_https?.replace("_normal", "_400x400"),
          bio: user.description,
          verified: user.verified || user.is_blue_verified,
          source: "twitter-syndication",
        };
    }
    const f = html.match(/"followers_count":(\d+)/);
    if (f)
      return {
        platform: "twitter",
        username,
        followers: Number(f[1]),
        source: "twitter-html",
      };
  } catch {}
  return null;
}

/* ------------------------------- YouTube ------------------------------ */
export async function youtubeStats(identifier: string): Promise<SocialStats | null> {
  const isHandle = identifier.startsWith("@");
  const url = isHandle
    ? `https://www.youtube.com/${identifier}`
    : `https://www.youtube.com/channel/${identifier}`;
  try {
    const html = await text(url);
    const subs = html.match(/"subscriberCountText":\{"accessibility".*?"simpleText":"([\d.,KMB]+)\s*subscribers"/) ||
      html.match(/([\d.,KMB]+)\s+subscribers/i);
    const title = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/);
    const img = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/);
    if (subs)
      return {
        platform: "youtube",
        username: identifier,
        name: title?.[1],
        followers: parseCount(subs[1]),
        avatar: img?.[1],
        source: "youtube-html",
      };
  } catch {}
  return null;
}

/* ------------------------------- Facebook ----------------------------- */
export async function facebookStats(username: string): Promise<SocialStats | null> {
  try {
    const html = await text(`https://www.facebook.com/${username}`);
    const likes = html.match(/([\d.,KMB]+)\s+(?:people like this|likes)/i);
    const follow = html.match(/([\d.,KMB]+)\s+(?:people follow this|followers)/i);
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/);
    if (likes || follow)
      return {
        platform: "facebook",
        username,
        name: title?.[1],
        followers: follow ? parseCount(follow[1]) : undefined,
        likes: likes ? parseCount(likes[1]) : undefined,
        source: "facebook-html",
      };
  } catch {}
  return null;
}

export const SOCIAL_FNS: Record<string, (u: string) => Promise<SocialStats | null>> = {
  tiktok: tiktokStats,
  instagram: instagramStats,
  twitter: twitterStats,
  youtube: youtubeStats,
  facebook: facebookStats,
};

export function parseCount(s: string) {
  const n = parseFloat(String(s).replace(/[^\d.]/g, ""));
  if (/K/i.test(s)) return Math.round(n * 1000);
  if (/M/i.test(s)) return Math.round(n * 1_000_000);
  if (/B/i.test(s)) return Math.round(n * 1_000_000_000);
  return Math.round(Number(String(s).replace(/[^\d]/g, "")) || n);
}

/* --------------------------- Keyword research -------------------------- */
export async function keywordIdeas(seed: string) {
  const out: { keyword: string; source: string }[] = [];

  // Google Suggest
  try {
    const r = await fetch(
      `https://suggestqueries.google.com/complete/search?client=firefox&hl=id&q=${encodeURIComponent(seed)}`,
      { headers: { "User-Agent": UA } },
    );
    const j = await r.json();
    (j?.[1] || []).forEach((k: string) => out.push({ keyword: k, source: "google" }));
  } catch {}

  // DuckDuckGo suggestions
  try {
    const r = await fetch(`https://duckduckgo.com/ac/?type=list&q=${encodeURIComponent(seed)}`, {
      headers: { "User-Agent": UA },
    });
    const j = await r.json();
    (j?.[1] || []).forEach((k: string) => out.push({ keyword: k, source: "duckduckgo" }));
  } catch {}

  // variasi modifikasi biar dapet ide long-tail
  const modifiers = ["apa", "cara", "tips", "terbaik", "murah", "review", "tutorial", "vs", "2025", "gratis"];
  modifiers.forEach((m) => out.push({ keyword: `${seed} ${m}`, source: "generated" }));

  const seen = new Set<string>();
  return out.filter((k) => {
    const key = k.keyword.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/* -------------------------- Competitor analysis ------------------------ */
export async function competitorAnalysis(url: string) {
  const started = Date.now();
  const r = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  const html = await r.text();
  const loadMs = Date.now() - started;

  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "";
  const desc =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["']/i)?.[1] || "";
  const h1 = Array.from(html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)).map((m) => strip(m[1]));
  const h2 = Array.from(html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)).map((m) => strip(m[1]));
  const h3 = Array.from(html.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi)).map((m) => strip(m[1]));
  const links = Array.from(html.matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi)).map((m) => m[1]);
  const images = Array.from(html.matchAll(/<img[^>]+(?:src|data-src)=["']([^"']+)["']/gi)).map((m) => m[1]);
  const scripts = Array.from(html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)).map((m) => m[1]);

  const bodyText = strip(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
  const words = bodyText.split(/\s+/).filter(Boolean);
  const freq: Record<string, number> = {};
  words.forEach((w) => {
    const k = w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
    if (k.length < 4) return;
    freq[k] = (freq[k] || 0) + 1;
  });
  const topKeywords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([word, count]) => ({ word, count }));

  // deteksi teknologi (kasar, dari string HTML)
  const tech: string[] = [];
  const checks: [string, RegExp][] = [
    ["Next.js", /_next\/static|__NEXT_DATA__/i],
    ["React", /react|__REACT_DEVTOOLS|data-reactroot/i],
    ["Vue", /vue\.js|data-v-[0-9a-f]/i],
    ["WordPress", /wp-content|wp-includes/i],
    ["Shopify", /cdn\.shopify|shopify\.js/i],
    ["Tailwind", /tailwind|tw-/i],
    ["Google Analytics", /gtag|google-analytics|GA_MEASUREMENT/i],
    ["Cloudflare", /cloudflare|cf-ray/i],
    ["jQuery", /jquery/i],
    ["Bootstrap", /bootstrap/i],
  ];
  checks.forEach(([name, re]) => re.test(html) && tech.push(name));

  const internal = links.filter((l) => !/^https?:\/\//i.test(l)).length;
  const external = links.filter((l) => /^https?:\/\//i.test(l) && !l.includes(new URL(r.url).hostname)).length;

  return {
    url,
    finalUrl: r.url,
    status: r.status,
    loadMs,
    title,
    description: desc,
    wordCount: words.length,
    headings: { h1, h2: h2.slice(0, 12), h3: h3.slice(0, 12) },
    counts: {
      internalLinks: internal,
      externalLinks: external,
      images: images.length,
      scripts: scripts.length,
    },
    topKeywords,
    tech,
    server: r.headers.get("server") || "",
    contentType: r.headers.get("content-type") || "",
  };
}

function strip(s: string) {
  return s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}
