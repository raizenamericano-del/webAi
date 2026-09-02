"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  Upload,
  Download,
  Loader2,
  Combine,
  Scissors,
  Minimize2,
  Table2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Label, Select, Badge, Tabs } from "@/components/ui";
import { useToast } from "@/components/toast";
import { decodeAudioFile, bufferToWavUrl, audioBufferToMp3Url, downloadBlobUrl } from "@/lib/media-client";

type Category = "pdf" | "image" | "video" | "audio" | "document";

export default function ConverterPage() {
  const [cat, setCat] = React.useState<Category>("pdf");

  return (
    <div className="mx-auto max-w-5xl px-3 py-6 sm:px-5">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-black sm:text-3xl">
          File <span className="text-gradient">Converter</span>
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          PDF · Gambar · Video · Audio · Dokumen — banyak yang diproses langsung di browser (file nggak dikirim ke server).
        </p>
      </div>

      <Tabs
        tabs={[
          { id: "pdf", label: "PDF Tools" },
          { id: "image", label: "Image" },
          { id: "video", label: "Video" },
          { id: "audio", label: "Audio" },
          { id: "document", label: "Document" },
        ]}
        active={cat}
        onChange={(id) => setCat(id as Category)}
        className="mb-5"
      />

      {cat === "pdf" && <PdfTools />}
      {cat === "image" && <ImageConverter />}
      {cat === "video" && <VideoConverter />}
      {cat === "audio" && <AudioConverter />}
      {cat === "document" && <DocumentConverter />}
    </div>
  );
}

function useFiles() {
  const [files, setFiles] = React.useState<File[]>([]);
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => setFiles(Array.from(e.target.files || []));
  return { files, setFiles, onPick };
}

