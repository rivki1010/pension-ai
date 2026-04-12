import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RefreshCw, TrendingUp, Wallet, FileText, Calculator, GraduationCap, AlertCircle, AlertTriangle } from "lucide-react";
import {
  formatCurrency, formatPercent,
  yearsToRetirement, getCurrentAge,
  getLatestDocumentData,
  getAggregatedPensionData,
  calculatePensionTax, generateProjectionData, calculateOldAgePension,
} from "../../lib/pensionCalculations";
import ExportReport from "../ExportReport";

const INFLATION_AVG = 2.5;
// Israeli pension market long-term (30yr) nominal average - רשות שוק ההון
const MARKET_LONGTERM_NOMINAL = 6.8;
const MARKET_LONGTERM_REAL = MARKET_LONGTERM_NOMINAL - INFLATION_AVG;

const Section = ({ icon: Icon, title, color, bg, children, delay = 0 }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
    className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm space-y-4">
    <div className="flex items-center gap-3">
      <div className={`p-2.5 rounded-xl ${bg}`}><Icon className={`w-5 h-5 ${color}`} /></div>
      <h3 className="text-lg font-bold text-foreground font-rubik">{title}</h3>
    </div>
    {children}
  </motion.div>
);

const Row = ({ label, value, sub, highlight, positive, negative }) => (
  <div className={`flex items-start justify-between py-2.5 border-b border-border/20 last:border-0 ${highlight ? "bg-primary/5 -mx-2 px-2 rounded-lg" : ""}`}>
    <div className="flex-1 min-w-0 pl-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
    </div>
    <p className={`text-sm font-semibold font-rubik shrink-0 ${highlight ? "text-primary text-base" : positive ? "text-emerald-600" : negative ? "text-red-500" : "text-foreground"}`}>
      {value}
    </p>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div dir="rtl" className="bg-card border border-border rounded-xl p-3 shadow-lg">
      <p className="text-sm font-semibold mb-1">שנת {label}</p>
      {payload.map((p, i) => <p key={i} className="text-xs" style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}</p>)}
    </div>
  );
};

function projectWithFees(balance, deposit, annualReturnNet, years) {
  if (years <= 0) return balance;
  const mr = annualReturnNet / 100 / 12;
  const n = years * 12;
  if (mr === 0) return balance + deposit * n;
  return balance * Math.pow(1 + mr, n) + deposit * ((Math.pow(1 + mr, n) - 1) / mr);
}

