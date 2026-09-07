import { useState } from 'react';
import { FileText, Calendar, TrendingUp, Shield, Activity, Truck, CheckSquare, Download, Check, Loader2 } from 'lucide-react';
import { PageHeader, GlassPanel } from '@/components/ui';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { analyticsService } from '@/services/modules/analyticsService';
import { issueService } from '@/services/modules/issueService';

export function ReportsPage() {
  const [loadingReport, setLoadingReport] = useState<string | null>(null);
  const [successReport, setSuccessReport] = useState<string | null>(null);

  const reports = [
    {
      title: 'Daily Summary',
      description: 'Comprehensive overview of yesterday\'s fleet operations and detections.',
      icon: Calendar,
      color: 'text-brand-blue',
      type: 'summary'
    },
    {
      title: 'Weekly Analysis',
      description: 'Trend analysis of pothole formations and repair verification over 7 days.',
      icon: TrendingUp,
      color: 'text-brand-purple',
      type: 'trends'
    },
    {
      title: 'Department Performance',
      description: 'Metrics on issue resolution times and contractor performance.',
      icon: Shield,
      color: 'text-brand-green',
      type: 'tickets'
    },
    {
      title: 'Road Health Report',
      description: 'Detailed deterioration metrics by road segment and ward.',
      icon: Activity,
      color: 'text-brand-orange',
      type: 'roads'
    },
    {
      title: 'Issues Registry Export',
      description: 'Full audit log of detected potholes, severity scores, and GPS coordinates.',
      icon: Truck,
      color: 'text-brand-blue',
      type: 'issues'
    },
    {
      title: 'Verification Audit',
      description: 'Log of all system-verified repairs and closed-loop inspections.',
      icon: CheckSquare,
      color: 'text-brand-red',
      type: 'verifications'
    }
  ];

  const handleGenerateReport = async (report: typeof reports[0]) => {
    setLoadingReport(report.title);
    setSuccessReport(null);

    try {
      let csvContent = "";
      const timestamp = new Date().toISOString().slice(0, 10);

      if (report.type === 'issues') {
        const issues = await issueService.getIssues();
        const headers = ["id", "issueType", "severity", "status", "roadSegmentId", "authorityId", "observationCount", "firstDetectedAt", "latitude", "longitude"];
        const rows = issues.map(i => [
          i.id,
          i.issueType,
          i.severity,
          i.status,
          i.roadSegmentId || "",
          i.authorityId || "",
          i.observationCount || 1,
          i.firstDetectedAt || "",
          i.location?.lat || "",
          i.location?.lng || ""
        ]);
        csvContent = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
      } else if (report.type === 'roads') {
        const roads = await analyticsService.getRoadSegments();
        const headers = ["id", "name", "authorityId", "currentHealthScore", "status", "lengthKm"];
        const rows = roads.map(r => [
          r.id,
          r.name,
          r.authorityId || "",
          r.currentHealthScore || "",
          r.status || "",
          r.lengthKm || ""
        ]);
        csvContent = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
      } else {
        const summary = await analyticsService.getAnalyticsSummary();
        const rows = [
          ["Metric", "Value"],
          ["Generated At", new Date().toISOString()],
          ["Report Type", report.title],
          ["Total Issues", summary?.totalIssues ?? "N/A"],
          ["Critical Issues", summary?.criticalIssues ?? "N/A"],
          ["Active Tickets", summary?.activeTickets ?? "N/A"],
          ["Avg Health Score", summary?.averageHealthScore ?? "N/A"],
          ["Total Segments", summary?.totalSegments ?? "N/A"],
        ];
        csvContent = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
      }

      // Trigger browser download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${report.title.toLowerCase().replace(/\s+/g, '_')}_${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccessReport(report.title);
      setTimeout(() => setSuccessReport(null), 3000);
    } catch (err) {
      console.error("Failed to generate report:", err);
    } finally {
      setLoadingReport(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Automated operational reporting and CSV data exports"
        icon={<FileText />}
        breadcrumbs={['Analytics', 'Reports']}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report, i) => {
          const isLoading = loadingReport === report.title;
          const isSuccess = successReport === report.title;

          return (
            <motion.div
              key={report.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              <GlassPanel hover className="p-6 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-white/5 rounded-xl">
                      <report.icon className={cn("w-6 h-6", report.color)} />
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-2">{report.title}</h3>
                  <p className="text-foreground/60 text-sm mb-6">
                    {report.description}
                  </p>
                </div>
                
                <button 
                  onClick={() => handleGenerateReport(report)}
                  disabled={isLoading}
                  className={cn(
                    "w-full py-2.5 px-4 rounded-lg border transition-all duration-200 flex items-center justify-center space-x-2 text-sm font-medium",
                    isSuccess 
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                      : "bg-white/5 hover:bg-white/10 text-white border-white/10"
                  )}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Exporting Data...</span>
                    </>
                  ) : isSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Downloaded CSV</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Generate Report</span>
                    </>
                  )}
                </button>
              </GlassPanel>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
