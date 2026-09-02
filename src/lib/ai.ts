import { getUserKey } from "./store";
import { decrypt } from "./crypto";

/** Ambil API key: prioritas env server, kalau kosong pakai "Bring Your Own Key" milik user. */
export async function resolveKey(userId: string | null | undefined, provider: string, envName: string) {
  const envVal = process.env[envName];
  if (envVal) return envVal;
  if (!userId) return "";
  try {
    const row = await getUserKey(userId, provider);
    if (row?.secret) return decrypt(row.secret);
  } catch {}
  return "";
}

export const GROQ_MODELS = [
  { id: "llama-3.3-70b-versatile", label: "LLaMA 3.3 70B", tag: "Best", ctx: 128000 },
  { id: "llama-3.1-70b-versatile", label: "LLaMA 3.1 70B", tag: "Fast", ctx: 131072 },
  { id: "llama3-70b-8192", label: "LLaMA 3 70B", tag: "Classic", ctx: 8192 },
  { id: "llama3-8b-8192", label: "LLaMA 3 8B", tag: "Lite", ctx: 8192 },
  { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B", tag: "MoE", ctx: 32768 },
  { id: "gemma2-9b-it", label: "Gemma 2 9B", tag: "Google", ctx: 8192 },
  { id: "gemma-7b-it", label: "Gemma 7B", tag: "Google", ctx: 8192 },
  { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B", tag: "New", ctx: 131072 },
];

export const NVIDIA_MODELS = [
  { id: "nvidia/llama-3.1-nemotron-70b-instruct", label: "Nemotron 70B", tag: "NVIDIA" },
  { id: "meta/llama-3.1-405b-instruct", label: "LLaMA 3.1 405B", tag: "NVIDIA" },
  { id: "mistralai/mixtral-8x22b-instruct-v0.1", label: "Mixtral 8x22B", tag: "NVIDIA" },
];

export const IMAGE_MODELS = [
  { id: "stabilityai/stable-diffusion-3-medium", label: "Stable Diffusion 3 Medium", tag: "SD3" },
  { id: "stabilityai/stable-diffusion-xl-base-1.0", label: "Stable Diffusion XL", tag: "SDXL" },
  { id: "stabilityai/sdxl-turbo", label: "SDXL Turbo (cepat)", tag: "Turbo" },
  { id: "black-forest-labs/flux.1-dev", label: "FLUX.1 [dev]", tag: "FLUX" },
  { id: "black-forest-labs/flux.1-schnell", label: "FLUX.1 [schnell]", tag: "FLUX" },
];

export function isNvidiaModel(model: string) {
  return NVIDIA_MODELS.some((m) => m.id === model);
}

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

/** Panggil LLM. Kalau model NVIDIA -> pakai NVIDIA NIM, selainnya Groq. */
export async function chatOnce(opts: {
  messages: ChatMsg[];
  model: string;
  userId?: string | null;
  temperature?: number;
  maxTokens?: number;
}) {
  const { messages, model, userId, temperature = 0.7, maxTokens = 2048 } = opts;
  if (isNvidiaModel(model)) {
    const key = await resolveKey(userId, "nvidia", "NVIDIA_API_KEY");
    if (!key) throw new Error("NVIDIA_API_KEY belum di-set (atau tambahkan key sendiri di Settings).");
    const r = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens, stream: false }),
    });
    if (!r.ok) throw new Error(await errText(r, "NVIDIA NIM"));
    const j = await r.json();
    return String(j.choices?.[0]?.message?.content ?? "");
  }

  const key =
    (await resolveKey(userId, "groq", "GROQ_API_KEY")) ||
    (await resolveKey(userId, "groq2", "GROQ_API_KEY_2"));
  if (!key) throw new Error("GROQ_API_KEY belum di-set (atau tambahkan key sendiri di Settings).");
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens, stream: false }),
  });
  if (!r.ok) throw new Error(await errText(r, "Groq"));
  const j = await r.json();
  return String(j.choices?.[0]?.message?.content ?? "");
}

async function errText(r: Response, name: string) {
  let detail = "";
  try {
    const t = await r.text();
    try {
      detail = JSON.parse(t)?.error?.message || t;
    } catch {
      detail = t;
    }
  } catch {}
  return `${name} error ${r.status}: ${detail?.slice(0, 400) || r.statusText}`;
}

/** Stream chat (SSE dari provider diteruskan mentah: `data: {...}` baris per baris). */
export async function chatStream(opts: {
  messages: ChatMsg[];
  model: string;
  userId?: string | null;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}) {
  const { messages, model, userId, temperature = 0.7, maxTokens = 4096, signal } = opts;

  let url = "https://api.groq.com/openai/v1/chat/completions";
  let key =
    (await resolveKey(userId, "groq", "GROQ_API_KEY")) ||
    (await resolveKey(userId, "groq2", "GROQ_API_KEY_2"));

  if (isNvidiaModel(model)) {
    url = "https://integrate.api.nvidia.com/v1/chat/completions";
    key = await resolveKey(userId, "nvidia", "NVIDIA_API_KEY");
  }

  if (!key) {
    throw new Error(
      isNvidiaModel(model)
        ? "NVIDIA_API_KEY belum di-set. Tambahkan di .env.local atau Settings → Bring Your Own Key."
        : "GROQ_API_KEY belum di-set. Tambahkan di .env.local atau Settings → Bring Your Own Key.",
    );
  }

  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens, stream: true }),
    signal,
  });

  if (!r.ok || !r.body) throw new Error(await errText(r, isNvidiaModel(model) ? "NVIDIA NIM" : "Groq"));
  return r;
}

/* ------------------------------------------------------------------ */
/*  IMAGE GENERATION - NVIDIA NIM                                       */
/* ------------------------------------------------------------------ */

