import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RefreshCw, TrendingUp, Wallet } from "lucide-react";
import ProjectionChart from "@/components/ProjectionChart";
import {
  DEFAULT_INFLATION_PCT,
  calculateAverageReturn,
  calculateMonthlyPension,
  calculatePensionTax,
  formatCurrency,
  formatPercent,
  generateProjectionDataDetailed,
  getAggregatedPensionData,
  getCurrentAge,
  projectBalanceWithDynamicFeesAndGrowth,
  yearsToRetirement,
} from "@/lib/pensionCalculations";

export default function StepResults({ profile, documents, returnMode, manualReturn, onRestart }) {
  const [valueMode, setValueMode] = useState("nominal");
  const [includeCompensation, setIncludeCompensation] = useState(true);

  const calc = useMemo(() => {
    if (!profile) return null;

    const aggPension = getAggregatedPensionData(documents);
    const annualReturn = returnMode === "auto" ? calculateAverageReturn(documents) : manualReturn;
    const startBalance = aggPension?.total_balance || 0;
    const severanceBalance = aggPension?.severance_balance || 0;
    const monthlyDepositGross =
      (aggPension?.employee_deposit || 0) + (aggPension?.employer_deposit || 0) > 0
        ? (aggPension?.employee_deposit || 0) + (aggPension?.employer_deposit || 0)
        : aggPension?.monthly_deposit || 0;

    const years = yearsToRetirement(profile.birth_year, profile.retirement_age || 67);
    const currentAge = getCurrentAge(profile.birth_year);
    const effectiveStartBalance = includeCompensation ? startBalance : Math.max(0, startBalance - severanceBalance);

    const projectedBalance = projectBalanceWithDynamicFeesAndGrowth({
      currentBalance: effectiveStartBalance,
      monthlyDeposit: monthlyDepositGross,
      annualReturnPct: annualReturn,
      years,
      salaryGrowthPct: profile.salary_growth_pct || 2,
      managementFeeFromBalancePct: aggPension?.management_fee_pct ?? 0.5,
      managementFeeFromDepositPct: aggPension?.management_fee_deposit_pct ?? 2,
      inflationPct: DEFAULT_INFLATION_PCT,
      valueMode,
    });

    const monthlyPension = calculateMonthlyPension(projectedBalance, profile.gender);
    const tax = calculatePensionTax(monthlyPension, profile.marital_status);

    const projectionData = generateProjectionDataDetailed({
      currentBalance: effectiveStartBalance,
      monthlyDeposit: monthlyDepositGross,
      annualReturnPct: annualReturn,
      years,
      salaryGrowthPct: profile.salary_growth_pct || 2,
      managementFeeFromBalancePct: aggPension?.management_fee_pct ?? 0.5,
      managementFeeFromDepositPct: aggPension?.management_fee_deposit_pct ?? 2,
      inflationPct: DEFAULT_INFLATION_PCT,
    }).map((d, i) => ({ ...d, age: currentAge + i }));

    return {
      annualReturn,
      years,
      currentAge,
      severanceBalance,
      projectedBalance,
      monthlyPension,
      tax,
      projectionData,
    };
  }, [profile, documents, returnMode, manualReturn, includeCompensation, valueMode]);

  if (!calc) return <div className="text-center text-muted-foreground py-20">חסרים נתונים לחישוב.</div>;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground font-rubik">תוצאות התחזית</h2>
          <p className="text-muted-foreground text-sm">גיל {calc.currentAge} | עוד {calc.years} שנים לפרישה | תשואה שנתית {formatPercent(calc.annualReturn)}</p>
        </div>
        <Button variant="outline" onClick={onRestart} className="gap-2"><RefreshCw className="w-4 h-4" />התחל מחדש</Button>
      </motion.div>

      <div className="bg-muted/40 rounded-xl p-4 flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-2">
          <Label>תצוגת ערכים:</Label>
          <button type="button" onClick={() => setValueMode("nominal")} className={`px-3 py-1.5 rounded-lg text-sm ${valueMode === "nominal" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>נומינלי</button>
          <button type="button" onClick={() => setValueMode("real")} className={`px-3 py-1.5 rounded-lg text-sm ${valueMode === "real" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>ריאלי</button>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox id="inc-comp" checked={includeCompensation} onCheckedChange={(v) => setIncludeCompensation(Boolean(v))} />
          <Label htmlFor="inc-comp">לכלול פיצויים בקצבה</Label>
        </div>
      </div>

      {!includeCompensation && calc.severanceBalance > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">רכיב הפיצויים הוסר מבסיס הקצבה: {formatCurrency(calc.severanceBalance)}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card icon={TrendingUp} title="צבירה צפויה בפרישה" value={formatCurrency(calc.projectedBalance)} />
        <Card icon={Wallet} title="קצבה חודשית נטו צפויה" value={formatCurrency(calc.tax.netPension)} subtitle={`ברוטו: ${formatCurrency(calc.monthlyPension)}`} />
      </div>

      <ProjectionChart data={calc.projectionData} title="תחזית צבירה לאורך זמן" valueMode={valueMode} onValueModeChange={setValueMode} />

      <div className="text-xs text-muted-foreground border-t border-border/40 pt-3">בתצוגה ריאלית מחושבת אינפלציה שנתית ממוצעת של {formatPercent(DEFAULT_INFLATION_PCT)}.</div>
    </div>
  );
}

function Card({ icon: Icon, title, value, subtitle }) {
  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground text-sm"><Icon className="w-4 h-4" /><span>{title}</span></div>
      <p className="text-3xl font-bold text-foreground font-rubik">{value}</p>
      {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}
