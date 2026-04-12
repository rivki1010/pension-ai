import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Upload, Shield, GraduationCap, SkipForward } from "lucide-react";
import { motion } from "framer-motion";
import FileUploader from "@/components/FileUploader";
import { formatCurrency, formatPercent } from "../../lib/pensionCalculations";

export default function StepDocuments({ initialDocuments, onNext, onBack }) {
  const [documents, setDocuments] = useState(initialDocuments || []);

  const addDoc = (doc) => setDocuments((prev) => [...prev, doc]);

  const pensionDocs = documents.filter((d) => d.document_type === "pension");
  const eduDocs = documents.filter((d) => d.document_type === "education_fund");

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-primary/10">
          <Upload className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground font-rubik">העלאת מסמכים</h2>
          <p className="text-muted-foreground text-sm">העלה דוחות פנסיה וקרן השתלמות מהשנים האחרונות</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">פנסיה ({pensionDocs.length} קבצים)</h3>
          </div>
          <FileUploader documentType="pension" onFileProcessed={addDoc} />
        </div>

        <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-foreground">קרן השתלמות ({eduDocs.length} קבצים)</h3>
          </div>
          <FileUploader documentType="education_fund" onFileProcessed={addDoc} />
        </div>
      </div>

      {documents.length > 0 && (
        <div className="bg-muted/40 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-foreground">{documents.length} מסמכים הועלו:</p>
          <div className="space-y-1">
            {documents.map((d, i) => (
              <div key={`${d.id || d.file_name}_${i}`} className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{d.file_name}</span>
                <div className="flex gap-4">
                  {d.total_balance != null && <span>יתרה: {formatCurrency(d.total_balance)}</span>}
                  {d.annual_return_pct != null && <span className="text-emerald-600">תשואה: {formatPercent(d.annual_return_pct)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center pt-2">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowRight className="w-4 h-4" />
          חזור
        </Button>
        <div className="flex gap-2">
          {documents.length === 0 && (
            <Button variant="ghost" onClick={() => onNext([])} className="gap-2 text-muted-foreground">
              <SkipForward className="w-4 h-4" />
              דלג (הזנה ידנית)
            </Button>
          )}
          {documents.length > 0 && (
            <Button onClick={() => onNext(documents)} size="lg" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              המשך לשלב הבא
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
