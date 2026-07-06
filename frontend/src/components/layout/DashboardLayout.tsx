import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { Sidebar } from './Sidebar';
import { QuotaBanner } from '../features/QuotaBanner/QuotaBanner';
import { GraphUnavailableBanner } from '../features/QuotaBanner/GraphUnavailableBanner';
import { PaymentFailedBanner } from '../features/QuotaBanner/PaymentFailedBanner';
import { ErrorBoundary } from '../system/ErrorBoundary';
import { CrispChat } from '../features/CrispChat';
import { CommandPalette } from '../features/CommandPalette';

export function DashboardLayout() {
  const { graphUnavailableBannerVisible, paymentFailedBannerVisible } = useSelector(
    (state: RootState) => state.ui
  );
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-background-alt">
      <CrispChat />
      <CommandPalette />
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <PaymentFailedBanner visible={paymentFailedBannerVisible} />
        <GraphUnavailableBanner visible={graphUnavailableBannerVisible} />
        <QuotaBanner />
        <main className="flex-1 overflow-y-auto bg-background-alt">
          <ErrorBoundary key={location.pathname}>
            <Suspense fallback={null}>
              <div key={location.pathname} className="animate-fade-in">
                <Outlet />
              </div>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
