import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { Loader2, ArrowLeft, User } from "lucide-react";
import { motion } from "framer-motion";

export default function StepPersonalDetails({ initialProfile, onNext }) {
  const [form, setForm] = useState({
    birth_year: initialProfile?.birth_year || "",
    gender: initialProfile?.gender || "",
    current_salary: initialProfile?.current_salary || "",
    retirement_age: initialProfile?.retirement_age || "",
    marital_status: initialProfile?.marital_status || "single",
    salary_growth_pct: initialProfile?.salary_growth_pct || 2,
  });
  const [saving, setSaving] = useState(false);

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
    if (initialProfile?.id) {
      result = await base44.entities.UserFinancialProfile.update(initialProfile.id, data);
    } else {
      result = await base44.entities.UserFinancialProfile.create(data);
    }
    setSaving(false);
    onNext(result);
  };

  const field = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-primary/10">
          <User className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground font-rubik">פרטים אישיים</h2>
          <p className="text-muted-foreground text-sm">הפרטים ישמשו לחישוב גיל הפרישה, מס הכנסה וקצבת הזקנה</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label>שנת לידה <span className="text-destructive">*</span></Label>
            <Input type="number" placeholder="1985" value={form.birth_year} onChange={e => field("birth_year", e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>מין <span className="text-destructive">*</span></Label>
            <Select value={form.gender} onValueChange={v => field("gender", v)} required>
              <SelectTrigger><SelectValue placeholder="בחר מין" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">זכר</SelectItem>
                <SelectItem value="female">נקבה</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>שכר ברוטו חודשי (₪) <span className="text-destructive">*</span></Label>
            <Input type="number" placeholder="15,000" value={form.current_salary} onChange={e => field("current_salary", e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>גיל פרישה מתוכנן</Label>
            <Input type="number" placeholder={form.gender === "female" ? "65" : "67"} value={form.retirement_age} onChange={e => field("retirement_age", e.target.value)} />
            <p className="text-xs text-muted-foreground">ברירת מחדל: גבר 67 / אישה 65</p>
          </div>
          <div className="space-y-2">
            <Label>מצב משפחתי</Label>
            <Select value={form.marital_status} onValueChange={v => field("marital_status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="single">רווק/ה</SelectItem>
                <SelectItem value="married">נשוי/אה</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>צפי עליית שכר שנתית (%)</Label>
            <Input type="number" step="0.1" placeholder="2" value={form.salary_growth_pct} onChange={e => field("salary_growth_pct", e.target.value)} />
          </div>
        </div>

        <div className="flex justify-start pt-2">
          <Button type="submit" disabled={saving || !form.birth_year || !form.gender || !form.current_salary} size="lg" className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeft className="w-4 h-4" />}
            המשך לשלב הבא
          </Button>
        </div>
      </form>
    </motion.div>
  );
}