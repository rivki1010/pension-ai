// Israeli pension calculation utilities

export const DEFAULT_INFLATION_PCT = 2.5;

export function yearsToRetirement(birthYear, retirementAge) {
  const currentYear = new Date().getFullYear();
  const currentAge = currentYear - Number(birthYear || currentYear);
  return Math.max(0, Number(retirementAge || 67) - currentAge);
}

export function getCurrentAge(birthYear) {
  return new Date().getFullYear() - Number(birthYear || new Date().getFullYear());
}

export function calculateNetReturnAfterFees(annualReturnPct, managementFeeFromBalancePct = 0) {
  return Math.max(0, Number(annualReturnPct || 0) - Number(managementFeeFromBalancePct || 0));
}

export function calculateNetDepositAfterFees(monthlyDeposit, managementFeeFromDepositPct = 0) {
  const feeRatio = Math.max(0, Number(managementFeeFromDepositPct || 0)) / 100;
  return Math.max(0, Number(monthlyDeposit || 0) * (1 - feeRatio));
}

export function toRealAnnualReturn(annualReturnPct, inflationPct = DEFAULT_INFLATION_PCT) {
  return Math.max(0, Number(annualReturnPct || 0) - Number(inflationPct || 0));
}

export function projectBalance(currentBalance, monthlyDeposit, annualReturnPct, years) {
  if (years <= 0) return Number(currentBalance || 0);

  const monthlyRate = Number(annualReturnPct || 0) / 100 / 12;
  const months = years * 12;
  const balance = Number(currentBalance || 0);
  const deposit = Number(monthlyDeposit || 0);

  if (monthlyRate === 0) {
    return balance + deposit * months;
  }

  const futureValueLump = balance * Math.pow(1 + monthlyRate, months);
  const futureValueAnnuity = deposit * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);

  return futureValueLump + futureValueAnnuity;
}

export function projectBalanceWithDynamicFeesAndGrowth({
  currentBalance,
  monthlyDeposit,
  annualReturnPct,
  years,
  salaryGrowthPct = 0,
  managementFeeFromBalancePct = 0,
  managementFeeFromDepositPct = 0,
  inflationPct = DEFAULT_INFLATION_PCT,
  valueMode = "nominal",
}) {
  const netAnnualReturn = calculateNetReturnAfterFees(annualReturnPct, managementFeeFromBalancePct);
  const effectiveAnnualReturn =
    valueMode === "real" ? toRealAnnualReturn(netAnnualReturn, inflationPct) : netAnnualReturn;

  let balance = Number(currentBalance || 0);
  let deposit = Number(monthlyDeposit || 0);
  const monthlyRate = effectiveAnnualReturn / 100 / 12;

  for (let y = 0; y < years; y++) {
    const netMonthlyDeposit = calculateNetDepositAfterFees(deposit, managementFeeFromDepositPct);
    for (let m = 0; m < 12; m++) {
      balance = balance * (1 + monthlyRate) + netMonthlyDeposit;
    }
    deposit *= 1 + Number(salaryGrowthPct || 0) / 100;
  }

  return balance;
}

export function calculateMonthlyPension(totalBalance, gender, coefficientOverride = null) {
  const defaultCoefficient = gender === "male" ? 239 : 257;
  const coefficient = Number(coefficientOverride || defaultCoefficient);
  return Number(totalBalance || 0) / coefficient;
}

