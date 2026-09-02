import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserByEmail, getThread, createThread, listMessages, addMessage, updateThread } from "@/lib/store";
import { consumeQuota } from "@/lib/usage";
import { chatStream, generateImage } from "@/lib/ai";
import { webSearch } from "@/lib/search";
import { logActivity } from "@/lib/realtime";
import { friendlyError } from "@/lib/utils";
import { addGeneration, bumpCounter } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `Kamu adalah NEURAL AI, asisten AI yang powerful, cepat dan to-the-point.
- Jawab dalam bahasa yang dipakai user (default Bahasa Indonesia yang santai tapi profesional).
- Kalau user minta kode, kasih kode lengkap dengan blok \`\`\`bahasa ... \`\`\`.
- Kalau butuh data terbaru, gunakan hasil web search yang disediakan (sertakan sumbernya).
- Jangan mengarang fakta. Kalau nggak tahu, bilang nggak tahu.`;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Login dulu untuk pakai AI Chat." }, { status: 401 });
  const user = await getUserByEmail(session.user.email);
  if (!user) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 401 });

  const quota = await consumeQuota(user, 1);
  if (quota) return quota;

  const body = await req.json().catch(() => ({}));
  const {
    message = "",
    threadId,
    model = "llama-3.3-70b-versatile",
    fileContext,
    search = false,
    systemPrompt,
  } = body as {
    message: string;
    threadId?: string;
    model?: string;
    fileContext?: string;
    search?: boolean;
    systemPrompt?: string;
  };

  if (!message && !fileContext) return NextResponse.json({ error: "Pesan kosong." }, { status: 400 });

  let thread = threadId ? await getThread(threadId, user.id) : undefined;
  if (!thread) {
    const title = (message || "File upload").slice(0, 48);
    thread = await createThread(user.id, title, model);
  }
  if (thread.model !== model) await updateThread(thread.id, { model });

  // simpan pesan user
  await addMessage(
    thread.id,
    "user",
    message || "(file diupload)",
    user.id,
    model,
    fileContext ? { fileContext: fileContext.slice(0, 500) } : null,
  );

  const history = (await listMessages(thread.id)).slice(-20);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let full = "";
      const send = (obj: any) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        } catch {}
      };

      send({ type: "meta", threadId: thread.id, title: thread.title });

      try {
        /* ------------------ command: /image ------------------ */
        const imgMatch = message.match(/^\/(image|img|gambar)\s+([\s\S]+)$/i);
        if (imgMatch) {
          send({ type: "delta", text: "🎨 Generating image pakai NVIDIA NIM...\n\n" });
          const { images, model: usedModel } = await generateImage({
            prompt: imgMatch[2].trim(),
            userId: user.id,
            width: 1024,
            height: 1024,
          });
          for (const dataUrl of images) {
            const gen: any = await addGeneration(user.id, "image", imgMatch[2].trim(), dataUrl, {
              model: usedModel,
              threadId: thread.id,
            });
            const md = `![generated](/api/g/${gen.id})\n`;
            full += md;
            send({ type: "delta", text: md });
            send({ type: "image", url: `/api/g/${gen.id}`, id: gen.id });
          }
          full += `\n_Selesai · ${usedModel}_`;
          send({ type: "delta", text: `\n_Selesai · ${usedModel}_` });
          await addMessage(thread!.id, "assistant", full, user.id, model, { images: true });
          logActivity(user.id, "chat-image", imgMatch[2].trim().slice(0, 80), "images");
          send({ type: "done", threadId: thread.id });
          controller.close();
          return;
        }

        /* ------------------ web search ------------------ */
        let searchNote = "";
        if (search) {
          send({ type: "status", text: "🔎 Mencari di web..." });
          const { results, provider } = await webSearch(message, user.id, 5);
          if (results.length) {
            searchNote =
              `\n\nHASIL WEB SEARCH (${provider}, ${new Date().toISOString().slice(0, 10)}):\n` +
              results.map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.content}`).join("\n\n");
            send({ type: "sources", sources: results });
          } else {
            send({ type: "status", text: "⚠️ Web search nggak nemu hasil, lanjut tanpa sumber." });
          }
        }

        /* ------------------ susun prompt ------------------ */
        const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
          { role: "system", content: systemPrompt || SYSTEM_PROMPT },
          ...history.slice(0, -1).map((m: any) => ({
            role: m.role,
            content: m.role === "user" && m.meta ? `${m.content}\n\n[Konteks file]\n${safeMeta(m.meta)}` : m.content,
          })),
          {
            role: "user",
            content:
              (message || "Analisis file berikut.") +
              (fileContext ? `\n\n--- ISI FILE ---\n${fileContext}\n--- SELESAI ---` : "") +
              searchNote,
          },
        ];

        const r = await chatStream({ messages, model, userId: user.id, signal: req.signal });

        const reader = r.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const t = line.trim();
            if (!t.startsWith("data:")) continue;
            const payload = t.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const json = JSON.parse(payload);
              const delta = json.choices?.[0]?.delta?.content ?? json.choices?.[0]?.message?.content ?? "";
              if (delta) {
                full += delta;
                send({ type: "delta", text: delta });
              }
            } catch {}
          }
        }

        await addMessage(thread!.id, "assistant", full, user.id, model, { search });
        logActivity(user.id, "chat", message.slice(0, 80), "chats");
        send({ type: "done", threadId: thread.id });
      } catch (e: any) {
        send({ type: "error", error: friendlyError(e, "Terjadi kesalahan saat menghubungi AI.") });
        if (full) await addMessage(thread!.id, "assistant", full, user.id, model, { truncated: true });
      } finally {
        try {
          controller.close();
        } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

function safeMeta(meta: string) {
  try {
    const j = JSON.parse(meta);
    return j.fileContext || "";
  } catch {
    return "";
  }
}
