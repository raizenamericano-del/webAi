"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { User, KeyRound, Palette, Save, Trash2, Eye, EyeOff, ShieldCheck, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Textarea, Label, Select, Badge, Switch } from "@/components/ui";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/components/toast";

const PROVIDERS = [
  { id: "groq", label: "Groq API Key", env: "GROQ_API_KEY", desc: "Buat AI Chat (LLaMA, Mixtral, Gemma) & Whisper transcription", placeholder: "gsk_..." },
  { id: "groq2", label: "Groq API Key (cadangan)", env: "GROQ_API_KEY_2", desc: "Dipakai kalau key utama limit/ error", placeholder: "gsk_..." },
  { id: "nvidia", label: "NVIDIA NIM API Key", env: "NVIDIA_API_KEY", desc: "Buat image generation (SD3/SDXL/FLUX) & Nemotron", placeholder: "nvapi-..." },
  { id: "openai", label: "OpenAI API Key", env: "OPENAI_API_KEY", desc: "Whisper speech-to-text (alternatif Groq)", placeholder: "sk-..." },
  { id: "tavily", label: "Tavily API Key", env: "TAVILY_API_KEY", desc: "Web search di AI Chat (kalau kosong, fallback DuckDuckGo)", placeholder: "tvly-..." },
  { id: "elevenlabs", label: "ElevenLabs API Key", env: "ELEVENLABS_API_KEY", desc: "Text-to-speech premium & voice cloning", placeholder: "..." },
  { id: "removebg", label: "Remove.bg API Key", env: "REMOVEBG_API_KEY", desc: "Background remover kualitas tinggi", placeholder: "..." },
  { id: "clipdrop", label: "Clipdrop API Key", env: "CLIPDROP_API_KEY", desc: "Background remover alternatif", placeholder: "..." },
  { id: "replicate", label: "Replicate API Token", env: "REPLICATE_API_TOKEN", desc: "AI Colorizer (DeOldify), face swap & model lain", placeholder: "r8_..." },
  { id: "suno", label: "Suno API Key", env: "SUNO_API_KEY", desc: "AI Music Generator", placeholder: "..." },
  { id: "runway", label: "RunwayML API Key", env: "RUNWAY_API_KEY", desc: "AI Video Generator (Gen-3)", placeholder: "..." },
  { id: "pika", label: "Pika API Key", env: "PIKA_API_KEY", desc: "AI Video Generator alternatif", placeholder: "..." },
  { id: "other", label: "ANOTHER_API (custom)", env: "ANOTHER_API", desc: "Key custom lu, dipakai sebagai fallback terakhir", placeholder: "..." },
];

