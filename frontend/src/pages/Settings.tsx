// ============================================================
// Settings Page — System configuration
// ============================================================

import { motion } from 'framer-motion';
import { Settings as SettingsIcon, User, Bell, Shield, Database, Palette, ChevronRight } from 'lucide-react';
import { PageHeader, GlassPanel } from '@/components/ui';

const settingsSections = [
  { icon: User, label: 'Profile', description: 'User profile and operator preferences' },
  { icon: Bell, label: 'Notifications', description: 'Alert dispatch and notification thresholds' },
  { icon: Shield, label: 'Security', description: 'Authentication credentials and access control' },
  { icon: Database, label: 'Data Sources', description: 'API endpoints and telemetry data connections' },
  { icon: Palette, label: 'Appearance', description: 'Theme mode and display preferences' },
  { icon: SettingsIcon, label: 'System', description: 'Edge AI processing devices and fleet config' },
];

export function SettingsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1920px] mx-auto pb-20">
      <PageHeader
        title="Settings"
        subtitle="System configuration, preferences, and telemetry node controls."
        breadcrumbs={[{ label: 'System' }, { label: 'Settings' }]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {settingsSections.map((section, index) => {
          const Icon = section.icon;

          return (
            <motion.div
              key={section.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, duration: 0.2 }}
            >
              <GlassPanel
                padding="lg"
                className="group cursor-pointer border-outline-variant/80 hover:border-primary/50 shadow-md hover:shadow-xl transition-all duration-300 relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform duration-300 shadow-sm mt-0.5">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <h3 className="text-base font-extrabold text-on-surface tracking-tight group-hover:text-primary transition-colors">
                        {section.label}
                      </h3>
                      <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                        {section.description}
                      </p>
                    </div>
                  </div>

                  <div className="w-8 h-8 rounded-xl bg-surface-container-high border border-outline-variant/60 flex items-center justify-center text-on-surface-variant group-hover:text-primary group-hover:border-primary/40 transition-all shrink-0">
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>

                <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </GlassPanel>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
