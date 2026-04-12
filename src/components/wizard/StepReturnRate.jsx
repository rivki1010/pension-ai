import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, TrendingUp, Sliders, AlertTriangle } from "lucide-react";
import { calculateAverageReturn, formatPercent } from "../../lib/pensionCalculations";

// Israeli pension fund long-term historical averages (30-year, source: רשות שוק ההון)
const MARKET_AVG_NOMINAL = 6.8; // % nominal (30yr avg)
const INFLATION_AVG = 2.5;      // % average long-term inflation
const MARKET_AVG_REAL = MARKET_AVG_NOMINAL - INFLATION_AVG; // ~4.3% real

export default function StepReturnRate({ documents, onNext, onBack }) {
  const avgFromDocs = calculateAverageReturn(documents);
  const [mode, setMode] = useState(documents.length > 0 ? "auto" : "manual");
  const [manualValue, setManualValue] = useState(avgFromDocs || 5);

  const effectiveReturn = mode === "auto" ? avgFromDocs : manualValue;
  const realReturn = Math.max(0, effectiveReturn - INFLATION_AVG);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-primary/10">
          <TrendingUp className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground font-rubik">בחירת תשואה לחישוב</h2>
          <p className="text-muted-foreground text-sm">בחר כיצד לחשב את תשואת ההשקעה הצפויה</p>
        </div>
      </div>

      {/* Market avg info */}
      <div className="bg-muted/40 rounded-xl p-4 text-sm flex flex-wrap gap-x-6 gap-y-2">
        <div>
          <p className="text-xs text-muted-foreground">ממוצע שוק ישראל (30 שנה, ארוך טווח)</p>
          <p className="font-bold text-foreground font-rubik">{formatPercent(MARKET_AVG_NOMINAL)} נומינלי</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">ממוצע ריאלי (בניכוי אינפלציה ~2.5%)</p>
          <p className="font-bold text-foreground font-rubik">{formatPercent(MARKET_AVG_REAL)} ריאלי</p>
        </div>
        <div className="text-xs text-muted-foreground self-end">
          מקור: רשות שוק ההון, ממוצע קרנות פנסיה מקיפות (30 שנה)
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Auto option */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => setMode("auto")}
          disabled={documents.length === 0}
          className={`text-right p-5 rounded-2xl border-2 transition-all space-y-3 ${
            mode === "auto"
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-border bg-card hover:border-primary/40"
          } ${documents.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <div className="flex items-center justify-between">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${mode === "auto" ? "border-primary" : "border-border"}`}>
              {mode === "auto" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
            </div>
            <TrendingUp className={`w-6 h-6 ${mode === "auto" ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <div>
            <p className="font-bold text-foreground text-lg">תשואה ממוצעת מהמסמכים</p>
            <p className="text-sm text-muted-foreground mt-1">
              {documents.length > 0
                ? `מחושב מ-${documents.filter(d => d.annual_return_pct).length} דוחות`
                : "לא הועלו מסמכים"}
            </p>
          </div>
          {documents.length > 0 && (
            <div className="p-3 rounded-xl bg-primary/10 space-y-1">
              <div className="flex justify-between items-baseline">
                <p className="text-xs text-muted-foreground">נומינלי</p>
                <p className="text-2xl font-bold text-primary font-rubik">{formatPercent(avgFromDocs)}</p>
              </div>
              <div className="flex justify-between items-baseline">
                <p className="text-xs text-muted-foreground">ריאלי (−{INFLATION_AVG}%)</p>
                <p className="text-lg font-semibold text-emerald-600 font-rubik">{formatPercent(Math.max(0, avgFromDocs - INFLATION_AVG))}</p>
              </div>
            </div>
          )}
        </motion.button>

        {/* Manual option */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => setMode("manual")}
          className={`text-right p-5 rounded-2xl border-2 transition-all space-y-3 ${
            mode === "manual"
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-border bg-card hover:border-primary/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${mode === "manual" ? "border-primary" : "border-border"}`}>
              {mode === "manual" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
            </div>
            <Sliders className={`w-6 h-6 ${mode === "manual" ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <div>
            <p className="font-bold text-foreground text-lg">הגדרה ידנית</p>
            <p className="text-sm text-muted-foreground mt-1">הזן תשואה שנתית לפי הנחתך</p>
          </div>
          {mode === "manual" && (
            <div className="space-y-3 pt-1">
              <div className="p-3 rounded-xl bg-primary/10 space-y-1">
                <div className="flex justify-between items-baseline">
                  <p className="text-xs text-muted-foreground">נומינלי</p>
                  <p className="text-2xl font-bold text-primary font-rubik">{formatPercent(manualValue)}</p>
                </div>
                <div className="flex justify-between items-baseline">
                  <p className="text-xs text-muted-foreground">ריאלי (−{INFLATION_AVG}%)</p>
                  <p className="text-lg font-semibold text-emerald-600 font-rubik">{formatPercent(Math.max(0, manualValue - INFLATION_AVG))}</p>
                </div>
              </div>
              <Slider value={[manualValue]} min={0} max={15} step={0.1}
                onValueChange={([v]) => setManualValue(v)}
                onClick={e => e.stopPropagation()} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span><span>שמרני 4%</span><span>ממוצע 7.2%</span><span>15%</span>
              </div>
            </div>
          )}
        </motion.button>
      </div>

      <div className="flex justify-between items-center pt-2">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowRight className="w-4 h-4" />
          חזור
        </Button>
        <Button onClick={() => onNext({ mode, value: effectiveReturn, realReturn })} size="lg" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          חשב תוצאות
        </Button>
      </div>
    </motion.div>
  );
}

function MarketAvgComparison({ pensionBalance, pensionDeposit, currentReturn, marketReturn }) {
  // Quick projection: 30 years
  const years = 30;
  const months = years * 12;
  const project = (r) => {
    const mr = r / 100 / 12;
    if (mr === 0) return pensionBalance + pensionDeposit * months;
    return pensionBalance * Math.pow(1 + mr, months) + pensionDeposit * ((Math.pow(1 + mr, months) - 1) / mr);
  };
  const coeff = 239;
  const atCurrent = project(currentReturn) / coeff;
  const atMarket = project(marketReturn) / coeff;

  if (!pensionBalance && !pensionDeposit) return null;

  return (
    <div className="mt-2 p-3 rounded-lg bg-amber-100/60 text-xs grid grid-cols-2 gap-2">
      <div>
        <p className="text-amber-600">לפי תשואתך ({formatPercent(currentReturn)})</p>
        <p className="font-bold text-amber-900 text-base font-rubik">
          ₪{Math.round(atCurrent).toLocaleString("he-IL")} /חודש
        </p>
      </div>
      <div>
        <p className="text-amber-600">לפי ממוצע שוק ({formatPercent(marketReturn)})</p>
        <p className="font-bold text-amber-900 text-base font-rubik">
          ₪{Math.round(atMarket).toLocaleString("he-IL")} /חודש
        </p>
      </div>
    </div>
  );
}