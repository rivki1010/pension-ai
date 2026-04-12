import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatCurrency } from "../lib/pensionCalculations";

const CustomTooltip = ({ active, payload, label, valueMode }) => {
  if (!active || !payload?.length) return null;
  return (
    <div dir="rtl" className="bg-card border border-border rounded-xl p-3 shadow-lg">
      <p className="text-sm font-semibold text-foreground mb-1">שנת {label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
      <p className="text-xs text-muted-foreground mt-1">תצוגה: {valueMode === "real" ? "ריאלית" : "נומינלית"}</p>
    </div>
  );
};

export default function ProjectionChart({ data, title, valueMode = "nominal", onValueModeChange }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border/50 p-6">
        <p className="text-muted-foreground text-center">אין נתונים להצגה</p>
      </div>
    );
  }

  const hasDetailedSeries = data.some((d) => d.totalContributions != null);
  const gainsKey = valueMode === "real" ? "investmentGainsReal" : "investmentGainsNominal";
  const balanceKey = valueMode === "real" ? "balanceReal" : "balanceNominal";

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm space-y-4">
      {title && <h3 className="text-lg font-bold text-foreground font-rubik">{title}</h3>}

      {onValueModeChange && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onValueModeChange("nominal")}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              valueMode === "nominal" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            נומינלי
          </button>
          <button
            type="button"
            onClick={() => onValueModeChange("real")}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              valueMode === "real" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            ריאלי
          </button>
        </div>
      )}

      <div className="h-72 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="contributionsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="gainsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 12, fill: "hsl(215, 16%, 47%)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "hsl(215, 16%, 47%)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(val) => `₪${(val / 1000000).toFixed(1)}M`}
              width={70}
            />
            <Tooltip content={<CustomTooltip valueMode={valueMode} />} />

            {hasDetailedSeries ? (
              <>
                <Area
                  type="monotone"
                  dataKey="totalContributions"
                  name="סך הפקדות"
                  stackId="1"
                  stroke="hsl(221, 83%, 53%)"
                  fill="url(#contributionsGradient)"
                  strokeWidth={2}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey={gainsKey}
                  name="רווחי השקעה"
                  stackId="1"
                  stroke="hsl(142, 76%, 36%)"
                  fill="url(#gainsGradient)"
                  strokeWidth={2}
                  dot={false}
                />
              </>
            ) : (
              <Area
                type="monotone"
                dataKey={balanceKey in data[0] ? balanceKey : "balance"}
                name="צבירה צפויה"
                stroke="hsl(221, 83%, 53%)"
                fill="url(#contributionsGradient)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, fill: "white" }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