export default function SettingsPage() {
  const { success, error: toastError, info } = useToast();
  const { theme, setTheme, resolved } = useTheme();
  const [profile, setProfile] = React.useState({ name: "", bio: "", image: "", email: "" });
  const [keys, setKeys] = React.useState<Record<string, string>>({});
  const [savedKeys, setSavedKeys] = React.useState<any[]>([]);
  const [show, setShow] = React.useState<Record<string, boolean>>({});
  const [cursorOn, setCursorOn] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((j) => j.user && setProfile({ name: j.user.name || "", bio: j.user.bio || "", image: j.user.image || "", email: j.user.email }));
    fetch("/api/user/keys")
      .then((r) => r.json())
      .then((j) => setSavedKeys(j.keys || []));
    setCursorOn(localStorage.getItem("neural-cursor") !== "off");
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    const r = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: profile.name, bio: profile.bio, image: profile.image }),
    });
    setSaving(false);
    if (r.ok) success("Tersimpan", "Profil lu udah diupdate.");
    else toastError("Gagal", "Nggak bisa simpan profil.");
  };

  const saveKey = async (provider: string) => {
    const secret = keys[provider];
    if (!secret?.trim()) return toastError("Kosong", "Isi dulu key-nya.");
    const r = await fetch("/api/user/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, secret }),
    });
    const j = await r.json();
    if (!j.ok) return toastError("Gagal", j.error);
    success("Key tersimpan", `Key ${provider} dienkripsi & disimpan di akun lu.`);
    setKeys((k) => ({ ...k, [provider]: "" }));
    fetch("/api/user/keys")
      .then((r) => r.json())
      .then((j) => setSavedKeys(j.keys || []));
  };

  const deleteKey = async (provider: string) => {
    await fetch(`/api/user/keys?provider=${provider}`, { method: "DELETE" });
    success("Dihapus", `Key ${provider} udah dihapus.`);
    setSavedKeys((s) => s.filter((k) => k.provider !== provider));
  };

  return (
    <div className="mx-auto max-w-3xl px-3 py-6 sm:px-5">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-black sm:text-3xl">
          <span className="text-gradient">Settings</span>
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">Profil, tema, API key lu sendiri (BYOK) & preferensi tampilan.</p>
      </div>

      <div className="space-y-5">
        {/* ---------------------------- PROFIL ---------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4 text-neon-cyan" /> Profil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={profile.email} disabled className="opacity-60" />
            </div>
            <div className="space-y-1.5">
              <Label>Nama</Label>
              <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="Nama lu" />
            </div>
            <div className="space-y-1.5">
              <Label>Bio</Label>
              <Textarea value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} placeholder="Ceritain dikit tentang lu" className="min-h-[80px]" />
            </div>
            <div className="space-y-1.5">
              <Label>URL Avatar</Label>
              <Input value={profile.image} onChange={(e) => setProfile({ ...profile, image: e.target.value })} placeholder="https://..." />
            </div>
            <Button variant="neon" onClick={saveProfile} loading={saving} className="gap-2">
              <Save className="h-4 w-4" /> Simpan Profil
            </Button>
          </CardContent>
        </Card>

        {/* ----------------------------- TAMPILAN ---------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-neon-magenta" /> Tampilan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Label className="w-20">Tema</Label>
              <Select value={theme} onChange={(e) => setTheme(e.target.value as any)} className="w-40">
                <option value="dark">Dark (default)</option>
                <option value="light">Light</option>
                <option value="system">Ikut sistem</option>
              </Select>
              <Badge variant="neon">aktif: {resolved}</Badge>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Label className="w-20">Cursor neon</Label>
              <Switch
                checked={cursorOn}
                label="Efek trail neon di desktop"
                onChange={(v) => {
                  setCursorOn(v);
                  localStorage.setItem("neural-cursor", v ? "on" : "off");
                  window.location.reload();
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* ------------------------------- BYOK ------------------------------ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-neon-lime" /> Bring Your Own Key
            </CardTitle>
            <CardDescription className="flex items-start gap-1.5">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neon-lime" />
              Key dienkripsi (AES-256) sebelum disimpan. Kalau server udah punya key bawaan, itu yang dipakai duluan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {savedKeys.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {savedKeys.map((k) => (
                  <button key={k.provider} onClick={() => deleteKey(k.provider)} className="group flex items-center gap-1.5 rounded-lg border border-neon-lime/40 bg-neon-lime/10 px-2.5 py-1 text-xs text-neon-lime">
                    {k.provider} <Trash2 className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            )}

            {PROVIDERS.map((p) => {
              const saved = savedKeys.some((k) => k.provider === p.id);
              return (
                <div key={p.id} className="space-y-1.5 rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Label className="text-xs font-semibold normal-case text-foreground">{p.label}</Label>
                    {saved && <Badge variant="lime">tersimpan</Badge>}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{p.desc}</p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={show[p.id] ? "text" : "password"}
                        value={keys[p.id] || ""}
                        onChange={(e) => setKeys({ ...keys, [p.id]: e.target.value })}
                        placeholder={p.placeholder}
                        className="pr-10 font-mono text-xs"
                      />
                      <button
                        onClick={() => setShow((s) => ({ ...s, [p.id]: !s[p.id] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {show[p.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => saveKey(p.id)}>
                      Simpan
                    </Button>
                  </div>
                </div>
              );
            })}

            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-300">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Jangan pernah share API key lu ke orang lain. Kalau key lu pernah ke-share di tempat publik (chat, grup, dll),
                segera revoke & bikin baru dari dashboard provider-nya.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
