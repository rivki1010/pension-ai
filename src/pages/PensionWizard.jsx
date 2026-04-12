import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import StepPersonalDetails from "../components/wizard/StepPersonalDetails";
import StepDocuments from "../components/wizard/StepDocuments";
import StepReturnRate from "../components/wizard/StepReturnRate";
import StepResults from "../components/wizard/StepResults";

const STEPS = [
  { number: 1, label: "פרטים אישיים" },
  { number: 2, label: "העלאת מסמכים" },
  { number: 3, label: "בחירת תשואה" },
  { number: 4, label: "תוצאות" },
];

export default function PensionWizard() {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [returnMode, setReturnMode] = useState("auto"); // "auto" | "manual"
  const [manualReturn, setManualReturn] = useState(5);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExisting();
  }, []);

  const loadExisting = async () => {
    const [profiles, docs] = await Promise.all([
      base44.entities.UserFinancialProfile.list(),
      base44.entities.PensionDocument.filter({ status: "completed" }),
    ]);
    if (profiles[0]) setProfile(profiles[0]);
    setDocuments(docs);
    setLoading(false);
  };

  const handleProfileSave = (p) => {
    setProfile(p);
    setStep(2);
  };

  const handleDocumentsDone = (docs) => {
    setDocuments(docs);
    setStep(3);
  };

  const handleReturnChosen = ({ mode, value }) => {
    setReturnMode(mode);
    setManualReturn(value);
    setStep(4);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Step indicator */}
      <div className="flex items-center justify-between relative">
        <div className="absolute top-5 right-0 left-0 h-0.5 bg-border -z-10" />
        <div
          className="absolute top-5 right-0 h-0.5 bg-primary transition-all duration-700 -z-10"
          style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
        />
        {STEPS.map((s) => {
          const done = step > s.number;
          const active = step === s.number;
          return (
            <div key={s.number} className="flex flex-col items-center gap-2 z-10">
              <motion.div
                animate={{
                  backgroundColor: done ? "hsl(221,83%,53%)" : active ? "hsl(221,83%,53%)" : "hsl(0,0%,100%)",
                  borderColor: done || active ? "hsl(221,83%,53%)" : "hsl(214,32%,91%)",
                  scale: active ? 1.1 : 1,
                }}
                transition={{ duration: 0.3 }}
                className="w-10 h-10 rounded-full border-2 flex items-center justify-center font-semibold text-sm shadow-sm bg-card"
              >
                {done ? (
                  <Check className="w-4 h-4 text-white" />
                ) : (
                  <span className={active ? "text-white" : "text-muted-foreground"}>{s.number}</span>
                )}
              </motion.div>
              <span className={`text-xs font-medium hidden sm:block ${active ? "text-primary" : "text-muted-foreground"}`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 30 }}
          transition={{ duration: 0.3 }}
        >
          {step === 1 && (
            <StepPersonalDetails
              initialProfile={profile}
              onNext={handleProfileSave}
            />
          )}
          {step === 2 && (
            <StepDocuments
              initialDocuments={documents}
              onNext={handleDocumentsDone}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <StepReturnRate
              documents={documents}
              onNext={handleReturnChosen}
              onBack={() => setStep(2)}
            />
          )}
          {step === 4 && (
            <StepResults
              profile={profile}
              documents={documents}
              returnMode={returnMode}
              manualReturn={manualReturn}
              onRestart={() => setStep(1)}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}