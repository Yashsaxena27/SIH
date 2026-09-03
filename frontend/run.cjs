const fs = require('fs');
const p1 = 'C:/Users/saxen/AIH-POTHOLE/frontend/src/components/ui/SeverityBadge.tsx';
let c1 = fs.readFileSync(p1, 'utf8');
c1 = c1.replace(/<span className="font-medium">/g, '<span className="font-label-caps">');
fs.writeFileSync(p1, c1);

const p2 = 'C:/Users/saxen/AIH-POTHOLE/frontend/src/components/ui/StatusBadge.tsx';
let c2 = fs.readFileSync(p2, 'utf8');
c2 = c2.replace(/bg-status-low/g, 'bg-status-healthy');
c2 = c2.replace(/bg-surface-container border border-outline-variant/g, 'bg-surface-container border border-outline-variant'); // Was already done?
c2 = c2.replace(/bg-white\/\[0\.03\] border border-white\/\[0\.06\]/g, 'bg-surface-container border border-outline-variant');
c2 = c2.replace(/text-white\/90/g, 'text-on-surface');
fs.writeFileSync(p2, c2);

const p3 = 'C:/Users/saxen/AIH-POTHOLE/frontend/src/components/ui/MetricCard.tsx';
let c3 = fs.readFileSync(p3, 'utf8');
c3 = c3.replace(/text-3xl font-semibold tracking-tight text-white\/90/g, 'text-3xl font-display-metrics text-on-surface');
c3 = c3.replace(/text-sm font-medium text-white\/56/g, 'text-sm font-medium text-on-surface-variant');
c3 = c3.replace(/text-white\/56/g, 'text-on-surface-variant');
c3 = c3.replace(/bg-white\/5/g, 'bg-surface-container');
c3 = c3.replace(/text-status-low/g, 'text-status-healthy');
fs.writeFileSync(p3, c3);

const p4 = 'C:/Users/saxen/AIH-POTHOLE/frontend/src/components/ui/DataTable.tsx';
let c4 = fs.readFileSync(p4, 'utf8');
c4 = c4.replace(/className={cn\('px-6 py-4'/g, 'className={cn(\'px-6 py-4 tabular-nums\'');
fs.writeFileSync(p4, c4);

const p5 = 'C:/Users/saxen/AIH-POTHOLE/frontend/src/components/gis/CommandMap.tsx';
let c5 = fs.readFileSync(p5, 'utf8');
c5 = c5.replace(/color: '#8b5cf6'/g, "color: '#b4c5ff'");
c5 = c5.replace(/bg-primary/g, 'bg-secondary-container');
c5 = c5.replace(/fillColor: issue.severity === 'critical' \? 'var\(--color-status-critical\)' : 'var\(--color-status-high\)'/, "fillColor: issue.severity === 'critical' ? '#dc2626' : '#f97316'");
fs.writeFileSync(p5, c5);

const p6 = 'C:/Users/saxen/AIH-POTHOLE/frontend/src/pages/Analytics.tsx';
let c6 = fs.readFileSync(p6, 'utf8');
c6 = c6.replace(/text-7xl font-bold tracking-tighter text-on-surface leading-none/g, 'text-7xl font-display-metrics text-on-surface leading-none');
c6 = c6.replace(/text-xs font-bold uppercase tracking-widest/g, 'font-label-caps');
fs.writeFileSync(p6, c6);
