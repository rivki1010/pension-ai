import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Shield,
  GraduationCap,
  Trash2,
  Loader2,
  Calendar,
  TrendingUp,
  Wallet,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercent } from "../lib/pensionCalculations";
import { getJson, setJson, STORAGE_KEYS } from "../lib/localStore";

function getStoredDocuments() {
  const primary = getJson("pension_documents", []);
  if (Array.isArray(primary) && primary.length > 0) return primary;

  const fallback = getJson(STORAGE_KEYS.PENSION_DOCUMENTS, []);
  return Array.isArray(fallback) ? fallback : [];
}

function persistDocuments(documents) {
  setJson("pension_documents", documents);
  setJson(STORAGE_KEYS.PENSION_DOCUMENTS, documents);
}

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    const docs = getStoredDocuments();
    setDocuments(docs);
    setLoading(false);
  }, []);

  const handleDelete = async (id) => {
    setDeleting(id);
    const updated = documents.filter((d) => d.id !== id);
    setDocuments(updated);
    persistDocuments(updated);
    setDeleting(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const pensionDocs = documents.filter((d) => d.document_type === "pension");
  const eduDocs = documents.filter((d) => d.document_type === "education_fund");

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-bold text-foreground font-rubik">My Documents</h1>
        <p className="text-muted-foreground">
          {documents.length} uploaded documents • {pensionDocs.length} pension • {eduDocs.length} education fund
        </p>
      </motion.div>

      {documents.length === 0 ? (
        <EmptyDocuments />
      ) : (
        <div className="space-y-6">
          {pensionDocs.length > 0 && (
            <DocumentSection
              title="Pension"
              icon={Shield}
              documents={pensionDocs}
              onDelete={handleDelete}
              deleting={deleting}
            />
          )}
          {eduDocs.length > 0 && (
            <DocumentSection
              title="Education Fund"
              icon={GraduationCap}
              documents={eduDocs}
              onDelete={handleDelete}
              deleting={deleting}
            />
          )}
        </div>
      )}
    </div>
  );
}

function DocumentSection({ title, icon: Icon, documents, onDelete, deleting }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground font-rubik">{title}</h2>
        <Badge variant="secondary" className="mr-2">{documents.length}</Badge>
      </div>
      <div className="space-y-3">
        <AnimatePresence>
          {documents.map((doc, i) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              index={i}
              onDelete={onDelete}
              isDeleting={deleting === doc.id}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function DocumentCard({ doc, index, onDelete, isDeleting }) {
  const isError = doc.status === "error";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ delay: index * 0.05 }}
      className={`bg-card rounded-xl border p-5 shadow-sm hover:shadow-md transition-all ${
        isError ? "border-red-200 bg-red-50/50" : "border-border/50"
      }`}
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${isError ? "bg-red-100" : "bg-primary/10"}`}>
          {isError ? (
            <AlertCircle className="w-5 h-5 text-red-500" />
          ) : (
            <FileText className="w-5 h-5 text-primary" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground truncate">{doc.file_name}</p>
            {doc.provider_name && (
              <Badge variant="outline" className="text-xs">{doc.provider_name}</Badge>
            )}
          </div>

          {isError ? (
            <p className="text-sm text-red-500">{doc.extraction_notes || "Data extraction failed"}</p>
          ) : (
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
              {doc.year && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Year {doc.year}
                </span>
              )}
              {doc.total_balance != null && (
                <span className="flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5" />
                  Balance: {formatCurrency(doc.total_balance)}
                </span>
              )}
              {doc.annual_return_pct != null && (
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Return: {formatPercent(doc.annual_return_pct)}
                </span>
              )}
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(doc.id)}
          disabled={isDeleting}
          className="shrink-0 text-muted-foreground hover:text-red-500 hover:bg-red-50"
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </Button>
      </div>
    </motion.div>
  );
}

function EmptyDocuments() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20 text-center space-y-4"
    >
      <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center">
        <FileText className="w-10 h-10 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">No documents yet</h3>
        <p className="text-sm text-muted-foreground">Upload your pension and education fund reports to get started.</p>
      </div>
      <Button asChild>
        <Link to="/upload">Upload Documents</Link>
      </Button>
    </motion.div>
  );
}
