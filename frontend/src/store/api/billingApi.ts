import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../lib/apiClient';
import { setPaymentFailed } from '../uiSlice';

export const billingApi = createApi({
  reducerPath: 'billingApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Billing'],
  endpoints: (builder) => ({
    listPlans: builder.query<{
      plans: Array<{
        tier: 'free' | 'pro' | 'enterprise';
        label: string;
        price: string;
        queries: string;
        monthlyQueryLimit: number;
        features: string[];
        highlighted?: boolean;
      }>;
    }, void>({
      query: () => '/billing/plans',
    }),
    getSubscription: builder.query<{
      subscription: { tier: string; status: string; monthly_query_limit: number; current_period_end: string | null } | null;
      usage: { query_count: number; monthly_query_limit: number };
    }, void>({
      query: () => '/billing/subscription',
      providesTags: ['Billing'],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        if (data.subscription?.status === 'past_due') {
          dispatch(setPaymentFailed(true));
        }
      },
    }),
    createCheckout: builder.mutation<{ url: string }, { tier: 'pro' | 'enterprise' }>({
      query: (body) => ({ url: '/billing/checkout', method: 'POST', body }),
    }),
  }),
});

export const { useListPlansQuery, useGetSubscriptionQuery, useCreateCheckoutMutation } = billingApi;