export default function StepResults({ profile, documents, returnMode, manualReturn, onRestart }) {
  const [includeEduAsPension, setIncludeEduAsPension] = useState(false);
  const [useRealReturn, setUseRealReturn] = useState(false);
  const [customCoefficient, setCustomCoefficient] = useState(null);
  const eduDocs = documents.filter(d => d.document_type === "education_fund");
  const hasEduDocs = eduDocs.length > 0;

  const calc = useMemo(() => {
    if (!profile) return null;

    // --- Gather pension documents ---
    // Use aggregated data across ALL pension funds (latest per provider)
    const aggPension = getAggregatedPensionData(documents);
    const latestEdu = getLatestDocumentData(documents, "education_fund");

    // --- Average return: use only latest docs per provider (from aggPension._docs + latestEdu) ---
    const latestPensionDocs = aggPension?._docs || [];
    const latestEduDocs = latestEdu ? [latestEdu] : [];
    const docsWithReturn = [...latestPensionDocs, ...latestEduDocs].filter(d => d.annual_return_pct);
    const avgFromDocs = docsWithReturn.length > 0
      ? docsWithReturn.reduce((s, d) => s + d.annual_return_pct, 0) / docsWithReturn.length
      : 4.5;
    const nominalReturn = returnMode === "auto" ? avgFromDocs : manualReturn;
    const realReturn = Math.max(0, nominalReturn - INFLATION_AVG);

    // --- Average management fee from aggregated pension docs ---
    const pensionDocsWithFee = (aggPension?._docs || []).filter(d => d.management_fee_pct != null && d.management_fee_pct > 0);
    const avgMgmtFee = aggPension?.management_fee_pct != null
      ? aggPension.management_fee_pct
      : 0.5;
    const netReturn = Math.max(0, nominalReturn - avgMgmtFee);
    const realNetReturn = Math.max(0, netReturn - INFLATION_AVG);
    // Active rate: nominal or real per toggle
    const activeReturn = useRealReturn ? realNetReturn : netReturn;

    // --- Pension balances (aggregated across all funds) ---
    // Use total_balance directly — it already includes both תגמולים and פיצויים.
    // No subtraction needed; both components go toward the pension.
    const pensionBalance = aggPension?.total_balance || 0;
    const totalStartBalance = pensionBalance;
    // Total monthly deposit: employee + employer across all funds
    const employeeDeposit = aggPension?.employee_deposit || 0;
    const employerDeposit = aggPension?.employer_deposit || 0;
    const pensionDeposit = (employeeDeposit + employerDeposit) > 0
      ? (employeeDeposit + employerDeposit)
      : (aggPension?.monthly_deposit || 0);
    // Guard: insurance_component must be monthly (< deposit), not a balance mis-extraction
    const rawInsurance = aggPension?.insurance_component || 0;
    const insuranceComponent = (rawInsurance > 0 && rawInsurance < pensionDeposit) ? rawInsurance : 0;
    const netPensionDeposit = Math.max(0, pensionDeposit - insuranceComponent);

    const years = yearsToRetirement(profile.birth_year, profile.retirement_age || 67);
    const currentAge = getCurrentAge(profile.birth_year);
    const months = years * 12;
    const mr = activeReturn / 100 / 12;

    // --- Step-by-step pension projection (uses activeReturn: nominal or real) ---
    const pensionFVLump = totalStartBalance * Math.pow(1 + mr, months);
    const pensionFVAnnuity = mr > 0
      ? netPensionDeposit * ((Math.pow(1 + mr, months) - 1) / mr)
      : netPensionDeposit * months;
    const projectedPensionBalance = pensionFVLump + pensionFVAnnuity;

    // --- Education fund projection ---
    const eduMgmtFee = (() => {
      const eduWithFee = documents.filter(d => d.document_type === "education_fund" && d.management_fee_pct != null && d.management_fee_pct > 0);
      return eduWithFee.length > 0 ? eduWithFee.reduce((s, d) => s + d.management_fee_pct, 0) / eduWithFee.length : 0.5;
    })();
    const eduNetReturn = Math.max(0, nominalReturn - eduMgmtFee);
    const eduActiveReturn = useRealReturn ? Math.max(0, eduNetReturn - INFLATION_AVG) : eduNetReturn;
    const eduBalance = latestEdu?.total_balance || 0;
    const eduDeposit = latestEdu?.monthly_deposit || 0;
    const projectedEduBalance = projectWithFees(eduBalance, eduDeposit, eduActiveReturn, years);

    // --- Pension conversion ---
    const defaultCoefficient = profile.gender === "male" ? 239 : 257;
    const coefficient = customCoefficient || defaultCoefficient;
    const grossPension = projectedPensionBalance / coefficient;

    // --- Education fund as pension (tax-free capital drawdown — not "pension income") ---
    // Assuming edu fund is not cashed out: monthly drawdown over 20 years (240 months)
    const EDU_DRAWDOWN_MONTHS = 240;
    const monthlyEduAsPension = includeEduAsPension
      ? (projectedEduBalance / EDU_DRAWDOWN_MONTHS)
      : 0;
    // Edu fund drawdown is TAX-FREE (after 6 yrs, it's a privileged fund)
    // So we add it directly to net income

    // --- Tax on pension ---
    const taxResult = calculatePensionTax(grossPension, profile.marital_status);
    const oldAgePension = calculateOldAgePension(profile.marital_status, profile.gender);
    const totalNetMonthly = taxResult.netPension + oldAgePension.net + monthlyEduAsPension;

    const replacementRate = profile.current_salary > 0 ? (totalNetMonthly / profile.current_salary) * 100 : 0;

    // --- Projection chart ---
    const projectionData = generateProjectionData(totalStartBalance, netPensionDeposit, activeReturn, years, profile.salary_growth_pct || 2)
      .map((d, i) => ({ ...d, age: currentAge + i }));

    return {
      // Returns
      nominalReturn, realReturn, netReturn, realNetReturn, activeReturn, avgMgmtFee, eduMgmtFee,
      // Pension inputs
      pensionBalance, totalStartBalance,
      pensionDeposit, insuranceComponent, netPensionDeposit,
      // Pension projection
      pensionFVLump, pensionFVAnnuity, projectedPensionBalance, months, mr,
      coefficient, grossPension,
      // Edu fund
      eduBalance, eduDeposit, projectedEduBalance, monthlyEduAsPension, eduNetReturn,
      // Results
      taxResult, oldAgePension, totalNetMonthly, replacementRate,
      projectionData, years, currentAge,
      // Meta
      docsWithReturn, avgFromDocs,
      aggPension, latestEdu,
      pensionDocsWithFee,
      defaultCoefficient, coefficient,
    };
  }, [profile, documents, returnMode, manualReturn, includeEduAsPension, useRealReturn, customCoefficient]);

  if (!calc) return <div className="text-center text-muted-foreground py-20">חסרים פרטים לחישוב</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground font-rubik">תוצאות החישוב</h2>
          <p className="text-muted-foreground text-sm">
            בן {calc.currentAge} • {calc.years} שנים לפרישה •{" "}
            נומינלי: <strong>{formatPercent(calc.nominalReturn)}</strong>{" | "}
            ריאלי נטו: <strong>{formatPercent(calc.realNetReturn)}</strong>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ExportReport profile={profile} calculations={{ years: calc.years, avgReturn: calc.netReturn, balance: calc.pensionBalance, deposit: calc.pensionDeposit, projectedBalance: calc.projectedPensionBalance, monthlyPension: calc.grossPension, taxBreakdown: calc.taxResult }} documents={documents} />
          <Button variant="outline" onClick={onRestart} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            חישוב חדש
          </Button>
        </div>
      </motion.div>

      {/* Controls row: return type + coefficient */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-muted/40 rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">טיפוס חישוב:</span>
          <div className="flex rounded-lg border border-border overflow-hidden text-sm">
            <button onClick={() => setUseRealReturn(false)}
              className={`px-3 py-1.5 transition-colors ${!useRealReturn ? 'bg-primary text-white font-semibold' : 'bg-card text-muted-foreground hover:bg-muted'}`}>
              נומינלי ({formatPercent(calc.netReturn)})
            </button>
            <button onClick={() => setUseRealReturn(true)}
              className={`px-3 py-1.5 transition-colors ${useRealReturn ? 'bg-primary text-white font-semibold' : 'bg-card text-muted-foreground hover:bg-muted'}`}>
              ריאלי ({formatPercent(calc.realNetReturn)})
            </button>
          </div>
          <span className="text-xs text-muted-foreground hidden sm:block">
            {useRealReturn ? 'בערכי היום — בניכוי אינפלציה' : 'מוניטרין נומינלית — ערך פנקאי'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">מקדם אקטוארי:</span>
          <input
            type="number"
            value={customCoefficient || calc.defaultCoefficient}
            min={200} max={320} step={1}
            onChange={e => setCustomCoefficient(Number(e.target.value) || null)}
            className="w-20 border border-border rounded-lg px-2 py-1 text-sm text-center bg-card focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {customCoefficient && customCoefficient !== calc.defaultCoefficient && (
            <button onClick={() => setCustomCoefficient(null)} className="text-xs text-muted-foreground hover:text-foreground underline">ברירת מחדל</button>
          )}
          <span className="text-xs text-muted-foreground hidden sm:block">ברירת מחדל: {calc.defaultCoefficient}</span>
        </div>
      </motion.div>

      {/* Edu fund toggle */}
      {hasEduDocs && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-amber-900 text-sm">קרן השתלמות — כלול בקצבה החודשית?</p>
            <p className="text-xs text-amber-700 mt-0.5">
              הנחה: לא תפרע את הקרן — משיכה כקצבה חודשית על פני 20 שנה (פטורה ממס).
              צבירה צפויית: <strong>{formatCurrency(calc.projectedEduBalance)}</strong> → {formatCurrency(calc.projectedEduBalance / 240)}/חודש
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Switch id="edu-pension" checked={includeEduAsPension} onCheckedChange={setIncludeEduAsPension} />
            <Label htmlFor="edu-pension" className="text-sm font-medium">{includeEduAsPension ? "כן" : "לא"}</Label>
          </div>
        </motion.div>
      )}

      {/* Summary hero */}
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
        className="bg-gradient-to-l from-primary to-primary/80 rounded-2xl p-6 text-white space-y-4">
        <p className="text-primary-foreground/80 text-sm font-medium">סה"כ הכנסה חודשית נטו צפויה בפרישה</p>
        <p className="text-5xl font-bold font-rubik">{formatCurrency(calc.totalNetMonthly)}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-primary-foreground/70 text-xs">תשואה נומינלית</p>
            <p className="font-bold text-white font-rubik text-lg">{formatPercent(calc.nominalReturn)}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-primary-foreground/70 text-xs">תשואה ריאלית נטו</p>
            <p className="font-bold text-white font-rubik text-lg">{formatPercent(calc.realNetReturn)}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-primary-foreground/70 text-xs">שיעור החלפה</p>
            <p className="font-bold text-white font-rubik text-lg">{formatPercent(calc.replacementRate)}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-primary-foreground/70 text-xs">צבירה בפרישה</p>
            <p className="font-bold text-white font-rubik text-lg">{formatCurrency(calc.projectedPensionBalance).replace('₪','₪')}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-primary-foreground/80 border-t border-white/20 pt-3">
          <span>קצבת פנסיה נטו: <strong className="text-white">{formatCurrency(calc.taxResult.netPension)}</strong></span>
          <span>קצבת זקנה: <strong className="text-white">{formatCurrency(calc.oldAgePension.net)}</strong></span>
          {includeEduAsPension && <span>קרן השתלמות: <strong className="text-white">{formatCurrency(calc.monthlyEduAsPension)}</strong></span>}
        </div>
      </motion.div>

      {/* Above market warning */}
      {calc.nominalReturn > MARKET_LONGTERM_NOMINAL && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-semibold text-amber-800">
              התשואה שנבחרה ({formatPercent(calc.nominalReturn)}) גבוהה מהממוצע ארוך הטווח בשוק
            </p>
            <p className="text-amber-700">
              ממוצע קרנות הפנסיה בישראל לאורך 30 שנה עומד על{" "}
              <strong>{formatPercent(MARKET_LONGTERM_NOMINAL)} נומינלי</strong>.{" "}
              ייתכן שהתשואה בדוחות שלך גבוהה בשנים טובות, אך קשה לשמר אותה לאורך עשרות שנים.
            </p>
          </div>
        </motion.div>
      )}

      {/* Section 1: Extracted data */}
      <Section icon={FileText} title="נתונים שחולצו מהמסמכים" color="text-blue-600" bg="bg-blue-50" delay={0.15}>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">לא הועלו מסמכים — נעשה שימוש בנתוני ברירת מחדל</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              {documents.map((doc, i) => (
                <div key={i} className="p-3 rounded-xl bg-muted/50 text-sm">
                  <p className="font-semibold text-foreground">
                    {doc.document_type === "education_fund" ? "🎓" : "🛡"} {doc.file_name}
                    {doc.year ? ` (${doc.year})` : ""} {doc.provider_name ? `• ${doc.provider_name}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 mt-1.5 text-muted-foreground text-xs">
                    {doc.total_balance != null && <span>יתרה: <strong className="text-foreground">{formatCurrency(doc.total_balance)}</strong></span>}
                    {doc.annual_return_pct != null && <span>תשואה שנתית: <strong className="text-emerald-600">{formatPercent(doc.annual_return_pct)}</strong></span>}
                    {doc.monthly_deposit != null && <span>הפקדה: <strong className="text-foreground">{formatCurrency(doc.monthly_deposit)}</strong></span>}
                    {doc.management_fee_pct != null && <span>דמי ניהול: <strong className="text-red-500">{formatPercent(doc.management_fee_pct)}</strong></span>}
                    {doc.insurance_component != null && doc.insurance_component > 0 && <span>רכיב ביטוח: <strong className="text-foreground">{formatCurrency(doc.insurance_component)}</strong></span>}
                    {doc.severance_balance != null && doc.severance_balance > 0 && <span>פיצויים: <strong className="text-foreground">{formatCurrency(doc.severance_balance)}</strong></span>}
                    {doc.compensation_balance != null && doc.compensation_balance > 0 && <span>תגמולים: <strong className="text-foreground">{formatCurrency(doc.compensation_balance)}</strong></span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border/30 pt-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">ערכים בשימוש לחישוב הפנסיה</p>
              <Row label="יתרה כוללת (תגמולים + עודף פיצויים)" value={formatCurrency(calc.totalStartBalance)}
                sub={calc.severanceBalance > 0 ? `פיצויים: ${formatCurrency(calc.severanceBalance)} | תגמולים: ${formatCurrency(calc.pensionCompBalance)}` : "מהדוח האחרון"} />
              <Row label="הפקדה חודשית נטו (בניכוי רכיב ביטוח)" value={formatCurrency(calc.netPensionDeposit)}
                sub={calc.insuranceComponent > 0 ? `הפקדה ברוטו ${formatCurrency(calc.pensionDeposit)} פחות ביטוח ${formatCurrency(calc.insuranceComponent)}` : "מהדוח האחרון"} />
              {calc.docsWithReturn.length > 0 && (
                <Row label={`תשואה ממוצעת מ-${calc.docsWithReturn.length} דוחות (ארוכת טווח)`}
                  value={formatPercent(calc.avgFromDocs)}
                  sub={calc.docsWithReturn.map(d => `${d.year || "?"}: ${formatPercent(d.annual_return_pct)}`).join(" | ")}
                  positive />
              )}
              <Row label={`דמי ניהול ממוצעים (מ-${calc.pensionDocsWithFee.length || "ברירת מחדל"} דוחות)`}
                value={`− ${formatPercent(calc.avgMgmtFee)}`}
                sub={calc.pensionDocsWithFee.length > 0 ? calc.pensionDocsWithFee.map(d => `${d.provider_name || d.file_name}: ${formatPercent(d.management_fee_pct)}`).join(" | ") : "ממוצע שוק כברירת מחדל"}
                negative />
              <Row label="תשואה נומינלית נטו (לאחר דמי ניהול)" value={formatPercent(calc.netReturn)} highlight />
              <Row label="תשואה ריאלית נטו (בניכוי אינפלציה 2.5%)" value={formatPercent(calc.realNetReturn)} positive
                sub="ממוצע אינפלציה היסטורי ישראל לטווח ארוך" />
            </div>
          </div>
        )}
      </Section>

      {/* Section 2: Calculation breakdown */}
      <Section icon={Calculator} title="דרך החישוב — שלב אחר שלב" color="text-purple-600" bg="bg-purple-50" delay={0.2}>
        <div className="space-y-1 text-sm">
          <div className="p-3 bg-muted/40 rounded-xl font-mono text-xs mb-3 space-y-1">
            <p className="font-semibold text-foreground mb-1">נוסחת צבירה (FV):</p>
            <p>FV = יתרה × (1 + r)ⁿ + הפקדה × [(1 + r)ⁿ - 1] / r</p>
            <p className="text-muted-foreground">r בשימוש ({useRealReturn ? 'ריאלי' : 'נומינלי'} נטו) = {formatPercent(calc.activeReturn)} ÷ 12 = {(calc.mr * 100).toFixed(4)}% לחודש</p>
            <p className="text-muted-foreground">r נומינלי נטו = {formatPercent(calc.netReturn)} | ריאלי נטו = {formatPercent(calc.realNetReturn)} (בניכוי אינפלציה ~2.5%)</p>
            <p className="text-muted-foreground">n = {calc.years} שנים × 12 = {calc.months} חודשים</p>
            <p className="text-amber-600 mt-1">ממוצע שוק ארוך טווח (30 שנה): {formatPercent(MARKET_LONGTERM_NOMINAL)} נומינלי / {formatPercent(MARKET_LONGTERM_REAL)} ריאלי</p>
          </div>

          {/* Severance breakdown */}
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 space-y-1 mb-2">
            <p className="text-xs font-semibold text-blue-700 mb-2">📊 יתרה כוללת (תגמולים + פיצויים)</p>
            <Row label="יתרה כוללת מהדוח"
              value={formatCurrency(calc.pensionBalance)}
              sub="כולל תגמולים ופיצויים — כפי שמופיע בדוח" highlight />
          </div>

          <Row label="יתרת פתיחה לחישוב" value={formatCurrency(calc.totalStartBalance)} highlight />
          <Row label="צמיחת יתרה (ריבית דריבית)"
            value={formatCurrency(calc.pensionFVLump)}
            sub={`${formatCurrency(calc.totalStartBalance)} × (1 + ${(calc.mr * 100).toFixed(4)}%)^${calc.months}`} positive />
          <Row label="צמיחת הפקדות נטו (אנואיטי)"
            value={formatCurrency(calc.pensionFVAnnuity)}
            sub={`${formatCurrency(calc.netPensionDeposit)}/חודש × [(1+r)ⁿ - 1] / r | r=${(calc.mr*100).toFixed(4)}% לחודש`} positive />
          <Row label="סה״כ צבירה בפרישה" value={formatCurrency(calc.projectedPensionBalance)} highlight />

          <div className="border-t border-border/30 pt-3 mt-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">המרה לקצבה</p>
            <Row label="מקדם המרה אקטוארי"
              value={calc.coefficient}
              sub={`${profile.gender === "male" ? "גבר, גיל 67" : "אישה, גיל 65"} — תוחלת חיים עוד ~${(calc.coefficient / 12) | 0} שנים${calc.coefficient !== calc.defaultCoefficient ? ' (מותאם אישית)' : ''}`} />
            <Row label="קצבה ברוטו חודשית"
              value={formatCurrency(calc.grossPension)}
              sub={`${formatCurrency(calc.projectedPensionBalance)} ÷ ${calc.coefficient}`} highlight />
          </div>
        </div>
      </Section>

      {/* Section 3: Tax breakdown */}
      <Section icon={Wallet} title="מיסים וניכויים על הקצבה" color="text-red-600" bg="bg-red-50" delay={0.25}>
        <div className="space-y-1">
          <Row label="קצבה ברוטו" value={formatCurrency(calc.taxResult.grossPension)} />
          <Row label="פטור ממס (43.5%, עד ₪8,800/חודש)"
            value={`− ${formatCurrency(calc.taxResult.exemptAmount)}`}
            sub="סעיף 9א לפקודת מס הכנסה" positive />
          <Row label="הכנסה חייבת במס" value={formatCurrency(calc.taxResult.taxableIncome)} sub="ברוטו פחות הפטור" />
          <Row label="מס הכנסה (מדרגות 2024/25)"
            value={`− ${formatCurrency(calc.taxResult.incomeTax)}`}
            sub={`${profile.marital_status === "married" ? "2.75" : "2.25"} נקודות זיכוי`} negative />
          <Row label="ביטוח לאומי (0.4% — גמלאים)"
            value={`− ${formatCurrency(calc.taxResult.nationalInsurance)}`} negative />
          <Row label="ביטוח בריאות (3.1%)"
            value={`− ${formatCurrency(calc.taxResult.healthInsurance)}`} negative />
          <Row label="סה״כ ניכויים"
            value={`− ${formatCurrency(calc.taxResult.totalDeductions)}`}
            sub={`שיעור מס אפקטיבי: ${formatPercent(calc.taxResult.effectiveTaxRate)}`} negative />
          <Row label="קצבת פנסיה נטו" value={formatCurrency(calc.taxResult.netPension)} highlight />
        </div>
      </Section>

      {/* Section 4: Old age pension */}
      <Section icon={TrendingUp} title="קצבת זקנה (ביטוח לאומי)" color="text-emerald-600" bg="bg-emerald-50" delay={0.3}>
        <div className="space-y-1">
          <Row label="קצבת זקנה בסיסית (2025)"
            value={formatCurrency(calc.oldAgePension.base)}
            sub={profile.marital_status === "married" ? "נשוי/אה — 150% מהסכום הבסיסי" : "יחיד/ה"} />
          <Row label="ניכויים" value="₪0" sub="גמלאים פטורים מביטוח לאומי על קצבת הזקנה" />
          <Row label="קצבת זקנה נטו" value={formatCurrency(calc.oldAgePension.net)} highlight />
          <div className="mt-3 p-3 rounded-xl bg-emerald-50 text-xs text-emerald-700 border border-emerald-100">
            💡 הסכום תלוי בשנות הביטוח ובהכנסות. המספר המוצג הוא הקצבה הבסיסית לפי מצב משפחתי.
          </div>
        </div>
      </Section>

      {/* Section 5: Education fund breakdown */}
      {hasEduDocs && (
        <Section icon={GraduationCap} title="קרן השתלמות" color="text-amber-600" bg="bg-amber-50" delay={0.32}>
          <div className="space-y-1">
            <Row label="יתרה נוכחית" value={formatCurrency(calc.eduBalance)} />
            <Row label="הפקדה חודשית" value={formatCurrency(calc.eduDeposit)} />
            <Row label="תשואה נטו (לאחר דמי ניהול)" value={formatPercent(calc.eduNetReturn)}
              sub={`דמי ניהול ממוצעים: ${formatPercent(calc.eduMgmtFee)}`} positive />
            <Row label="צבירה צפויה בפרישה" value={formatCurrency(calc.projectedEduBalance)} highlight />
            {includeEduAsPension && (
              <>
                <Row label="משיכה חודשית (20 שנה, 240 חודשים)"
                  value={formatCurrency(calc.monthlyEduAsPension)}
                  sub="פטורה ממס לאחר 6 שנות ותק בקרן" positive />
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700 mt-2">
                  ✅ משיכת קרן השתלמות לאחר 6 שנים — <strong>פטורה ממס הכנסה וביטוח לאומי</strong>.
                </div>
              </>
            )}
          </div>
        </Section>
      )}

      {/* Section 6: Chart */}
      <Section icon={TrendingUp} title="תחזית צבירה לאורך השנים" color="text-cyan-600" bg="bg-cyan-50" delay={0.35}>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={calc.projectionData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(221,83%,53%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(221,83%,53%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => `₪${(v / 1000000).toFixed(1)}M`} width={65} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="balance" name="צבירה נטו" stroke="hsl(221,83%,53%)" fill="url(#grad)" strokeWidth={2.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground text-center">הגרף מציג צבירת פנסיה לפי תשואה {formatPercent(calc.netReturn)} נטו (לאחר דמי ניהול)</p>
      </Section>

      {/* Final summary */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="bg-gradient-to-l from-primary/5 via-primary/8 to-primary/5 rounded-2xl p-6 border border-primary/20 space-y-4">
        <h3 className="text-lg font-bold text-foreground font-rubik">סיכום סופי</h3>
        <div className={`grid grid-cols-2 gap-4 text-sm ${includeEduAsPension && hasEduDocs ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
          <div><p className="text-muted-foreground">קצבת פנסיה נטו</p><p className="text-xl font-bold text-foreground font-rubik mt-1">{formatCurrency(calc.taxResult.netPension)}</p></div>
          <div><p className="text-muted-foreground">קצבת זקנה</p><p className="text-xl font-bold text-foreground font-rubik mt-1">{formatCurrency(calc.oldAgePension.net)}</p></div>
          {includeEduAsPension && hasEduDocs && (
            <div><p className="text-muted-foreground">קרן השתלמות</p><p className="text-xl font-bold text-amber-600 font-rubik mt-1">{formatCurrency(calc.monthlyEduAsPension)}</p></div>
          )}
          <div><p className="text-muted-foreground">סה"כ הכנסה חודשית</p><p className="text-xl font-bold text-primary font-rubik mt-1">{formatCurrency(calc.totalNetMonthly)}</p></div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border/30 pt-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>החישוב מבוסס על תשואה {formatPercent(calc.nominalReturn)} נומינלי, בניכוי {formatPercent(calc.avgMgmtFee)} דמי ניהול → {formatPercent(calc.netReturn)} נטו ({formatPercent(calc.realNetReturn)} ריאלי). אין בכך ייעוץ פנסיוני מורשה.</span>
        </div>
      </motion.div>
    </div>
  );
}