import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from './ProtectedRoute';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { AuthLayout } from '../components/layout/AuthLayout';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { CookieConsentBanner } from '../components/features/CookieConsentBanner/CookieConsentBanner';

const LoadingFallback = () => (
  <div className="p-8"><SkeletonLoader lines={5} /></div>
);

// Auth
const LogInPage = lazy(() => import('../pages/auth/LogInPage').then(m => ({ default: m.LogInPage })));
const SignUpPage = lazy(() => import('../pages/auth/SignUpPage').then(m => ({ default: m.SignUpPage })));
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const CheckYourEmailPage = lazy(() => import('../pages/auth/CheckYourEmailPage').then(m => ({ default: m.CheckYourEmailPage })));
const VerifyEmailPage = lazy(() => import('../pages/auth/VerifyEmailPage').then(m => ({ default: m.VerifyEmailPage })));

// Dashboard
const DashboardHomePage = lazy(() => import('../pages/dashboard/DashboardHomePage').then(m => ({ default: m.DashboardHomePage })));
const ApiKeysPage = lazy(() => import('../pages/dashboard/ApiKeysPage').then(m => ({ default: m.ApiKeysPage })));
const DocumentsPage = lazy(() => import('../pages/dashboard/DocumentsPage').then(m => ({ default: m.DocumentsPage })));
const DocumentDetailPage = lazy(() => import('../pages/dashboard/DocumentDetailPage').then(m => ({ default: m.DocumentDetailPage })));
const QueryExplorerPage = lazy(() => import('../pages/dashboard/QueryExplorerPage').then(m => ({ default: m.QueryExplorerPage })));
const UsageBillingPage = lazy(() => import('../pages/dashboard/UsageBillingPage').then(m => ({ default: m.UsageBillingPage })));
const TeamPage = lazy(() => import('../pages/dashboard/TeamPage').then(m => ({ default: m.TeamPage })));
const WebhooksPage = lazy(() => import('../pages/dashboard/WebhooksIntegrationsPage').then(m => ({ default: m.WebhooksIntegrationsPage })));
const AuditLogsPage = lazy(() => import('../pages/dashboard/AuditLogsPage').then(m => ({ default: m.AuditLogsPage })));
const NotificationsPage = lazy(() => import('../pages/dashboard/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const SettingsPage = lazy(() => import('../pages/dashboard/SettingsPage').then(m => ({ default: m.SettingsPage })));
const SecuritySettingsPage = lazy(() => import('../pages/dashboard/SecuritySettingsPage').then(m => ({ default: m.SecuritySettingsPage })));
const SupportHelpPage = lazy(() => import('../pages/dashboard/SupportHelpPage').then(m => ({ default: m.SupportHelpPage })));
const TenantIsolationPage = lazy(() => import('../pages/dashboard/TenantIsolationPage').then(m => ({ default: m.TenantIsolationPage })));

// Landing
const LandingPage = lazy(() => import('../pages/LandingPage').then(m => ({ default: m.LandingPage })));
const PrivacyPolicyPage = lazy(() => import('../pages/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
const DocsPage = lazy(() => import('../pages/DocsPage').then(m => ({ default: m.DocsPage })));

// System
const NotFoundPage = lazy(() => import('../pages/system/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const ServerErrorPage = lazy(() => import('../pages/system/ServerErrorPage').then(m => ({ default: m.ServerErrorPage })));
const UnauthorizedAccessPage = lazy(() => import('../pages/system/UnauthorizedAccessPage').then(m => ({ default: m.UnauthorizedAccessPage })));

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Landing page */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/docs" element={<DocsPage />} />

          {/* Auth routes (redirect to dashboard if already logged in) */}
          <Route element={<PublicRoute />}>
            <Route element={<AuthLayout />}>
              <Route path="/log-in" element={<LogInPage />} />
              <Route path="/sign-up" element={<SignUpPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/check-your-email" element={<CheckYourEmailPage />} />
            </Route>
          </Route>
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          {/* Protected dashboard */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardHomePage />} />
              <Route path="/dashboard/api-keys" element={<ApiKeysPage />} />
              <Route path="/dashboard/documents" element={<DocumentsPage />} />
              <Route path="/dashboard/documents/:id" element={<DocumentDetailPage />} />
              <Route path="/dashboard/queries" element={<QueryExplorerPage />} />
              <Route path="/dashboard/tenant-isolation" element={<TenantIsolationPage />} />
              <Route path="/dashboard/billing" element={<UsageBillingPage />} />
              <Route path="/dashboard/team" element={<TeamPage />} />
              <Route path="/dashboard/webhooks" element={<WebhooksPage />} />
              <Route path="/dashboard/audit-logs" element={<AuditLogsPage />} />
              <Route path="/dashboard/notifications" element={<NotificationsPage />} />
              <Route path="/dashboard/settings" element={<SettingsPage />} />
              <Route path="/dashboard/security-settings" element={<SecuritySettingsPage />} />
              <Route path="/dashboard/support" element={<SupportHelpPage />} />
            </Route>
          </Route>

          {/* System */}
          <Route path="/401" element={<UnauthorizedAccessPage />} />
          <Route path="/500" element={<ServerErrorPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <CookieConsentBanner />
    </BrowserRouter>
  );
}