export type ImageOpts = {
  prompt: string;
  negativePrompt?: string;
  model?: string;
  width?: number;
  height?: number;
  steps?: number;
  seed?: number;
  batch?: number;
  imageBase64?: string; // img2img
  maskBase64?: string; // inpainting
  strength?: number;
  userId?: string | null;
};

const NVIDIA_GENAI: Record<string, string> = {
  "stabilityai/sdxl-turbo": "https://ai.api.nvidia.com/v1/genai/stabilityai/sdxl-turbo",
  "stabilityai/stable-diffusion-xl-base-1.0": "https://ai.api.nvidia.com/v1/genai/stabilityai/sdxl-turbo",
  "stabilityai/stable-diffusion-3-medium":
    "https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-3-medium",
  "black-forest-labs/flux.1-dev": "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-dev",
  "black-forest-labs/flux.1-schnell": "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell",
};

export async function generateImage(opts: ImageOpts): Promise<{ images: string[]; model: string }> {
  const key = await resolveKey(opts.userId, "nvidia", "NVIDIA_API_KEY");
  if (!key) throw new Error("NVIDIA_API_KEY belum di-set (atau pakai key sendiri di Settings).");

  const model = opts.model || "stabilityai/stable-diffusion-3-medium";
  const out: string[] = [];
  const count = Math.min(Math.max(opts.batch || 1, 1), 4);

  // 1) Coba endpoint OpenAI-compatible /v1/images/generations (paling stabil)
  try {
    for (let i = 0; i < count; i++) {
      const body: any = {
        model,
        prompt: opts.prompt,
        negative_prompt: opts.negativePrompt || undefined,
        size: `${opts.width || 1024}x${opts.height || 1024}`,
        steps: opts.steps || (model.includes("schnell") ? 4 : 30),
        seed: opts.seed ? opts.seed + i : Math.floor(Math.random() * 2 ** 31),
        response_format: "b64_json",
      };
      const r = await fetch("https://integrate.api.nvidia.com/v1/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(await errText(r, "NVIDIA Images"));
      const j = await r.json();
      const b64 = j?.data?.[0]?.b64_json;
      if (!b64) throw new Error("Response kosong dari NVIDIA.");
      out.push("data:image/png;base64," + b64);
    }
    return { images: out, model: `${model} · images/generations` };
  } catch (e1: any) {
    // 2) Fallback: endpoint genai lama (support img2img + inpainting)
    const endpoint = NVIDIA_GENAI[model] || NVIDIA_GENAI["stabilityai/sdxl-turbo"];
    out.length = 0;
    for (let i = 0; i < count; i++) {
      const body: any = {
        text_prompts: [{ text: opts.prompt, weight: 1 }],
        ...(opts.negativePrompt ? { negative_prompts: [{ text: opts.negativePrompt, weight: -1 }] } : {}),
        cfg_scale: 7,
        sampler: "K_DPM_22_ANCESTRAL",
        steps: opts.steps || (model.includes("turbo") ? 4 : 30),
        seed: opts.seed ? opts.seed + i : Math.floor(Math.random() * 2 ** 31),
        width: opts.width || 1024,
        height: opts.height || 1024,
      };
      if (opts.imageBase64) {
        body.image = opts.imageBase64;
        body.strength = opts.strength ?? 0.7;
        body.mode = opts.maskBase64 ? "inpainting" : "image-to-image";
        if (opts.maskBase64) body.mask = opts.maskBase64;
      }
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, Accept: "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(await errText(r, "NVIDIA GenAI"));
      const j = await r.json();
      const b64 = j?.artifacts?.[0]?.base64 || j?.image || j?.data?.[0]?.b64_json;
      if (!b64) throw new Error("Response kosong dari NVIDIA GenAI.");
      out.push(`data:image/png;base64,${b64}`);
    }
    return { images: out, model: `${model} · genai` };
  }
}

/* ------------------------------------------------------------------ */
/*  SPEECH                                                              */
/* ------------------------------------------------------------------ */

export async function transcribeAudio(file: File, userId?: string | null) {
  // Prioritas: OpenAI Whisper -> Groq Whisper (key lu jalan di dua-duanya, tergantung provider)
  const openai = await resolveKey(userId, "openai", "OPENAI_API_KEY");
  if (openai) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("model", "whisper-1");
    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openai}` },
      body: fd,
    });
    if (!r.ok) throw new Error(await errText(r, "OpenAI Whisper"));
    const j = await r.json();
    return String(j.text || "");
  }
  const groq =
    (await resolveKey(userId, "groq", "GROQ_API_KEY")) ||
    (await resolveKey(userId, "groq2", "GROQ_API_KEY_2"));
  if (!groq) throw new Error("Butuh OPENAI_API_KEY atau GROQ_API_KEY untuk speech-to-text.");
  const fd = new FormData();
  fd.append("file", file, file.name || "audio.webm");
  fd.append("model", "whisper-large-v3-turbo");
  fd.append("response_format", "json");
  const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${groq}` },
    body: fd,
  });
  if (!r.ok) throw new Error(await errText(r, "Groq Whisper"));
  const j = await r.json();
  return String(j.text || "");
}

export async function textToSpeech(text: string, voiceId = "21m00Tcm4TlvDq8ikWAM", userId?: string | null) {
  const key = await resolveKey(userId, "elevenlabs", "ELEVENLABS_API_KEY");
  if (!key) throw new Error("ELEVENLABS_API_KEY belum di-set. (TTS browser tetap jalan tanpa key.)");
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "xi-api-key": key, Accept: "audio/mpeg" },
    body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.5, similarity_boost: 0.8 } }),
  });
  if (!r.ok) throw new Error(await errText(r, "ElevenLabs"));
  return r;
}
