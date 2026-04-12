import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { formatCurrency, formatPercent } from "../lib/pensionCalculations";

export default function ExportReport({ profile, calculations, documents }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!profile || !calculations) return;
    setLoading(true);

    const reportText = `
# דוח פנסיוני אישי
## תאריך הפקה: ${new Date().toLocaleDateString("he-IL")}

---

## פרטים אישיים
- שנת לידה: ${profile.birth_year}
- מין: ${profile.gender === "male" ? "זכר" : "נקבה"}
- שכר ברוטו חודשי: ${formatCurrency(profile.current_salary)}
- גיל פרישה מתוכנן: ${profile.retirement_age || 67}
- מצב משפחתי: ${profile.marital_status === "married" ? "נשוי/אה" : "רווק/ה"}
- שנים לפרישה: ${calculations.years}

---

## נתוני הצבירה הנוכחית
- יתרה נוכחית בפנסיה: ${formatCurrency(calculations.balance)}
- הפקדה חודשית: ${formatCurrency(calculations.deposit)}
- תשואה ממוצעת (לפי דוחות): ${formatPercent(calculations.avgReturn)}

---

## תחזית לפרישה
- **צבירה צפויה בפרישה: ${formatCurrency(calculations.projectedBalance)}**
- **קצבה חודשית ברוטו: ${formatCurrency(calculations.monthlyPension)}**

---

## פירוט מיסים וניכויים
- פטור ממס (43.5%): ${formatCurrency(calculations.taxBreakdown.exemptAmount)}
- מס הכנסה חודשי: ${formatCurrency(calculations.taxBreakdown.incomeTax)}
- ביטוח בריאות: ${formatCurrency(calculations.taxBreakdown.healthInsurance)}
- ביטוח לאומי: ${formatCurrency(calculations.taxBreakdown.nationalInsurance)}
- **קצבה נטו לאחר ניכויים: ${formatCurrency(calculations.taxBreakdown.netPension)}**
- שיעור מס אפקטיבי: ${formatPercent(calculations.taxBreakdown.effectiveTaxRate)}

---

## שיעור החלפה
קצבה נטו כאחוז מהשכר הנוכחי: ${formatPercent(profile.current_salary > 0 ? (calculations.taxBreakdown.netPension / profile.current_salary) * 100 : 0)}

---

## מסמכים שהועלו
${documents.map(d => `- ${d.file_name} (${d.year || "ללא שנה"}) - ${formatCurrency(d.total_balance || 0)} - תשואה ${formatPercent(d.annual_return_pct || 0)}`).join("\n")}

---

*הדוח הופק על ידי מערכת פנסיה חכמה. אין בכך ייעוץ פנסיוני מורשה.*
`;

    try {
      // Use LLM to generate a formatted HTML report
      const htmlReport = await base44.integrations.Core.InvokeLLM({
        prompt: `Convert this pension report text to a beautiful, professional RTL Hebrew HTML report with inline CSS styling. 
Use a clean design with:
- Dark blue (#1e3a5f) header with the title
- White body with good typography  
- Cards for each section with light gray backgrounds
- Bold the key numbers in blue
- Include a disclaimer at the bottom
- Make it print-ready

Report content:
${reportText}

Return ONLY the complete HTML (with <html>, <head>, <body> tags and all inline styles).`,
        model: "gpt_5_mini"
      });

      // Open in new window for printing/saving
      const printWindow = window.open("", "_blank");
      printWindow.document.write(htmlReport);
      printWindow.document.close();
      printWindow.focus();
    } catch (e) {
      // Fallback: download as text
      const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "דוח-פנסיוני.txt";
      a.click();
      URL.revokeObjectURL(url);
    }

    setLoading(false);
  };

  return (
    <Button onClick={handleExport} disabled={loading || !profile || !calculations} variant="outline" className="gap-2">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      {loading ? "מפיק דו\"ח..." : "ייצוא דו\"ח אישי"}
    </Button>
  );
}