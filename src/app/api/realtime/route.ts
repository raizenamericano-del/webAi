import { getStats, heartbeat, loadStats, subscribe } from "@/lib/realtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  await loadStats();
  const encoder = new TextEncoder();
  const clientId = Math.random().toString(36).slice(2);
  heartbeat(clientId);

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: any) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event, payload: data })}\n\n`));
        } catch {}
      };

      send("stats", getStats());

      const unsubscribe = subscribe((event, data) => send(event, data));
      const ping = setInterval(() => {
        heartbeat(clientId);
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {}
      }, 25000);

      req.signal.addEventListener("abort", () => {
        clearInterval(ping);
        unsubscribe();
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
