import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { HashRouter as Router, Route, Routes } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import PensionWizard from "./pages/PensionWizard";
import UploadPage from "./pages/UploadPage";
import Calculator from "./pages/Calculator";
import Documents from "./pages/Documents";
import InvestmentComparison from "./pages/InvestmentComparison";
import FundsComparison from "./pages/FundsComparison";
import Methodology from "./pages/Methodology";
import Settings from "./pages/Settings";

const AppRoutes = () => {
  const { isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<PensionWizard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/calculator" element={<Calculator />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/investment-comparison" element={<InvestmentComparison />} />
        <Route path="/funds-comparison" element={<FundsComparison />} />
        <Route path="/methodology" element={<Methodology />} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AppRoutes />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;