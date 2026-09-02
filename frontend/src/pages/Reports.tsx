import { FileText, Calendar, TrendingUp, Shield, Activity, Truck, CheckSquare, Download } from 'lucide-react';
import { PageHeader, GlassPanel } from '@/components/ui';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function ReportsPage() {
  const reports = [
    {
      title: 'Daily Summary',
      description: 'Comprehensive overview of yesterday\'s fleet operations and detections.',
      icon: Calendar,
      color: 'text-brand-blue'
    },
    {
      title: 'Weekly Analysis',
      description: 'Trend analysis of pothole formations and repair verification over 7 days.',
      icon: TrendingUp,
      color: 'text-brand-purple'
    },
    {
      title: 'Department Performance',
      description: 'Metrics on issue resolution times and contractor performance.',
      icon: Shield,
      color: 'text-brand-green'
    },
    {
      title: 'Road Health Report',
      description: 'Detailed deterioration metrics by road segment and ward.',
      icon: Activity,
      color: 'text-brand-orange'
    },
    {
      title: 'Fleet Utilization',
      description: 'Edge device uptime and route coverage efficiency.',
      icon: Truck,
      color: 'text-brand-blue'
    },
    {
      title: 'Verification Audit',
      description: 'Log of all system-verified repairs and manual overrides.',
      icon: CheckSquare,
      color: 'text-brand-red'
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Automated reporting and data export"
        icon={<FileText />}
        breadcrumbs={['Analytics', 'Reports']}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report, i) => (
          <motion.div
            key={report.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
          >
            <GlassPanel hover className="p-6 h-full flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-black/5 rounded-xl">
                  <report.icon className={cn("w-6 h-6", report.color)} />
                </div>
              </div>
              
              <h3 className="text-xl font-semibold mb-2">{report.title}</h3>
              <p className="text-foreground/60 text-sm mb-6 flex-grow">
                {report.description}
              </p>
              
              <button className="w-full py-2.5 px-4 rounded-lg bg-black/5 hover:bg-black/10 border border-black/10 transition-colors flex items-center justify-center space-x-2 text-sm font-medium">
                <Download className="w-4 h-4" />
                <span>Generate Report</span>
              </button>
            </GlassPanel>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
