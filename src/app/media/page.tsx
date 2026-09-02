"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Mic,
  AudioLines,
  Music4,
  Video,
  Scissors,
  Repeat,
  Play,
  Square,
  Loader2,
  Download,
  Upload,
  Volume2,
  FileAudio,
  Wand2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Textarea, Select, Label, Tabs, Badge, EmptyState } from "@/components/ui";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";
import { decodeAudioFile, bufferToWavUrl, audioBufferToMp3Url, downloadBlobUrl } from "@/lib/media-client";

const TABS = [
  { id: "tts", label: "Text → Speech" },
  { id: "stt", label: "Speech → Text" },
  { id: "music", label: "AI Music" },
  { id: "video", label: "AI Video" },
  { id: "voice", label: "Voice Clone" },
  { id: "trim", label: "Video Trimmer" },
  { id: "convert", label: "Audio Converter" },
];

export default function MediaPage() {
  const [tab, setTab] = React.useState("tts");

  return (
    <div className="mx-auto max-w-5xl px-3 py-6 sm:px-5">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-black sm:text-3xl">
          Media <span className="text-gradient">Studio</span>
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Text-to-speech, speech-to-text, AI music, AI video, voice cloning, trimmer & konverter audio — semua di satu tempat.
        </p>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} className="mb-5" />

      {tab === "tts" && <TextToSpeech />}
      {tab === "stt" && <SpeechToText />}
      {tab === "music" && <MusicGenerator />}
      {tab === "video" && <VideoGenerator />}
      {tab === "voice" && <VoiceClone />}
      {tab === "trim" && <VideoTrimmer />}
      {tab === "convert" && <AudioConverter />}
    </div>
  );
}

/* ============================ TTS ============================ */
const VOICES = [
  { id: "21m00Tcm4TlvDq8ikWAM", label: "Rachel (Female, US)" },
  { id: "AZnzlk1XvdvUeBnXmlld", label: "Domi (Female, US)" },
  { id: "EXAVITQu4vr4xnSDxMaL", label: "Bella (Female, US)" },
  { id: "ErXwobaYiN019PkySvjV", label: "Antoni (Male, US)" },
  { id: "VR6AewLTigWG4xSOukaG", label: "Arnold (Male, US)" },
  { id: "pNInz6obpgDQGcFmaJgB", label: "Adam (Male, US)" },
];

