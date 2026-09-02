import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function blocked(host: string) {
  const h = host.toLowerCase();
  return (
    h === "localhost" ||
    h === "::1" ||
    /^127\./.test(h) ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    h === "metadata.google.internal" ||
    !h.includes(".")
  );
}

/**
 * Stream file dari URL eksternal (bypass CORS / hotlink + paksa download).
 * ?url=... &name=namafile.mp4 &dl=1
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("url");
  const name = (searchParams.get("name") || "media").replace(/[^\w.\-()\[\] ]+/g, "_").slice(0, 120);
  const dl = searchParams.get("dl") !== "0";

  if (!target) return new NextResponse("Missing url", { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }
  if (!/^https?:$/.test(parsed.protocol)) return new NextResponse("Invalid protocol", { status: 400 });
  if (blocked(parsed.hostname)) return new NextResponse("Blocked host", { status: 403 });

  const range = req.headers.get("range");

  try {
    const upstream = await fetch(target, {
      headers: {
        "User-Agent": UA,
        Referer: `${parsed.origin}/`,
        Accept: "*/*",
        ...(range ? { Range: range } : {}),
      },
      redirect: "follow",
    });

    const headers = new Headers();
    const copy = ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"];
    copy.forEach((h) => {
      const v = upstream.headers.get(h);
      if (v) headers.set(h, v);
    });
    headers.set("Access-Control-Allow-Origin", "*");
    if (dl) headers.set("Content-Disposition", `attachment; filename="${name}"`);
    headers.set("Cache-Control", "public, max-age=3600");

    return new Response(upstream.body as any, { status: upstream.status, headers });
  } catch (e: any) {
    return new NextResponse("Upstream error: " + e.message, { status: 502 });
  }
}