/* ============================== PDF ============================== */
function PdfTools() {
  const { success, error: toastError, info } = useToast();
  const { files, onPick } = useFiles();
  const [busy, setBusy] = React.useState(false);
  const [splitFrom, setSplitFrom] = React.useState(1);
  const [splitTo, setSplitTo] = React.useState(2);

  const merge = async () => {
    if (files.length < 2) return toastError("Kurang file", "Pilih minimal 2 PDF.");
    setBusy(true);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const merged = await PDFDocument.create();
      for (const f of files) {
        const bytes = await f.arrayBuffer();
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = await merged.copyPages(doc, doc.getPageIndices());
        pages.forEach((p) => merged.addPage(p));
      }
      const out = await merged.save();
      const url = URL.createObjectURL(new Blob([out as any], { type: "application/pdf" }));
      downloadBlobUrl(url, "merged.pdf");
      success("Selesai!", `${files.length} PDF digabung.`);
    } catch (e: any) {
      toastError("Gagal", e.message);
    } finally {
      setBusy(false);
    }
  };

  const split = async () => {
    if (!files[0]) return toastError("File kosong", "Pilih 1 PDF dulu.");
    setBusy(true);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const doc = await PDFDocument.load(await files[0].arrayBuffer(), { ignoreEncryption: true });
      const total = doc.getPageCount();
      const to = Math.min(splitTo || total, total);
      const newDoc = await PDFDocument.create();
      const pages = await newDoc.copyPages(
        doc,
        Array.from({ length: to - splitFrom + 1 }, (_, i) => splitFrom - 1 + i),
      );
      pages.forEach((p) => newDoc.addPage(p));
      const out = await newDoc.save();
      downloadBlobUrl(URL.createObjectURL(new Blob([out as any], { type: "application/pdf" })), `split-${splitFrom}-${to}.pdf`);
      success("Selesai!", `Halaman ${splitFrom}-${to} dari ${total} diekstrak.`);
    } catch (e: any) {
      toastError("Gagal", e.message);
    } finally {
      setBusy(false);
    }
  };

  const compress = async () => {
    if (!files[0]) return toastError("File kosong", "Pilih 1 PDF dulu.");
    setBusy(true);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const doc = await PDFDocument.load(await files[0].arrayBuffer(), { ignoreEncryption: true });
      doc.setTitle("");
      doc.setSubject("");
      doc.setKeywords([]);
      doc.setProducer("");
      doc.setCreator("");
      const out = await doc.save({ useObjectStreams: true, addDefaultPage: false });
      const before = files[0].size;
      const blob = new Blob([out as any], { type: "application/pdf" });
      downloadBlobUrl(URL.createObjectURL(blob), "compressed.pdf");
      const pct = Math.max(0, Math.round((1 - blob.size / before) * 100));
      success("Selesai!", `${(before / 1024).toFixed(0)}KB → ${(blob.size / 1024).toFixed(0)}KB (${pct}% lebih kecil)`);
    } catch (e: any) {
      toastError("Gagal", e.message);
    } finally {
      setBusy(false);
    }
  };

  const toPdfServer = async (mode: string, name: string) => {
    if (!files[0]) return toastError("File kosong", "Pilih file dulu.");
    setBusy(true);
    const fd = new FormData();
    fd.append("file", files[0]);
    fd.append("mode", mode);
    try {
      const r = await fetch("/api/convert", { method: "POST", body: fd });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
      const blob = await r.blob();
      downloadBlobUrl(URL.createObjectURL(blob), `${files[0].name.replace(/\.\w+$/, "")}.${name}`);
      success("Selesai!", "File terunduh.");
    } catch (e: any) {
      toastError("Gagal", e.message);
    } finally {
      setBusy(false);
    }
  };

  const imagesToPdf = async () => {
    if (!files.length) return toastError("File kosong", "Pilih gambar dulu.");
    setBusy(true);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const doc = await PDFDocument.create();
      for (const f of files) {
        const bytes = new Uint8Array(await f.arrayBuffer());
        const isPng = /png/i.test(f.type) || /\.png$/i.test(f.name);
        const img = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
        const page = doc.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      }
      const out = await doc.save();
      downloadBlobUrl(URL.createObjectURL(new Blob([out as any], { type: "application/pdf" })), "images.pdf");
      success("Selesai!", `${files.length} gambar → 1 PDF.`);
    } catch (e: any) {
      toastError("Gagal", e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-neon-cyan" /> PDF Tools
        </CardTitle>
        <CardDescription>Merge, split, compress, images→PDF, PDF→TXT/DOCX — tanpa upload ke server (kecuali konversi dokumen).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input type="file" accept=".pdf,image/*" multiple onChange={onPick} className="w-full text-xs" />
        {!!files.length && (
          <p className="text-[11px] text-muted-foreground">
            {files.length} file: {files.map((f) => f.name).join(", ").slice(0, 120)}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Button variant="outline" onClick={merge} loading={busy} className="gap-2">
            <Combine className="h-4 w-4" /> Merge PDF
          </Button>

          <div className="space-y-2 rounded-xl border border-border p-3">
            <Label>Split halaman</Label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={splitFrom}
                onChange={(e) => setSplitFrom(Number(e.target.value))}
                className="h-9 w-20 rounded-lg border border-input bg-background px-2 text-sm"
              />
              <span className="text-xs text-muted-foreground">s/d</span>
              <input
                type="number"
                min={1}
                value={splitTo}
                onChange={(e) => setSplitTo(Number(e.target.value))}
                className="h-9 w-20 rounded-lg border border-input bg-background px-2 text-sm"
              />
              <Button size="sm" onClick={split} loading={busy} className="gap-1">
                <Scissors className="h-3.5 w-3.5" /> Split
              </Button>
            </div>
          </div>

          <Button variant="outline" onClick={compress} loading={busy} className="gap-2">
            <Minimize2 className="h-4 w-4" /> Compress PDF
          </Button>

          <Button variant="outline" onClick={imagesToPdf} loading={busy} className="gap-2">
            <FileImage className="h-4 w-4" /> Images → PDF
          </Button>

          <Button variant="outline" onClick={() => toPdfServer("pdf-text", "txt")} loading={busy} className="gap-2">
            <FileText className="h-4 w-4" /> PDF → TXT
          </Button>

          <Button variant="outline" onClick={() => toPdfServer("pdf-docx", "docx")} loading={busy} className="gap-2">
            <Table2 className="h-4 w-4" /> PDF → DOCX
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================= IMAGE ============================= */
function ImageConverter() {
  const { success, error: toastError } = useToast();
  const [file, setFile] = React.useState<File | null>(null);
  const [format, setFormat] = React.useState("image/png");
  const [quality, setQuality] = React.useState(0.92);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const convert = async () => {
    if (!file) return toastError("File kosong", "Pilih gambar dulu.");
    setBusy(true);
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0);

      let url: string;
      let ext = format.split("/")[1];

      if (format === "image/x-icon") {
        // ICO: bungkus PNG 256px ke dalam container ICO
        const size = 256;
        const c2 = document.createElement("canvas");
        c2.width = c2.height = size;
        c2.getContext("2d")!.drawImage(bitmap, 0, 0, size, size);
        const pngBytes = new Uint8Array(
          await new Promise<ArrayBuffer>((res) => c2.toBlob((b) => b!.arrayBuffer().then(res), "image/png")),
        );
        const ico = buildIco(pngBytes, size);
        url = URL.createObjectURL(new Blob([ico], { type: "image/x-icon" }));
        ext = "ico";
      } else {
        url = canvas.toDataURL(format, quality);
        if (!url.startsWith("data:")) throw new Error("Format nggak didukung browser ini.");
      }

      setPreview(url);
      downloadBlobUrl(url, `converted.${ext}`);
      success("Selesai!", `Gambar jadi ${ext.toUpperCase()}`);
    } catch (e: any) {
      toastError("Gagal", e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileImage className="h-4 w-4 text-neon-magenta" /> Image Converter
        </CardTitle>
        <CardDescription>JPG · PNG · WEBP · BMP · ICO — proses lokal di browser.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input type="file" accept="image/*,.svg" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-xs" />
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[160px] space-y-1.5">
            <Label>Format</Label>
            <Select value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="image/png">PNG</option>
              <option value="image/jpeg">JPG</option>
              <option value="image/webp">WEBP</option>
              <option value="image/bmp">BMP</option>
              <option value="image/x-icon">ICO</option>
            </Select>
          </div>
          <div className="min-w-[160px] flex-1 space-y-1.5">
            <Label>Kualitas: {Math.round(quality * 100)}%</Label>
            <input type="range" min={0.3} max={1} step={0.02} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="w-full accent-neon-magenta" />
          </div>
          <Button variant="neon" onClick={convert} loading={busy} className="gap-2">
            <Download className="h-4 w-4" /> Konversi
          </Button>
        </div>
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="preview" className="max-h-64 rounded-xl border border-border" />
        )}
      </CardContent>
    </Card>
  );
}

function buildIco(png: Uint8Array, size: number) {
  const header = new Uint8Array(6);
  new DataView(header.buffer).setUint16(0, 0, true);
  new DataView(header.buffer).setUint16(2, 1, true);
  new DataView(header.buffer).setUint16(4, 1, true);

  const entry = new Uint8Array(16);
  const dv = new DataView(entry.buffer);
  dv.setUint8(0, size >= 256 ? 0 : size);
  dv.setUint8(1, size >= 256 ? 0 : size);
  dv.setUint8(2, 0);
  dv.setUint8(3, 0);
  dv.setUint16(4, 1, true);
  dv.setUint16(6, 32, true);
  dv.setUint32(8, png.length, true);
  dv.setUint32(12, 6 + 16, true);

  const out = new Uint8Array(6 + 16 + png.length);
  out.set(header, 0);
  out.set(entry, 6);
  out.set(png, 22);
  return out;
}

/* ============================= VIDEO ============================= */
function VideoConverter() {
  const { success, error: toastError, info } = useToast();
  const [file, setFile] = React.useState<File | null>(null);
  const [format, setFormat] = React.useState("video/webm");
  const [busy, setBusy] = React.useState(false);
  const [outUrl, setOutUrl] = React.useState<string | null>(null);

  const convert = async () => {
    if (!file) return toastError("File kosong", "Pilih video dulu.");
    setBusy(true);
    info("Konversi...", "Re-encode video di browser. Jangan tutup tab.");
    try {
      const video = document.createElement("video");
      video.src = URL.createObjectURL(file);
      video.muted = true;
      await new Promise((res) => (video.onloadedmetadata = res));

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d")!;
      const stream = canvas.captureStream(30);
      const candidates = [format, "video/webm;codecs=vp9", "video/webm", "video/mp4"];
      const mime = candidates.find((m) => MediaRecorder.isTypeSupported(m))!;
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 5_000_000 });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: mime });
        const url = URL.createObjectURL(blob);
        setOutUrl(url);
        downloadBlobUrl(url, `converted.${mime.includes("mp4") ? "mp4" : "webm"}`);
        success("Selesai!", "Video terkonversi.");
        setBusy(false);
      };
      const draw = () => {
        if (video.ended) return rec.stop();
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(draw);
      };
      await video.play();
      rec.start();
      draw();
    } catch (e: any) {
      toastError("Gagal", e.message);
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileVideo className="h-4 w-4 text-neon-lime" /> Video Converter
        </CardTitle>
        <CardDescription>Re-encode ke WEBM / MP4 langsung di browser (WEBM paling aman, MP4 tergantung browser).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-xs" />
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[160px] space-y-1.5">
            <Label>Format</Label>
            <Select value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="video/webm">WEBM (VP9)</option>
              <option value="video/mp4">MP4 (H.264)</option>
            </Select>
          </div>
          <Button variant="neon" onClick={convert} loading={busy} className="gap-2">
            <Download className="h-4 w-4" /> Konversi
          </Button>
        </div>
        {outUrl && <video src={outUrl} controls className="w-full rounded-xl" />}
      </CardContent>
    </Card>
  );
}

