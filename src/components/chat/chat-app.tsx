"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus,
  Send,
  Paperclip,
  Mic,
  Square,
  Trash2,
  Pin,
  Download,
  Search,
  Sparkles,
  X,
  PanelLeft,
  FileText,
  Loader2,
  Globe,
  Command,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Badge, Select, EmptyState } from "@/components/ui";
import { MessageBubble, type ChatMessage } from "./message";
import { useToast } from "@/components/toast";
import { cn, timeAgo } from "@/lib/utils";

const MODELS = [
  { id: "llama-3.3-70b-versatile", label: "LLaMA 3.3 70B", tag: "Best" },
  { id: "llama-3.1-70b-versatile", label: "LLaMA 3.1 70B", tag: "Fast" },
  { id: "llama3-70b-8192", label: "LLaMA 3 70B", tag: "Classic" },
  { id: "llama3-8b-8192", label: "LLaMA 3 8B", tag: "Lite" },
  { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B", tag: "MoE" },
  { id: "gemma2-9b-it", label: "Gemma 2 9B", tag: "Google" },
  { id: "gemma-7b-it", label: "Gemma 7B", tag: "Google" },
  { id: "nvidia/llama-3.1-nemotron-70b-instruct", label: "Nemotron 70B", tag: "NVIDIA" },
  { id: "meta/llama-3.1-405b-instruct", label: "LLaMA 3.1 405B", tag: "NVIDIA" },
];

type Thread = { id: string; title: string; model: string; pinned: number; updatedAt: string };

export function ChatApp() {
  const params = useSearchParams();
  const router = useRouter();
  const { success, error: toastError, info } = useToast();

  const [threads, setThreads] = React.useState<Thread[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(params.get("t"));
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [streaming, setStreaming] = React.useState("");
  const [model, setModel] = React.useState("llama-3.3-70b-versatile");
  const [searchOn, setSearchOn] = React.useState(false);
  const [sidebar, setSidebar] = React.useState(true);
  const [fileContext, setFileContext] = React.useState<{ name: string; text: string } | null>(null);
  const [recording, setRecording] = React.useState(false);
  const [sources, setSources] = React.useState<any[]>([]);
  const [query, setQuery] = React.useState("");

  const mediaRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const pendingSources = React.useRef<any[]>([]);

  /* ----------------------------- threads ----------------------------- */
  const loadThreads = React.useCallback(async () => {
    const r = await fetch("/api/chat/threads");
    const j = await r.json();
    setThreads(j.threads || []);
  }, []);

  React.useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  React.useEffect(() => {
    if (!activeId) return;
    (async () => {
      const r = await fetch(`/api/chat/threads/${activeId}`);
      const j = await r.json();
      if (j.thread) {
        setMessages(j.messages || []);
        setModel(j.thread.model || "llama-3.3-70b-versatile");
      }
      router.replace(`/chat?t=${activeId}`, { scroll: false });
    })();
  }, [activeId, router]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const newThread = async () => {
    const r = await fetch("/api/chat/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model }),
    });
    const j = await r.json();
    if (j.thread) {
      setThreads((t) => [j.thread, ...t]);
      setActiveId(j.thread.id);
      setMessages([]);
      setFileContext(null);
    }
  };

  const removeThread = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/chat/threads/${id}`, { method: "DELETE" });
    setThreads((t) => t.filter((x) => x.id !== id));
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
    }
  };

  const pinThread = async (id: string, pinned: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/chat/threads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !pinned }),
    });
    loadThreads();
  };

  /* ------------------------------ kirim ------------------------------ */
  const send = async () => {
    if ((!input.trim() && !fileContext) || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    setStreaming("");
    setSources([]);
    pendingSources.current = [];

    const optimistic: ChatMessage = {
      id: "temp-" + Date.now(),
      role: "user",
      content: content || "(file diupload)",
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          threadId: activeId,
          model,
          search: searchOn,
          fileContext: fileContext?.text
            ? `=== FILE: ${fileContext.name} ===\n${fileContext.text}`
            : undefined,
        }),
      });

      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          try {
            const ev = JSON.parse(line.slice(5).trim());
            if (ev.type === "meta") {
              if (!activeId && ev.threadId) setActiveId(ev.threadId);
            } else if (ev.type === "delta") {
              acc += ev.text;
              setStreaming(acc);
            } else if (ev.type === "sources") {
              pendingSources.current = ev.sources;
              setSources(ev.sources);
            } else if (ev.type === "status") {
              info("AI Chat", ev.text);
            } else if (ev.type === "image") {
              // gambar sudah masuk sebagai markdown
            } else if (ev.type === "error") {
              throw new Error(ev.error);
            } else if (ev.type === "done") {
              if (!activeId && ev.threadId) setActiveId(ev.threadId);
            }
          } catch (e: any) {
            if (e.message && !e.message.startsWith("{")) throw e;
          }
        }
      }

      // refresh pesan dari server (supaya meta & id konsisten)
      const finalThread = activeId;
      setStreaming("");
      setFileContext(null);
      if (finalThread) {
        const r = await fetch(`/api/chat/threads/${finalThread}`);
        const j = await r.json();
        if (j.messages) setMessages(j.messages);
      }
      loadThreads();
    } catch (e: any) {
      toastError("Gagal mengirim", e.message);
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      setInput(content);
    } finally {
      setSending(false);
      setStreaming("");
    }
  };

  /* ------------------------------ upload ----------------------------- */
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.append("file", f);
    info("Memproses file", f.name);
    const r = await fetch("/api/chat/upload", { method: "POST", body: fd });
    const j = await r.json();
    if (!j.ok) return toastError("Gagal baca file", j.error);
    setFileContext({ name: f.name, text: j.text });
    success("File siap", `${f.name} · ${j.chars.toLocaleString()} karakter diekstrak`);
    e.target.value = "";
  };

  /* --------------------------- voice input --------------------------- */
  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        const fd = new FormData();
        fd.append("file", blob, "voice.webm");
        info("Transkripsi", "Mengubah suara jadi teks...");
        const r = await fetch("/api/transcribe", { method: "POST", body: fd });
        const j = await r.json();
        if (j.ok) {
          setInput((v) => (v ? v + " " + j.text : j.text));
          success("Selesai", "Teks dimasukkan ke kolom pesan.");
        } else toastError("Gagal transkrip", j.error);
      };
      mediaRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      toastError("Mikrofon ditolak", "Izinkan akses mikrofon di browser lu.");
    }
  };
  const stopRec = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  /* ------------------------------ export ----------------------------- */
  const exportChat = (format: "json" | "md" | "pdf") => {
    if (!messages.length) return toastError("Kosong", "Nggak ada pesan buat diekspor.");
    if (format === "json") {
      const blob = new Blob([JSON.stringify({ thread: activeId, model, messages }, null, 2)], { type: "application/json" });
      download(blob, `chat-${activeId || "export"}.json`);
    } else if (format === "md") {
      const md = messages
        .map((m) => `### ${m.role === "user" ? "🧑 Kamu" : "🤖 AI"}\n\n${m.content}\n`)
        .join("\n---\n\n");
      download(new Blob([md], { type: "text/markdown" }), `chat-${activeId || "export"}.md`);
    } else {
      const win = window.open("", "_blank");
      if (!win) return;
      win.document.write(`<html><head><title>Chat Export</title><style>
        body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;line-height:1.6}
        pre{background:#f4f4f5;padding:12px;border-radius:8px;overflow:auto}
        h3{margin-top:24px;border-bottom:1px solid #ddd;padding-bottom:6px}
        img{max-width:100%}
      </style></head><body>
      <h1>Riwayat Chat — Neural AI Studio</h1>
      <p><em>Model: ${model} · ${new Date().toLocaleString("id-ID")}</em></p>
      ${messages
        .map(
          (m) =>
            `<h3>${m.role === "user" ? "🧑 Kamu" : "🤖 AI"}</h3><div>${escapeHtml(m.content)
              .replace(/```(\w+)?\n([\s\S]*?)```/g, (_s, _l, c) => `<pre><code>${escapeHtml(c)}</code></pre>`)
              .replace(/\n/g, "<br/>")}</div>`,
        )
        .join("")}
      </body></html>`);
      win.document.close();
      setTimeout(() => win.print(), 400);
    }
    success("Export siap", `Format ${format.toUpperCase()} diunduh.`);
  };

  const download = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = threads.filter((t) => t.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* ---------------------------- SIDEBAR ---------------------------- */}
      <AnimatePresence initial={false}>
        {sidebar && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="hidden shrink-0 flex-col border-r border-border bg-card/40 md:flex"
          >
            <div className="space-y-2 p-3">
              <Button variant="neon" className="w-full gap-2" onClick={newThread}>
                <Plus className="h-4 w-4" /> Chat Baru
              </Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari thread..."
                  className="h-9 pl-9 text-xs"
                />
              </div>
            </div>

            <div className="scroll-thin flex-1 space-y-1 overflow-y-auto px-2 pb-4">
              {filtered.length === 0 && <p className="px-2 py-6 text-center text-xs text-muted-foreground">Belum ada thread</p>}
              {filtered.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveId(t.id)}
                  className={cn(
                    "group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors",
                    activeId === t.id ? "bg-primary/15 text-foreground ring-1 ring-primary/30" : "hover:bg-secondary/60",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{t.title}</span>
                  {!!t.pinned && <Pin className="h-3 w-3 text-neon-lime" />}
                  <span className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <span
                      onClick={(e) => pinThread(t.id, t.pinned, e)}
                      className="rounded p-1 hover:bg-secondary"
                      title="pin"
                    >
                      <Pin className="h-3 w-3" />
                    </span>
                    <span
                      onClick={(e) => removeThread(t.id, e)}
                      className="rounded p-1 text-destructive hover:bg-destructive/10"
                      title="hapus"
                    >
                      <Trash2 className="h-3 w-3" />
                    </span>
                  </span>
                </button>
              ))}
            </div>

            <div className="border-t border-border p-3 text-[10px] text-muted-foreground">
              Tip: ketik <code className="text-neon-cyan">/image prompt</code> buat bikin gambar langsung di chat.
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ------------------------------ MAIN ------------------------------ */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* header */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
          <button
            onClick={() => setSidebar((v) => !v)}
            className="hidden rounded-lg border border-border p-2 md:block"
            title="toggle sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </button>

          <Select value={model} onChange={(e) => setModel(e.target.value)} className="h-9 w-auto min-w-[160px] text-xs">
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} · {m.tag}
              </option>
            ))}
          </Select>

          <button
            onClick={() => setSearchOn((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
              searchOn ? "border-neon-lime/60 bg-neon-lime/10 text-neon-lime" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            <Globe className="h-3.5 w-3.5" /> Web Search
          </button>

          {!activeId && (
            <Button variant="neon" size="sm" className="md:hidden" onClick={newThread}>
              <Plus className="h-4 w-4" />
            </Button>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => exportChat("md")}>
              <Download className="h-3.5 w-3.5" /> MD
            </Button>
            <Button variant="ghost" size="sm" onClick={() => exportChat("json")}>
              <Download className="h-3.5 w-3.5" /> JSON
            </Button>
            <Button variant="ghost" size="sm" onClick={() => exportChat("pdf")}>
              <Download className="h-3.5 w-3.5" /> PDF
            </Button>
          </div>
        </div>

        {/* messages */}
        <div className="scroll-thin flex-1 overflow-y-auto">
          {!messages.length && !streaming ? (
            <div className="mx-auto max-w-2xl px-5 py-16">
              <div className="mb-6 text-center">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-neon-cyan to-neon-magenta"
                >
                  <Sparkles className="h-7 w-7 text-black" />
                </motion.div>
                <h2 className="font-display text-2xl font-black">Apa yang mau lu build hari ini?</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pilih model, upload file, atau langsung ketik pertanyaan.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { t: "Jelaskan cara kerja quantum computing", d: "Penjelasan sederhana" },
                  { t: "/image cyberpunk city neon rain 8k", d: "Generate gambar AI" },
                  { t: "Bikin REST API Express + PostgreSQL", d: "Generate kode" },
                  { t: "Bikin caption Instagram buat kopi susu", d: "Copywriting" },
                ].map((s) => (
                  <button
                    key={s.t}
                    onClick={() => setInput(s.t)}
                    className="rounded-xl border border-border bg-card/50 p-3 text-left transition-colors hover:border-primary/50"
                  >
                    <p className="text-[13px] font-medium">{s.t}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{s.d}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-4xl space-y-5 px-3 py-6 sm:px-5">
              {messages.map((m, i) => (
                <MessageBubble key={m.id + i} msg={m} index={i} />
              ))}
              {streaming && (
                <MessageBubble
                  msg={{ id: "streaming", role: "assistant", content: streaming, model }}
                  index={messages.length}
                />
              )}
              {sources.length > 0 && (
                <div className="rounded-xl border border-neon-lime/30 bg-neon-lime/5 p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-neon-lime">
                    <Globe className="h-3.5 w-3.5" /> Sumber web
                  </p>
                  <ul className="space-y-1">
                    {sources.map((s, i) => (
                      <li key={i} className="text-xs">
                        <a href={s.url} target="_blank" rel="noreferrer" className="text-neon-cyan hover:underline">
                          {i + 1}. {s.title}
                        </a>
                        <p className="line-clamp-2 text-muted-foreground">{s.content}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* composer */}
        <div className="border-t border-border bg-background/80 px-3 py-3 backdrop-blur">
          <div className="mx-auto max-w-4xl">
            {fileContext && (
              <div className="mb-2 flex items-center gap-2 rounded-lg border border-neon-lime/40 bg-neon-lime/5 px-3 py-1.5 text-xs">
                <FileText className="h-3.5 w-3.5 text-neon-lime" />
                <span className="min-w-0 flex-1 truncate">{fileContext.name}</span>
                <button onClick={() => setFileContext(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <div className="flex items-end gap-2 rounded-2xl border border-border bg-card/60 p-2 focus-within:border-primary/60">
              <label className="cursor-pointer rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                <Paperclip className="h-4 w-4" />
                <input type="file" className="hidden" onChange={onFile} accept=".pdf,.docx,.txt,.md,.csv,.xlsx,.xls,.json,.js,.ts,.py,.html,.css" />
              </label>

              <button
                onClick={recording ? stopRec : startRec}
                className={cn(
                  "rounded-lg p-2 transition-colors",
                  recording ? "bg-destructive/15 text-destructive" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
                title="Voice input (Whisper)"
              >
                {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>

              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Tanya apa aja... (Enter kirim, Shift+Enter baris baru, /image buat gambar)"
                className="max-h-40 min-h-[42px] flex-1 resize-none border-0 bg-transparent px-1 py-2.5 text-sm focus:ring-0"
                rows={1}
              />

              <Button onClick={send} disabled={sending || (!input.trim() && !fileContext)} variant="neon" size="icon" title="Kirim">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>

            <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
              <Command className="mr-1 inline h-3 w-3" />
              AI bisa salah — cek ulang hal penting. Model: {model}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
