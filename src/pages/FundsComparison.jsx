import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, TrendingDown, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { formatPercent, formatCurrency } from "../lib/pensionCalculations";

// Static fund data (major Israeli pension funds - approximate data)
const FUNDS_DATA = [
  {
    name: "מנורה מבטחים פנסיה",
    type: "pension",
    returns: { "2019": 17.2, "2020": 4.3, "2021": 12.8, "2022": -8.1, "2023": 11.4, "2024": 9.2 },
    managementFeeBalance: 0.05,
    managementFeeDeposit: 0.5,
    assets: 180000,
    rating: 4,
    color: "#3b82f6"
  },
  {
    name: "הפניקס אקסלנס פנסיה",
    type: "pension",
    returns: { "2019": 18.1, "2020": 3.9, "2021": 13.5, "2022": -7.8, "2023": 12.1, "2024": 8.9 },
    managementFeeBalance: 0.05,
    managementFeeDeposit: 0.6,
    assets: 145000,
    rating: 5,
    color: "#10b981"
  },
  {
    name: "מגדל מקפת פנסיה",
    type: "pension",
    returns: { "2019": 16.8, "2020": 4.1, "2021": 12.2, "2022": -8.4, "2023": 10.9, "2024": 8.5 },
    managementFeeBalance: 0.06,
    managementFeeDeposit: 0.5,
    assets: 132000,
    rating: 4,
    color: "#f59e0b"
  },
  {
    name: "כלל פנסיה",
    type: "pension",
    returns: { "2019": 16.5, "2020": 3.7, "2021": 11.9, "2022": -7.5, "2023": 11.2, "2024": 8.7 },
    managementFeeBalance: 0.05,
    managementFeeDeposit: 0.5,
    assets: 125000,
    rating: 4,
    color: "#8b5cf6"
  },
  {
    name: "הראל פנסיה",
    type: "pension",
    returns: { "2019": 17.5, "2020": 4.5, "2021": 13.1, "2022": -7.9, "2023": 11.8, "2024": 9.4 },
    managementFeeBalance: 0.05,
    managementFeeDeposit: 0.5,
    assets: 115000,
    rating: 5,
    color: "#ec4899"
  },
  {
    name: "אנליסט קרן השתלמות",
    type: "education_fund",
    returns: { "2019": 19.2, "2020": 5.1, "2021": 14.3, "2022": -9.1, "2023": 13.2, "2024": 10.1 },
    managementFeeBalance: 0.5,
    managementFeeDeposit: 0,
    assets: 28000,
    rating: 5,
    color: "#ef4444"
  },
  {
    name: "מור קרן השתלמות",
    type: "education_fund",
    returns: { "2019": 18.7, "2020": 4.8, "2021": 13.9, "2022": -8.7, "2023": 12.8, "2024": 9.7 },
    managementFeeBalance: 0.45,
    managementFeeDeposit: 0,
    assets: 35000,
    rating: 4,
    color: "#06b6d4"
  },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div dir="rtl" className="bg-card border border-border rounded-xl p-3 shadow-lg">
      <p className="text-sm font-semibold mb-1">שנת {label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>
          {p.name}: {p.value > 0 ? "+" : ""}{p.value?.toFixed(1)}%
        </p>
      ))}
    </div>
  );
};

function Stars({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-3 h-3 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
      ))}
    </div>
  );
}

export default function FundsComparison() {
  const [filterType, setFilterType] = useState("pension");
  const [selectedFunds, setSelectedFunds] = useState(["מנורה מבטחים פנסיה", "הפניקס אקסלנס פנסיה", "הראל פנסיה"]);

  const visibleFunds = FUNDS_DATA.filter(f => f.type === filterType);

  const toggleFund = (name) => {
    setSelectedFunds(prev =>
      prev.includes(name) ? (prev.length > 1 ? prev.filter(n => n !== name) : prev) : [...prev, name]
    );
  };

  const chartData = useMemo(() => {
    const years = ["2019", "2020", "2021", "2022", "2023", "2024"];
    return years.map(year => {
      const point = { year };
      FUNDS_DATA.filter(f => selectedFunds.includes(f.name)).forEach(fund => {
        point[fund.name] = fund.returns[year];
      });
      return point;
    });
  }, [selectedFunds]);

  const avgReturn = (fund) => {
    const vals = Object.values(fund.returns);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground font-rubik">השוואת ביצועי קרנות</h1>
        <p className="text-muted-foreground">השווה בין קרנות הפנסיה וקרנות ההשתלמות המובילות בישראל</p>
      </motion.div>

      {/* Filter type */}
      <div className="flex gap-2">
        <button onClick={() => { setFilterType("pension"); setSelectedFunds(["מנורה מבטחים פנסיה", "הפניקס אקסלנס פנסיה"]); }}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${filterType === "pension" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
          קרנות פנסיה
        </button>
        <button onClick={() => { setFilterType("education_fund"); setSelectedFunds(["אנליסט קרן השתלמות", "מור קרן השתלמות"]); }}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${filterType === "education_fund" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
          קרנות השתלמות
        </button>
      </div>

      {/* Fund cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleFunds.map((fund, i) => {
          const avg = avgReturn(fund);
          const isSelected = selectedFunds.includes(fund.name);
          return (
            <motion.div key={fund.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              onClick={() => toggleFund(fund.name)}
              className={`bg-card rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-md ${
                isSelected ? "border-primary shadow-sm" : "border-border/50"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{fund.name}</p>
                  <Stars rating={fund.rating} />
                </div>
                <div className="w-3 h-3 rounded-full mt-1" style={{ backgroundColor: isSelected ? fund.color : "hsl(0,0%,80%)" }} />
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>תשואה ממוצעת 6 שנים</span>
                  <span className={`font-semibold font-rubik ${avg >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {avg >= 0 ? "+" : ""}{avg.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>נכסים מנוהלים</span>
                  <span className="font-semibold text-foreground">{fund.assets.toLocaleString("he-IL")}M ₪</span>
                </div>
                <div className="flex justify-between">
                  <span>דמי ניהול מצבירה</span>
                  <span className="font-semibold text-foreground">{fund.managementFeeBalance}%</span>
                </div>
                {fund.managementFeeDeposit > 0 && (
                  <div className="flex justify-between">
                    <span>דמי ניהול מהפקדה</span>
                    <span className="font-semibold text-foreground">{fund.managementFeeDeposit}%</span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Return chart */}
      <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-foreground font-rubik mb-6">תשואות שנתיות השוואתיות</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} width={50} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {FUNDS_DATA.filter(f => selectedFunds.includes(f.name)).map(fund => (
                <Line key={fund.name} type="monotone" dataKey={fund.name} stroke={fund.color}
                  strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground text-center">
        * הנתונים הם לצורך המחשה בלבד. תשואות עבר אינן מבטיחות תשואות עתיד. מקורות: אתר גמל-נט, רשות שוק ההון.
      </p>
    </div>
  );
}