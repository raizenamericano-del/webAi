"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  QrCode,
  ScanLine,
  Link2,
  KeyRound,
  Dices,
  Ruler,
  Palette,
  Braces,
  Sparkles,
  Minimize2,
  Binary,
  Fingerprint,
  Copy,
  Check,
  Download,
  Upload,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Textarea, Label, Select, Badge, Tabs } from "@/components/ui";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";

const TOOLS = [
  { id: "qr", label: "QR Code", icon: QrCode, color: "text-neon-cyan" },
  { id: "qrscan", label: "QR Scanner", icon: ScanLine, color: "text-neon-lime" },
  { id: "short", label: "URL Shortener", icon: Link2, color: "text-neon-magenta" },
  { id: "password", label: "Password", icon: KeyRound, color: "text-neon-lime" },
  { id: "random", label: "Random Data", icon: Dices, color: "text-neon-violet" },
  { id: "unit", label: "Unit Converter", icon: Ruler, color: "text-neon-cyan" },
  { id: "color", label: "Color Picker", icon: Palette, color: "text-neon-magenta" },
  { id: "json", label: "JSON", icon: Braces, color: "text-neon-lime" },
  { id: "beautify", label: "Beautifier", icon: Sparkles, color: "text-neon-cyan" },
  { id: "minify", label: "Minifier", icon: Minimize2, color: "text-neon-magenta" },
  { id: "base64", label: "Base64", icon: Binary, color: "text-neon-violet" },
  { id: "hash", label: "Hash", icon: Fingerprint, color: "text-neon-lime" },
];

export default function ToolsPage() {
  const [tab, setTab] = React.useState("qr");

  return (
    <div className="mx-auto max-w-5xl px-3 py-6 sm:px-5">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-black sm:text-3xl">
          Utility <span className="text-gradient">Tools</span>
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          12 tool gratis & unlimited — sebagian besar jalan langsung di browser tanpa kirim data ke server.
        </p>
      </div>

      <Tabs tabs={TOOLS.map((t) => ({ id: t.id, label: t.label }))} active={tab} onChange={setTab} className="mb-5" />

      {tab === "qr" && <QrGenerator />}
      {tab === "qrscan" && <QrScanner />}
      {tab === "short" && <UrlShortener />}
      {tab === "password" && <PasswordGenerator />}
      {tab === "random" && <RandomData />}
      {tab === "unit" && <UnitConverter />}
      {tab === "color" && <ColorPicker />}
      {tab === "json" && <JsonTool />}
      {tab === "beautify" && <Beautifier />}
      {tab === "minify" && <Minifier />}
      {tab === "base64" && <Base64Tool />}
      {tab === "hash" && <HashGenerator />}
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = React.useState(false);
  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setOk(true);
        setTimeout(() => setOk(false), 1500);
      }}
      className="gap-1.5"
    >
      {ok ? <Check className="h-3.5 w-3.5 text-neon-lime" /> : <Copy className="h-3.5 w-3.5" />}
      {ok ? "Copied" : "Copy"}
    </Button>
  );
}

/* ============================ QR GENERATOR ============================ */
function QrGenerator() {
  const [text, setText] = React.useState("https://neuralai.studio");
  const [url, setUrl] = React.useState<string | null>(null);
  const [size, setSize] = React.useState(512);

  React.useEffect(() => {
    (async () => {
      const QRCode = (await import("qrcode")).default;
      const dataUrl = await QRCode.toDataURL(text || " ", { width: size, margin: 2, color: { dark: "#000000", light: "#ffffff" } });
      setUrl(dataUrl);
    })();
  }, [text, size]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-4 w-4 text-neon-cyan" /> QR Code Generator
        </CardTitle>
        <CardDescription>Bikin QR buat URL, teks, WiFi, apa aja. Langsung jadi PNG.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Isi teks / URL" className="min-h-[90px]" />
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label>Ukuran: {size}px</Label>
            <input type="range" min={128} max={1024} step={64} value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-40 accent-neon-cyan" />
          </div>
          {url && (
            <>
              <Button
                variant="neon"
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = url!;
                  a.download = "qrcode.png";
                  a.click();
                }}
                className="gap-2"
              >
                <Download className="h-4 w-4" /> Download PNG
              </Button>
              <CopyBtn text={text} />
            </>
          )}
        </div>
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="QR" className="mx-auto max-w-[280px] rounded-2xl border border-border bg-white p-2" />
        )}
      </CardContent>
    </Card>
  );
}

