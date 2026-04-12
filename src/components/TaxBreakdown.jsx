import { formatCurrency, formatPercent } from "../lib/pensionCalculations";
import { motion } from "framer-motion";
import { TrendingDown, Shield, Heart, Landmark } from "lucide-react";

export default function TaxBreakdown({ taxData }) {
  if (!taxData) return null;

  const items = [
    { label: "קצבה ברוטו", value: taxData.grossPension, icon: Landmark, positive: true },
    { label: "פטור ממס (43.5%)", value: taxData.exemptAmount, icon: Shield, info: true },
    { label: "מס הכנסה", value: taxData.incomeTax, icon: TrendingDown, negative: true },
    { label: "ביטוח בריאות", value: taxData.healthInsurance, icon: Heart, negative: true },
    { label: "ביטוח לאומי", value: taxData.nationalInsurance, icon: Shield, negative: true },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm"
    >
      <h3 className="text-lg font-bold text-foreground mb-6 font-rubik">פירוט מיסים וניכויים</h3>
      
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                item.positive ? "bg-emerald-50 text-emerald-600" :
                item.info ? "bg-primary/10 text-primary" :
                "bg-red-50 text-red-500"
              }`}>
                <item.icon className="w-4 h-4" />
              </div>
              <span className="text-sm text-muted-foreground">{item.label}</span>
            </div>
            <span className={`text-sm font-semibold font-rubik ${
              item.positive ? "text-emerald-600" :
              item.info ? "text-primary" :
              "text-red-500"
            }`}>
              {item.negative ? "-" : ""}{formatCurrency(item.value)}
            </span>
          </div>
        ))}
      </div>

      {/* Net pension highlight */}
      <div className="mt-6 p-4 rounded-xl bg-gradient-to-l from-primary/5 to-primary/10 border border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">קצבה נטו (לאחר מס)</p>
            <p className="text-xs text-muted-foreground mt-1">
              שיעור מס אפקטיבי: {formatPercent(taxData.effectiveTaxRate)}
            </p>
          </div>
          <p className="text-2xl font-bold text-primary font-rubik">
            {formatCurrency(taxData.netPension)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}