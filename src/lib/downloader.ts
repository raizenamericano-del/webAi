/**
 * Social media downloader — 10 platform.
 *
 * Setiap platform punya beberapa provider yang dicoba berurutan
 * (public endpoint / oEmbed / embed page). Kalau satu mati, lanjut ke berikutnya.
 * Hasilnya berupa daftar media (video/audio/gambar) siap download & di-stream
 * lewat /api/proxy supaya aman dari CORS & hotlink protection.
 */

export type MediaItem = {
  url: string;
  type: "video" | "audio" | "image";
  quality?: string;
  ext?: string;
  size?: string;
  hasAudio?: boolean;
};

export type DownloadResult = {
  platform: string;
  title?: string;
  author?: string;
  thumbnail?: string;
  duration?: string;
  source: string;
  medias: MediaItem[];
  note?: string;
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function get(url: string, opts: RequestInit = {}, timeout = 20000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    return await fetch(url, {
      ...opts,
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "*/*", ...(opts.headers || {}) },
    });
  } finally {
    clearTimeout(t);
  }
}

async function json<T = any>(url: string, opts: RequestInit = {}, _timeout?: number): Promise<T | null> {
  try {
    const r = await get(url, { ...opts, headers: { Accept: "application/json", ...(opts.headers || {}) } });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

async function text(url: string, opts: RequestInit = {}): Promise<string> {
  try {
    const r = await get(url, opts);
    if (!r.ok) return "";
    return await r.text();
  } catch {
    return "";
  }
}

function cleanTitle(s: string, fallback = "media") {
  const t = (s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return t || fallback;
}

function uniq(items: MediaItem[]) {
  const seen = new Set<string>();
  return items.filter((i) => {
    const k = i.url;
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/* ============================ DETEKSI ============================ */
export function detectPlatform(url: string): string {
  const u = url.toLowerCase();
  if (/tiktok\.com/.test(u)) return "tiktok";
  if (/instagram\.com|instagr\.am/.test(u)) return "instagram";
  if (/youtube\.com|youtu\.be/.test(u)) return "youtube";
  if (/(^|\.)(x|twitter)\.com/.test(u)) return "twitter";
  if (/facebook\.com|fb\.watch|fb\.com/.test(u)) return "facebook";
  if (/pinterest\.com|pin\.it/.test(u)) return "pinterest";
  if (/reddit\.com|redd\.it/.test(u)) return "reddit";
  if (/spotify\.com/.test(u)) return "spotify";
  if (/soundcloud\.com/.test(u)) return "soundcloud";
  if (/capcut\.com/.test(u)) return "capcut";
  return "unknown";
}

/* ============================ TIKTOK ============================ */
export async function tiktok(url: string): Promise<DownloadResult> {
  const medias: MediaItem[] = [];
  let title = "TikTok video";
  let author = "";
  let thumbnail = "";
  let source = "";

  // 1) oEmbed (metadata selalu jalan)
  const oe = await json<any>(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
  if (oe) {
    title = cleanTitle(oe.title, title);
    author = oe.author_name || "";
    thumbnail = oe.thumbnail_url || "";
  }

  // 2) tikwm (no watermark + audio)
  try {
    const r = await json<any>(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`);
    const d = r?.data;
    if (d) {
      title = cleanTitle(d.title, title);
      author = d.author?.nickname || author;
      thumbnail = d.cover || thumbnail;
      source = "tikwm";
      if (d.images?.length) {
        d.images.forEach((img: string, i: number) =>
          medias.push({ url: img, type: "image", quality: `foto ${i + 1}`, ext: "jpg" }),
        );
      }
      if (d.hdplay) medias.push({ url: d.hdplay, type: "video", quality: "HD (no watermark)", ext: "mp4", hasAudio: true });
      if (d.play) medias.push({ url: d.play, type: "video", quality: "SD (no watermark)", ext: "mp4", hasAudio: true });
      if (d.wmplay) medias.push({ url: d.wmplay, type: "video", quality: "SD (watermark)", ext: "mp4", hasAudio: true });
      if (d.music) medias.push({ url: d.music, type: "audio", quality: "Audio / MP3", ext: "mp3" });
    }
  } catch {}

  // 3) fallback: ambil dari HTML
  if (!medias.length) {
    const html = await text(url, { headers: { Accept: "text/html" } });
    const m = html.match(/"playAddr":"(https:[^"]+)"/) || html.match(/"downloadAddr":"(https:[^"]+)"/);
    if (m) {
      medias.push({ url: m[1].replace(/\\u002F/g, "/"), type: "video", quality: "SD", ext: "mp4", hasAudio: true });
      source = source || "tiktok-html";
    }
    const t = html.match(/<title[^>]*>([^<]+)<\/title>/);
    if (t) title = cleanTitle(t[1], title);
  }

  if (!medias.length) throw new Error("Video TikTok nggak bisa diambil (mungkin private / region blocked).");
  return { platform: "tiktok", title, author, thumbnail, source: source || "oembed", medias: uniq(medias) };
}

/* ========================== INSTAGRAM =========================== */
export async function instagram(url: string): Promise<DownloadResult> {
  const medias: MediaItem[] = [];
  let title = "Instagram media";
  let author = "";
  let thumbnail = "";
  let source = "";

  const canonical = url.split("?")[0].replace(/\/$/, "");

  // 1) embed/captioned (nggak perlu login, jalan buat post publik)
  const html = await text(`${canonical}/embed/captioned/`, { headers: { Accept: "text/html" } });
  if (html) {
    source = "instagram-embed";
    const vid = html.match(/"video_url":"(https:[^"]+)"/);
    if (vid) medias.push({ url: vid[1].replace(/\\u0026/g, "&"), type: "video", quality: "Video", ext: "mp4", hasAudio: true });
    const imgs = Array.from(html.matchAll(/"display_url":"(https:[^"]+)"/g)).map((m) =>
      m[1].replace(/\\u0026/g, "&").replace(/\\/g, ""),
    );
    imgs.forEach((img, i) => medias.push({ url: img, type: "image", quality: `foto ${i + 1}`, ext: "jpg" }));
    const t = html.match(/class="Caption".*?>([\s\S]*?)<\/div>/);
    if (t) title = cleanTitle(t[1].replace(/<[^>]+>/g, " "), title).slice(0, 120);
    const u = html.match(/"owner":{"?[^"]*"?:{?"?[^"]*"?:{?"?[^"]*"?:{?"?[^"]*"?}|"username":"([^"]+)"/);
    if (u?.[1]) author = "@" + u[1];
    const thumb = html.match(/"thumbnail_url":"(https:[^"]+)"/);
    if (thumb) thumbnail = thumb[1].replace(/\\u0026/g, "&");
  }

  // 2) oEmbed lama (kadang masih jalan)
  if (!medias.length) {
    const oe = await json<any>(`https://i.instagram.com/api/v1/oembed/?url=${encodeURIComponent(canonical)}`);
    if (oe?.thumbnail_url) {
      medias.push({ url: oe.thumbnail_url, type: "image", quality: "Foto", ext: "jpg" });
      title = cleanTitle(oe.title, title);
      author = oe.author_name || author;
      thumbnail = oe.thumbnail_url;
      source = "instagram-oembed";
    }
  }

  if (!medias.length)
    throw new Error("Post Instagram nggak bisa diambil (private, atau butuh login). Coba post publik / reel publik.");
  return { platform: "instagram", title, author, thumbnail, source, medias: uniq(medias) };
}

/* ============================ YOUTUBE ============================ */
const PIPED = [
  "https://pipedapi.kavin.rocks",
  "https://api.piped.private.coffee",
  "https://pipedapi.adminforge.de",
  "https://pipedapi.drgns.space",
];

function ytId(url: string) {
  const m =
    url.match(/[?&]v=([^&]+)/) ||
    url.match(/youtu\.be\/([^?/]+)/) ||
    url.match(/\/shorts\/([^?/]+)/) ||
    url.match(/\/embed\/([^?/]+)/) ||
    url.match(/\/live\/([^?/]+)/);
  return m ? m[1] : "";
}

export async function youtube(url: string): Promise<DownloadResult> {
  const id = ytId(url);
  if (!id) throw new Error("Link YouTube nggak valid.");

  const medias: MediaItem[] = [];
  let title = "YouTube video";
  let author = "";
  let thumbnail = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  let source = "";

  const oe = await json<any>(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
  if (oe) {
    title = cleanTitle(oe.title, title);
    author = oe.author_name || "";
    thumbnail = oe.thumbnail_url || thumbnail;
  }

  // Piped instances
  for (const base of PIPED) {
    try {
      const j = await json<any>(`${base}/streams/${id}`, {}, 15000);
      if (!j) continue;
      title = cleanTitle(j.title, title);
      author = j.uploader || author;
      thumbnail = j.thumbnail || thumbnail;
      source = new URL(base).host;
      (j.videoStreams || []).forEach((v: any) => {
        if (!v.url) return;
        medias.push({
          url: v.url,
          type: "video",
          quality: `${v.quality}${v.fps ? ` · ${v.fps}fps` : ""}${(v.videoOnly ?? !v.audioTrackUrl) ? " (video only)" : ""}`,
          ext: "mp4",
          hasAudio: !v.videoOnly,
        });
        if (v.audioTrackUrl)
          medias.push({ url: v.audioTrackUrl, type: "audio", quality: "Audio track (m4a)", ext: "m4a" });
      });
      (j.audioStreams || []).forEach((a: any) => {
        if (a.url)
          medias.push({ url: a.url, type: "audio", quality: `${a.quality} · ${Math.round((a.bitrate || 0) / 1000)}kbps`, ext: a.format || "m4a" });
      });
      if (medias.length) break;
    } catch {}
  }

  // Fallback: cobalt-style public instance
  if (!medias.length) {
    try {
      const r = await fetch("https://api.cobalt.tools/api/json", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": UA },
        body: JSON.stringify({ url, vCodec: "h264", vQuality: "720", aFormat: "mp3", isAudioOnly: false }),
      });
      const j = await r.json();
      if (j?.url) {
        medias.push({ url: j.url, type: "video", quality: "Cobalt 720p", ext: "mp4", hasAudio: true });
        source = "cobalt";
      }
    } catch {}
  }

  if (!medias.length)
    throw new Error(
      "Stream YouTube lagi nggak bisa diambil dari semua mirror. Coba lagi sebentar, atau pakai link pendek youtu.be.",
    );

  medias.sort((a, b) => (a.type === "video" ? -1 : 1));
  return { platform: "youtube", title, author, thumbnail, source: source || "oembed", medias: uniq(medias).slice(0, 14) };
}

/* ========================= TWITTER / X ========================== */
export async function twitter(url: string): Promise<DownloadResult> {
  const medias: MediaItem[] = [];
  let title = "Post X / Twitter";
  let author = "";
  let thumbnail = "";
  let source = "";

  const id = url.match(/status(?:es)?\/(\d+)/)?.[1] || "";

  for (const api of ["https://api.fxtwitter.com/status/", "https://api.vxtwitter.com/Twitter/status/"]) {
    if (!id) break;
    const j = await json<any>(api + id);
    const tweet = j?.tweet || j;
    if (tweet?.media) {
      title = cleanTitle((tweet.text || "").slice(0, 120), title);
      author = tweet.author?.screen_name ? "@" + tweet.author.screen_name : author;
      source = api.includes("fxtwitter") ? "fxtwitter" : "vxtwitter";
      tweet.media?.all?.forEach?.((m: any) => {
        if (m.type === "video" || m.type === "gif") {
          medias.push({ url: m.url, type: "video", quality: "Video / GIF (MP4)", ext: "mp4", hasAudio: true });
        } else if (m.type === "photo") {
          medias.push({ url: m.url, type: "image", quality: "Foto", ext: "jpg" });
        }
      });
      thumbnail = tweet.media?.all?.[0]?.url || "";
      if (medias.length) break;
    }
  }

  // fallback: oEmbed + og tags
  if (!medias.length) {
    const oe = await json<any>(`https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=1`);
    if (oe) {
      title = cleanTitle(oe.html?.replace(/<[^>]+>/g, " ").trim(), title).slice(0, 140);
      author = oe.author_name || author;
      source = "oembed";
    }
    const html = await text(url, { headers: { Accept: "text/html" } });
    const og = html.match(/<meta[^>]+property=["']og:(image|video)["'][^>]+content=["']([^"']+)["']/g) || [];
    og.forEach((tag) => {
      const m = tag.match(/og:(image|video)["'][^>]+content=["']([^"']+)["']/);
      if (!m) return;
      if (m[1] === "video") medias.push({ url: m[2], type: "video", quality: "Video", ext: "mp4" });
      else medias.push({ url: m[2].replace(/&name=\w+$/, "&name=large"), type: "image", quality: "Foto (large)", ext: "jpg" });
      thumbnail = thumbnail || (m[1] === "image" ? m[2] : "");
    });
  }

  if (!medias.length) throw new Error("Media dari post X nggak ketemu (mungkin nggak ada media / private).");
  return { platform: "twitter", title, author, thumbnail, source: source || "html", medias: uniq(medias) };
}

/* =========================== FACEBOOK =========================== */
export async function facebook(url: string): Promise<DownloadResult> {
  const medias: MediaItem[] = [];
  let title = "Facebook video";
  let thumbnail = "";
  let source = "";

  // 1) embed player
  const embed = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&width=640`;
  const html = await text(embed, { headers: { Accept: "text/html" } });
  if (html) {
    source = "fb-embed";
    const hd = html.match(/hd_src:"(https:[^"]+)"/);
    const sd = html.match(/sd_src:"(https:[^"]+)"/);
    if (hd?.[1]) medias.push({ url: hd[1].replace(/\\?\//g, "/"), type: "video", quality: "HD", ext: "mp4", hasAudio: true });
    if (sd?.[1]) medias.push({ url: sd[1].replace(/\\?\//g, "/"), type: "video", quality: "SD", ext: "mp4", hasAudio: true });
    const t = html.match(/<title[^>]*>([^<]+)<\/title>/);
    if (t) title = cleanTitle(t[1], title);
  }

  // 2) cobalt (sering jalan buat FB publik)
  if (!medias.length) {
    try {
      const r = await fetch("https://api.cobalt.tools/api/json", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": UA },
        body: JSON.stringify({ url }),
      });
      const j = await r.json();
      if (j?.url) {
        medias.push({ url: j.url, type: "video", quality: "Cobalt", ext: "mp4", hasAudio: true });
        source = "cobalt";
      }
    } catch {}
  }

  // 3) og tags
  if (!medias.length) {
    const page = await text(url, { headers: { Accept: "text/html" } });
    const ogv = page.match(/<meta[^>]+property=["']og:video(?::secure_url)?["'][^>]+content=["']([^"']+)["']/);
    const ogi = page.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/);
    const ogt = page.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/);
    if (ogv) {
      medias.push({ url: ogv[1].replace(/&amp;/g, "&"), type: "video", quality: "OG video", ext: "mp4", hasAudio: true });
      source = "og-tags";
    }
    if (ogi) {
      medias.push({ url: ogi[1].replace(/&amp;/g, "&"), type: "image", quality: "OG image", ext: "jpg" });
      thumbnail = ogi[1];
      source = source || "og-tags";
    }
    if (ogt) title = cleanTitle(ogt[1], title);
  }

  if (!medias.length)
    throw new Error("Video Facebook nggak bisa diambil. Facebook sering blokir — coba video dari Halaman publik.");
  return { platform: "facebook", title, thumbnail, source, medias: uniq(medias) };
}

/* =========================== PINTEREST ========================== */
export async function pinterest(url: string): Promise<DownloadResult> {
  const medias: MediaItem[] = [];
  let title = "Pinterest pin";
  let thumbnail = "";

  const html = await text(url, { headers: { Accept: "text/html" } });
  if (html) {
    const ogi = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/);
    const ogv = html.match(/<meta[^>]+property=["']og:video["'][^>]+content=["']([^"']+)["']/);
    const ogt = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/);
    if (ogv) medias.push({ url: ogv[1], type: "video", quality: "Video", ext: "mp4", hasAudio: true });
    if (ogi) {
      const base = ogi[1];
      medias.push({ url: base, type: "image", quality: "Original", ext: base.includes(".png") ? "png" : "jpg" });
      thumbnail = base;
    }
    if (ogt) title = cleanTitle(ogt[1], title);
    // ambil resolusi lain
    if (ogi) {
      const m = ogi[1].match(/\/(\d+x)\//);
      const sizes = ["736x", "originals"];
      sizes.forEach((s) => {
        const u = m ? ogi[1].replace(`/${m[1]}/`, `/${s}/`) : ogi[1];
        if (u !== ogi[1]) medias.push({ url: u, type: "image", quality: s.replace("x", ""), ext: "jpg" });
      });
    }
  }

  if (!medias.length) {
    const oe = await json<any>(`https://www.pinterest.com/oembed/?url=${encodeURIComponent(url)}`);
    if (oe?.thumbnail_url) {
      medias.push({ url: oe.thumbnail_url, type: "image", quality: "Thumbnail", ext: "jpg" });
      title = cleanTitle(oe.title, title);
      thumbnail = oe.thumbnail_url;
    }
  }

  if (!medias.length) throw new Error("Pin Pinterest nggak bisa diambil.");
  return { platform: "pinterest", title, thumbnail, source: "html", medias: uniq(medias) };
}

/* ============================= REDDIT =========================== */
export async function reddit(url: string): Promise<DownloadResult> {
  const medias: MediaItem[] = [];
  let title = "Reddit post";
  let author = "";
  let thumbnail = "";

  const clean = url.split("?")[0].replace(/\/$/, "");
  const j = await json<any>(`${clean}.json`, { headers: { "User-Agent": "neural-ai-studio/1.0" } });

  const post = j?.[0]?.data?.children?.[0]?.data;
  if (post) {
    title = cleanTitle(post.title, title);
    author = post.author ? "u/" + post.author : "";
    thumbnail = post.thumbnail && post.thumbnail.startsWith("http") ? post.thumbnail : "";

    const v = post.media?.reddit_video;
    if (v?.fallback_url)
      medias.push({ url: v.fallback_url.replace(/&amp;/g, "&"), type: "video", quality: "Video (tanpa audio)", ext: "mp4" });
    if (v?.hls_url) medias.push({ url: v.hls_url, type: "video", quality: "HLS", ext: "m3u8" });
    if (v?.dash_url) medias.push({ url: v.dash_url, type: "video", quality: "DASH", ext: "mpd" });

    if (post.is_gallery && post.media_metadata) {
      Object.values(post.media_metadata as Record<string, any>).forEach((m: any, i) => {
        const src = m?.s?.u?.replace(/&amp;/g, "&");
        if (src) medias.push({ url: src, type: "image", quality: `gambar ${i + 1}`, ext: "jpg" });
      });
    }

    const urlOver = post.url_overridden_by_dest || post.url;
    if (/\.(jpg|jpeg|png|webp|gif)$/i.test(urlOver || ""))
      medias.push({ url: urlOver, type: "image", quality: "Gambar", ext: (urlOver || "").split(".").pop() });
    if (/\.gifv$/i.test(urlOver || ""))
      medias.push({ url: urlOver.replace(/\.gifv$/, ".mp4"), type: "video", quality: "GIFV → MP4", ext: "mp4" });

    // kalau reddit nge-host audio (video + audio terpisah)
    if (v?.fallback_url && post.media?.reddit_video?.audio_track_url)
      medias.push({ url: post.media.reddit_video.audio_track_url, type: "audio", quality: "Audio track", ext: "m4a" });
  }

  if (!medias.length) throw new Error("Post Reddit nggak punya media yang bisa diunduh.");
  return { platform: "reddit", title, author, thumbnail, source: "reddit-json", medias: uniq(medias) };
}

/* ============================ SPOTIFY =========================== */
export async function spotify(url: string): Promise<DownloadResult> {
  const medias: MediaItem[] = [];
  let title = "Spotify track";
  let author = "";
  let thumbnail = "";

  const oe = await json<any>(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
  if (oe) {
    title = cleanTitle(oe.title, title);
    thumbnail = oe.thumbnail_url || "";
  }

  // cari preview 30 detik + metadata lewat Deezer
  if (title && title !== "Spotify track") {
    const q = encodeURIComponent(title.replace(/\s*\(.*?\)\s*/g, " ").trim());
    const dz = await json<any>(`https://api.deezer.com/search?q=${q}&limit=3`);
    const hit = dz?.data?.[0];
    if (hit) {
      author = hit.artist?.name || author;
      thumbnail = hit.album?.cover_xl || thumbnail;
      if (hit.preview)
        medias.push({ url: hit.preview, type: "audio", quality: "Preview 30s (Deezer)", ext: "mp3" });
    }
  }

  if (!medias.length)
    return {
      platform: "spotify",
      title,
      author,
      thumbnail,
      source: "spotify-oembed",
      medias: [],
      note: "Spotify nggak nyediain audio full secara publik. Metadata + preview di atas yang tersedia (DRM protected).",
    };

  return {
    platform: "spotify",
    title,
    author,
    thumbnail,
    source: "spotify+deezer",
    medias: uniq(medias),
    note: "Audio penuh dilindungi DRM Spotify — yang bisa diunduh adalah preview 30 detik via Deezer.",
  };
}

/* ========================== SOUNDCLOUD ========================== */
export async function soundcloud(url: string): Promise<DownloadResult> {
  const medias: MediaItem[] = [];
  let title = "SoundCloud track";
  let author = "";
  let thumbnail = "";

  const oe = await json<any>(`https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`);
  if (oe) {
    title = cleanTitle(oe.title, title);
    author = oe.author_name || "";
    thumbnail = oe.thumbnail_url || "";
  }

  const html = await text(url, { headers: { Accept: "text/html" } });
  if (html) {
    // progressive mp3 ada di dalam hydration JSON
    const urls = Array.from(
      html.matchAll(/https:\\?\/\\?\/api-v2\.soundcloud\.com\\?\/media\\?\/[^"\\]+\.(?:mp3|opus|m4a)[^"\\]*/g),
    ).map((m) => m[0].replace(/\\/g, ""));
    urls.slice(0, 4).forEach((u, i) =>
      medias.push({ url: u, type: "audio", quality: i === 0 ? "Progressive MP3" : `Stream ${i + 1}`, ext: "mp3" }),
    );
  }

  if (!medias.length)
    throw new Error("Track SoundCloud nggak bisa diambil ( mungkin butuh login / geo-block).");
  return { platform: "soundcloud", title, author, thumbnail, source: "soundcloud-html", medias: uniq(medias) };
}

/* ============================= CAPCUT =========================== */
export async function capcut(url: string): Promise<DownloadResult> {
  const medias: MediaItem[] = [];
  let title = "CapCut template";
  let thumbnail = "";

  const html = await text(url, { headers: { Accept: "text/html" } });
  if (html) {
    const t = html.match(/<title[^>]*>([^<]+)<\/title>/);
    if (t) title = cleanTitle(t[1], title);
    const ogi = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/);
    if (ogi) thumbnail = ogi[1];

    const vids = Array.from(html.matchAll(/(https:\/\/[^"'\s]+\.mp4[^"'\s]*)/g)).map((m) => m[1]);
    vids.slice(0, 5).forEach((v, i) =>
      medias.push({ url: v.replace(/\\u002F/g, "/"), type: "video", quality: i === 0 ? "Video utama" : `Video ${i + 1}`, ext: "mp4", hasAudio: true }),
    );

    if (!medias.length) {
      const imgs = Array.from(html.matchAll(/(https:\/\/[^"'\s]+\.(?:jpg|jpeg|png|webp)[^"'\s]*)/g)).map((m) => m[1]);
      imgs.slice(0, 6).forEach((v, i) =>
        medias.push({ url: v, type: "image", quality: `Gambar ${i + 1}`, ext: v.includes(".png") ? "png" : "jpg" }),
      );
    }
  }

  if (!medias.length) throw new Error("Template CapCut nggak bisa diambil dari halaman ini.");
  return { platform: "capcut", title, thumbnail, source: "capcut-html", medias: uniq(medias).slice(0, 8) };
}

/* ============================ DISPATCH ========================== */
const HANDLERS: Record<string, (url: string) => Promise<DownloadResult>> = {
  tiktok,
  instagram,
  youtube,
  twitter,
  facebook,
  pinterest,
  reddit,
  spotify,
  soundcloud,
  capcut,
};

export async function download(url: string, platform?: string): Promise<DownloadResult> {
  if (!/^https?:\/\//i.test(url)) throw new Error("URL harus dimulai dengan http:// atau https://");
  const key = platform && platform !== "auto" ? platform : detectPlatform(url);
  const handler = HANDLERS[key];
  if (!handler) throw new Error(`Platform nggak dikenali untuk link: ${url}`);
  return handler(url);
}

export const PLATFORMS = Object.keys(HANDLERS);
