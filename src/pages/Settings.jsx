import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, CheckCircle2, CircleAlert, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44, getStoredOpenAIKey, getStoredOpenAIModel, setStoredOpenAIKey, setStoredOpenAIModel } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

export default function Settings() {
  const { user, checkAppState } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4.1-mini");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profileExists, setProfileExists] = useState(false);

  useEffect(() => {
    setApiKey(getStoredOpenAIKey());
    setModel(getStoredOpenAIModel());
    loadProfileStatus();
  }, []);

  const loadProfileStatus = async () => {
    const profiles = await base44.entities.UserFinancialProfile.list();
    setProfileExists(profiles.length > 0);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStoredOpenAIKey(apiKey.trim());
    setStoredOpenAIModel(model.trim() || "gpt-4.1-mini");
    await checkAppState();
    await loadProfileStatus();
    setSaving(false);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const hasApiKey = Boolean((user?.hasApiKey ?? apiKey.trim().length > 0));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground font-rubik">הגדרות מקומיות</h1>
        <p className="text-muted-foreground">
          האפליקציה רצה כאתר סטטי. המידע נשמר רק בדפדפן שלך והמפתח נשמר מקומית ב-LocalStorage.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm space-y-5">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <KeyRound className="w-5 h-5 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-foreground">OpenAI API Key (BYOK)</p>
            <p className="text-xs text-muted-foreground">הכנס מפתח אישי. בלי מפתח לא יתבצע פענוח מסמכים ולא יופק דוח AI.</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="openai-key">API Key</Label>
          <Input
            id="openai-key"
            type="password"
            autoComplete="off"
            dir="ltr"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="openai-model">Model</Label>
          <Input
            id="openai-model"
            dir="ltr"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="gpt-4.1-mini"
          />
        </div>

        <Button type="submit" disabled={saving} className="gap-2">
          {saving ? (
            <span className="inline-block h-4 w-4 rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? "שומר..." : saved ? "נשמר" : "שמירת הגדרות"}
        </Button>
      </form>

      <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm space-y-3">
        <h2 className="font-bold text-foreground font-rubik">סטטוס מוכנות</h2>
        <StatusRow
          ok={hasApiKey}
          textOk="מפתח API הוגדר"
          textMissing="חסר מפתח API"
        />
        <StatusRow
          ok={profileExists}
          textOk="פרופיל אישי קיים"
          textMissing="חסר פרופיל אישי"
        />

        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild variant="outline">
            <Link to="/calculator">עריכת פרופיל ומחשבון</Link>
          </Button>
          <Button asChild>
            <Link to="/">מעבר לאשף</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatusRow({ ok, textOk, textMissing }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
      ) : (
        <CircleAlert className="w-4 h-4 text-amber-600" />
      )}
      <span className={ok ? "text-foreground" : "text-muted-foreground"}>{ok ? textOk : textMissing}</span>
    </div>
  );
}