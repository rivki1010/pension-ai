const PENSION_NET_RESOURCE_ID = "6d47d6b5-cb08-488b-b333-f1e717b1e1bd";
const BASE_URL = "https://data.gov.il/api/3/action";

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toYearMonth(reportPeriod) {
  const raw = String(reportPeriod || "");
  if (raw.length < 6) return null;
  const year = Number(raw.slice(0, 4));
  const month = Number(raw.slice(4, 6));
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  return { year, month };
}

function monthYieldToFactor(monthlyYieldPct) {
  return 1 + toNumber(monthlyYieldPct) / 100;
}

function factorToPercent(factor) {
  return (factor - 1) * 100;
}

function formatYearMonth(periodNumber) {
  const raw = String(periodNumber || "");
  if (raw.length < 6) return "Unknown";
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}`;
}

function computeYearlyReturns(rows) {
  const byYear = new Map();

  for (const row of rows) {
    const ym = toYearMonth(row.REPORT_PERIOD);
    if (!ym) continue;
    if (!byYear.has(ym.year)) {
      byYear.set(ym.year, []);
    }
    byYear.get(ym.year).push({
      month: ym.month,
      monthlyYield: toNumber(row.MONTHLY_YIELD),
    });
  }

  const result = {};
  for (const [year, values] of byYear.entries()) {
    values.sort((a, b) => a.month - b.month);
    const compounded = values.reduce((acc, v) => acc * monthYieldToFactor(v.monthlyYield), 1);
    result[String(year)] = Number(factorToPercent(compounded).toFixed(2));
  }

  return result;
}

export async function fetchPensionNetData({ fromPeriod = 201901, limit = 10000 } = {}) {
  const query = new URLSearchParams({
    resource_id: PENSION_NET_RESOURCE_ID,
    limit: String(limit),
    sort: "REPORT_PERIOD asc",
  });

  const url = `${BASE_URL}/datastore_search?${query.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed loading PensionNet data: ${response.status}`);
  }

  const payload = await response.json();
  if (!payload?.success) {
    throw new Error("PensionNet API returned unsuccessful response");
  }

  const records = (payload.result?.records || []).filter((r) => toNumber(r.REPORT_PERIOD) >= fromPeriod);
  const byFundId = new Map();

  for (const row of records) {
    const fundId = row.FUND_ID;
    if (!fundId) continue;

    if (!byFundId.has(fundId)) {
      byFundId.set(fundId, []);
    }
    byFundId.get(fundId).push(row);
  }

  const funds = [];
  for (const rows of byFundId.values()) {
    rows.sort((a, b) => toNumber(a.REPORT_PERIOD) - toNumber(b.REPORT_PERIOD));
    const latest = rows[rows.length - 1];

    const yearlyReturns = computeYearlyReturns(rows);
    const fiveYearAvg = toNumber(latest.AVG_ANNUAL_YIELD_TRAILING_5YRS, null);
    const threeYearAvg = toNumber(latest.AVG_ANNUAL_YIELD_TRAILING_3YRS, null);

    funds.push({
      id: String(latest.FUND_ID),
      name: latest.FUND_NAME || `Fund ${latest.FUND_ID}`,
      parentCompanyName: latest.PARENT_COMPANY_NAME || "Unknown",
      managerName: latest.MANAGING_CORPORATION || "Unknown",
      category: latest.FUND_CLASSIFICATION || "Unknown",
      latestReportPeriod: toNumber(latest.REPORT_PERIOD),
      latestReportPeriodLabel: formatYearMonth(latest.REPORT_PERIOD),
      totalAssetsBnIls: toNumber(latest.TOTAL_ASSETS),
      managementFeeBalancePct: toNumber(latest.AVG_ANNUAL_MANAGEMENT_FEE, null),
      managementFeeDepositPct: toNumber(latest.AVG_DEPOSIT_FEE, null),
      monthlyYieldPct: toNumber(latest.MONTHLY_YIELD, null),
      ytdYieldPct: toNumber(latest.YEAR_TO_DATE_YIELD, null),
      trailing3yAvgPct: Number.isFinite(threeYearAvg) ? threeYearAvg : null,
      trailing5yAvgPct: Number.isFinite(fiveYearAvg) ? fiveYearAvg : null,
      standardDeviation: toNumber(latest.STANDARD_DEVIATION, null),
      sharpeRatio: toNumber(latest.SHARPE_RATIO, null),
      recordsCount: rows.length,
      returnsByYear: yearlyReturns,
      sourceCurrentDate: latest.CURRENT_DATE || null,
    });
  }

  funds.sort((a, b) => (b.trailing5yAvgPct ?? -Infinity) - (a.trailing5yAvgPct ?? -Infinity));

  const maxPeriod = funds.reduce((max, f) => (f.latestReportPeriod > max ? f.latestReportPeriod : max), 0);
  const sourceDate =
    funds
      .map((f) => f.sourceCurrentDate)
      .filter(Boolean)
      .sort()
      .at(-1) || null;

  return {
    funds,
    stats: {
      totalFunds: funds.length,
      latestReportPeriod: maxPeriod,
      latestReportPeriodLabel: formatYearMonth(maxPeriod),
      sourceCurrentDate: sourceDate,
      sourceDatasetName: "Pension-Net (Pensia-Net)",
      sourceResourceId: PENSION_NET_RESOURCE_ID,
      sourceUrl: `https://data.gov.il/dataset/pensia-net/resource/${PENSION_NET_RESOURCE_ID}`,
    },
  };
}
