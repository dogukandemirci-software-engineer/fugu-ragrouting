import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  quotaWarningDismissed: boolean;
  graphUnavailableBannerVisible: boolean;
  paymentFailedBannerVisible: boolean;
}

const initialState: UIState = {
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  quotaWarningDismissed: false,
  graphUnavailableBannerVisible: false,
  paymentFailedBannerVisible: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    toggleMobileSidebar(state) {
      state.mobileSidebarOpen = !state.mobileSidebarOpen;
    },
    closeMobileSidebar(state) {
      state.mobileSidebarOpen = false;
    },
    dismissQuotaWarning(state) {
      state.quotaWarningDismissed = true;
    },
    resetQuotaWarning(state) {
      state.quotaWarningDismissed = false;
    },
    setGraphUnavailable(state, action: PayloadAction<boolean>) {
      state.graphUnavailableBannerVisible = action.payload;
    },
    setPaymentFailed(state, action: PayloadAction<boolean>) {
      state.paymentFailedBannerVisible = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  toggleMobileSidebar,
  closeMobileSidebar,
  dismissQuotaWarning,
  resetQuotaWarning,
  setGraphUnavailable,
  setPaymentFailed,
} = uiSlice.actions;
export default uiSlice.reducer;
