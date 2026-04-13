import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, TrendingUp, Sliders } from "lucide-react";
import { calculateAverageReturn, formatPercent } from "../../lib/pensionCalculations";

const INFLATION_AVG = 2.5;

export default function StepReturnRate({ documents, onNext, onBack }) {
  const avgFromDocs = calculateAverageReturn(documents);
  const [mode, setMode] = useState(documents.length > 0 ? "auto" : "manual");
  const [manualValue, setManualValue] = useState(avgFromDocs || 5);

  const effectiveReturn = mode === "auto" ? avgFromDocs : manualValue;
  const realReturn = Math.max(0, effectiveReturn - INFLATION_AVG);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-primary/10"><TrendingUp className="w-6 h-6 text-primary" /></div>
        <div>
          <h2 className="text-2xl font-bold text-foreground font-rubik">בחירת תשואה צפויה</h2>
          <p className="text-muted-foreground text-sm">אפשר להשתמש בתשואות מהמסמכים או להגדיר הנחה ידנית.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setMode("auto")}
          disabled={documents.length === 0}
          className={`text-left p-5 rounded-2xl border-2 transition-all space-y-3 ${
            mode === "auto" ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/40"
          } ${documents.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <div className="flex items-center justify-between">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${mode === "auto" ? "border-primary" : "border-border"}`}>
              {mode === "auto" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
            </div>
            <TrendingUp className={`w-6 h-6 ${mode === "auto" ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <div>
            <p className="font-bold text-foreground text-lg">אוטומטי מהמסמכים</p>
            <p className="text-sm text-muted-foreground mt-1">
              {documents.length > 0 ? `מבוסס על ${documents.filter((d) => d.annual_return_pct).length} מסמכים` : "לא הועלו מסמכים"}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-primary/10">
            <p className="text-2xl font-bold text-primary font-rubik">{formatPercent(avgFromDocs)}</p>
            <p className="text-xs text-muted-foreground">ריאלי: {formatPercent(Math.max(0, avgFromDocs - INFLATION_AVG))}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`text-left p-5 rounded-2xl border-2 transition-all space-y-3 ${
            mode === "manual" ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${mode === "manual" ? "border-primary" : "border-border"}`}>
              {mode === "manual" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
            </div>
            <Sliders className={`w-6 h-6 ${mode === "manual" ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <div>
            <p className="font-bold text-foreground text-lg">הנחה ידנית</p>
            <p className="text-sm text-muted-foreground mt-1">הזן הערכת תשואה שנתית משלך.</p>
          </div>

          {mode === "manual" && (
            <div className="space-y-3 pt-1">
              <div className="p-3 rounded-xl bg-primary/10">
                <p className="text-2xl font-bold text-primary font-rubik">{formatPercent(manualValue)}</p>
                <p className="text-xs text-muted-foreground">ריאלי: {formatPercent(Math.max(0, manualValue - INFLATION_AVG))}</p>
              </div>
              <Slider value={[manualValue]} min={0} max={15} step={0.1} onValueChange={([v]) => setManualValue(v)} />
            </div>
          )}
        </button>
      </div>

      <div className="flex justify-between items-center pt-2">
        <Button variant="outline" onClick={onBack} className="gap-2"><ArrowRight className="w-4 h-4" />חזרה</Button>
        <Button onClick={() => onNext({ mode, value: effectiveReturn, realReturn })} size="lg" className="gap-2"><ArrowLeft className="w-4 h-4" />חשב</Button>
      </div>
    </motion.div>
  );
}
