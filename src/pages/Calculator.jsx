import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Loader2, Wallet, TrendingUp } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import ProfileForm from "../components/ProfileForm";
import ProjectionChart from "../components/ProjectionChart";
import TaxBreakdown from "../components/TaxBreakdown";
import StatCard from "../components/StatCard";
import {
  DEFAULT_INFLATION_PCT,
  formatCurrency,
  formatPercent,
  yearsToRetirement,
  getCurrentAge,
  calculateAverageReturn,
  calculateMonthlyPension,
  calculatePensionTax,
  calculateNetReturnAfterFees,
  calculateNetDepositAfterFees,
  generateProjectionDataDetailed,
  getAggregatedPensionData,
  projectBalanceWithDynamicFeesAndGrowth,
  toRealAnnualReturn,
} from "../lib/pensionCalculations";

export default function Calculator() {
  const [profile, setProfile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [customReturn, setCustomReturn] = useState(null);
  const [customBalance, setCustomBalance] = useState(null);
  const [customDeposit, setCustomDeposit] = useState(null);
  const [mgmtFeeBalancePct, setMgmtFeeBalancePct] = useState(null);
  const [mgmtFeeDepositPct, setMgmtFeeDepositPct] = useState(null);
  const [includeCompensation, setIncludeCompensation] = useState(true);
  const [valueMode, setValueMode] = useState("nominal");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [profiles, docs] = await Promise.all([
      base44.entities.UserFinancialProfile.list(),
      base44.entities.PensionDocument.filter({ status: "completed" }),
    ]);
    setProfile(profiles[0] || null);
    setDocuments(docs);
    setLoading(false);
  };

  const handleProfileSave = (updatedProfile) => {
    setProfile(updatedProfile);
  };

  const calculations = useMemo(() => {
    if (!profile) return null;

    const avgReturn = customReturn ?? calculateAverageReturn(documents);
    const years = yearsToRetirement(profile.birth_year, profile.retirement_age || 67);
    const currentAge = getCurrentAge(profile.birth_year);

    const aggPension = getAggregatedPensionData(documents);

    const detectedBalance = aggPension?.total_balance || 0;
    const detectedSeveranceBalance = aggPension?.severance_balance || 0;
    const detectedCompensationBalance = aggPension?.compensation_balance || 0;
    const grossDeposit =
      (aggPension?.employee_deposit || 0) + (aggPension?.employer_deposit || 0) > 0
        ? (aggPension?.employee_deposit || 0) + (aggPension?.employer_deposit || 0)
        : aggPension?.monthly_deposit || 0;

    const detectedInsuranceComponent = aggPension?.insurance_component || 0;
    const depositAfterInsurance = Math.max(0, grossDeposit - detectedInsuranceComponent);

    const balanceBeforeToggle = customBalance ?? detectedBalance;
    const excludedCompensation = includeCompensation ? 0 : detectedSeveranceBalance;
    const effectiveBalance = Math.max(0, balanceBeforeToggle - excludedCompensation);

    const depositBeforeFee = customDeposit ?? depositAfterInsurance;

    const effectiveMgmtFeeBalance = mgmtFeeBalancePct ?? aggPension?.management_fee_pct ?? 0.5;
    const effectiveMgmtFeeDeposit = mgmtFeeDepositPct ?? aggPension?.management_fee_deposit_pct ?? 2;

    const nominalNetReturn = calculateNetReturnAfterFees(avgReturn, effectiveMgmtFeeBalance);
    const realNetReturn = toRealAnnualReturn(nominalNetReturn, DEFAULT_INFLATION_PCT);

    const projectedBalance = projectBalanceWithDynamicFeesAndGrowth({
      currentBalance: effectiveBalance,
      monthlyDeposit: depositBeforeFee,
      annualReturnPct: avgReturn,
      years,
      salaryGrowthPct: profile.salary_growth_pct || 2,
      managementFeeFromBalancePct: effectiveMgmtFeeBalance,
      managementFeeFromDepositPct: effectiveMgmtFeeDeposit,
      inflationPct: DEFAULT_INFLATION_PCT,
      valueMode,
    });

    const lowFeeBalanceScenario = projectBalanceWithDynamicFeesAndGrowth({
      currentBalance: effectiveBalance,
      monthlyDeposit: depositBeforeFee,
      annualReturnPct: avgReturn,
      years,
      salaryGrowthPct: profile.salary_growth_pct || 2,
      managementFeeFromBalancePct: 0.5,
      managementFeeFromDepositPct: 1.5,
      inflationPct: DEFAULT_INFLATION_PCT,
      valueMode,
    });

    const feePenalty = Math.max(0, lowFeeBalanceScenario - projectedBalance);

    const netMonthlyDeposit = calculateNetDepositAfterFees(depositBeforeFee, effectiveMgmtFeeDeposit);
    const monthlyPension = calculateMonthlyPension(projectedBalance, profile.gender);
    const taxBreakdown = calculatePensionTax(monthlyPension, profile.marital_status);

    const projectionData = generateProjectionDataDetailed({
      currentBalance: effectiveBalance,
      monthlyDeposit: depositBeforeFee,
      annualReturnPct: avgReturn,
      years,
      salaryGrowthPct: profile.salary_growth_pct || 2,
      managementFeeFromBalancePct: effectiveMgmtFeeBalance,
      managementFeeFromDepositPct: effectiveMgmtFeeDeposit,
      inflationPct: DEFAULT_INFLATION_PCT,
    }).map((d, i) => ({ ...d, age: currentAge + i }));

    return {
      avgReturn,
      years,
      currentAge,
      detectedBalance,
      detectedSeveranceBalance,
      detectedCompensationBalance,
      grossDeposit,
      depositAfterInsurance,
      depositBeforeFee,
      netMonthlyDeposit,
      effectiveBalance,
      effectiveMgmtFeeBalance,
      effectiveMgmtFeeDeposit,
      nominalNetReturn,
      realNetReturn,
      projectedBalance,
      feePenalty,
      monthlyPension,
      taxBreakdown,
      projectionData,
    };
  }, [
    profile,
    documents,
    customReturn,
    customBalance,
    customDeposit,
    mgmtFeeBalancePct,
    mgmtFeeDepositPct,
    includeCompensation,
    valueMode,
  ]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground font-rubik">מחשבון פנסיה</h1>
        <p className="text-muted-foreground">כאן אפשר לשחק עם הנחות ולראות בזמן אמת את ההשפעה על הקצבה.</p>
      </motion.div>

      <ProfileForm profile={profile} onSave={handleProfileSave} />

      {profile && calculations && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm space-y-6"
        >
          <h3 className="text-lg font-bold text-foreground font-rubik">כיוונון מתקדם</h3>

          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/50 p-3">
            <Label className="text-sm text-muted-foreground">תצוגת ערכים:</Label>
            <button
              type="button"
              onClick={() => setValueMode("nominal")}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                valueMode === "nominal" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
              }`}
            >
              נומינלי
            </button>
            <button
              type="button"
              onClick={() => setValueMode("real")}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                valueMode === "real" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
              }`}
            >
              ריאלי
            </button>
            <span className="text-xs text-muted-foreground">
              {valueMode === "real"
                ? `בניכוי אינפלציה ממוצעת ${DEFAULT_INFLATION_PCT}%`
                : "סכומים כפי שיופיעו בעתיד בבנק"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <SliderParam
              label="תשואה שנתית ברוטו"
              value={calculations.avgReturn}
              min={0}
              max={12}
              step={0.1}
              suffix="%"
              onChange={(v) => setCustomReturn(v)}
            />
            <SliderParam
              label="יתרת פתיחה לחישוב"
              value={calculations.effectiveBalance}
              min={0}
              max={6000000}
              step={10000}
              suffix="₪"
              format={formatCurrency}
              onChange={(v) => setCustomBalance(v)}
            />
            <SliderParam
              label="הפקדה חודשית לפני דמי ניהול"
              value={calculations.depositBeforeFee}
              min={0}
              max={15000}
              step={100}
              suffix="₪"
              format={formatCurrency}
              onChange={(v) => setCustomDeposit(v)}
            />
            <SliderParam
              label="דמי ניהול מהצבירה"
              value={calculations.effectiveMgmtFeeBalance}
              min={0}
              max={1.5}
              step={0.05}
              suffix="%"
              onChange={(v) => setMgmtFeeBalancePct(v)}
            />
            <SliderParam
              label="דמי ניהול מההפקדה"
              value={calculations.effectiveMgmtFeeDeposit}
              min={0}
              max={6}
              step={0.1}
              suffix="%"
              onChange={(v) => setMgmtFeeDepositPct(v)}
            />

            <div className="space-y-3 rounded-xl border border-border/60 p-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-compensation"
                  checked={includeCompensation}
                  onCheckedChange={(checked) => setIncludeCompensation(Boolean(checked))}
                />
                <Label htmlFor="include-compensation">לכלול רכיב פיצויים בקצבה</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                אם מבטלים, החישוב מניח שמשיכת הפיצויים ({formatCurrency(calculations.detectedSeveranceBalance)}) לא תיכנס לקצבה.
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
            פער דמי ניהול מול תרחיש מיקוח (0.5% מצבירה, 1.5% מהפקדה): <strong>{formatCurrency(calculations.feePenalty)}</strong>
          </div>
        </motion.div>
      )}

      {profile && calculations && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              icon={TrendingUp}
              label="צבירה צפויה בפרישה"
              value={formatCurrency(calculations.projectedBalance)}
              subtitle={`בעוד ${calculations.years} שנים • ${valueMode === "real" ? "ריאלי" : "נומינלי"}`}
              color="green"
            />
            <StatCard
              icon={Wallet}
              label="קצבה חודשית נטו"
              value={formatCurrency(calculations.taxBreakdown.netPension)}
              subtitle={`ברוטו: ${formatCurrency(calculations.monthlyPension)}`}
              color="primary"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProjectionChart
              data={calculations.projectionData}
              title="תחזית צבירה: הפקדות מול רווחים"
              valueMode={valueMode}
              onValueModeChange={setValueMode}
            />
            <TaxBreakdown taxData={calculations.taxBreakdown} />
          </div>

          <div className="text-sm text-muted-foreground bg-card border border-border/50 rounded-xl p-4">
            תשואה נטו אחרי דמי ניהול מצבירה: <strong>{formatPercent(calculations.nominalNetReturn)}</strong>
            {" • "}
            תשואה ריאלית נטו: <strong>{formatPercent(calculations.realNetReturn)}</strong>
            {" • "}
            הפקדה נטו אחרי דמי ניהול מהפקדה: <strong>{formatCurrency(calculations.netMonthlyDeposit)}</strong>
          </div>
        </>
      )}
    </div>
  );
}

function SliderParam({ label, value, min, max, step, suffix, format, onChange }) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const displayValue = format ? format(localValue) : `${localValue.toFixed(1)}${suffix}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm text-muted-foreground">{label}</Label>
        <span className="text-sm font-semibold text-foreground font-rubik">{displayValue}</span>
      </div>
      <Slider
        value={[localValue]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => {
          setLocalValue(v);
          onChange(v);
        }}
        className="w-full"
      />
    </div>
  );
}
