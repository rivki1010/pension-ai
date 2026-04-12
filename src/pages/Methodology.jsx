import { motion } from "framer-motion";
import { Calculator, FileText, Scale, TrendingUp, Shield, Info, BookOpen, AlertTriangle } from "lucide-react";

const sections = [
  {
    id: "pension_calc",
    icon: Calculator,
    title: "חישוב קצבת הפנסיה",
    color: "text-blue-600",
    bg: "bg-blue-50",
    content: [
      {
        subtitle: "פורמולת הצבירה (Compound Interest + Annuity)",
        text: "הצבירה מחושבת לפי נוסחת ריבית דריבית משולבת עם הפקדות קבועות:",
        formula: "FV = PV × (1+r)ⁿ + PMT × [(1+r)ⁿ - 1] / r",
        details: [
          "PV = יתרה נוכחית",
          "PMT = הפקדה חודשית",
          "r = תשואה חודשית (= תשואה שנתית ÷ 12)",
          "n = מספר חודשים עד פרישה",
        ]
      },
      {
        subtitle: "המרת צבירה לקצבה חודשית",
        text: "נעשה שימוש במקדם המרה אקטוארי (מקדם קצבה):",
        formula: "קצבה חודשית = צבירה כוללת ÷ מקדם המרה",
        details: [
          "מקדם המרה לגבר (גיל פרישה 67): 239",
          "מקדם המרה לאישה (גיל פרישה 65): 257",
          "המקדם מבטא את תוחלת החיים הצפויה לאחר גיל הפרישה",
          "מקדם גבוה יותר = קצבה חודשית נמוכה יותר",
        ]
      }
    ]
  },
  {
    id: "tax",
    icon: Scale,
    title: "חישוב מס על קצבת פנסיה",
    color: "text-purple-600",
    bg: "bg-purple-50",
    content: [
      {
        subtitle: "פטור ממס על קצבה",
        text: "על פי חוק (סעיף 9א לפקודת מס הכנסה), קצבת פנסיה זכאית לפטור ממס:",
        details: [
          "שיעור הפטור: 43.5% מסכום הקצבה",
          "תקרת הפטור השנתית: כ-105,600 ₪ (8,800 ₪ לחודש)",
          "הפטור חל על קצבאות ממקורות מוכרים (קרן פנסיה, ביטוח מנהלים)",
        ]
      },
      {
        subtitle: "מדרגות מס הכנסה (2024-2025)",
        text: "על ההכנסה החייבת (לאחר הפטור) חלות מדרגות מס הכנסה:",
        table: [
          { range: "₪0 – ₪84,120", rate: "10%" },
          { range: "₪84,121 – ₪120,720", rate: "14%" },
          { range: "₪120,721 – ₪193,800", rate: "20%" },
          { range: "₪193,801 – ₪269,280", rate: "31%" },
          { range: "₪269,281 – ₪560,280", rate: "35%" },
          { range: "₪560,281 – ₪721,560", rate: "47%" },
          { range: "מעל ₪721,560", rate: "50%" },
        ]
      },
      {
        subtitle: "נקודות זיכוי",
        text: "מהמס המחושב מנוכים זיכויים בגין נקודות זיכוי:",
        details: [
          "ערך נקודת זיכוי: 2,904 ₪ לשנה (2024)",
          "רווק/ה: 2.25 נקודות זיכוי",
          "נשוי/אה: 2.75 נקודות זיכוי",
        ]
      },
      {
        subtitle: "ביטוח לאומי ובריאות לגמלאים",
        details: [
          "ביטוח לאומי: 0.4% על קצבה (שיעור מופחת לגמלאים)",
          "ביטוח בריאות: 3.1% על קצבה",
        ]
      }
    ]
  },
  {
    id: "retirement_age",
    icon: Shield,
    title: "גיל פרישה ותוחלת חיים",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    content: [
      {
        subtitle: "גיל פרישה חובה בישראל",
        details: [
          "גבר: גיל פרישה חובה 67",
          "אישה: גיל פרישה חובה 65 (בתהליך העלאה ל-67)",
          "ניתן לפרוש מוקדם בתנאים מסוימים (נכות, עיסוקים מיוחדים)",
        ]
      },
      {
        subtitle: "תוחלת חיים (בסיס המקדם האקטוארי)",
        details: [
          "גבר בן 67: תוחלת חיים ממוצעת עוד כ-20 שנה = 240 חודשים",
          "אישה בת 65: תוחלת חיים ממוצעת עוד כ-22 שנה = 257 חודשים",
          "המקדם מתעדכן מעת לעת בהתאם לנתוני תוחלת החיים בישראל",
        ]
      }
    ]
  },
  {
    id: "education_fund",
    icon: BookOpen,
    title: "קרן השתלמות",
    color: "text-amber-600",
    bg: "bg-amber-50",
    content: [
      {
        subtitle: "שיעורי הפקדה",
        details: [
          "שכיר: עובד 2.5%, מעסיק 7.5% מהשכר",
          "עצמאי: עד 4.5% מההכנסה המוכרת (פטורה ממס)",
          "תקרת ההפקדה המוכרת: 18,840 ₪ לשנה (עובד שכיר 2024)",
        ]
      },
      {
        subtitle: "פטור ממס",
        details: [
          "לאחר 6 שנות חיסכון (3 לעצמאי מעל גיל 67): משיכה פטורה ממס",
          "רווחי הקרן פטורים ממס רווח הון לאורך כל תקופת החיסכון",
          "ניתן להשאיר את הכספים לאחר 6 שנים ולהמשיך לחסוך",
        ]
      }
    ]
  },
  {
    id: "assumptions",
    icon: TrendingUp,
    title: "הנחות החישוב",
    color: "text-cyan-600",
    bg: "bg-cyan-50",
    content: [
      {
        subtitle: "תשואה ממוצעת",
        text: "התשואה הממוצעת מחושבת מכלל הדוחות שהועלו למערכת. בהיעדר נתונים, נעשה שימוש ב-4.5% כברירת מחדל.",
        details: [
          "ממוצע תשואת קרנות פנסיה בישראל (2015-2024): כ-7% לשנה",
          "ממוצע תשואת קרנות השתלמות (2015-2024): כ-8% לשנה",
          "תשואה ריאלית (מנוכה אינפלציה): כ-4-5% לשנה",
        ]
      },
      {
        subtitle: "הנחות נוספות",
        details: [
          "עליית שכר שנתית ברירת מחדל: 2% לשנה",
          "ההפקדות נחשבות קבועות לאורך התקופה (ניתן לכוונון)",
          "החישוב אינו מביא בחשבון שינויי חקיקה עתידיים",
          "הקצבה מחושבת ללא הצמדה לאחר הפרישה",
        ]
      }
    ]
  },
  {
    id: "disclaimers",
    icon: AlertTriangle,
    title: "הצהרות ואזהרות",
    color: "text-red-600",
    bg: "bg-red-50",
    content: [
      {
        subtitle: "אין בכך ייעוץ פנסיוני",
        text: "המידע המוצג הוא לצרכי מידע והמחשה בלבד. המערכת אינה מחליפה ייעוץ פנסיוני מקצועי מורשה.",
        details: [
          "התחזיות מבוססות על הנחות ועלולות להתברר כשגויות",
          "מומלץ להיוועץ ביועץ פנסיוני מורשה לפני כל החלטה",
          "נתוני הקרנות המוצגים בדף ההשוואה הם לצורכי המחשה בלבד",
        ]
      }
    ]
  }
];

