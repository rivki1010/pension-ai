import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import FileUploader from "../components/FileUploader";

export default function UploadPage() {
  const [activeTab, setActiveTab] = useState("pension");

  const handleFileProcessed = (doc) => {
    // File processed successfully - could show toast
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-bold text-foreground font-rubik">העלאת מסמכים</h1>
        <p className="text-muted-foreground">
          העלה את דוחות הפנסיה והקרן השתלמות השנתיים. המערכת תחלץ את הנתונים באופן אוטומטי.
        </p>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="w-full grid grid-cols-2 h-12 rounded-xl bg-muted p-1">
          <TabsTrigger
            value="pension"
            className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2 text-sm font-medium"
          >
            <Shield className="w-4 h-4" />
            פנסיה
          </TabsTrigger>
          <TabsTrigger
            value="education_fund"
            className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2 text-sm font-medium"
          >
            <GraduationCap className="w-4 h-4" />
            קרן השתלמות
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pension" className="mt-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
              <h3 className="text-sm font-semibold text-foreground mb-2">מה להעלות?</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• דוח שנתי מקרן הפנסיה (PDF)</li>
                <li>• דוח רבעוני או חודשי</li>
                <li>• אישור יתרות מחברת הביטוח</li>
                <li>• צילום מסך מהאזור האישי</li>
              </ul>
            </div>
            <FileUploader documentType="pension" onFileProcessed={handleFileProcessed} />
          </motion.div>
        </TabsContent>

        <TabsContent value="education_fund" className="mt-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="bg-accent/10 rounded-xl p-4 border border-accent/20">
              <h3 className="text-sm font-semibold text-foreground mb-2">מה להעלות?</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• דוח שנתי מקרן ההשתלמות (PDF)</li>
                <li>• אישור יתרות</li>
                <li>• דוח תשואות</li>
              </ul>
            </div>
            <FileUploader documentType="education_fund" onFileProcessed={handleFileProcessed} />
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Tips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm"
      >
        <h3 className="text-base font-bold text-foreground font-rubik mb-3">💡 טיפים</h3>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>• ככל שתעלה יותר דוחות משנים שונות, כך התחזית תהיה מדויקת יותר</p>
          <p>• המערכת מחשבת תשואה ממוצעת מכל הדוחות שהעלית</p>
          <p>• ניתן להעלות קבצי PDF, Excel, CSV ותמונות</p>
          <p>• הנתונים שלך מאובטחים ומוצפנים</p>
        </div>
      </motion.div>
    </div>
  );
}