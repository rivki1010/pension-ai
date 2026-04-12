import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { Loader2, Save, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function ProfileForm({ profile, onSave }) {
  const [form, setForm] = useState({
    birth_year: profile?.birth_year || "",
    gender: profile?.gender || "",
    current_salary: profile?.current_salary || "",
    retirement_age: profile?.retirement_age || "",
    marital_status: profile?.marital_status || "single",
    salary_growth_pct: profile?.salary_growth_pct || 2,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        birth_year: profile.birth_year || "",
        gender: profile.gender || "",
        current_salary: profile.current_salary || "",
        retirement_age: profile.retirement_age || "",
        marital_status: profile.marital_status || "single",
        salary_growth_pct: profile.salary_growth_pct || 2,
      });
    }
  }, [profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const data = {
      birth_year: Number(form.birth_year),
      gender: form.gender,
      current_salary: Number(form.current_salary),
      retirement_age: Number(form.retirement_age) || (form.gender === "male" ? 67 : 65),
      marital_status: form.marital_status,
      salary_growth_pct: Number(form.salary_growth_pct),
    };

    let result;
    if (profile?.id) {
      result = await base44.entities.UserFinancialProfile.update(profile.id, data);
    } else {
      result = await base44.entities.UserFinancialProfile.create(data);
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    if (onSave) onSave(result);
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onSubmit={handleSubmit}
      className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm space-y-5"
    >
      <h3 className="text-lg font-bold text-foreground font-rubik">הפרטים שלי</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">שנת לידה</Label>
          <Input
            type="number"
            placeholder="1985"
            value={form.birth_year}
            onChange={(e) => setForm(prev => ({ ...prev, birth_year: e.target.value }))}
            className="text-right"
            required
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">מין</Label>
          <Select value={form.gender} onValueChange={(v) => setForm(prev => ({ ...prev, gender: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="בחר" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">זכר</SelectItem>
              <SelectItem value="female">נקבה</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">שכר ברוטו חודשי (₪)</Label>
          <Input
            type="number"
            placeholder="15,000"
            value={form.current_salary}
            onChange={(e) => setForm(prev => ({ ...prev, current_salary: e.target.value }))}
            className="text-right"
            required
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">גיל פרישה מתוכנן</Label>
          <Input
            type="number"
            placeholder="67"
            value={form.retirement_age}
            onChange={(e) => setForm(prev => ({ ...prev, retirement_age: e.target.value }))}
            className="text-right"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">מצב משפחתי</Label>
          <Select value={form.marital_status} onValueChange={(v) => setForm(prev => ({ ...prev, marital_status: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">רווק/ה</SelectItem>
              <SelectItem value="married">נשוי/אה</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">צפי עליית שכר שנתית (%)</Label>
          <Input
            type="number"
            step="0.1"
            placeholder="2"
            value={form.salary_growth_pct}
            onChange={(e) => setForm(prev => ({ ...prev, salary_growth_pct: e.target.value }))}
            className="text-right"
          />
        </div>
      </div>

      <Button type="submit" disabled={saving} className="w-full sm:w-auto gap-2">
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : saved ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        {saving ? "שומר..." : saved ? "נשמר!" : "שמור פרטים"}
      </Button>
    </motion.form>
  );
}