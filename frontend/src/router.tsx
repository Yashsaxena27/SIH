import { createBrowserRouter } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AppShell } from './components/layout/AppShell';
import { PageSkeleton } from './components/ui/States';

// Lazy load pages for performance
const OverviewPage = lazy(() => import('./pages/Overview').then(m => ({ default: m.OverviewPage })));
const IssuesPage = lazy(() => import('./pages/Issues').then(m => ({ default: m.IssuesPage })));
const IssueDetailPage = lazy(() => import('./pages/IssueDetail').then(m => ({ default: m.IssueDetailPage })));
const IntelligencePage = lazy(() => import('./pages/Intelligence').then(m => ({ default: m.IntelligencePage })));
const LiveMapPage = lazy(() => import('./pages/LiveMap').then(m => ({ default: m.LiveMapPage })));
const VerificationPage = lazy(() => import('./pages/Verification').then(m => ({ default: m.VerificationPage })));
const FleetPage = lazy(() => import('./pages/Fleet').then(m => ({ default: m.FleetPage })));
const AnalyticsPage = lazy(() => import('./pages/Analytics').then(m => ({ default: m.AnalyticsPage })));
const RoadHealthPage = lazy(() => import('./pages/RoadHealth').then(m => ({ default: m.RoadHealthPage })));

// Placeholders for remaining secondary routes
const TicketsPage = lazy(() => import('./pages/Tickets').then(m => ({ default: m.TicketsPage })));
const AlertsPage = lazy(() => import('./pages/Alerts').then(m => ({ default: m.AlertsPage })));
const ReportsPage = lazy(() => import('./pages/Reports').then(m => ({ default: m.ReportsPage })));

const RoutesPage = lazy(() => import('./pages/Routes').then(m => ({ default: m.RoutesPage })));
const EdgeMonitoringPage = lazy(() => import('./pages/EdgeMonitoring').then(m => ({ default: m.EdgeMonitoringPage })));
const TrafficPage = lazy(() => import('./pages/Traffic').then(m => ({ default: m.TrafficPage })));
const SettingsPage = lazy(() => import('./pages/Settings').then(m => ({ default: m.SettingsPage })));
const NotFoundPage = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFoundPage })));

// Wrapper to suspend routes with premium skeleton
const Loadable = (Component: React.ComponentType) => (
  <Suspense fallback={<PageSkeleton />}>
    <Component />
  </Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: Loadable(OverviewPage) },
      { path: 'overview', element: Loadable(OverviewPage) },
      { path: 'live-map', element: Loadable(LiveMapPage) },
      { path: 'intelligence', element: Loadable(IntelligencePage) },
      { path: 'issues', element: Loadable(IssuesPage) },
      { path: 'issues/:id', element: Loadable(IssueDetailPage) },
      { path: 'verification', element: Loadable(VerificationPage) },
      { path: 'fleet', element: Loadable(FleetPage) },
      { path: 'analytics', element: Loadable(AnalyticsPage) },
      { path: 'road-health', element: Loadable(RoadHealthPage) },
      { path: 'routes', element: Loadable(RoutesPage) },
      { path: 'edge-monitoring', element: Loadable(EdgeMonitoringPage) },
      { path: 'traffic', element: Loadable(TrafficPage) },
      // Secondary
      { path: 'tickets', element: Loadable(TicketsPage) },
      { path: 'alerts', element: Loadable(AlertsPage) },
      { path: 'reports', element: Loadable(ReportsPage) },
      { path: 'settings', element: Loadable(SettingsPage) },
      // Fallback 404
      { path: '*', element: Loadable(NotFoundPage) }
    ],
  },
]);
