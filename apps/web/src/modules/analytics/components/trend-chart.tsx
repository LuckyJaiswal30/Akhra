'use client';

import dynamic from 'next/dynamic';

export type { TrendSeries } from './trend-chart-view';

export const TrendChart = dynamic(() => import('./trend-chart-view').then((m) => m.TrendChart), {
  ssr: false,
  loading: () => <div className="bg-well h-64 w-full animate-pulse rounded-md" />,
});
