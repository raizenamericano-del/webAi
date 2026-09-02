"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Eraser, Wand2, Palette, Maximize2, Droplets, Scissors, Upload, Download, Loader2, Info, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Label, Badge, Tabs, Select } from "@/components/ui";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";

const TOOLS = [
  { id: "bg", label: "BG Remover", icon: Eraser, color: "text-neon-cyan" },
  { id: "enhance", label: "Enhancer", icon: Wand2, color: "text-neon-lime" },
  { id: "upscale", label: "Upscale 2x/4x", icon: Maximize2, color: "text-neon-magenta" },
  { id: "colorize", label: "AI Colorizer", icon: Palette, color: "text-amber-400" },
  { id: "style", label: "Style Transfer", icon: Droplets, color: "text-neon-violet" },
  { id: "object", label: "Object Remover", icon: Scissors, color: "text-red-400" },
  { id: "extend", label: "Image Extender", icon: Maximize2, color: "text-neon-cyan" },
];

const STYLE_PRESETS = [
  { id: "none", label: "Original" },
  { id: "vintage", label: "Vintage Film" },
  { id: "cyberpunk", label: "Cyberpunk Neon" },
  { id: "noir", label: "Noir B&W" },
  { id: "pastel", label: "Pastel Dream" },
  { id: "hdr", label: "HDR Punch" },
  { id: "sketch", label: "Pencil Sketch" },
];