function TextToSpeech() {
  const { success, error: toastError, info } = useToast();
  const [text, setText] = React.useState("Halo! Gue AI dari Neural Studio. Semoga hari lu menyenangkan.");
  const [voice, setVoice] = React.useState(VOICES[0].id);
  const [loading, setLoading] = React.useState(false);
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);

  const generate = async () => {
    if (!text.trim()) return toastError("Teks kosong", "Tulis dulu teksnya.");
    setLoading(true);
    try {
      const r = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceId: voice }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        // fallback browser TTS
        speakBrowser(text);
        info("Pakai suara browser", j.error || "ElevenLabs belum dikonfigurasi.");
        return;
      }
      const blob = await r.blob();
      setAudioUrl(URL.createObjectURL(blob));
      success("Selesai!", "Audio siap diputar & diunduh.");
    } catch (e: any) {
      speakBrowser(text);
      toastError("Gagal", e.message);
    } finally {
      setLoading(false);
    }
  };

  const speakBrowser = (t: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = "id-ID";
    window.speechSynthesis.speak(u);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-neon-cyan" /> Text-to-Speech
        </CardTitle>
        <CardDescription>
          ElevenLabs (voices premium) — kalau key belum di-set, otomatis pakai suara bawaan browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-[120px]" maxLength={2000} />
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1 space-y-1.5">
            <Label>Voice</Label>
            <Select value={voice} onChange={(e) => setVoice(e.target.value)}>
              {VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </Select>
          </div>
          <Button variant="neon" onClick={generate} loading={loading} className="gap-2">
            {!loading && <AudioLines className="h-4 w-4" />} Generate Audio
          </Button>
          <Button variant="outline" onClick={() => speakBrowser(text)} className="gap-2">
            <Play className="h-4 w-4" /> Preview Browser
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">{text.length}/2000 karakter</p>

        {audioUrl && (
          <div className="space-y-2 rounded-xl border border-border bg-secondary/30 p-3">
            <audio src={audioUrl} controls className="w-full" />
            <Button
              variant="secondary"
              className="gap-2"
              onClick={() => {
                const a = document.createElement("a");
                a.href = audioUrl!;
                a.download = "neural-tts.mp3";
                a.click();
              }}
            >
              <Download className="h-4 w-4" /> Download MP3
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ============================ STT ============================ */
function SpeechToText() {
  const { success, error: toastError, info } = useToast();
  const [recording, setRecording] = React.useState(false);
  const [text, setText] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const recRef = React.useRef<MediaRecorder | null>(null);
  const chunks = React.useRef<Blob[]>([]);
  const [mode, setMode] = React.useState<"whisper" | "browser">("whisper");

  const start = async () => {
    setText("");
    if (mode === "browser") {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) return toastError("Nggak didukung", "Browser lu nggak punya Web Speech API. Pakai mode Whisper.");
      const r = new SR();
      r.lang = "id-ID";
      r.continuous = true;
      r.interimResults = true;
      r.onresult = (e: any) => {
        let t = "";
        for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
        setText(t);
      };
      r.start();
      setRecording(true);
      (window as any).__sr = r;
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream);
    chunks.current = [];
    rec.ondataavailable = (e) => chunks.current.push(e.data);
    rec.onstop = async () => {
      setLoading(true);
      const fd = new FormData();
      fd.append("file", new Blob(chunks.current, { type: "audio/webm" }), "audio.webm");
      try {
        const r = await fetch("/api/transcribe", { method: "POST", body: fd });
        const j = await r.json();
        if (!j.ok) throw new Error(j.error);
        setText(j.text);
        success("Selesai", "Teks berhasil ditranskrip.");
      } catch (e: any) {
        toastError("Gagal", e.message);
      } finally {
        setLoading(false);
        stream.getTracks().forEach((t) => t.stop());
      }
    };
    recRef.current = rec;
    rec.start();
    setRecording(true);
  };

  const stop = () => {
    if (mode === "browser") {
      (window as any).__sr?.stop();
      setRecording(false);
      return;
    }
    recRef.current?.stop();
    setRecording(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-4 w-4 text-neon-magenta" /> Speech-to-Text
        </CardTitle>
        <CardDescription>Whisper large-v3 lewat Groq (akurat, multi-bahasa) atau Web Speech API browser.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs
          tabs={[
            { id: "whisper", label: "Whisper (Groq)" },
            { id: "browser", label: "Browser (live)" },
          ]}
          active={mode}
          onChange={(id) => setMode(id as any)}
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button variant={recording ? "danger" : "neon"} onClick={recording ? stop : start} className="gap-2">
            {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {recording ? "Stop & Transkrip" : "Mulai Rekam"}
          </Button>
          {loading && <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> memproses...</span>}
          {recording && <span className="flex items-center gap-1.5 text-xs text-destructive"><span className="h-2 w-2 animate-pulse rounded-full bg-destructive" /> REC</span>}
        </div>

        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Hasil transkrip muncul di sini..." className="min-h-[140px]" />

        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              navigator.clipboard.writeText(text);
              success("Disalin", "Teks masuk ke clipboard.");
            }}
          >
            Copy
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              const blob = new Blob([text], { type: "text/plain" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "transcript.txt";
              a.click();
            }}
          >
            <Download className="h-4 w-4" /> TXT
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              const blob = new Blob([JSON.stringify({ text, at: new Date().toISOString() }, null, 2)], { type: "application/json" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "transcript.json";
              a.click();
            }}
          >
            <Download className="h-4 w-4" /> JSON
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ======================= AI MUSIC / VIDEO ===================== */
function MusicGenerator() {
  const { info, error: toastError, success } = useToast();
  const [prompt, setPrompt] = React.useState("lofi hip hop beat, rainy night, warm piano, 90 bpm");
  const [loading, setLoading] = React.useState(false);
  const [out, setOut] = React.useState<any>(null);

  const gen = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/media/music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const j = await r.json();
      if (!j.ok) {
        info("Info", j.error || "Belum aktif.");
        setOut(j);
        return;
      }
      setOut(j);
      success("Selesai", "Lagu lu udah jadi.");
    } catch (e: any) {
      toastError("Gagal", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music4 className="h-4 w-4 text-neon-lime" /> AI Music Generator
        </CardTitle>
        <CardDescription>Butuh SUNO_API_KEY (atau key lu sendiri di Settings → provider `suno`).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Deskripsi lagu: genre, mood, tempo, instrumen..." />
        <Button variant="neon" onClick={gen} loading={loading} className="gap-2">
          {!loading && <Wand2 className="h-4 w-4" />} Bikin Lagu
        </Button>
        {out?.error && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
            <div className="mb-1 flex items-center gap-1.5 font-semibold"><Info className="h-3.5 w-3.5" /> Catatan</div>
            {out.error}
            {out.hint && <p className="mt-1 text-amber-200/80">{out.hint}</p>}
          </div>
        )}
        {out?.audioUrl && (
          <audio src={out.audioUrl} controls className="w-full" />
        )}
      </CardContent>
    </Card>
  );
}

function VideoGenerator() {
  const { info, success, error: toastError } = useToast();
  const [prompt, setPrompt] = React.useState("aerial shot of neon city at night, rain, cinematic");
  const [loading, setLoading] = React.useState(false);
  const [out, setOut] = React.useState<any>(null);

  const gen = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/media/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const j = await r.json();
      if (!j.ok) return info("Info", j.error);
      setOut(j);
      success("Selesai", "Video lu udah jadi.");
    } catch (e: any) {
      toastError("Gagal", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-4 w-4 text-neon-cyan" /> AI Video Generator
        </CardTitle>
        <CardDescription>Butuh RUNWAY_API_KEY atau PIKA_API_KEY (bisa di-set di Settings).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Deskripsikan video yang lu mau..." />
        <Button variant="neon" onClick={gen} loading={loading} className="gap-2">
          {!loading && <Wand2 className="h-4 w-4" />} Bikin Video
        </Button>
        {out?.error && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
            <div className="mb-1 flex items-center gap-1.5 font-semibold"><Info className="h-3.5 w-3.5" /> Catatan</div>
            {out.error}
          </div>
        )}
        {out?.videoUrl && <video src={out.videoUrl} controls className="w-full rounded-xl" />}
      </CardContent>
    </Card>
  );
}

/* ========================= VOICE CLONE ========================= */
function VoiceClone() {
  const { success, error: toastError, info } = useToast();
  const [name, setName] = React.useState("Suara gue");
  const [files, setFiles] = React.useState<File[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);

  const submit = async () => {
    if (!files.length) return toastError("File kosong", "Upload minimal 1 sampel suara (MP3/WAV).");
    setLoading(true);
    const fd = new FormData();
    fd.append("name", name);
    files.forEach((f) => fd.append("files", f));
    try {
      const r = await fetch("/api/media/voice-clone", { method: "POST", body: fd });
      const j = await r.json();
      if (!j.ok) return info("Info", j.error);
      setResult(j);
      success("Voice cloned!", `Voice ID: ${j.voiceId}`);
    } catch (e: any) {
      toastError("Gagal", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AudioLines className="h-4 w-4 text-neon-magenta" /> AI Voice Cloning
        </CardTitle>
        <CardDescription>ElevenLabs Instant Voice Cloning — upload 1-5 sampel suara (minimal 1 menit total).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama voice" />
        <input
          type="file"
          accept="audio/*"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
          className="w-full text-xs"
        />
        {files.length > 0 && <p className="text-[11px] text-muted-foreground">{files.length} file dipilih: {files.map((f) => f.name).join(", ")}</p>}
        <Button variant="neon" onClick={submit} loading={loading} className="gap-2">
          {!loading && <Upload className="h-4 w-4" />} Clone Suara
        </Button>
        {result?.voiceId && (
          <div className="rounded-xl border border-neon-lime/40 bg-neon-lime/5 p-3 text-xs">
            <p className="font-semibold text-neon-lime">Voice ID: {result.voiceId}</p>
            <p className="mt-1 text-muted-foreground">Tinggal tempel Voice ID ini ke Text-to-Speech buat dipakai.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ======================== VIDEO TRIMMER ======================== */
function VideoTrimmer() {
  const { success, error: toastError, info } = useToast();
  const [src, setSrc] = React.useState<string | null>(null);
  const [start, setStart] = React.useState(0);
  const [end, setEnd] = React.useState(10);
  const [duration, setDuration] = React.useState(0);
  const [processing, setProcessing] = React.useState(false);
  const [outUrl, setOutUrl] = React.useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setSrc(url);
    setOutUrl(null);
  };

  const trim = async () => {
    if (!src || !videoRef.current) return;
    setProcessing(true);
    info("Processing", "Potong video jalan di browser (re-encode). Jangan tutup tab.");
    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d")!;
      const stream = canvas.captureStream(30);
      const mimeType = ["video/webm;codecs=vp9", "video/webm", "video/mp4"].find((m) => MediaRecorder.isTypeSupported(m))!;
      const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        setOutUrl(URL.createObjectURL(blob));
        success("Selesai!", "Video udah dipotong.");
        setProcessing(false);
      };

      const draw = () => {
        if (video.currentTime >= end) {
          rec.stop();
          video.pause();
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(draw);
      };

      video.currentTime = start;
      video.muted = true;
      await video.play();
      rec.start();
      draw();
    } catch (e: any) {
      toastError("Gagal", e.message);
      setProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scissors className="h-4 w-4 text-neon-lime" /> Video Trimmer
        </CardTitle>
        <CardDescription>Potong video langsung di browser — file nggak pernah dikirim ke server.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <input type="file" accept="video/*" onChange={onFile} className="w-full text-xs" />
        {src && (
          <>
            <video
              ref={videoRef}
              src={src}
              controls
              className="w-full rounded-xl"
              onLoadedMetadata={(e) => {
                const d = (e.target as HTMLVideoElement).duration;
                setDuration(d);
                setEnd(Math.min(10, d));
              }}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Mulai (detik): {start.toFixed(1)}</Label>
                <input type="range" min={0} max={duration || 100} step={0.1} value={start} onChange={(e) => setStart(Number(e.target.value))} className="w-full accent-neon-cyan" />
              </div>
              <div className="space-y-1">
                <Label>Selesai (detik): {end.toFixed(1)}</Label>
                <input type="range" min={0} max={duration || 100} step={0.1} value={end} onChange={(e) => setEnd(Number(e.target.value))} className="w-full accent-neon-magenta" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">Durasi hasil: {(end - start).toFixed(1)} detik</p>
            <Button variant="neon" onClick={trim} loading={processing} className="gap-2">
              {!processing && <Scissors className="h-4 w-4" />} Potong Video
            </Button>
          </>
        )}

        {outUrl && (
          <div className="space-y-2 rounded-xl border border-border bg-secondary/30 p-3">
            <video src={outUrl} controls className="w-full rounded-lg" />
            <Button
              variant="secondary"
              className="gap-2"
              onClick={() => {
                const a = document.createElement("a");
                a.href = outUrl!;
                a.download = "trimmed-video.webm";
                a.click();
              }}
            >
              <Download className="h-4 w-4" /> Download Hasil
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ====================== AUDIO CONVERTER ======================== */
function AudioConverter() {
  const { success, error: toastError, info } = useToast();
  const [file, setFile] = React.useState<File | null>(null);
  const [format, setFormat] = React.useState("mp3");
  const [busy, setBusy] = React.useState(false);
  const [outUrl, setOutUrl] = React.useState<string | null>(null);

  const convert = async () => {
    if (!file) return toastError("File kosong", "Pilih file audio dulu.");
    setBusy(true);
    info("Konversi...", `Ke ${format.toUpperCase()} — diproses di browser.`);
    try {
      const audioBuffer = await decodeAudioFile(file);

      if (format === "wav") {
        setOutUrl(bufferToWavUrl(audioBuffer));
      } else if (format === "mp3") {
        setOutUrl(await audioBufferToMp3Url(audioBuffer));
      } else {
        // ogg/webm via MediaRecorder
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const dest = ctx.createMediaStreamDestination();
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(dest);
        const mime = format === "ogg" ? "audio/ogg" : "audio/webm";
        const rec = new MediaRecorder(dest.stream, { mimeType: MediaRecorder.isTypeSupported(mime) ? mime : "audio/webm" });
        const chunks: Blob[] = [];
        rec.ondataavailable = (e) => chunks.push(e.data);
        rec.onstop = () => {
          setOutUrl(URL.createObjectURL(new Blob(chunks, { type: rec.mimeType })));
          setBusy(false);
          success("Selesai", "Audio berhasil dikonversi.");
        };
        rec.start();
        source.start();
        source.onended = () => setTimeout(() => rec.stop(), 300);
        return;
      }
      success("Selesai", `Audio jadi ${format.toUpperCase()}.`);
    } catch (e: any) {
      toastError("Gagal konversi", e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Repeat className="h-4 w-4 text-neon-cyan" /> Audio Converter
        </CardTitle>
        <CardDescription>MP3 · WAV · OGG · WEBM — semua diproses lokal di browser lu.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-border p-4">
          <FileAudio className="h-8 w-8 text-neon-cyan" />
          <input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-xs" />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[150px] space-y-1.5">
            <Label>Format output</Label>
            <Select value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="mp3">MP3</option>
              <option value="wav">WAV</option>
              <option value="ogg">OGG</option>
              <option value="webm">WEBM</option>
            </Select>
          </div>
          <Button variant="neon" onClick={convert} loading={busy} className="gap-2">
            {!busy && <Repeat className="h-4 w-4" />} Konversi
          </Button>
        </div>
        {outUrl && (
          <div className="space-y-2 rounded-xl border border-border bg-secondary/30 p-3">
            <audio src={outUrl} controls className="w-full" />
            <Button
              variant="secondary"
              className="gap-2"
              onClick={() => {
                const a = document.createElement("a");
                a.href = outUrl!;
                a.download = `converted.${format}`;
                a.click();
              }}
            >
              <Download className="h-4 w-4" /> Download
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