/* ============================= QR SCANNER ============================= */
function QrScanner() {
  const { success, error: toastError } = useToast();
  const [result, setResult] = React.useState("");
  const [scanning, setScanning] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const rafRef = React.useRef<number>(0);

  const stop = () => {
    cancelAnimationFrame(rafRef.current);
    const s = (videoRef.current?.srcObject as MediaStream) || null;
    s?.getTracks().forEach((t) => t.stop());
    setScanning(false);
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setScanning(true);
      const jsQR = (await import("jsqr")).default;
      const canvas = document.createElement("canvas");

      const tick = () => {
        const video = videoRef.current;
        if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(img.data, img.width, img.height);
        if (code?.data) {
          setResult(code.data);
          success("QR terdeteksi!", code.data.slice(0, 60));
          stop();
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      toastError("Kamera ditolak", "Izinkan akses kamera buat scan QR.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScanLine className="h-4 w-4 text-neon-lime" /> QR Code Scanner
        </CardTitle>
        <CardDescription>Scan QR pakai kamera HP/laptop. Deteksi berjalan lokal di browser.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <video ref={videoRef} className="w-full rounded-2xl border border-border bg-black" muted playsInline />
        <div className="flex gap-2">
          {!scanning ? (
            <Button variant="neon" onClick={start} className="gap-2">
              <ScanLine className="h-4 w-4" /> Mulai Scan
            </Button>
          ) : (
            <Button variant="danger" onClick={stop}>
              Stop
            </Button>
          )}
          {result && <CopyBtn text={result} />}
        </div>
        {result && (
          <div className="rounded-xl border border-neon-lime/40 bg-neon-lime/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-neon-lime">Hasil</p>
            <p className="break-all text-sm">{result}</p>
            {/^https?:\/\//i.test(result) && (
              <a href={result} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-neon-cyan hover:underline">
                Buka link →
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* =========================== URL SHORTENER ============================ */
function UrlShortener() {
  const { success, error: toastError } = useToast();
  const [url, setUrl] = React.useState("");
  const [code, setCode] = React.useState("");
  const [out, setOut] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, code }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setOut(j.shortUrl);
      success("Berhasil!", j.shortUrl);
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
          <Link2 className="h-4 w-4 text-neon-magenta" /> URL Shortener
        </CardTitle>
        <CardDescription>Pendekkan link pakai domain sendiri: {typeof window !== "undefined" ? window.location.origin : ""}/s/kode</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://link-yang-panjang-banget.com/..." className="h-11" />
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="kode custom (opsional)" />
        <Button variant="neon" onClick={submit} loading={busy} className="gap-2">
          <Link2 className="h-4 w-4" /> Pendekkan
        </Button>
        {out && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neon-magenta/40 bg-neon-magenta/5 p-3">
            <a href={out} target="_blank" rel="noreferrer" className="break-all text-sm text-neon-cyan hover:underline">
              {out}
            </a>
            <CopyBtn text={out} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ========================= PASSWORD GENERATOR ========================= */
function PasswordGenerator() {
  const [len, setLen] = React.useState(20);
  const [opt, setOpt] = React.useState({ upper: true, lower: true, num: true, sym: true });
  const [pw, setPw] = React.useState("");

  const gen = React.useCallback(() => {
    const sets: string[] = [];
    if (opt.upper) sets.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    if (opt.lower) sets.push("abcdefghijklmnopqrstuvwxyz");
    if (opt.num) sets.push("0123456789");
    if (opt.sym) sets.push("!@#$%^&*()-_=+[]{};:,.<>?/");
    if (!sets.length) return setPw("");
    const all = sets.join("");
    const bytes = new Uint32Array(len);
    crypto.getRandomValues(bytes);
    let out = "";
    // pastikan tiap set kepakai minimal 1
    sets.forEach((s) => (out += s[crypto.getRandomValues(new Uint32Array(1))[0] % s.length]));
    for (let i = out.length; i < len; i++) out += all[bytes[i] % all.length];
    setPw(out.split("").sort(() => Math.random() - 0.5).join(""));
  }, [len, opt]);

  React.useEffect(() => {
    gen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entropy = Math.round(len * Math.log2((opt.upper ? 26 : 0) + (opt.lower ? 26 : 0) + (opt.num ? 10 : 0) + (opt.sym ? 26 : 0) || 1));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-neon-lime" /> Password Generator
        </CardTitle>
        <CardDescription>Dibuat dengan Web Crypto (cryptographically secure random).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-black/40 p-4">
          <code className="flex-1 break-all font-mono text-sm text-neon-lime">{pw}</code>
          <CopyBtn text={pw} />
          <Button size="sm" variant="ghost" onClick={gen}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label>Panjang: {len}</Label>
          <input type="range" min={6} max={64} value={len} onChange={(e) => setLen(Number(e.target.value))} className="w-full accent-neon-lime" />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(opt) as (keyof typeof opt)[]).map((k) => (
            <button
              key={k}
              onClick={() => setOpt((o) => ({ ...o, [k]: !o[k] }))}
              className={cn(
                "rounded-lg border px-3 py-2 text-xs transition-colors",
                opt[k] ? "border-neon-lime/60 bg-neon-lime/10 text-neon-lime" : "border-border text-muted-foreground",
              )}
            >
              {k === "upper" ? "A-Z" : k === "lower" ? "a-z" : k === "num" ? "0-9" : "!@#$"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Estimasi entropi:</span>
          <Badge variant={entropy > 90 ? "lime" : entropy > 60 ? "neon" : "danger"}>{entropy} bit</Badge>
          <span className="text-muted-foreground">{entropy > 90 ? "(sangat kuat)" : entropy > 60 ? "(kuat)" : "(lemah)"}</span>
        </div>

        <Button variant="neon" onClick={gen} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Generate Ulang
        </Button>
      </CardContent>
    </Card>
  );
}

/* =========================== RANDOM DATA ============================== */
const FIRST = ["Andi", "Budi", "Citra", "Dewi", "Eka", "Fajar", "Gita", "Hadi", "Indah", "Joko", "Kirana", "Luki", "Maya", "Nanda", "Oscar", "Putri", "Rizky", "Sari", "Taufik", "Wulan"];
const LAST = ["Pratama", "Saputra", "Wijaya", "Kusuma", "Nugroho", "Santoso", "Halim", "Siregar", "Mahendra", "Anggraini", "Firmansyah", "Ramadhan"];
const DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "proton.me", "icloud.com"];
const STREETS = ["Jl. Sudirman", "Jl. Thamrin", "Jl. Gatot Subroto", "Jl. Diponegoro", "Jl. Ahmad Yani", "Jl. Pahlawan", "Jl. Merdeka"];
const CITIES = ["Jakarta", "Bandung", "Surabaya", "Yogyakarta", "Semarang", "Medan", "Makassar", "Denpasar", "Palembang", "Malang"];
const JOBS = ["Software Engineer", "Content Creator", "Digital Marketer", "UI Designer", "Data Analyst", "Teacher", "Doctor", "Entrepreneur"];

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function RandomData() {
  const [people, setPeople] = React.useState<any[]>([]);

  const gen = (n = 8) => {
    const out = Array.from({ length: n }).map(() => {
      const first = pick(FIRST);
      const last = pick(LAST);
      const name = `${first} ${last}`;
      const email = `${first.toLowerCase()}.${last.toLowerCase()}${Math.floor(Math.random() * 99)}@${pick(DOMAINS)}`;
      return {
        name,
        email,
        phone: `+62 8${Math.floor(10 + Math.random() * 89)}-${Math.floor(1000 + Math.random() * 8999)}-${Math.floor(1000 + Math.random() * 8999)}`,
        address: `${pick(STREETS)} No. ${Math.floor(1 + Math.random() * 200)}, ${pick(CITIES)}`,
        job: pick(JOBS),
        age: 18 + Math.floor(Math.random() * 45),
      };
    });
    setPeople(out);
  };

  React.useEffect(() => gen(8), []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dices className="h-4 w-4 text-neon-violet" /> Random Data Generator
        </CardTitle>
        <CardDescription>Nama, email, telepon, alamat, pekerjaan & umur buat dummy data / testing.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="neon" onClick={() => gen(8)} className="gap-2">
            <Dices className="h-4 w-4" /> Generate 8
          </Button>
          <Button variant="outline" onClick={() => gen(50)}>
            Generate 50
          </Button>
          {!!people.length && (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(people, null, 2)], { type: "application/json" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = "random-people.json";
                  a.click();
                }}
              >
                <Download className="h-4 w-4" /> JSON
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  const header = Object.keys(people[0]).join(",");
                  const rows = people.map((p) => Object.values(p).join(","));
                  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = "random-people.csv";
                  a.click();
                }}
              >
                <Download className="h-4 w-4" /> CSV
              </Button>
            </>
          )}
        </div>

        <div className="scroll-thin max-h-[420px] overflow-auto rounded-xl border border-border">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-secondary/80 backdrop-blur">
              <tr>
                {["Nama", "Email", "Telepon", "Alamat", "Pekerjaan", "Umur"].map((h) => (
                  <th key={h} className="px-3 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {people.map((p, i) => (
                <tr key={i} className="border-t border-border/60">
                  <td className="px-3 py-1.5">{p.name}</td>
                  <td className="px-3 py-1.5 text-neon-cyan">{p.email}</td>
                  <td className="px-3 py-1.5">{p.phone}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{p.address}</td>
                  <td className="px-3 py-1.5">{p.job}</td>
                  <td className="px-3 py-1.5">{p.age}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ========================== UNIT CONVERTER ============================ */
const UNITS: Record<string, { units: Record<string, number>; base?: string }> = {
  Panjang: { units: { mm: 0.001, cm: 0.01, m: 1, km: 1000, inch: 0.0254, ft: 0.3048, yard: 0.9144, mile: 1609.344 } },
  Massa: { units: { mg: 0.000001, g: 0.001, kg: 1, ton: 1000, oz: 0.0283495, lb: 0.453592 } },
  Suhu: { units: { C: 0, F: 0, K: 0 } },
  Data: { units: { B: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776 } },
  Waktu: { units: { detik: 1, menit: 60, jam: 3600, hari: 86400, minggu: 604800, bulan: 2629800, tahun: 31557600 } },
  Kecepatan: { units: { "m/s": 1, "km/h": 0.277778, mph: 0.44704, knot: 0.514444 } },
  Luas: { units: { "cm²": 0.0001, "m²": 1, "km²": 1000000, hektar: 10000, acre: 4046.86, "ft²": 0.092903 } },
  Volume: { units: { ml: 0.001, L: 1, "m³": 1000, "cm³": 0.001, galon: 3.78541, "ft³": 28.3168 } },
};

function UnitConverter() {
  const [cat, setCat] = React.useState("Panjang");
  const [from, setFrom] = React.useState("m");
  const [to, setTo] = React.useState("cm");
  const [val, setVal] = React.useState("1");

  const units = Object.keys(UNITS[cat].units);

  const convert = () => {
    const v = parseFloat(val);
    if (isNaN(v)) return "";
    if (cat === "Suhu") {
      let c = v;
      if (from === "F") c = ((v - 32) * 5) / 9;
      if (from === "K") c = v - 273.15;
      if (to === "C") return c.toFixed(4);
      if (to === "F") return ((c * 9) / 5 + 32).toFixed(4);
      return (c + 273.15).toFixed(4);
    }
    const base = v * UNITS[cat].units[from];
    const res = base / UNITS[cat].units[to];
    return String(Number(res.toPrecision(10)));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ruler className="h-4 w-4 text-neon-cyan" /> Unit Converter
        </CardTitle>
        <CardDescription>Panjang, massa, suhu, data, waktu, kecepatan, luas & volume.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select
          value={cat}
          onChange={(e) => {
            setCat(e.target.value);
            const u = Object.keys(UNITS[e.target.value].units);
            setFrom(u[0]);
            setTo(u[1] || u[0]);
          }}
        >
          {Object.keys(UNITS).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <div className="space-y-1.5">
            <Label>Dari</Label>
            <Input value={val} onChange={(e) => setVal(e.target.value)} type="number" />
            <Select value={from} onChange={(e) => setFrom(e.target.value)}>
              {units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </div>
          <div className="pb-9 text-2xl text-neon-cyan">=</div>
          <div className="space-y-1.5">
            <Label>Ke</Label>
            <Input value={convert()} readOnly className="font-mono text-neon-lime" />
            <Select value={to} onChange={(e) => setTo(e.target.value)}>
              {units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* =========================== COLOR PICKER ============================= */
function ColorPicker() {
  const [hex, setHex] = React.useState("#00f0ff");

  const hexToRgb = (h: string) => {
    const m = h.replace("#", "");
    const n = parseInt(m.length === 3 ? m.split("").map((c) => c + c).join("") : m, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  };
  const rgbToHsl = ({ r, g, b }: { r: number; g: number; b: number }) => {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const l = (max + min) / 2;
    let h = 0;
    let s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      h = max === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
      h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  };

  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb);

  const shades = Array.from({ length: 9 }).map((_, i) => {
    const f = 0.15 + i * 0.1;
    return `#${[rgb.r, rgb.g, rgb.b].map((c) => Math.round(Math.min(255, c * f + 255 * (1 - f) * 0.0)).toString(16).padStart(2, "0")).join("")}`;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-neon-magenta" /> Color Picker
        </CardTitle>
        <CardDescription>Pilih warna, dapet kode HEX / RGB / HSL + palet turunan.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <input type="color" value={hex} onChange={(e) => setHex(e.target.value)} className="h-20 w-28 cursor-pointer rounded-xl border border-border bg-transparent" />
          <Input value={hex} onChange={(e) => setHex(e.target.value)} className="w-32 font-mono" />
          <CopyBtn text={hex} />
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { label: "HEX", value: hex.toUpperCase() },
            { label: "RGB", value: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` },
            { label: "HSL", value: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-border p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.label}</p>
              <p className="font-mono text-sm text-neon-cyan">{c.value}</p>
              <CopyBtn text={c.value} />
            </div>
          ))}
        </div>

        <div>
          <Label>Palet turunan</Label>
          <div className="mt-1 flex overflow-hidden rounded-xl border border-border">
            {shades.map((s) => (
              <button key={s} onClick={() => setHex(s)} className="h-12 flex-1" style={{ background: s }} title={s} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================ JSON TOOLS ============================== */
function JsonTool() {
  const [input, setInput] = React.useState('{"nama":"Budi","umur":21,"hobi":["ngoding","kopi"]}');
  const [error, setError] = React.useState<string | null>(null);
  const [parsed, setParsed] = React.useState<string>("");

  const format = () => {
    try {
      const obj = JSON.parse(input);
      setParsed(JSON.stringify(obj, null, 2));
      setError(null);
    } catch (e: any) {
      setError(e.message);
      setParsed("");
    }
  };

  const minify = () => {
    try {
      setParsed(JSON.stringify(JSON.parse(input)));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Braces className="h-4 w-4 text-neon-lime" /> JSON Formatter & Validator
        </CardTitle>
        <CardDescription>Format (pretty print), minify & validasi JSON.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea value={input} onChange={(e) => setInput(e.target.value)} className="min-h-[160px] font-mono text-xs" />
        <div className="flex gap-2">
          <Button variant="neon" onClick={format}>
            Format
          </Button>
          <Button variant="outline" onClick={minify}>
            Minify
          </Button>
          <CopyBtn text={parsed || input} />
        </div>
        {error && <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">{error}</p>}
        {!error && parsed && (
          <>
            <pre className="scroll-thin max-h-80 overflow-auto rounded-xl border border-border bg-black/40 p-3 font-mono text-xs">{parsed}</pre>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <Badge variant="lime">valid</Badge>
              <span>{parsed.length} karakter</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ============================ BEAUTIFIER ============================== */
function Beautifier() {
  const [code, setCode] = React.useState('<div class="x"><p>hello</p></div>');
  const [lang, setLang] = React.useState("html");
  const [out, setOut] = React.useState("");

  const run = async () => {
    const beautify = await import("js-beautify");
    const fn: any = lang === "html" ? beautify.html : lang === "css" ? beautify.css : beautify.js;
    setOut(fn(code, { indent_size: 2, space_in_empty_paren: true }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-neon-cyan" /> Code Beautifier
        </CardTitle>
        <CardDescription>Rapikan HTML, CSS & JavaScript yang berantakan.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={lang} onChange={(e) => setLang(e.target.value)}>
          <option value="html">HTML</option>
          <option value="css">CSS</option>
          <option value="js">JavaScript</option>
        </Select>
        <Textarea value={code} onChange={(e) => setCode(e.target.value)} className="min-h-[160px] font-mono text-xs" />
        <Button variant="neon" onClick={run}>
          Beautify
        </Button>
        {out && (
          <>
            <pre className="scroll-thin max-h-80 overflow-auto rounded-xl border border-border bg-black/40 p-3 font-mono text-xs">{out}</pre>
            <CopyBtn text={out} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ============================= MINIFIER =============================== */
function Minifier() {
  const { error: toastError } = useToast();
  const [code, setCode] = React.useState("function halo(nama) {\n  console.log('Halo ' + nama);\n}\nhalo('Dunia');");
  const [lang, setLang] = React.useState("js");
  const [out, setOut] = React.useState("");

  const run = async () => {
    try {
      if (lang === "js") {
        const { minify } = await import("terser");
        const r = await minify(code, { compress: true, mangle: true });
        setOut(r.code || "");
      } else if (lang === "css") {
        setOut(
          code
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/\s+/g, " ")
            .replace(/\s*([{}:;,>])\s*/g, "$1")
            .replace(/;}/g, "}")
            .trim(),
        );
      } else {
        setOut(code.replace(/<!--[\s\S]*?-->/g, "").replace(/>\s+</g, "><").replace(/\s+/g, " ").trim());
      }
    } catch (e: any) {
      toastError("Gagal minify", e.message);
    }
  };

  const saved = out ? Math.round((1 - out.length / (code.length || 1)) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Minimize2 className="h-4 w-4 text-neon-magenta" /> Code Minifier
        </CardTitle>
        <CardDescription>JS (Terser), CSS & HTML — kecilkan ukuran file.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={lang} onChange={(e) => setLang(e.target.value)}>
          <option value="js">JavaScript</option>
          <option value="css">CSS</option>
          <option value="html">HTML</option>
        </Select>
        <Textarea value={code} onChange={(e) => setCode(e.target.value)} className="min-h-[160px] font-mono text-xs" />
        <Button variant="neon" onClick={run}>
          Minify
        </Button>
        {out && (
          <>
            <pre className="scroll-thin max-h-60 overflow-auto rounded-xl border border-border bg-black/40 p-3 font-mono text-xs">{out}</pre>
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="neon">-{saved}% ukuran</Badge>
              <span className="text-muted-foreground">
                {code.length} → {out.length} karakter
              </span>
              <CopyBtn text={out} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ============================== BASE64 ================================ */
function Base64Tool() {
  const [input, setInput] = React.useState("Halo Neural AI!");
  const [mode, setMode] = React.useState<"encode" | "decode">("encode");

  const output = React.useMemo(() => {
    try {
      if (mode === "encode") return btoa(unescape(encodeURIComponent(input)));
      return decodeURIComponent(escape(atob(input)));
    } catch (e: any) {
      return "⚠️ " + e.message;
    }
  }, [input, mode]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Binary className="h-4 w-4 text-neon-violet" /> Base64 Encoder / Decoder
        </CardTitle>
        <CardDescription>Encode & decode teks (UTF-8 aman). Bisa juga buat data URL gambar.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Tabs
          tabs={[
            { id: "encode", label: "Encode" },
            { id: "decode", label: "Decode" },
          ]}
          active={mode}
          onChange={(id) => setMode(id as any)}
        />
        <Textarea value={input} onChange={(e) => setInput(e.target.value)} className="min-h-[120px] font-mono text-xs" placeholder="Masukkan teks" />
        <div>
          <Label>Hasil</Label>
          <pre className="scroll-thin mt-1 max-h-60 overflow-auto whitespace-pre-wrap break-all rounded-xl border border-border bg-black/40 p-3 font-mono text-xs text-neon-lime">
            {output}
          </pre>
          <CopyBtn text={output} />
        </div>
      </CardContent>
    </Card>
  );
}

/* =============================== HASH ================================= */
function HashGenerator() {
  const [input, setInput] = React.useState("neural ai studio");
  const [hashes, setHashes] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    (async () => {
      const CryptoJS = (await import("crypto-js")).default;
      const webSha = async (algo: string) => {
        const buf = await crypto.subtle.digest(algo, new TextEncoder().encode(input));
        return Array.from(new Uint8Array(buf))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      };
      setHashes({
        MD5: CryptoJS.MD5(input).toString(),
        SHA1: await webSha("SHA-1"),
        SHA256: await webSha("SHA-256"),
        SHA512: await webSha("SHA-512"),
        "SHA3-256": CryptoJS.SHA3(input, { outputLength: 256 }).toString(),
        RIPEMD160: CryptoJS.RIPEMD160(input).toString(),
      });
    })();
  }, [input]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="h-4 w-4 text-neon-lime" /> Hash Generator
        </CardTitle>
        <CardDescription>MD5, SHA-1, SHA-256, SHA-512, SHA3 & RIPEMD-160.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea value={input} onChange={(e) => setInput(e.target.value)} className="min-h-[100px]" placeholder="Teks yang mau di-hash" />
        <div className="space-y-2">
          {Object.entries(hashes).map(([k, v]) => (
            <div key={k} className="rounded-xl border border-border p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{k}</span>
                <CopyBtn text={v} />
              </div>
              <code className="block break-all font-mono text-[11px] text-neon-lime">{v}</code>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
