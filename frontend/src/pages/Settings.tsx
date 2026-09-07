import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings as SettingsIcon, User, Bell, Shield, Database, Palette, ChevronRight, X, CheckCircle2 } from 'lucide-react';
import { PageHeader, GlassPanel } from '@/components/ui';

const settingsSections = [
  { 
    id: 'profile',
    icon: User, 
    label: 'Profile', 
    description: 'User profile and operator preferences',
    details: [
      { label: 'Current User', value: 'Operator Sneha (Default Demo Operator)' },
      { label: 'Role / Clearance', value: 'System Operator / Dispatcher' },
      { label: 'Assigned Department', value: 'Delhi-NCR Traffic Division' },
      { label: 'Session Token', value: 'Bearer demo-operator-token (Active)' }
    ]
  },
  { 
    id: 'notifications',
    icon: Bell, 
    label: 'Notifications', 
    description: 'Alert dispatch and notification thresholds',
    details: [
      { label: 'Alert Dispatch Trigger', value: 'Real-time WebSocket & Live Push' },
      { label: 'High Priority Threshold', value: 'Confidence >= 0.70 or Severity: Critical' },
      { label: 'Auto-Acknowledge', value: 'Disabled (Manual Operator Confirmation)' },
      { label: 'Escalation Channel', value: 'Municipal Department Queue' }
    ]
  },
  { 
    id: 'security',
    icon: Shield, 
    label: 'Security', 
    description: 'Authentication credentials and access control',
    details: [
      { label: 'RBAC Enforcement', value: 'Active (admin, operator, officer)' },
      { label: 'JWT Authentication', value: 'HS256 with 24-hour token expiry' },
      { label: 'Path Traversal Guard', value: 'Strict safe-filename UUID sandboxing' },
      { label: 'Upload Firewall', value: '100MB Max Video / Allowed Formats: mp4, mov, avi, mkv' }
    ]
  },
  { 
    id: 'datasources',
    icon: Database, 
    label: 'Data Sources', 
    description: 'API endpoints and telemetry data connections',
    details: [
      { label: 'Backend API Gateway', value: 'http://localhost:8000/api/v1' },
      { label: 'Spatial Database', value: 'PostgreSQL 16 + PostGIS 3.4' },
      { label: 'Message Broker / Cache', value: 'Redis 7 (redis://localhost:6379)' },
      { label: 'Evidence Storage Mount', value: '/evidence static asset filesystem' }
    ]
  },
  { 
    id: 'appearance',
    icon: Palette, 
    label: 'Appearance', 
    description: 'Theme mode and display preferences',
    details: [
      { label: 'Visual Interface', value: 'Kinetic Infrastructure Dark Mode' },
      { label: 'Accent Palette', value: 'Hexagon Industrial Slate & Signal Emerald' },
      { label: 'Data Density', value: 'High Density Telemetry Grid' },
      { label: 'Motion Effects', value: 'Hardware-Accelerated Fluid Spring Animations' }
    ]
  },
  { 
    id: 'system',
    icon: SettingsIcon, 
    label: 'System', 
    description: 'Edge AI processing devices and fleet config',
    details: [
      { label: 'CV Model Architecture', value: 'YOLOv8x Road Distress Detector' },
      { label: 'Active GIS Boundary', value: 'Delhi-NCR (MCD Central & Noida Authority)' },
      { label: 'Corridor Route', value: 'SEG-DEL-NCR-01 (Ring Road - Ashram Chowk)' },
      { label: 'Spatial Fusion Radius', value: '10.0 Meters (PostGIS ST_DWithin)' }
    ]
  },
];

export function SettingsPage() {
  const [selectedSection, setSelectedSection] = useState<typeof settingsSections[0] | null>(null);

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
                onClick={() => setSelectedSection(section)}
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

      {/* Configuration Detail Modal */}
      <AnimatePresence>
        {selectedSection && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedSection(null)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-lg bg-surface-elevated/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-6 pointer-events-auto space-y-6"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                      <selectedSection.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">{selectedSection.label} Configuration</h2>
                      <p className="text-xs text-white/50">{selectedSection.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedSection(null)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  {selectedSection.details.map((item, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] gap-1">
                      <span className="text-xs text-white/50">{item.label}</span>
                      <span className="text-xs font-mono font-medium text-white/90 bg-white/[0.04] px-2 py-0.5 rounded text-left sm:text-right">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-between items-center text-[11px] text-white/40 border-t border-white/[0.06]">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Parameter Verified
                  </span>
                  <button
                    onClick={() => setSelectedSection(null)}
                    className="px-3 py-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary font-medium text-xs transition-colors"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
