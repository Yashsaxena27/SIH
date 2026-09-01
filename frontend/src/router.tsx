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
      { path: 'live-map', element: Loadable(LiveMapPage) },
      { path: 'intelligence', element: Loadable(IntelligencePage) },
      { path: 'issues', element: Loadable(IssuesPage) },
      { path: 'issues/:id', element: Loadable(IssueDetailPage) },
      { path: 'verification', element: Loadable(VerificationPage) },
      { path: 'fleet', element: Loadable(FleetPage) },
      { path: 'analytics', element: Loadable(AnalyticsPage) },
      { path: 'road-health', element: Loadable(RoadHealthPage) },
      // Secondary
      { path: 'tickets', element: Loadable(TicketsPage) },
      { path: 'alerts', element: Loadable(AlertsPage) },
      { path: 'reports', element: Loadable(ReportsPage) },
    ],
  },
]);
