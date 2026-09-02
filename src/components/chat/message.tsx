"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import { Copy, Check, Play, User, Bot, FileText, Globe, Terminal } from "lucide-react";
import { useToast } from "@/components/toast";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model?: string | null;
  meta?: any;
  createdAt?: string;
};

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = React.useState(false);
  const [output, setOutput] = React.useState<string | null>(null);
  const { success, error: err } = useToast();

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const run = () => {
    // jalankan JS di sandbox iframe (aman, terisolasi)
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.setAttribute("sandbox", "allow-scripts");
    const token = Math.random().toString(36).slice(2);
    const script = `
      <script>
        const logs = [];
        const fmt = (v) => { try { return typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v) } catch(e){ return String(e) } };
        console.log = (...a) => logs.push(a.map(fmt).join(' '));
        console.error = (...a) => logs.push('ERR: ' + a.map(fmt).join(' '));
        console.info = console.log; console.warn = console.log;
        try {
          const __result = (function(){ ${code.includes("return") || /^[\s\S]*\bfunction\b/.test(code) ? code : `return (${code})`} })();
          if (__result !== undefined) logs.push('→ ' + fmt(__result));
        } catch (e) { logs.push('ERROR: ' + e.message) }
        parent.postMessage({ token: ${JSON.stringify(token)}, logs: logs.join('\\n') }, '*');
      <\/script>`;
    iframe.srcdoc = script;
    document.body.appendChild(iframe);

    const handler = (e: MessageEvent) => {
      if (e.data?.token !== token) return;
      window.removeEventListener("message", handler);
      setOutput(e.data.logs || "(tidak ada output)");
      iframe.remove();
    };
    window.addEventListener("message", handler);
    setTimeout(() => {
      if (!output) setOutput("(timeout 5s)");
      iframe.remove();
    }, 5000);
  };

  const runnable = ["js", "javascript", "jsx", "ts"].includes(lang.toLowerCase());

  return (
    <div className="group my-3 overflow-hidden rounded-xl border border-border bg-black/60">
      <div className="flex items-center justify-between border-b border-border/70 px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wider text-neon-cyan">{lang || "code"}</span>
        <div className="flex items-center gap-1">
          {runnable && (
            <button
              onClick={run}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-neon-lime hover:bg-neon-lime/10"
            >
              <Play className="h-3 w-3" /> Run
            </button>
          )}
          <button
            onClick={copy}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            {copied ? <Check className="h-3 w-3 text-neon-lime" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <pre className="scroll-thin overflow-x-auto p-3 text-[12.5px] leading-relaxed">
        <code>{code}</code>
      </pre>
      {output !== null && (
        <div className="border-t border-border/70 bg-black/80 px-3 py-2">
          <div className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-neon-lime">
            <Terminal className="h-3 w-3" /> output
          </div>
          <pre className="whitespace-pre-wrap font-mono text-[12px] text-foreground/90">{output}</pre>
        </div>
      )}
    </div>
  );
}

export function MessageBubble({ msg, index }: { msg: ChatMessage; index: number }) {
  const isUser = msg.role === "user";
  const meta = typeof msg.meta === "string" ? safeParse(msg.meta) : msg.meta;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.02, 0.2) }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <span
        className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
          isUser
            ? "bg-gradient-to-br from-neon-cyan to-neon-magenta text-black"
            : "border border-primary/40 bg-primary/10 text-neon-cyan"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </span>

      <div className={`min-w-0 max-w-[min(760px,92%)] ${isUser ? "items-end text-right" : ""}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            isUser
              ? "rounded-tr-sm bg-primary/15 ring-1 ring-primary/30"
              : "rounded-tl-sm border border-border bg-card/70"
          }`}
        >
          {meta?.fileContext && (
            <div className="mb-2 flex items-center gap-1.5 text-[11px] text-neon-lime">
              <FileText className="h-3 w-3" /> file dianalisis
            </div>
          )}
          {meta?.sources?.length ? null : null}

          <div className={`prose-neon break-words ${isUser ? "text-left" : ""}`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || "");
                  if (inline) return <code className={className} {...props}>{children}</code>;
                  return <CodeBlock lang={match?.[1] || ""} code={String(children).replace(/\n$/, "")} />;
                },
                a({ children, href }) {
                  return (
                    <a href={href} target="_blank" rel="noreferrer noopener">
                      {children}
                    </a>
                  );
                },
                img({ src, alt }) {
                  return (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt={alt}
                      className="my-3 max-h-[420px] w-auto rounded-xl border border-border"
                      loading="lazy"
                    />
                  );
                },
              }}
            >
              {msg.content}
            </ReactMarkdown>
          </div>
        </div>

        <div className={`mt-1 flex items-center gap-2 px-1 text-[10px] text-muted-foreground ${isUser ? "justify-end" : ""}`}>
          {msg.model && <span className="font-mono">{msg.model}</span>}
          {meta?.search && (
            <span className="flex items-center gap-1 text-neon-lime">
              <Globe className="h-3 w-3" /> web search
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function safeParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