export function calculatePensionTax(monthlyPension, maritalStatus) {
  const gross = Number(monthlyPension || 0);
  const exemptionRate = 0.435;
  const maxExemptAmount = 8800;
  const exemptAmount = Math.min(gross * exemptionRate, maxExemptAmount);
  const taxableIncome = Math.max(0, gross - exemptAmount);

  const annualTaxable = taxableIncome * 12;
  const brackets = [
    { limit: 84120, rate: 0.1 },
    { limit: 120720, rate: 0.14 },
    { limit: 193800, rate: 0.2 },
    { limit: 269280, rate: 0.31 },
    { limit: 560280, rate: 0.35 },
    { limit: 721560, rate: 0.47 },
    { limit: Infinity, rate: 0.5 },
  ];

  let annualTax = 0;
  let previousLimit = 0;

  for (const bracket of brackets) {
    if (annualTaxable <= previousLimit) break;
    const taxableInBracket = Math.min(annualTaxable, bracket.limit) - previousLimit;
    annualTax += taxableInBracket * bracket.rate;
    previousLimit = bracket.limit;
  }

  const creditPointValue = 2904;
  const creditPoints = maritalStatus === "married" ? 2.75 : 2.25;
  const totalCredit = creditPoints * creditPointValue;

  const healthInsurance = taxableIncome * 0.031;
  const nationalInsurance = taxableIncome * 0.004;

  const monthlyTax = Math.max(0, (annualTax - totalCredit) / 12);
  const monthlyDeductions = monthlyTax + healthInsurance + nationalInsurance;

  return {
    grossPension: gross,
    exemptAmount,
    taxableIncome,
    incomeTax: monthlyTax,
    healthInsurance,
    nationalInsurance,
    totalDeductions: monthlyDeductions,
    netPension: gross - monthlyDeductions,
    effectiveTaxRate: gross > 0 ? (monthlyDeductions / gross) * 100 : 0,
  };
}

export function projectEducationFund(currentBalance, monthlyDeposit, annualReturnPct, years) {
  return projectBalance(currentBalance, monthlyDeposit, annualReturnPct, years);
}

export function calculateAverageReturn(documents) {
  const validDocs = (documents || []).filter((d) => d.annual_return_pct != null && d.annual_return_pct !== 0);
  if (validDocs.length === 0) return 4.5;
  const sum = validDocs.reduce((acc, d) => acc + Number(d.annual_return_pct || 0), 0);
  return sum / validDocs.length;
}

export function getLatestDocumentData(documents, type) {
  const filtered = (documents || [])
    .filter((d) => d.document_type === type && d.status === "completed")
    .sort((a, b) => {
      if ((b.year || 0) !== (a.year || 0)) return (b.year || 0) - (a.year || 0);
      return new Date(b.created_date || 0) - new Date(a.created_date || 0);
    });
  return filtered[0] || null;
}

export function getAggregatedPensionData(documents) {
  const completed = (documents || []).filter((d) => d.document_type === "pension" && d.status === "completed");
  if (completed.length === 0) return null;

  const byProvider = {};
  const isNewer = (docA, docB) => {
    const dateA = new Date(docA.created_date || 0).getTime();
    const dateB = new Date(docB.created_date || 0).getTime();
    if (Math.abs(dateA - dateB) > 60000) return dateA > dateB;
    return (docA.year || 0) > (docB.year || 0);
  };

  for (const doc of completed) {
    const key = doc.provider_name || "__unknown__";
    if (!byProvider[key] || isNewer(doc, byProvider[key])) {
      byProvider[key] = doc;
    }
  }

  const latestDocs = Object.values(byProvider);

  const total_balance = latestDocs.reduce((s, d) => s + Number(d.total_balance || 0), 0);
  const compensation_balance = latestDocs.reduce((s, d) => s + Number(d.compensation_balance || 0), 0);
  const severance_balance = latestDocs.reduce((s, d) => s + Number(d.severance_balance || 0), 0);

  const employee_deposit = latestDocs.reduce((s, d) => s + Number(d.employee_deposit || 0), 0);
  const employer_deposit = latestDocs.reduce((s, d) => s + Number(d.employer_deposit || 0), 0);
  const monthly_deposit = latestDocs.reduce((s, d) => s + Number(d.monthly_deposit || 0), 0);

  const docsWithFee = latestDocs.filter((d) => d.management_fee_pct != null && d.management_fee_pct > 0);
  const management_fee_pct =
    docsWithFee.length > 0
      ? docsWithFee.reduce((s, d) => s + Number(d.management_fee_pct || 0), 0) / docsWithFee.length
      : null;

  const docsWithDepositFee = latestDocs.filter(
    (d) => d.management_fee_deposit_pct != null && d.management_fee_deposit_pct > 0
  );
  const management_fee_deposit_pct =
    docsWithDepositFee.length > 0
      ? docsWithDepositFee.reduce((s, d) => s + Number(d.management_fee_deposit_pct || 0), 0) /
        docsWithDepositFee.length
      : null;

  const insurance_component = latestDocs.reduce((s, d) => s + Number(d.insurance_component || 0), 0);

  return {
    total_balance,
    compensation_balance,
    severance_balance,
    employee_deposit,
    employer_deposit,
    monthly_deposit,
    management_fee_pct,
    management_fee_deposit_pct,
    insurance_component,
    _docs: latestDocs,
  };
}

