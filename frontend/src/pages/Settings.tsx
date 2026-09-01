// ============================================================
// Settings Page — System configuration
// ============================================================

import { Settings as SettingsIcon, User, Bell, Shield, Database, Palette } from 'lucide-react';
import { PageHeader, GlassPanel } from '@/components/ui';
import { cn } from '@/lib/utils';

const settingsSections = [
  { icon: User, label: 'Profile', description: 'User profile and preferences' },
  { icon: Bell, label: 'Notifications', description: 'Alert and notification settings' },
  { icon: Shield, label: 'Security', description: 'Authentication and access control' },
  { icon: Database, label: 'Data Sources', description: 'API endpoints and data connections' },
  { icon: Palette, label: 'Appearance', description: 'Theme and display preferences' },
  { icon: SettingsIcon, label: 'System', description: 'Edge devices, fleet configuration' },
];

export function SettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Settings"
        subtitle="System configuration and preferences"
        breadcrumbs={[{ label: 'System' }, { label: 'Settings' }]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {settingsSections.map((section) => (
          <GlassPanel
            key={section.label}
            hover
            padding="md"
            className="cursor-pointer"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                <section.icon className="w-4 h-4 text-white/40" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-white/80">{section.label}</h3>
                <p className="text-xs text-white/40 mt-0.5">{section.description}</p>
              </div>
            </div>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}
