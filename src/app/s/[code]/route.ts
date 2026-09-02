import { NextResponse } from "next/server";
import { bumpShortLink, getShortLink } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { code: string } }) {
  const row = await getShortLink(params.code);
  if (!row) return NextResponse.redirect(new URL("/", req.url));
  await bumpShortLink(params.code).catch(() => {});
  return NextResponse.redirect(row.url);
}