/* ============================= AUDIO ============================= */
function AudioConverter() {
  const { success, error: toastError, info } = useToast();
  const [file, setFile] = React.useState<File | null>(null);
  const [format, setFormat] = React.useState("mp3");
  const [busy, setBusy] = React.useState(false);

  const convert = async () => {
    if (!file) return toastError("File kosong", "Pilih audio dulu.");
    setBusy(true);
    info("Konversi...", `Ke ${format.toUpperCase()}.`);
    try {
      const buffer = await decodeAudioFile(file);
      let url: string;
      if (format === "wav") url = bufferToWavUrl(buffer);
      else if (format === "mp3") url = await audioBufferToMp3Url(buffer);
      else {
        // ogg/webm via MediaRecorder
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const dest = ctx.createMediaStreamDestination();
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(dest);
        const mime = format === "ogg" ? "audio/ogg" : "audio/webm";
        const rec = new MediaRecorder(dest.stream, { mimeType: MediaRecorder.isTypeSupported(mime) ? mime : "audio/webm" });
        const chunks: Blob[] = [];
        rec.ondataavailable = (e) => chunks.push(e.data);
        rec.onstop = () => {
          downloadBlobUrl(URL.createObjectURL(new Blob(chunks, { type: rec.mimeType })), `converted.${format}`);
          success("Selesai!", "Audio terkonversi.");
          setBusy(false);
        };
        rec.start();
        src.start();
        src.onended = () => setTimeout(() => rec.stop(), 300);
        return;
      }
      downloadBlobUrl(url, `converted.${format}`);
      success("Selesai!", `Audio jadi ${format.toUpperCase()}`);
    } catch (e: any) {
      toastError("Gagal", e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileAudio className="h-4 w-4 text-neon-cyan" /> Audio Converter
        </CardTitle>
        <CardDescription>MP3 · WAV · OGG · WEBM — semua diproses lokal.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-xs" />
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[160px] space-y-1.5">
            <Label>Format</Label>
            <Select value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="mp3">MP3</option>
              <option value="wav">WAV</option>
              <option value="ogg">OGG</option>
              <option value="webm">WEBM</option>
            </Select>
          </div>
          <Button variant="neon" onClick={convert} loading={busy} className="gap-2">
            <Download className="h-4 w-4" /> Konversi
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* =========================== DOCUMENT ============================ */
function DocumentConverter() {
  const { success, error: toastError } = useToast();
  const [file, setFile] = React.useState<File | null>(null);
  const [mode, setMode] = React.useState("docx-pdf");
  const [busy, setBusy] = React.useState(false);

  const MODES = [
    { id: "docx-pdf", label: "Word (DOCX) → PDF", accept: ".docx" },
    { id: "docx-text", label: "Word (DOCX) → TXT", accept: ".docx" },
    { id: "xlsx-csv", label: "Excel (XLSX) → CSV", accept: ".xlsx,.xls" },
    { id: "csv-xlsx", label: "CSV → Excel (XLSX)", accept: ".csv" },
    { id: "xlsx-pdf", label: "Excel (XLSX) → PDF", accept: ".xlsx,.xls" },
  ];

  const convert = async () => {
    if (!file) return toastError("File kosong", "Pilih file dulu.");
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("mode", mode);
    try {
      const r = await fetch("/api/convert", { method: "POST", body: fd });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
      const blob = await r.blob();
      const ext = mode.endsWith("pdf") ? "pdf" : mode.endsWith("csv") ? "csv" : mode.endsWith("xlsx") ? "xlsx" : mode.endsWith("docx") ? "docx" : "txt";
      downloadBlobUrl(URL.createObjectURL(blob), `converted.${ext}`);
      success("Selesai!", "Dokumen terkonversi & terunduh.");
    } catch (e: any) {
      toastError("Gagal", e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-neon-violet" /> Document Converter
        </CardTitle>
        <CardDescription>Word / Excel / CSV — diproses server-side (tanpa menyimpan file).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Jenis konversi</Label>
          <Select value={mode} onChange={(e) => setMode(e.target.value)}>
            {MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </Select>
        </div>
        <input
          type="file"
          accept={MODES.find((m) => m.id === mode)?.accept}
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full text-xs"
        />
        <Button variant="neon" onClick={convert} loading={busy} className="gap-2">
          <Download className="h-4 w-4" /> Konversi Dokumen
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Konversi berbasis teks: isi dokumen diekstrak & disusun ulang (layout kompleks bisa berubah).
        </p>
      </CardContent>
    </Card>
  );
}
