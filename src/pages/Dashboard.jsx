import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Wallet, TrendingUp, Calendar, PiggyBank, ArrowLeft } from "lucide-react";
import ExportReport from "../components/ExportReport";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import StatCard from "../components/StatCard";
import ProjectionChart from "../components/ProjectionChart";
import TaxBreakdown from "../components/TaxBreakdown";
import {
  formatCurrency,
  formatPercent,
  yearsToRetirement,
  getCurrentAge,
  calculateAverageReturn,
  getLatestDocumentData,
  projectBalance,
  calculateMonthlyPension,
  calculatePensionTax,
  generateProjectionData,
} from "../lib/pensionCalculations";

export default function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [docs, profiles] = await Promise.all([
      base44.entities.PensionDocument.filter({ status: "completed" }),
      base44.entities.UserFinancialProfile.list(),
    ]);
    setDocuments(docs);
    setProfile(profiles[0] || null);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const hasData = documents.length > 0 && profile;

  if (!hasData) {
    return <EmptyState hasProfile={!!profile} hasDocuments={documents.length > 0} />;
  }

  // Calculate everything
  const latestPension = getLatestDocumentData(documents, "pension");
  const latestEduFund = getLatestDocumentData(documents, "education_fund");
  const avgReturn = calculateAverageReturn(documents);
  const years = yearsToRetirement(profile.birth_year, profile.retirement_age || 67);
  const currentAge = getCurrentAge(profile.birth_year);

  const pensionBalance = latestPension?.total_balance || 0;
  const pensionDeposit = latestPension?.monthly_deposit || 0;
  const eduFundBalance = latestEduFund?.total_balance || 0;
  const eduFundDeposit = latestEduFund?.monthly_deposit || 0;

  const projectedPensionBalance = projectBalance(pensionBalance, pensionDeposit, avgReturn, years);
  const monthlyPension = calculateMonthlyPension(projectedPensionBalance, profile.gender);
  const taxBreakdown = calculatePensionTax(monthlyPension, profile.marital_status);

  const projectedEduFund = projectBalance(eduFundBalance, eduFundDeposit, avgReturn, Math.min(years, 6));

  const projectionData = generateProjectionData(
    pensionBalance, pensionDeposit, avgReturn, years, profile.salary_growth_pct || 2
  ).map((d, i) => ({ ...d, age: currentAge + i }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4 flex-wrap"
      >
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground font-rubik">הסקירה שלי</h1>
          <p className="text-muted-foreground">
            בן {currentAge} • {years} שנים לפרישה • תשואה ממוצעת {formatPercent(avgReturn)}
          </p>
        </div>
        <ExportReport
          profile={profile}
          calculations={{ years, avgReturn, balance: pensionBalance, deposit: pensionDeposit, projectedBalance: projectedPensionBalance, monthlyPension, taxBreakdown }}
          documents={documents}
        />
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Wallet} label="צבירה נוכחית בפנסיה" value={formatCurrency(pensionBalance)} subtitle={latestPension?.provider_name} color="primary" delay={0} />
        <StatCard icon={TrendingUp} label="צבירה צפויה בפרישה" value={formatCurrency(projectedPensionBalance)} subtitle={`בעוד ${years} שנים`} color="green" delay={0.1} />
        <StatCard icon={PiggyBank} label="קצבה חודשית צפויה (נטו)" value={formatCurrency(taxBreakdown.netPension)} subtitle={`ברוטו: ${formatCurrency(monthlyPension)}`} color="accent" delay={0.2} />
        <StatCard icon={Calendar} label="קרן השתלמות" value={formatCurrency(eduFundBalance)} subtitle={`צפי: ${formatCurrency(projectedEduFund)}`} color="purple" delay={0.3} />
      </div>

      {/* Charts and details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProjectionChart data={projectionData} title="תחזית צבירה לאורך השנים" />
        <TaxBreakdown taxData={taxBreakdown} />
      </div>

      {/* Summary insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-l from-primary/5 via-primary/10 to-primary/5 rounded-2xl p-6 border border-primary/20"
      >
        <h3 className="text-lg font-bold text-foreground font-rubik mb-4">תובנות עיקריות</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <InsightItem label="שיעור החלפה" value={formatPercent(profile.current_salary > 0 ? (taxBreakdown.netPension / profile.current_salary) * 100 : 0)} description="יחס הקצבה לשכר הנוכחי" />
          <InsightItem label="הפקדה חודשית כוללת" value={formatCurrency(pensionDeposit + eduFundDeposit)} description="פנסיה + קרן השתלמות" />
          <InsightItem label="דמי ניהול ממוצעים" value={formatPercent(calculateAvgFee(documents))} description="מצבירה" />
        </div>
      </motion.div>
    </div>
  );
}

function InsightItem({ label, value, description }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground">{label}</p>
      <p className="text-xl font-bold text-foreground font-rubik">{value}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function calculateAvgFee(documents) {
  const fees = documents.filter(d => d.management_fee_pct != null && d.management_fee_pct > 0);
  if (fees.length === 0) return 0;
  return fees.reduce((sum, d) => sum + d.management_fee_pct, 0) / fees.length;
}

function EmptyState({ hasProfile, hasDocuments }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6"
    >
      <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center">
        <PiggyBank className="w-12 h-12 text-primary" />
      </div>
      <div className="space-y-2 max-w-md">
        <h2 className="text-2xl font-bold text-foreground font-rubik">ברוכים הבאים לפנסיה חכמה</h2>
        <p className="text-muted-foreground">
          {!hasProfile && "התחל בהזנת הפרטים האישיים שלך, "}
          {!hasDocuments && "העלה את דוחות הפנסיה והקרן השתלמות שלך "}
          כדי לקבל תחזית מדויקת של הפנסיה העתידית שלך.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        {!hasProfile && (
          <Button asChild size="lg" className="gap-2">
            <Link to="/calculator">
              <ArrowLeft className="w-4 h-4" />
              הזן פרטים אישיים
            </Link>
          </Button>
        )}
        {!hasDocuments && (
          <Button asChild variant={hasProfile ? "default" : "outline"} size="lg" className="gap-2">
            <Link to="/upload">
              <ArrowLeft className="w-4 h-4" />
              העלה מסמכים
            </Link>
          </Button>
        )}
      </div>
    </motion.div>
  );
}