export default function Methodology() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground font-rubik">שיטת החישוב</h1>
        <p className="text-muted-foreground">כל החוקים, הנוסחאות והנתונים עליהם מתבססת המערכת</p>
      </motion.div>

      {/* Quick nav */}
      <div className="flex flex-wrap gap-2">
        {sections.map(s => (
          <a key={s.id} href={`#${s.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-sm text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
            <s.icon className="w-3.5 h-3.5" />
            {s.title}
          </a>
        ))}
      </div>

      {sections.map((section, si) => (
        <motion.div key={section.id} id={section.id}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.05 }}
          className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${section.bg}`}>
              <section.icon className={`w-5 h-5 ${section.color}`} />
            </div>
            <h2 className="text-xl font-bold text-foreground font-rubik">{section.title}</h2>
          </div>

          {section.content.map((block, bi) => (
            <div key={bi} className="space-y-3 border-t border-border/30 pt-4 first:border-0 first:pt-0">
              {block.subtitle && <h3 className="text-base font-semibold text-foreground">{block.subtitle}</h3>}
              {block.text && <p className="text-sm text-muted-foreground leading-relaxed">{block.text}</p>}

              {block.formula && (
                <div className="bg-muted rounded-xl p-4 font-mono text-center text-sm font-semibold text-foreground border border-border/50 dir-ltr">
                  {block.formula}
                </div>
              )}

              {block.details && (
                <ul className="space-y-1.5">
                  {block.details.map((d, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              )}

              {block.table && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-right">
                        <th className="py-2 px-4 bg-muted rounded-r-lg text-muted-foreground font-medium">טווח הכנסה שנתי</th>
                        <th className="py-2 px-4 bg-muted rounded-l-lg text-muted-foreground font-medium">שיעור מס</th>
                      </tr>
                    </thead>
                    <tbody>
                      {block.table.map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                          <td className="py-2 px-4 text-foreground">{row.range}</td>
                          <td className="py-2 px-4 font-semibold text-primary font-rubik">{row.rate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </motion.div>
      ))}
    </div>
  );
}