export default function PhotoLabPage() {
  const { success, error: toastError, info } = useToast();
  const [tool, setTool] = React.useState("bg");
  const [src, setSrc] = React.useState<string | null>(null);
  const [out, setOut] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [tolerance, setTolerance] = React.useState(42);
  const [enhanceLevel, setEnhanceLevel] = React.useState(1);
  const [style, setStyle] = React.useState("cyberpunk");
  const [extendPx, setExtendPx] = React.useState(120);
  const [brush, setBrush] = React.useState(30);
  const imgRef = React.useRef<HTMLImageElement | null>(null);

  const load = (file: File) => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    setOut(null);
    const img = new Image();
    img.onload = () => (imgRef.current = img);
    img.src = url;
  };

  const canvasOf = (img: HTMLImageElement) => {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    c.getContext("2d")!.drawImage(img, 0, 0);
    return c;
  };

  const finish = (canvas: HTMLCanvasElement, msg: string) => {
    setOut(canvas.toDataURL("image/png"));
    success("Selesai!", msg);
  };

  /* --------------------------- BG REMOVER --------------------------- */
  const removeBg = async () => {
    if (!imgRef.current) return;
    setBusy(true);
    try {
      // 1) coba API dulu (remove.bg / clipdrop)
      const blob = await fetch(imgRef.current.src).then((x) => x.blob());
      const fd = new FormData();
      fd.append("image", blob, "image.png");
      const r = await fetch("/api/photo/remove-bg", { method: "POST", body: fd });
      if (r.ok) {
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          const c = canvasOf(img);
          setOut(c.toDataURL("image/png"));
          success("Selesai!", "Background dihapus pakai API (kualitas tinggi).");
        };
        img.src = url;
        setBusy(false);
        return;
      }
      // 2) fallback: magic wand di browser
      const canvas = canvasOf(imgRef.current);
      magicWandRemove(canvas, tolerance);
      finish(canvas, "Background dihapus secara lokal (magic wand). Cocok buat background polos.");
    } catch (e: any) {
      toastError("Gagal", e.message);
    } finally {
      setBusy(false);
    }
  };

  /* ---------------------------- ENHANCER ---------------------------- */
  const enhance = () => {
    if (!imgRef.current) return;
    const canvas = canvasOf(imgRef.current);
    autoLevels(canvas.getContext("2d")!, canvas.width, canvas.height);
    sharpenCanvas(canvas.getContext("2d")!, canvas.width, canvas.height, enhanceLevel);
    finish(canvas, "Kontras, brightness & ketajaman diperbaiki.");
  };

  /* ---------------------------- UPSCALE ----------------------------- */
  const upscale = (factor: 2 | 4) => {
    if (!imgRef.current) return;
    setBusy(true);
    setTimeout(() => {
      const img = imgRef.current!;
      const c = document.createElement("canvas");
      c.width = img.naturalWidth * factor;
      c.height = img.naturalHeight * factor;
      const ctx = c.getContext("2d")!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, c.width, c.height);
      sharpenCanvas(ctx, c.width, c.height, 1);
      setBusy(false);
      finish(c, `Upscale ${factor}x → ${c.width}×${c.height} px`);
    }, 30);
  };

  /* --------------------------- COLORIZER ---------------------------- */
  const colorize = async () => {
    if (!imgRef.current) return;
    setBusy(true);
    try {
      const blob = await fetch(imgRef.current.src).then((x) => x.blob());
      const fd = new FormData();
      fd.append("image", blob, "image.png");
      const r = await fetch("/api/photo/colorize", { method: "POST", body: fd });
      if (r.ok) {
        const b = await r.blob();
        const url = URL.createObjectURL(b);
        const img = new Image();
        img.onload = () => finish(canvasOf(img), "Diwarnai pakai model AI (Replicate).");
        img.src = url;
      } else {
        const j = await r.json().catch(() => ({}));
        // fallback: tint hangat biar nggak mentok
        const canvas = canvasOf(imgRef.current);
        sepiaTint(canvas.getContext("2d")!, canvas.width, canvas.height);
        finish(canvas, j.error || "Model colorize belum aktif — hasil pakai pewarnaan lokal (tint).");
      }
    } catch (e: any) {
      toastError("Gagal", e.message);
    } finally {
      setBusy(false);
    }
  };

  /* -------------------------- STYLE TRANSFER ------------------------ */
  const applyStyle = () => {
    if (!imgRef.current) return;
    const canvas = canvasOf(imgRef.current);
    styleFilter(canvas.getContext("2d")!, canvas.width, canvas.height, style);
    finish(canvas, `Style "${style}" diterapkan.`);
  };

  /* ------------------------- OBJECT REMOVER ------------------------- */
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [painting, setPainting] = React.useState(false);
  const [hasMask, setHasMask] = React.useState(false);
  const maskRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    if (tool !== "object" || !src || !canvasRef.current) return;
    const img = imgRef.current!;
    const c = canvasRef.current;
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const m = document.createElement("canvas");
    m.width = c.width;
    m.height = c.height;
    maskRef.current = m;
    setHasMask(false);
  }, [tool, src]);

  const paint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!painting || !canvasRef.current) return;
    const c = canvasRef.current;
    const rect = c.getBoundingClientRect();
    const scaleX = c.width / rect.width;
    const scaleY = c.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "rgba(255,0,229,0.55)";
    ctx.beginPath();
    ctx.arc(x, y, brush * scaleX * 0.5, 0, Math.PI * 2);
    ctx.fill();

    const mctx = maskRef.current!.getContext("2d")!;
    mctx.fillStyle = "#fff";
    mctx.beginPath();
    mctx.arc(x, y, brush * scaleX * 0.5, 0, Math.PI * 2);
    mctx.fill();
    setHasMask(true);
  };

  const removeObject = () => {
    if (!imgRef.current || !maskRef.current) return;
    setBusy(true);
    setTimeout(() => {
      const canvas = canvasOf(imgRef.current!);
      patchFill(canvas, maskRef.current!);
      setBusy(false);
      finish(canvas, "Objek dihapus (patch fill). Makin kecil objeknya, makin rapi hasilnya.");
    }, 30);
  };

  /* ------------------------- IMAGE EXTENDER ------------------------- */
  const extend = () => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    const c = document.createElement("canvas");
    c.width = img.naturalWidth + extendPx * 2;
    c.height = img.naturalHeight + extendPx * 2;
    const ctx = c.getContext("2d")!;
    // mirror edges
    const base = canvasOf(img);
    ctx.drawImage(base, extendPx, extendPx);
    // atas
    ctx.save();
    ctx.translate(0, extendPx * 2);
    ctx.scale(1, -1);
    ctx.drawImage(base, extendPx, 0, img.naturalWidth, extendPx);
    ctx.restore();
    // bawah
    ctx.save();
    ctx.translate(0, extendPx + img.naturalHeight);
    ctx.scale(1, -1);
    ctx.drawImage(base, extendPx, img.naturalHeight - extendPx, img.naturalWidth, extendPx);
    ctx.restore();
    // kiri
    ctx.save();
    ctx.translate(extendPx * 2, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(base, 0, extendPx, extendPx, img.naturalHeight);
    ctx.restore();
    // kanan
    ctx.save();
    ctx.translate(extendPx + img.naturalWidth, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(base, img.naturalWidth - extendPx, extendPx, extendPx, img.naturalHeight);
    ctx.restore();

    // blur halus biar sambungan nggak kelihatan
    ctx.filter = "blur(6px)";
    ctx.drawImage(c, 0, 0);
    ctx.filter = "none";
    ctx.drawImage(base, extendPx, extendPx);

    finish(c, `Gambar diperluas ${extendPx}px tiap sisi → ${c.width}×${c.height}`);
  };

  const download = (url: string, name: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  };

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-6 sm:px-5">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-black sm:text-3xl">
          Photo <span className="text-gradient">Lab AI</span>
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          7 tool editing: hapus background, enhance, upscale, colorize, style transfer, hapus objek & perluas gambar.
        </p>
      </div>

      <Tabs tabs={TOOLS.map((t) => ({ id: t.id, label: t.label }))} active={tool} onChange={setTool} className="mb-5" />

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        {/* --------------------------- CONTROLS --------------------------- */}
        <Card className="h-fit space-y-4 p-4">
          <div className="rounded-xl border border-dashed border-border p-4 text-center">
            <Upload className="mx-auto h-6 w-6 text-neon-cyan" />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && load(e.target.files[0])}
              className="mt-2 w-full text-xs"
            />
          </div>

          {tool === "bg" && (
            <>
              <div className="space-y-1.5">
                <Label>Tolerance: {tolerance}</Label>
                <input type="range" min={5} max={120} value={tolerance} onChange={(e) => setTolerance(Number(e.target.value))} className="w-full accent-neon-cyan" />
              </div>
              <Button variant="neon" className="w-full gap-2" onClick={removeBg} loading={busy}>
                <Eraser className="h-4 w-4" /> Hapus Background
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Pakai remove.bg/clipdrop API kalau key-nya diset; kalau nggak, pakai magic wand lokal (cocok buat background polos).
              </p>
            </>
          )}

          {tool === "enhance" && (
            <>
              <div className="space-y-1.5">
                <Label>Sharpen level: {enhanceLevel}</Label>
                <input type="range" min={0} max={3} step={0.5} value={enhanceLevel} onChange={(e) => setEnhanceLevel(Number(e.target.value))} className="w-full accent-neon-lime" />
              </div>
              <Button variant="neon" className="w-full gap-2" onClick={enhance}>
                <Wand2 className="h-4 w-4" /> Enhance Sekarang
              </Button>
            </>
          )}

          {tool === "upscale" && (
            <>
              <Button variant="neon" className="w-full gap-2" onClick={() => upscale(2)} loading={busy}>
                <Maximize2 className="h-4 w-4" /> Upscale 2x
              </Button>
              <Button variant="outline" className="w-full gap-2" onClick={() => upscale(4)} loading={busy}>
                <Maximize2 className="h-4 w-4" /> Upscale 4x
              </Button>
              <p className="text-[11px] text-muted-foreground">Upscale + sharpen di browser. Cocok buat foto & hasil generate AI.</p>
            </>
          )}

          {tool === "colorize" && (
            <>
              <Button variant="neon" className="w-full gap-2" onClick={colorize} loading={busy}>
                <Palette className="h-4 w-4" /> Warnai Foto
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Butuh REPLICATE_API_TOKEN buat model DeOldify/DDColor. Tanpa itu, hasilnya pewarnaan tint sederhana.
              </p>
            </>
          )}

          {tool === "style" && (
            <>
              <div className="space-y-1.5">
                <Label>Preset style</Label>
                <Select value={style} onChange={(e) => setStyle(e.target.value)}>
                  {STYLE_PRESETS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </div>
              <Button variant="neon" className="w-full gap-2" onClick={applyStyle}>
                <Droplets className="h-4 w-4" /> Terapkan Style
              </Button>
            </>
          )}

          {tool === "object" && (
            <>
              <div className="space-y-1.5">
                <Label>Ukuran kuas: {brush}</Label>
                <input type="range" min={5} max={120} value={brush} onChange={(e) => setBrush(Number(e.target.value))} className="w-full accent-neon-magenta" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Kuas area yang mau dihapus di gambar (warna pink), lalu klik Hapus Objek.
              </p>
              <Button variant="neon" className="w-full gap-2" onClick={removeObject} loading={busy} disabled={!hasMask}>
                <Scissors className="h-4 w-4" /> Hapus Objek
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  if (canvasRef.current && imgRef.current) {
                    const c = canvasRef.current;
                    c.getContext("2d")!.drawImage(imgRef.current, 0, 0);
                    maskRef.current!.getContext("2d")!.clearRect(0, 0, c.width, c.height);
                    setHasMask(false);
                  }
                }}
              >
                <RefreshCcw className="h-3.5 w-3.5" /> Reset kuas
              </Button>
            </>
          )}

          {tool === "extend" && (
            <>
              <div className="space-y-1.5">
                <Label>Perluas tiap sisi: {extendPx}px</Label>
                <input type="range" min={20} max={400} step={10} value={extendPx} onChange={(e) => setExtendPx(Number(e.target.value))} className="w-full accent-neon-cyan" />
              </div>
              <Button variant="neon" className="w-full gap-2" onClick={extend}>
                <Maximize2 className="h-4 w-4" /> Perluas Gambar
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Outpainting mirror-edge (instan). Mau hasil generatif? Kirim ke AI Image Generator (img2img).
              </p>
            </>
          )}

          {out && (
            <Button variant="secondary" className="w-full gap-2" onClick={() => download(out, `photo-${tool}.png`)}>
              <Download className="h-4 w-4" /> Download Hasil
            </Button>
          )}
        </Card>

        {/* ---------------------------- PREVIEW ---------------------------- */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Original</p>
            {tool === "object" && src ? (
              <canvas
                ref={canvasRef}
                onMouseDown={() => setPainting(true)}
                onMouseUp={() => setPainting(false)}
                onMouseLeave={() => setPainting(false)}
                onMouseMove={paint}
                className="w-full cursor-crosshair rounded-2xl border border-border"
              />
            ) : src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt="original" className="w-full rounded-2xl border border-border" />
            ) : (
              <div className="grid aspect-square place-items-center rounded-2xl border border-dashed border-border text-xs text-muted-foreground">
                Upload gambar dulu
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Hasil {out && <Badge variant="neon">siap</Badge>}
            </p>
            {out ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={out} alt="result" className="w-full rounded-2xl border border-neon-cyan/40" />
            ) : (
              <div className="grid aspect-square place-items-center rounded-2xl border border-dashed border-border text-xs text-muted-foreground">
                Hasil muncul di sini
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================== CANVAS HELPERS ========================== */

/** Magic-wand background removal (flood fill dari tepi dengan tolerance). */
function magicWandRemove(canvas: HTMLCanvasElement, tol: number) {
  const ctx = canvas.getContext("2d")!;
  const w = canvas.width;
  const h = canvas.height;
  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;

  // warna referensi dari 4 sudut
  const corners = [
    getPx(data, w, 0, 0),
    getPx(data, w, w - 1, 0),
    getPx(data, w, 0, h - 1),
    getPx(data, w, w - 1, h - 1),
  ];
  const ref = corners.reduce((a, c) => [a[0] + c[0] / 4, a[1] + c[1] / 4, a[2] + c[2] / 4], [0, 0, 0]);

  const visited = new Uint8Array(w * h);
  const stack: number[] = [];
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x;
    if (visited[i]) return;
    visited[i] = 1;
    stack.push(i);
  };

  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }

  const t2 = tol * tol * 3;
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % w;
    const y = (i / w) | 0;
    const p = i * 4;
    const dr = data[p] - ref[0];
    const dg = data[p + 1] - ref[1];
    const db = data[p + 2] - ref[2];
    if (dr * dr + dg * dg + db * db > t2) continue;
    data[p + 3] = 0; // transparan
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  ctx.putImageData(img, 0, 0);
}

function getPx(data: Uint8ClampedArray, w: number, x: number, y: number) {
  const i = (y * w + x) * 4;
  return [data[i], data[i + 1], data[i + 2]];
}

/** Auto levels (kontras + brightness otomatis). */
function autoLevels(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const hist = new Array(256).fill(0);
  for (let i = 0; i < d.length; i += 4) hist[Math.round((d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114))]++;

  const total = (w * h) | 0;
  let acc = 0;
  let lo = 0;
  let hi = 255;
  const clip = total * 0.005;
  for (let i = 0; i < 256; i++) {
    acc += hist[i];
    if (acc > clip) {
      lo = i;
      break;
    }
  }
  acc = 0;
  for (let i = 255; i >= 0; i--) {
    acc += hist[i];
    if (acc > clip) {
      hi = i;
      break;
    }
  }
  if (hi - lo < 10) return;
  const scale = 255 / (hi - lo);
  for (let i = 0; i < d.length; i += 4) {
    d[i] = clamp((d[i] - lo) * scale);
    d[i + 1] = clamp((d[i + 1] - lo) * scale);
    d[i + 2] = clamp((d[i + 2] - lo) * scale);
  }
  ctx.putImageData(img, 0, 0);
}

function clamp(v: number) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

function sharpenCanvas(ctx: CanvasRenderingContext2D, w: number, h: number, level: number) {
  if (level <= 0) return;
  try {
    const img = ctx.getImageData(0, 0, w, h);
    const src = img.data;
    const copy = new Uint8ClampedArray(src);
    const k = [0, -level, 0, -level, 1 + 4 * level, -level, 0, -level, 0];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          for (let ky = 0; ky < 3; ky++)
            for (let kx = 0; kx < 3; kx++) {
              const idx = ((y + ky - 1) * w + (x + kx - 1)) * 4 + c;
              sum += copy[idx] * k[ky * 3 + kx];
            }
          src[(y * w + x) * 4 + c] = clamp(sum);
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  } catch {}
}

function sepiaTint(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    d[i] = clamp(lum * 1.07 + 12);
    d[i + 1] = clamp(lum * 0.98 + 4);
    d[i + 2] = clamp(lum * 0.85 - 6);
  }
  ctx.putImageData(img, 0, 0);
}

