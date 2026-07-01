import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import { dismissQuotaWarning, resetQuotaWarning } from '../store/uiSlice';
import { useGetSubscriptionQuery } from '../store/api/billingApi';

export function useQuotaStatus() {
  const dispatch = useDispatch();
  const dismissed = useSelector((state: RootState) => state.ui.quotaWarningDismissed);
  const { data } = useGetSubscriptionQuery();

  const percent = data
    ? data.usage.query_count / (data.usage.monthly_query_limit || 1)
    : 0;

  const warn = percent >= 0.8 && percent < 1.0;
  const hardBlocked = percent >= 1.0;

  return {
    percent,
    warn: warn && !dismissed,
    hardBlocked,
    used: data?.usage.query_count ?? 0,
    limit: data?.usage.monthly_query_limit ?? 1000,
    dismiss: () => dispatch(dismissQuotaWarning()),
    reset: () => dispatch(resetQuotaWarning()),
  };
}
