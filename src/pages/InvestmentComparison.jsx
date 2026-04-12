import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatPercent, projectBalance, calculateMonthlyPension, calculatePensionTax } from "../lib/pensionCalculations";

const TRACKS = [
  { id: "general", label: "מסלול כללי", returnPct: 5.5, riskLevel: "בינוני", color: "#3b82f6", description: "מסלול מאוזן עם חשיפה מניות בינונית" },
  { id: "stocks", label: "מסלול מניות", returnPct: 8.2, riskLevel: "גבוה", color: "#10b981", description: "חשיפה גבוהה למניות - תנודתיות גבוהה, תשואה פוטנציאלית גבוהה" },
  { id: "bonds", label: "מסלול אג\"ח", returnPct: 3.8, riskLevel: "נמוך", color: "#f59e0b", description: "בעיקר אגרות חוב - יציב אך תשואה נמוכה" },
  { id: "halacha", label: "מסלול הלכתי", returnPct: 4.9, riskLevel: "בינוני-נמוך", color: "#8b5cf6", description: "השקעות בהתאם להלכה היהודית" },
  { id: "conservative", label: "מסלול שמרני", returnPct: 3.2, riskLevel: "נמוך מאוד", color: "#ec4899", description: "נזילות גבוהה, תשואה נמוכה, מינימום סיכון" },
  { id: "aggressive", label: "מסלול אגרסיבי", returnPct: 9.5, riskLevel: "גבוה מאוד", color: "#ef4444", description: "מקסימום חשיפה מנייתית עם פוטנציאל תשואה עצום" },
];

const RISK_COLOR = {
  "נמוך מאוד": "bg-emerald-100 text-emerald-700",
  "נמוך": "bg-green-100 text-green-700",
  "בינוני-נמוך": "bg-lime-100 text-lime-700",
  "בינוני": "bg-yellow-100 text-yellow-700",
  "גבוה": "bg-orange-100 text-orange-700",
  "גבוה מאוד": "bg-red-100 text-red-700",
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div dir="rtl" className="bg-card border border-border rounded-xl p-3 shadow-lg">
      <p className="text-sm font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}</p>
      ))}
    </div>
  );
};

export default function InvestmentComparison() {
  const [balance, setBalance] = useState(500000);
  const [deposit, setDeposit] = useState(3000);
  const [years, setYears] = useState(20);
  const [selectedTracks, setSelectedTracks] = useState(["general", "stocks", "bonds"]);

  const toggleTrack = (id) => {
    setSelectedTracks(prev =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter(t => t !== id) : prev) : [...prev, id]
    );
  };

  const chartData = useMemo(() => {
    const milestones = [5, 10, 15, 20, 25, 30].filter(y => y <= years + 1);
    return milestones.map(y => {
      const point = { year: `שנה ${y}` };
      TRACKS.filter(t => selectedTracks.includes(t.id)).forEach(t => {
        point[t.label] = Math.round(projectBalance(balance, deposit, t.returnPct, y));
      });
      return point;
    });
  }, [balance, deposit, years, selectedTracks]);

  const results = useMemo(() => {
    return TRACKS.filter(t => selectedTracks.includes(t.id)).map(track => {
      const projectedBalance = projectBalance(balance, deposit, track.returnPct, years);
      const pension = calculateMonthlyPension(projectedBalance, "male");
      const tax = calculatePensionTax(pension, "single");
      return { ...track, projectedBalance, monthlyPension: tax.netPension };
    }).sort((a, b) => b.projectedBalance - a.projectedBalance);
  }, [balance, deposit, years, selectedTracks]);

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground font-rubik">השוואת מסלולי השקעה</h1>
        <p className="text-muted-foreground">השווה בין מסלולי ההשקעה השונים וראה את ההשפעה על הפנסיה שלך</p>
      </motion.div>

      {/* Parameters */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm space-y-6">
        <h3 className="text-lg font-bold text-foreground font-rubik">פרמטרים</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label className="text-sm text-muted-foreground">יתרה נוכחית</Label>
              <span className="text-sm font-semibold font-rubik">{formatCurrency(balance)}</span>
            </div>
            <Slider value={[balance]} min={0} max={3000000} step={10000} onValueChange={([v]) => setBalance(v)} />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label className="text-sm text-muted-foreground">הפקדה חודשית</Label>
              <span className="text-sm font-semibold font-rubik">{formatCurrency(deposit)}</span>
            </div>
            <Slider value={[deposit]} min={500} max={15000} step={100} onValueChange={([v]) => setDeposit(v)} />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label className="text-sm text-muted-foreground">שנות חיסכון</Label>
              <span className="text-sm font-semibold font-rubik">{years} שנים</span>
            </div>
            <Slider value={[years]} min={5} max={40} step={1} onValueChange={([v]) => setYears(v)} />
          </div>
        </div>
      </motion.div>

      {/* Track selector */}
      <div className="flex flex-wrap gap-2">
        {TRACKS.map(track => (
          <button
            key={track.id}
            onClick={() => toggleTrack(track.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
              selectedTracks.includes(track.id)
                ? "text-white border-transparent"
                : "bg-muted text-muted-foreground border-border hover:border-primary/50"
            }`}
            style={selectedTracks.includes(track.id) ? { backgroundColor: track.color, borderColor: track.color } : {}}
          >
            {track.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-foreground font-rubik mb-6">התפתחות הצבירה לאורך הזמן</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₪${(v / 1000000).toFixed(1)}M`} width={70} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {TRACKS.filter(t => selectedTracks.includes(t.id)).map(track => (
                <Bar key={track.id} dataKey={track.label} fill={track.color} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Results table */}
      <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-foreground font-rubik mb-4">סיכום השוואה</h3>
        <div className="space-y-3">
          {results.map((track, i) => (
            <motion.div key={track.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-muted/50">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: track.color }} />
                <div>
                  <p className="text-sm font-semibold text-foreground">{track.label}</p>
                  <p className="text-xs text-muted-foreground">{track.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${RISK_COLOR[track.riskLevel]}`}>{track.riskLevel}</span>
                <span className="text-muted-foreground">תשואה: <span className="font-semibold text-foreground">{formatPercent(track.returnPct)}</span></span>
                <span className="text-muted-foreground">צבירה: <span className="font-semibold text-foreground font-rubik">{formatCurrency(track.projectedBalance)}</span></span>
                <span className="text-muted-foreground">קצבה נטו: <span className="font-semibold text-primary font-rubik">{formatCurrency(track.monthlyPension)}</span></span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}