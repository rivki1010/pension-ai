import { useMemo, useState } from "react";
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
import { Loader2, ArrowLeft, User, KeyRound } from "lucide-react";
import { motion } from "framer-motion";
import { AI_PROVIDERS, defaultModelForProvider } from "@/lib/aiProviders";

export default function StepPersonalDetails({ initialProfile, onNext }) {
  const [form, setForm] = useState({
    birth_year: initialProfile?.birth_year || "",
    gender: initialProfile?.gender || "",
    current_salary: initialProfile?.current_salary || "",
    retirement_age: initialProfile?.retirement_age || "",
    marital_status: initialProfile?.marital_status || "single",
    salary_growth_pct: initialProfile?.salary_growth_pct || 2,
  });

  const [provider, setProvider] = useState(getStoredAIProvider());
  const [apiKey, setApiKey] = useState(getStoredAIKey());
  const [model, setModel] = useState(getStoredAIModel());
  const [baseUrl, setBaseUrl] = useState(getStoredAIBaseUrl());
  const [saving, setSaving] = useState(false);

  const showBaseUrl = useMemo(() => provider === "custom", [provider]);

  const field = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleProviderChange = (next) => {
    setProvider(next);
    if (!model || model === defaultModelForProvider(provider)) {
      setModel(defaultModelForProvider(next));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    setStoredAIProvider(provider);
    setStoredAIKey(apiKey.trim());
    setStoredAIModel(model.trim() || defaultModelForProvider(provider));
    setStoredAIBaseUrl(baseUrl.trim());
    localStorage.setItem("openai_api_key", apiKey.trim());
    localStorage.setItem("openai_model", model.trim() || defaultModelForProvider(provider));

    const data = {
      birth_year: Number(form.birth_year),
      gender: form.gender,
      current_salary: Number(form.current_salary),
      retirement_age: Number(form.retirement_age) || (form.gender === "male" ? 67 : 65),
      marital_status: form.marital_status,
      salary_growth_pct: Number(form.salary_growth_pct),
    };

    const result = initialProfile?.id
      ? await base44.entities.UserFinancialProfile.update(initialProfile.id, data)
      : await base44.entities.UserFinancialProfile.create(data);

    setSaving(false);
    onNext(result);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-primary/10">
          <User className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground font-rubik">פרטים אישיים + הגדרות AI</h2>
          <p className="text-muted-foreground text-sm">הגדרת פרופיל אישי וספק AI בשלב אחד.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">הגדרות ספק AI</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>ספק AI</Label>
              <Select value={provider} onValueChange={handleProviderChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_PROVIDERS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>מודל</Label>
              <Input value={model} onChange={(e) => setModel(e.target.value)} dir="ltr" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>מפתח API</Label>
            <Input
              type="password"
              dir="ltr"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-... / claude-... / AIza..."
              required
            />
          </div>

          {showBaseUrl && (
            <div className="space-y-2">
              <Label>כתובת בסיס (תואם OpenAI)</Label>
              <Input
                dir="ltr"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.example.com/v1"
                required
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 border-t border-border/50 pt-6">
          <div className="space-y-2">
            <Label>שנת לידה *</Label>
            <Input type="number" placeholder="1985" value={form.birth_year} onChange={(e) => field("birth_year", e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label>מגדר *</Label>
            <Select value={form.gender} onValueChange={(v) => field("gender", v)} required>
              <SelectTrigger><SelectValue placeholder="בחר מגדר" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">גבר</SelectItem>
                <SelectItem value="female">אישה</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>שכר חודשי נוכחי (₪) *</Label>
            <Input type="number" placeholder="15000" value={form.current_salary} onChange={(e) => field("current_salary", e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label>גיל פרישה מתוכנן</Label>
            <Input type="number" placeholder={form.gender === "female" ? "65" : "67"} value={form.retirement_age} onChange={(e) => field("retirement_age", e.target.value)} />
            <p className="text-xs text-muted-foreground">ברירת מחדל: גבר 67, אישה 65</p>
          </div>

          <div className="space-y-2">
            <Label>מצב משפחתי</Label>
            <Select value={form.marital_status} onValueChange={(v) => field("marital_status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="single">רווק/ה</SelectItem>
                <SelectItem value="married">נשוי/אה</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>צפי עליית שכר שנתית (%)</Label>
            <Input type="number" step="0.1" placeholder="2" value={form.salary_growth_pct} onChange={(e) => field("salary_growth_pct", e.target.value)} />
          </div>
        </div>

        <div className="flex justify-start pt-2">
          <Button type="submit" disabled={saving || !form.birth_year || !form.gender || !form.current_salary || !apiKey.trim()} size="lg" className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeft className="w-4 h-4" />}
            המשך
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