function styleFilter(ctx: CanvasRenderingContext2D, w: number, h: number, style: string) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i];
    let g = d[i + 1];
    let b = d[i + 2];
    switch (style) {
      case "vintage":
        r = clamp(r * 1.12 + 10);
        g = clamp(g * 1.02 + 4);
        b = clamp(b * 0.86 - 6);
        break;
      case "cyberpunk":
        r = clamp(r * 0.9 + b * 0.25);
        g = clamp(g * 0.75);
        b = clamp(b * 1.35 + 20);
        break;
      case "noir": {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        r = g = b = clamp(lum * 1.15);
        break;
      }
      case "pastel":
        r = clamp(r * 0.75 + 70);
        g = clamp(g * 0.78 + 68);
        b = clamp(b * 0.8 + 78);
        break;
      case "hdr":
        r = clamp((r - 128) * 1.5 + 128);
        g = clamp((g - 128) * 1.5 + 128);
        b = clamp((b - 128) * 1.5 + 128);
        break;
      case "sketch": {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const v = clamp(255 - lum);
        r = g = b = v > 200 ? 255 : v > 120 ? 180 : v > 60 ? 110 : 40;
        break;
      }
    }
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
  }
  ctx.putImageData(img, 0, 0);
}

/** Isi area mask pakai sampling piksel sekitar (patch fill sederhana). */
function patchFill(canvas: HTMLCanvasElement, mask: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  const w = canvas.width;
  const h = canvas.height;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const mctx = mask.getContext("2d")!;
  const mdata = mctx.getImageData(0, 0, w, h).data;

  const isMask = (x: number, y: number) => mdata[(y * w + x) * 4 + 3] > 40;
  const out = new Uint8ClampedArray(d);
  let changed = true;
  let iter = 0;

  while (changed && iter < 60) {
    changed = false;
    iter++;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = (y * w + x) * 4;
        if (!isMask(x, y)) continue;
        let r = 0;
        let g = 0;
        let b = 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (isMask(nx, ny)) continue;
            const j = (ny * w + nx) * 4;
            r += d[j];
            g += d[j + 1];
            b += d[j + 2];
            n++;
          }
        }
        if (n) {
          out[i] = r / n;
          out[i + 1] = g / n;
          out[i + 2] = b / n;
          changed = true;
        }
      }
    }
    // copy balik biar iterasi berikutnya makin merambat ke dalam
    for (let k = 0; k < d.length; k += 4) {
      if (mdata[k + 3] > 40) {
        d[k] = out[k];
        d[k + 1] = out[k + 1];
        d[k + 2] = out[k + 2];
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}
