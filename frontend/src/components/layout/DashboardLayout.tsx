import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { Sidebar } from './Sidebar';
import { QuotaBanner } from '../features/QuotaBanner/QuotaBanner';
import { GraphUnavailableBanner } from '../features/QuotaBanner/GraphUnavailableBanner';
import { PaymentFailedBanner } from '../features/QuotaBanner/PaymentFailedBanner';

export function DashboardLayout() {
  const { graphUnavailableBannerVisible, paymentFailedBannerVisible } = useSelector(
    (state: RootState) => state.ui
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background relative">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* System banners — persistent, top of content area */}
        <PaymentFailedBanner visible={paymentFailedBannerVisible} />
        <GraphUnavailableBanner visible={graphUnavailableBannerVisible} />
        <QuotaBanner />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
