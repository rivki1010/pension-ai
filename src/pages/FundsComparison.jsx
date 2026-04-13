import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPercent } from "../lib/pensionCalculations";
import { fetchPensionNetData } from "../lib/pensionNetApi";

const COLORS = ["#2563eb", "#059669", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899", "#0ea5e9"];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-lg">
      <p className="text-sm font-semibold mb-1">Year {label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>
          {p.name}: {p.value > 0 ? "+" : ""}{p.value?.toFixed(2)}%
        </p>
      ))}
    </div>
  );
};

export default function FundsComparison() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [funds, setFunds] = useState([]);
  const [meta, setMeta] = useState(null);
  const [selectedFunds, setSelectedFunds] = useState([]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const result = await fetchPensionNetData({ fromPeriod: 201901, limit: 10000 });

        if (!mounted) return;

        setFunds(result.funds);
        setMeta(result.stats);

        const top3 = result.funds.slice(0, 3).map((f) => f.id);
        setSelectedFunds(top3.length > 0 ? top3 : []);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Failed loading live pension data");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const fundById = useMemo(() => {
    const map = new Map();
    for (const fund of funds) map.set(fund.id, fund);
    return map;
  }, [funds]);

  const visibleSelectedFunds = useMemo(() => {
    return selectedFunds.map((id) => fundById.get(id)).filter(Boolean);
  }, [selectedFunds, fundById]);

  const chartData = useMemo(() => {
    const yearsSet = new Set();
    for (const fund of visibleSelectedFunds) {
      Object.keys(fund.returnsByYear || {}).forEach((y) => yearsSet.add(y));
    }

    const years = Array.from(yearsSet).sort();
    return years.map((year) => {
      const point = { year };
      for (const fund of visibleSelectedFunds) {
        point[fund.name] = fund.returnsByYear?.[year] ?? null;
      }
      return point;
    });
  }, [visibleSelectedFunds]);

  const toggleFund = (fundId) => {
    setSelectedFunds((prev) => {
      if (prev.includes(fundId)) {
        return prev.length > 1 ? prev.filter((id) => id !== fundId) : prev;
      }
      return [...prev, fundId];
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
        <div>
          <p className="font-semibold text-red-700">Could not load live Pension-Net data</p>
          <p className="text-sm text-red-600 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground font-rubik">Live Pension Fund Comparison</h1>
        <p className="text-muted-foreground">
          Official live data from Israel Data.gov Pension-Net.
        </p>
        {meta && (
          <p className="text-xs text-muted-foreground">
            Source date: {meta.sourceCurrentDate || "Unknown"} | Latest report period: {meta.latestReportPeriodLabel} | Funds: {meta.totalFunds}
          </p>
        )}
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {funds.map((fund, index) => {
          const isSelected = selectedFunds.includes(fund.id);
          const color = COLORS[index % COLORS.length];
          return (
            <motion.div
              key={fund.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.02, 0.25) }}
              onClick={() => toggleFund(fund.id)}
              className={`bg-card rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-md ${
                isSelected ? "border-primary shadow-sm" : "border-border/50"
              }`}
            >
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate" title={fund.name}>{fund.name}</p>
                  <p className="text-xs text-muted-foreground truncate" title={fund.parentCompanyName}>{fund.parentCompanyName}</p>
                </div>
                <div className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ backgroundColor: isSelected ? color : "hsl(0,0%,80%)" }} />
              </div>

              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>5Y avg return</span>
                  <span className="font-semibold text-foreground">{fund.trailing5yAvgPct != null ? formatPercent(fund.trailing5yAvgPct) : "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span>YTD return</span>
                  <span className="font-semibold text-foreground">{fund.ytdYieldPct != null ? formatPercent(fund.ytdYieldPct) : "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Mgmt fee (balance)</span>
                  <span className="font-semibold text-foreground">{fund.managementFeeBalancePct != null ? formatPercent(fund.managementFeeBalancePct) : "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Mgmt fee (deposit)</span>
                  <span className="font-semibold text-foreground">{fund.managementFeeDepositPct != null ? formatPercent(fund.managementFeeDepositPct) : "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Assets (Bn ILS)</span>
                  <span className="font-semibold text-foreground">{fund.totalAssetsBnIls?.toFixed(2) ?? "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Latest period</span>
                  <Badge variant="outline" className="text-[10px]">{fund.latestReportPeriodLabel}</Badge>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-foreground font-rubik mb-6">Historical Annual Returns (computed from monthly Pension-Net data)</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} width={55} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {visibleSelectedFunds.map((fund, index) => (
                <Line
                  key={fund.id}
                  type="monotone"
                  dataKey={fund.name}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {meta && (
        <p className="text-xs text-muted-foreground text-center">
          Source: <a href={meta.sourceUrl} target="_blank" rel="noreferrer" className="underline">Data.gov.il - {meta.sourceDatasetName}</a> (resource {meta.sourceResourceId}).
          Figures are loaded live at runtime and reflect latest published period {meta.latestReportPeriodLabel}.
        </p>
      )}
    </div>
  );
}
