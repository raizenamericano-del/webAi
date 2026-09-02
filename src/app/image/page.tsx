"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wand2, Download, Share2, Trash2, Loader2, ImageIcon, Upload, Sparkles, RefreshCw, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Input, Textarea, Select, Label, Badge, EmptyState, Tabs } from "@/components/ui";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";

const STYLES = [
  { id: "", label: "Tanpa style" },
  { id: "anime style, vibrant colors, studio ghibli inspired", label: "Anime" },
  { id: "photorealistic, ultra detailed, 8k, cinematic lighting", label: "Realistic" },
  { id: "cyberpunk, neon lights, futuristic, blade runner mood", label: "Cyberpunk" },
  { id: "oil painting, brush strokes, classical art", label: "Painting" },
  { id: "3d render, octane render, unreal engine, volumetric", label: "3D Render" },
  { id: "pixel art, 16-bit, retro game", label: "Pixel Art" },
  { id: "watercolor, soft pastel, dreamy", label: "Watercolor" },
  { id: "dark fantasy, gothic, moody, dramatic shadows", label: "Dark Fantasy" },
];

const MODELS = [
  { id: "stabilityai/stable-diffusion-3-medium", label: "Stable Diffusion 3 Medium" },
  { id: "stabilityai/stable-diffusion-xl-base-1.0", label: "Stable Diffusion XL" },
  { id: "stabilityai/sdxl-turbo", label: "SDXL Turbo (super cepat)" },
  { id: "black-forest-labs/flux.1-dev", label: "FLUX.1 [dev]" },
  { id: "black-forest-labs/flux.1-schnell", label: "FLUX.1 [schnell]" },
];

const ASPECTS = ["1:1", "4:3", "3:4", "16:9", "9:16", "21:9"];

type Gen = { id: string; url: string; dataUrl?: string; prompt: string; model?: string; createdAt?: string };

