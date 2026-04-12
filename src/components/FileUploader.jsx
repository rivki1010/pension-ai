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
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const processFile = async (file) => {
    const fileId = Date.now() + Math.random();
    setFiles((prev) => [...prev, { id: fileId, name: file.name, status: "uploading" }]);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status: "extracting", file_url } : f)));

      const extractionResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            provider_name: { type: "string" },
            year: { type: "number" },
            total_balance: { type: "number" },
            monthly_deposit: { type: "number" },
            employer_deposit: { type: "number" },
            employee_deposit: { type: "number" },
            annual_return_pct: { type: "number" },
            management_fee_pct: { type: "number" },
            management_fee_deposit_pct: { type: "number" },
            insurance_component: { type: "number" },
            severance_balance: { type: "number" },
            compensation_balance: { type: "number" },
          },
        },
      });

      if (extractionResult.status === "success") {
        const doc = await base44.entities.PensionDocument.create({
          file_url,
          file_name: file.name,
          document_type: documentType,
          status: "completed",
          ...extractionResult.output,
        });
        setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status: "done", data: doc } : f)));
        onFileProcessed?.(doc);
      } else {
        const details = extractionResult.details || "Could not extract data";
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
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status: "error", error: error?.message || "Processing failed" } : f)));
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    Array.from(e.dataTransfer.files || []).forEach(processFile);
  }, []);

  const handleFileSelect = (e) => {
    Array.from(e.target.files || []).forEach(processFile);
  };

  const removeFile = (fileId) => setFiles((prev) => prev.filter((f) => f.id !== fileId));

  const statusConfig = {
    uploading: { icon: Loader2, text: "Uploading...", color: "text-primary", spin: true },
    extracting: { icon: Loader2, text: "Extracting data...", color: "text-accent-foreground", spin: true },
    done: { icon: CheckCircle2, text: "Done", color: "text-emerald-600", spin: false },
    error: { icon: AlertCircle, text: "Error", color: "text-red-500", spin: false },
  };

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all duration-300 cursor-pointer ${
          dragActive ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/50 hover:bg-muted/50"
        }`}
      >
        <input type="file" accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg" multiple onChange={handleFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        <div className="space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto"><Upload className="w-7 h-7 text-primary" /></div>
          <div>
            <p className="text-base font-semibold text-foreground">Drop files here or click to browse</p>
            <p className="text-sm text-muted-foreground mt-1">PDF, Excel, CSV, or image | up to 10MB per file</p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {files.map((file) => {
          const config = statusConfig[file.status];
          const StatusIcon = config.icon;
          return (
            <motion.div key={file.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-3 bg-card rounded-xl p-4 border border-border/50">
              <div className="p-2 rounded-lg bg-muted"><FileText className="w-5 h-5 text-muted-foreground" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                <p className={`text-xs ${config.color}`}>{file.error || config.text}</p>
              </div>
              <StatusIcon className={`w-5 h-5 ${config.color} ${config.spin ? "animate-spin" : ""}`} />
              {(file.status === "done" || file.status === "error") && (
                <button onClick={() => removeFile(file.id)} className="p-1 hover:bg-muted rounded-lg transition-colors"><X className="w-4 h-4 text-muted-foreground" /></button>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
