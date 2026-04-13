import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { extractDataWithAI } from "@/api/aiClient";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Shield,
  GraduationCap,
  SkipForward,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency, formatPercent } from "../../lib/pensionCalculations";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";
  const maxPages = Math.min(pdf.numPages, 4);

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .filter(Boolean);
    fullText += `${strings.join(" ")}\n`;
  }

  return fullText;
}

function FileUploadZone({ documentType, onProcessed }) {
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);

  const processFile = async (file) => {
    const fileId = Date.now() + Math.random();
    setFiles((prev) => [...prev, { id: fileId, name: file.name, status: "uploading" }]);

    try {
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status: "extracting" } : f)));

      if (file.type !== "application/pdf") {
        throw new Error("Standalone mode currently supports PDF files only.");
      }

      const text = await extractTextFromPDF(file);
      if (!text.trim()) {
        throw new Error("Could not extract text from PDF.");
      }

      const extractedData = await extractDataWithAI(text, documentType);

      const doc = {
        id: fileId,
        file_name: file.name,
        document_type: documentType,
        status: "completed",
        created_date: new Date().toISOString(),
        ...extractedData,
      };

      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status: "done", doc } : f)));
      onProcessed(doc);
    } catch (error) {
      const message = error?.message || "Failed to process file";
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status: "error", error: message } : f)));
      alert(`File processing error: ${message}`);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    Array.from(e.dataTransfer.files || []).forEach(processFile);
  }, []);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  }, []);

  const statusIcon = {
    uploading: Loader2,
    extracting: Loader2,
    done: CheckCircle2,
    error: AlertCircle,
  };
  const statusText = {
    uploading: "Reading file...",
    extracting: "Extracting with AI...",
    done: "Done",
    error: "Error",
  };
  const statusColor = {
    uploading: "text-primary",
    extracting: "text-amber-500",
    done: "text-emerald-600",
    error: "text-red-500",
  };

  return (
    <div className="space-y-3">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
          dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
        }`}
      >
        <input
          type="file"
          accept=".pdf"
          multiple
          onChange={(e) => Array.from(e.target.files || []).forEach(processFile)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm font-medium text-foreground">Drop PDF files or click to select</p>
      </div>

      <AnimatePresence>
        {files.map((f) => {
          const Icon = statusIcon[f.status];
          return (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 bg-muted/50 rounded-xl p-3"
            >
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{f.name}</p>
                <p className={`text-xs ${statusColor[f.status]}`}>{f.error || statusText[f.status]}</p>
              </div>
              <Icon
                className={`w-4 h-4 ${statusColor[f.status]} ${
                  ["uploading", "extracting"].includes(f.status) ? "animate-spin" : ""
                } shrink-0`}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export default function StepDocuments({ initialDocuments, onNext, onBack }) {
  const [documents, setDocuments] = useState(initialDocuments || []);

  const addDoc = (doc) => {
    const updatedDocs = [...documents, doc];
    setDocuments(updatedDocs);

    localStorage.setItem("pension_documents", JSON.stringify(updatedDocs));
    // Keep compatibility with existing local-first layer used by other pages.
    localStorage.setItem("pension_ai_pension_documents", JSON.stringify(updatedDocs));
  };

  const pensionDocs = documents.filter((d) => d.document_type === "pension");
  const eduDocs = documents.filter((d) => d.document_type === "education_fund");

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-primary/10">
          <Upload className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground font-rubik">Upload Documents</h2>
          <p className="text-muted-foreground text-sm">Read PDF locally and extract data with your own API key.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Pension ({pensionDocs.length} files)</h3>
          </div>
          <FileUploadZone documentType="pension" onProcessed={addDoc} />
        </div>

        <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-foreground">Education Fund ({eduDocs.length} files)</h3>
          </div>
          <FileUploadZone documentType="education_fund" onProcessed={addDoc} />
        </div>
      </div>

      {documents.length > 0 && (
        <div className="bg-muted/40 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-foreground">{documents.length} documents uploaded:</p>
          <div className="space-y-1">
            {documents.map((d, i) => (
              <div key={`${d.id || d.file_name}_${i}`} className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{d.file_name}</span>
                <div className="flex gap-4">
                  {d.total_balance != null && <span>Balance: {formatCurrency(d.total_balance)}</span>}
                  {d.annual_return_pct != null && <span className="text-emerald-600">Return: {formatPercent(d.annual_return_pct)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center pt-2">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowRight className="w-4 h-4" />
          Back
        </Button>

        <div className="flex gap-2">
          {documents.length === 0 && (
            <Button variant="ghost" onClick={() => onNext([])} className="gap-2 text-muted-foreground">
              <SkipForward className="w-4 h-4" />
              Skip (manual)
            </Button>
          )}

          {documents.length > 0 && (
            <Button onClick={() => onNext(documents)} size="lg" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Continue
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