export default function ImagePage() {
  const { success, error: toastError, info } = useToast();
  const [tab, setTab] = React.useState("generate");
  const [prompt, setPrompt] = React.useState("");
  const [negative, setNegative] = React.useState("blurry, low quality, watermark, text, deformed, extra fingers");
  const [style, setStyle] = React.useState(STYLES[2].id);
  const [model, setModel] = React.useState(MODELS[0].id);
  const [aspect, setAspect] = React.useState("1:1");
  const [batch, setBatch] = React.useState(1);
  const [steps, setSteps] = React.useState(30);
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState<Gen[]>([]);
  const [gallery, setGallery] = React.useState<Gen[]>([]);
  const [initImage, setInitImage] = React.useState<string | null>(null);
  const [maskImage, setMaskImage] = React.useState<string | null>(null);
  const [strength, setStrength] = React.useState(0.7);
  const [selected, setSelected] = React.useState<Gen | null>(null);

  const loadGallery = React.useCallback(async () => {
    const r = await fetch("/api/gallery?type=image");
    const j = await r.json();
    setGallery(j.items || []);
  }, []);

  React.useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  const toBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result).split(",")[1] || "");
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });

  const generate = async () => {
    if (!prompt.trim()) return toastError("Prompt kosong", "Tulis dulu gambar apa yang lu mau.");
    setLoading(true);
    info("Generating...", "NVIDIA NIM sedang menggambar (bisa 10-30 detik).");
    try {
      const r = await fetch("/api/image/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          negativePrompt: negative,
          style,
          model,
          aspect,
          batch,
          steps,
          imageBase64: initImage || undefined,
          maskBase64: maskImage || undefined,
          strength,
        }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setResults(j.images || []);
      success("Selesai!", `${j.images.length} gambar jadi · ${j.model}`);
      loadGallery();
    } catch (e: any) {
      toastError("Gagal generate", e.message);
    } finally {
      setLoading(false);
    }
  };

  const upscale = async (gen: Gen, factor: 2 | 4) => {
    info("Upscaling...", `${factor}x — diproses di browser.`);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = gen.dataUrl || gen.url;
    await new Promise((res) => (img.onload = res));
    const canvas = document.createElement("canvas");
    canvas.width = img.width * factor;
    canvas.height = img.height * factor;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    // sharpen ringan
    sharpen(ctx, canvas.width, canvas.height);
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `upscaled-${factor}x-${gen.id}.png`;
    a.click();
    success("Upscale selesai", `${canvas.width}×${canvas.height} px`);
  };

  const download = (gen: Gen, name?: string) => {
    const a = document.createElement("a");
    a.href = gen.dataUrl || gen.url;
    a.download = name || `neural-ai-${gen.id}.png`;
    a.click();
  };

  const shareTwitter = (gen: Gen) => {
    const text = encodeURIComponent(`${prompt.slice(0, 120)} — dibuat di Neural AI Studio`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  };

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-6 sm:px-5">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-display text-2xl font-black">
            AI <span className="text-gradient">Image Generator</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            NVIDIA NIM · Stable Diffusion 3 / SDXL / FLUX — dengan img2img, inpainting & upscale.
          </p>
        </div>
        <Tabs
          className="ml-auto"
          tabs={[
            { id: "generate", label: "Generate" },
            { id: "gallery", label: <span className="flex items-center gap-1"><History className="h-3.5 w-3.5" /> Gallery ({gallery.length})</span> },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {tab === "generate" ? (
        <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
          {/* ------------------------------ PANEL ------------------------------ */}
          <Card className="h-fit space-y-4 p-4">
            <div className="space-y-1.5">
              <Label>Prompt</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="contoh: seorang ksatria cyberpunk berdiri di atap kota hujan neon, ultra detailed"
                className="min-h-[110px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Negative prompt</Label>
              <Textarea value={negative} onChange={(e) => setNegative(e.target.value)} className="min-h-[70px] text-xs" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Style</Label>
                <Select value={style} onChange={(e) => setStyle(e.target.value)} className="text-xs">
                  {STYLES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Model</Label>
                <Select value={model} onChange={(e) => setModel(e.target.value)} className="text-xs">
                  {MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Aspect ratio</Label>
                <Select value={aspect} onChange={(e) => setAspect(e.target.value)} className="text-xs">
                  {ASPECTS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Jumlah (1-4)</Label>
                <Select value={String(batch)} onChange={(e) => setBatch(Number(e.target.value))} className="text-xs">
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n} gambar
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Steps: {steps}</Label>
              <input
                type="range"
                min={1}
                max={50}
                value={steps}
                onChange={(e) => setSteps(Number(e.target.value))}
                className="w-full accent-neon-cyan"
              />
            </div>

            <details className="rounded-xl border border-border p-3">
              <summary className="cursor-pointer text-xs font-semibold">
                Image-to-Image / Inpainting (opsional)
              </summary>
              <div className="mt-3 space-y-3">
                <div>
                  <Label>Gambar dasar (img2img)</Label>
                  <input
                    type="file"
                    accept="image/*"
                    className="mt-1 w-full text-xs"
                    onChange={async (e) => setInitImage(e.target.files?.[0] ? await toBase64(e.target.files[0]) : null)}
                  />
                </div>
                <div>
                  <Label>Mask (inpainting)</Label>
                  <input
                    type="file"
                    accept="image/*"
                    className="mt-1 w-full text-xs"
                    onChange={async (e) => setMaskImage(e.target.files?.[0] ? await toBase64(e.target.files[0]) : null)}
                  />
                </div>
                <div>
                  <Label>Strength: {strength}</Label>
                  <input
                    type="range"
                    min={0.1}
                    max={0.95}
                    step={0.05}
                    value={strength}
                    onChange={(e) => setStrength(Number(e.target.value))}
                    className="w-full accent-neon-magenta"
                  />
                </div>
              </div>
            </details>

            <Button variant="neon" className="w-full gap-2" onClick={generate} loading={loading}>
              {!loading && <Wand2 className="h-4 w-4" />} Generate Gambar
            </Button>
            <p className="text-center text-[10px] text-muted-foreground">
              Batch {batch} = {batch} request dari kuota harian lu.
            </p>
          </Card>

          {/* ------------------------------ HASIL ------------------------------ */}
          <div>
            {loading && (
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: batch }).map((_, i) => (
                  <div key={i} className="shimmer relative aspect-square overflow-hidden rounded-2xl border border-border bg-secondary/40">
                    <div className="absolute inset-0 grid place-items-center">
                      <Loader2 className="h-6 w-6 animate-spin text-neon-cyan" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && !results.length && (
              <EmptyState
                icon={<ImageIcon className="h-10 w-10" />}
                title="Belum ada gambar"
                desc="Tulis prompt di panel kiri, pilih style & model, lalu tekan Generate."
              />
            )}

            <div className={cn("grid gap-3", results.length > 1 ? "sm:grid-cols-2" : "")}>
              <AnimatePresence>
                {results.map((g) => (
                  <motion.div
                    key={g.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="group relative overflow-hidden rounded-2xl border border-border"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.dataUrl || g.url} alt={g.prompt} className="w-full cursor-pointer" onClick={() => setSelected(g)} />
                    <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-1.5 bg-gradient-to-t from-black/90 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button size="sm" variant="secondary" onClick={() => download(g)}>
                        <Download className="h-3.5 w-3.5" /> PNG
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => upscale(g, 2)}>
                        2x
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => upscale(g, 4)}>
                        4x
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => shareTwitter(g)}>
                        <Share2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setInitImage((g.dataUrl || g.url).split(",")[1])}>
                        <RefreshCw className="h-3.5 w-3.5" /> Variasi
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      ) : (
        /* ------------------------------ GALLERY ------------------------------ */
        <div>
          {!gallery.length ? (
            <EmptyState icon={<History className="h-10 w-10" />} title="Gallery masih kosong" desc="Semua hasil generate bakal tersimpan otomatis di sini." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {gallery.map((g) => (
                <motion.div key={g.id} layout className="group relative overflow-hidden rounded-xl border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.url} alt={g.prompt} className="aspect-square w-full object-cover" loading="lazy" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="mb-1.5 line-clamp-2 text-[11px] text-white/80">{g.prompt}</p>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="secondary" onClick={() => download(g)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => upscale(g, 2)}>
                        2x
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setPrompt(g.prompt)}>
                        Pakai prompt
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* lightbox */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
            className="fixed inset-0 z-[200] grid place-items-center bg-black/90 p-4"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selected.dataUrl || selected.url}
              alt={selected.prompt}
              className="max-h-[88vh] max-w-full rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-6 flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Button variant="secondary" onClick={() => download(selected)}>
                <Download className="h-4 w-4" /> Download
              </Button>
              <Button variant="secondary" onClick={() => upscale(selected, 2)}>
                <Sparkles className="h-4 w-4" /> Upscale 2x
              </Button>
              <Button variant="secondary" onClick={() => upscale(selected, 4)}>
                <Sparkles className="h-4 w-4" /> Upscale 4x
              </Button>
              <Button variant="ghost" onClick={() => setSelected(null)}>
                Tutup
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Unsharp mask sederhana biar hasil upscale lebih tajam. */
function sharpen(ctx: CanvasRenderingContext2D, w: number, h: number) {
  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const src = imgData.data;
    const copy = new Uint8ClampedArray(src);
    const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
    const side = 3;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          for (let ky = 0; ky < side; ky++) {
            for (let kx = 0; kx < side; kx++) {
              const idx = ((y + ky - 1) * w + (x + kx - 1)) * 4 + c;
              sum += copy[idx] * kernel[ky * side + kx];
            }
          }
          const i = (y * w + x) * 4 + c;
          src[i] = Math.min(255, Math.max(0, sum));
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } catch {}
}
