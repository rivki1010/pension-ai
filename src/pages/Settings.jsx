import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, CheckCircle2, CircleAlert, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  base44,
  getStoredAIBaseUrl,
  getStoredAIKey,
  getStoredAIModel,
  getStoredAIProvider,
  setStoredAIBaseUrl,
  setStoredAIKey,
  setStoredAIModel,
  setStoredAIProvider,
} from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { AI_PROVIDERS, defaultModelForProvider } from "@/lib/aiProviders";

export default function Settings() {
  const { user, checkAppState } = useAuth();
  const [provider, setProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profileExists, setProfileExists] = useState(false);

  useEffect(() => {
    const p = getStoredAIProvider();
    setProvider(p);
    setApiKey(getStoredAIKey());
    setModel(getStoredAIModel());
    setBaseUrl(getStoredAIBaseUrl());
    loadProfileStatus();
  }, []);

  const showBaseUrl = useMemo(() => provider === "custom", [provider]);

  const loadProfileStatus = async () => {
    const profiles = await base44.entities.UserFinancialProfile.list();
    setProfileExists(profiles.length > 0);
  };

  const onProviderChange = (next) => {
    setProvider(next);
    if (!model || model === defaultModelForProvider(provider)) setModel(defaultModelForProvider(next));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStoredAIProvider(provider);
    setStoredAIKey(apiKey.trim());
    setStoredAIModel(model.trim() || defaultModelForProvider(provider));
    setStoredAIBaseUrl(baseUrl.trim());
    await checkAppState();
    await loadProfileStatus();
    setSaving(false);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const hasApiKey = Boolean(user?.hasApiKey ?? apiKey.trim().length > 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground font-rubik">AI Settings</h1>
        <p className="text-muted-foreground">This app is local-first. Keys and profile data are saved in your browser only.</p>
      </div>

      <form onSubmit={handleSave} className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm space-y-5">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10"><KeyRound className="w-5 h-5 text-primary" /></div>
          <div className="space-y-1">
            <p className="font-semibold text-foreground">Provider and API key</p>
            <p className="text-xs text-muted-foreground">Supports OpenAI, Anthropic, Gemini, OpenRouter, Groq, and custom OpenAI-compatible endpoints.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>AI provider</Label>
            <Select value={provider} onValueChange={onProviderChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {AI_PROVIDERS.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Model</Label>
            <Input value={model} onChange={(e) => setModel(e.target.value)} dir="ltr" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>API key</Label>
          <Input type="password" autoComplete="off" dir="ltr" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-... / claude-... / AIza..." />
        </div>

        {showBaseUrl && (
          <div className="space-y-2">
            <Label>Base URL</Label>
            <Input dir="ltr" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.example.com/v1" />
          </div>
        )}

        <Button type="submit" disabled={saving} className="gap-2">
          {saving ? <span className="inline-block h-4 w-4 rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving..." : saved ? "Saved" : "Save settings"}
        </Button>
      </form>

      <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm space-y-3">
        <h2 className="font-bold text-foreground font-rubik">Readiness</h2>
        <StatusRow ok={hasApiKey} textOk="API key is configured" textMissing="Missing API key" />
        <StatusRow ok={profileExists} textOk="Personal profile exists" textMissing="Missing personal profile" />

        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild variant="outline"><Link to="/calculator">Open calculator</Link></Button>
          <Button asChild><Link to="/">Open wizard</Link></Button>
        </div>
      </div>
    </div>
  );
}

function StatusRow({ ok, textOk, textMissing }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <CircleAlert className="w-4 h-4 text-amber-600" />}
      <span className={ok ? "text-foreground" : "text-muted-foreground"}>{ok ? textOk : textMissing}</span>
    </div>
  );
}
