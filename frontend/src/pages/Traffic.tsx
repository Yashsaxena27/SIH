import { Car, Clock } from 'lucide-react';
import { PageHeader, GlassPanel } from '@/components/ui';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function TrafficPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Traffic Intelligence"
        subtitle="Vehicle density analysis and congestion monitoring"
        icon={<Car />}
        breadcrumbs={['Analytics', 'Traffic']}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <GlassPanel className="h-[500px] flex flex-col items-center justify-center p-8 text-center border-dashed border-2">
          <div className="w-20 h-20 bg-brand-blue/10 rounded-full flex items-center justify-center mb-6">
            <Car className="w-10 h-10 text-brand-blue" />
          </div>
          
          <h2 className="text-2xl font-semibold mb-3">Coming in Phase 2</h2>
          
          <p className="text-foreground/60 max-w-md text-lg leading-relaxed mb-8">
            Vehicle detection, tracking, density heatmaps, and congestion pattern analysis using edge inference data from the bus fleet.
          </p>

          <div className="flex items-center space-x-2 text-sm text-foreground/40 bg-black/5 px-4 py-2 rounded-full">
            <Clock className="w-4 h-4" />
            <span>Under development</span>
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  );
}