export function generateProjectionData(currentBalance, monthlyDeposit, annualReturnPct, years, salaryGrowthPct = 2) {
  const data = [];
  let balance = Number(currentBalance || 0);
  let deposit = Number(monthlyDeposit || 0);

  for (let i = 0; i <= years; i++) {
    data.push({
      year: new Date().getFullYear() + i,
      age: i,
      balance: Math.round(balance),
      deposits: Math.round(deposit * 12),
    });

    const monthlyRate = Number(annualReturnPct || 0) / 100 / 12;
    for (let m = 0; m < 12; m++) {
      balance = balance * (1 + monthlyRate) + deposit;
    }
    deposit *= 1 + Number(salaryGrowthPct || 0) / 100;
  }

  return data;
}

export function generateProjectionDataDetailed({
  currentBalance,
  monthlyDeposit,
  annualReturnPct,
  years,
  salaryGrowthPct = 2,
  managementFeeFromBalancePct = 0,
  managementFeeFromDepositPct = 0,
  inflationPct = DEFAULT_INFLATION_PCT,
}) {
  const data = [];
  let balanceNominal = Number(currentBalance || 0);
  let balanceReal = Number(currentBalance || 0);
  let deposit = Number(monthlyDeposit || 0);
  let cumulativeContributions = Number(currentBalance || 0);

  const netNominalAnnualReturn = calculateNetReturnAfterFees(annualReturnPct, managementFeeFromBalancePct);
  const netRealAnnualReturn = toRealAnnualReturn(netNominalAnnualReturn, inflationPct);
  const monthlyNominalRate = netNominalAnnualReturn / 100 / 12;
  const monthlyRealRate = netRealAnnualReturn / 100 / 12;

  for (let i = 0; i <= years; i++) {
    const investmentGainsNominal = Math.max(0, balanceNominal - cumulativeContributions);
    const investmentGainsReal = Math.max(0, balanceReal - cumulativeContributions);

    data.push({
      year: new Date().getFullYear() + i,
      age: i,
      totalContributions: Math.round(cumulativeContributions),
      balanceNominal: Math.round(balanceNominal),
      balanceReal: Math.round(balanceReal),
      investmentGainsNominal: Math.round(investmentGainsNominal),
      investmentGainsReal: Math.round(investmentGainsReal),
    });

    const netMonthlyDeposit = calculateNetDepositAfterFees(deposit, managementFeeFromDepositPct);
    for (let m = 0; m < 12; m++) {
      balanceNominal = balanceNominal * (1 + monthlyNominalRate) + netMonthlyDeposit;
      balanceReal = balanceReal * (1 + monthlyRealRate) + netMonthlyDeposit;
    }
    cumulativeContributions += netMonthlyDeposit * 12;
    deposit *= 1 + Number(salaryGrowthPct || 0) / 100;
  }

  return data;
}

export function formatCurrency(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return "₪0";
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

export function calculateOldAgePension(maritalStatus) {
  const baseSingle = 1844;
  const baseMarried = 2766;

  const base = maritalStatus === "married" ? baseMarried : baseSingle;
  const deduction = 0;

  return {
    base,
    deduction,
    net: base - deduction,
    note: "קצבת זקנה בסיסית מביטוח לאומי (2025)",
  };
}

export function formatPercent(value) {
  if (value == null || Number.isNaN(Number(value))) return "0%";
  return `${Number(value).toFixed(1)}%`;
}
