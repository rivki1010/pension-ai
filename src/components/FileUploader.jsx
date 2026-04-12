import { useState, useCallback } from "react";
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";

export default function FileUploader({ onFileProcessed, documentType }) {
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const processFile = async (file) => {
    const fileId = Date.now() + Math.random();
    const fileEntry = { id: fileId, name: file.name, status: "uploading", progress: 0 };
    setFiles((prev) => [...prev, fileEntry]);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status: "extracting", file_url } : f)));

      const extractionResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            provider_name: { type: "string", description: "שם חברת הביטוח/קרן" },
            year: { type: "number", description: "שנת הדוח" },
            total_balance: { type: "number", description: "יתרה כוללת בשקלים" },
            monthly_deposit: { type: "number", description: "הפקדה חודשית כוללת" },
            employer_deposit: { type: "number", description: "הפקדת מעסיק חודשית" },
            employee_deposit: { type: "number", description: "הפקדת עובד חודשית" },
            annual_return_pct: { type: "number", description: "תשואה שנתית באחוזים" },
            management_fee_pct: { type: "number", description: "דמי ניהול מצבירה" },
            management_fee_deposit_pct: { type: "number", description: "דמי ניהול מהפקדה" },
            insurance_component: { type: "number", description: "רכיב ביטוח/סיכון" },
            severance_balance: { type: "number", description: "יתרת פיצויים" },
            compensation_balance: { type: "number", description: "יתרת תגמולים" },
          },
        },
      });

      if (extractionResult.status === "success") {
        const data = extractionResult.output;
        const doc = await base44.entities.PensionDocument.create({
          file_url,
          file_name: file.name,
          document_type: documentType,
          status: "completed",
          ...data,
        });

        setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status: "done", data: doc } : f)));
        if (onFileProcessed) onFileProcessed(doc);
      } else {
        const details = extractionResult.details || "שגיאה בחילוץ נתונים";
        await base44.entities.PensionDocument.create({
          file_url,
          file_name: file.name,
          document_type: documentType,
          status: "error",
          extraction_notes: details,
        });
        setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status: "error", error: details } : f)));
      }
    } catch (error) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, status: "error", error: error?.message || "שגיאה בעיבוד הקובץ" }
            : f
        )
      );
    }
  };

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      droppedFiles.forEach(processFile);
    },
    [documentType]
  );

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    selectedFiles.forEach(processFile);
  };

  const removeFile = (fileId) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const statusConfig = {
    uploading: { icon: Loader2, text: "מעלה...", color: "text-primary", spin: true },
    extracting: { icon: Loader2, text: "מנתח נתונים...", color: "text-accent-foreground", spin: true },
    done: { icon: CheckCircle2, text: "הושלם", color: "text-emerald-600", spin: false },
    error: { icon: AlertCircle, text: "שגיאה", color: "text-red-500", spin: false },
  };

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all duration-300 cursor-pointer ${
          dragActive
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-border hover:border-primary/50 hover:bg-muted/50"
        }`}
      >
        <input
          type="file"
          accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
          multiple
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Upload className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">גרור קבצים לכאן או לחץ לבחירה</p>
            <p className="text-sm text-muted-foreground mt-1">PDF, Excel, CSV או תמונה • עד 10MB לקובץ</p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {files.map((file) => {
          const config = statusConfig[file.status];
          const StatusIcon = config.icon;
          return (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3 bg-card rounded-xl p-4 border border-border/50"
            >
              <div className="p-2 rounded-lg bg-muted">
                <FileText className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                <p className={`text-xs ${config.color}`}>{file.error || config.text}</p>
              </div>
              <StatusIcon className={`w-5 h-5 ${config.color} ${config.spin ? "animate-spin" : ""}`} />
              {(file.status === "done" || file.status === "error") && (
                <button onClick={() => removeFile(file.id)} className="p-1 hover:bg-muted rounded-lg transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
