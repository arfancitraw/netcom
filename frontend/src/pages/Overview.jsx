import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../api';
import {
  formatCurrency,
  formatInteger,
  formatCompactCurrency,
  formatPercentage,
} from '../utils/formatters';
import {
  DollarSign,
  ShoppingCart,
  Users,
  RefreshCw,
} from 'lucide-react';
import { Skeleton, CardSkeleton, ChartSkeleton } from '../components/Skeleton';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Overview() {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadOverviewMetrics = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await analyticsApi.getOverview();
      if (response.data && response.data.success) {
        setAnalyticsData(response.data.data);
      }
    } catch (error) {
      setErrorMessage(
        error.response?.data?.error?.message ||
          error.message ||
          'Failed to load overview data'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOverviewMetrics();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-7 w-20" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="lg:col-span-2">
            <CardSkeleton />
          </div>
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <ChartSkeleton height="h-72" />
          </div>
          <ChartSkeleton height="h-72" />
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700">
        <div className="font-semibold text-sm mb-1">Failed to load overview</div>
        <div className="text-xs text-rose-600">{errorMessage}</div>
        <button
          onClick={loadOverviewMetrics}
          className="mt-3 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const kpis = analyticsData?.kpis || {};
  const monthlyTrend = analyticsData?.monthly_trend || [];
  const topCategories = analyticsData?.top_categories || [];
  const paymentMethods = analyticsData?.payment_methods || [];
  const orderStatuses = analyticsData?.order_statuses || [];

  const trendLabels = monthlyTrend.map((monthRecord) => monthRecord.month_year);
  const trendRevenue = monthlyTrend.map((monthRecord) => monthRecord.revenue);
  const lineChartData = {
    labels: trendLabels,
    datasets: [
      {
        label: 'Revenue (R$)',
        data: trendRevenue,
        borderColor: '#2563EB',
        backgroundColor: 'rgba(37, 99, 235, 0.04)',
        fill: true,
        tension: 0.2,
        pointBackgroundColor: '#2563EB',
        pointRadius: 2.5,
        pointHoverRadius: 5,
        borderWidth: 1.5,
      },
    ],
  };

  const categoryLabels = topCategories.map((categoryItem) =>
    categoryItem.category.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
  );
  const categoryRevenue = topCategories.map((categoryItem) => categoryItem.total_revenue);

  // Professional cohesive corporate blue palette
  const barChartData = {
    labels: categoryLabels,
    datasets: [
      {
        label: 'Gross Revenue (R$)',
        data: categoryRevenue,
        backgroundColor: '#2563EB',
        hoverBackgroundColor: '#1D4ED8',
        borderRadius: 3,
      },
    ],
  };

  const doughnutData = {
    labels: paymentMethods.map((paymentItem) =>
      paymentItem.payment_type.replace(/_/g, ' ').toUpperCase()
    ),
    datasets: [
      {
        data: paymentMethods.map((paymentItem) => paymentItem.total_value),
        backgroundColor: ['#2563EB', '#475569', '#059669', '#D97706'],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#64748B',
          font: { size: 11, family: 'Inter' },
          boxWidth: 8,
        },
      },
      tooltip: {
        backgroundColor: '#0F172A',
        titleColor: '#FFFFFF',
        bodyColor: '#E2E8F0',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 8,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(241, 245, 249, 1)' },
        ticks: { color: '#94A3B8', font: { size: 10, family: 'Inter' } },
      },
      y: {
        grid: { color: 'rgba(241, 245, 249, 1)' },
        ticks: {
          color: '#94A3B8',
          font: { size: 10, family: 'Inter' },
          callback: (value) => formatCompactCurrency(value),
        },
      },
    },
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
            Executive Overview
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Macro performance metrics across 99,441 orders
          </p>
        </div>
        <button
          onClick={loadOverviewMetrics}
          aria-label="Refresh overview data"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-md border border-slate-200 transition-all active:scale-[0.98] shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Primary Hero Revenue Card */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 p-4 rounded-lg flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Total Merchandise Revenue
            </span>
            <DollarSign className="w-4 h-4 text-slate-400" aria-hidden="true" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
              {formatCurrency(kpis.total_revenue)}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 font-mono">
              <span className="text-emerald-600 font-medium">+ {formatCurrency(kpis.total_freight)} freight</span>
              <span className="text-slate-300">•</span>
              <span>Gross: {formatCurrency(kpis.total_gross)}</span>
            </div>
          </div>
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Processed Volume</span>
            <span className="font-mono font-medium text-slate-900">{formatInteger(kpis.total_orders)} transactions</span>
          </div>
        </div>

        {/* Card 2: Orders */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-lg flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Orders</span>
            <ShoppingCart className="w-4 h-4 text-slate-400" aria-hidden="true" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-slate-900">
              {formatInteger(kpis.total_orders)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Confirmed buyer checkouts
            </div>
          </div>
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Avg Order Value</span>
            <span className="font-mono font-medium text-slate-900">{formatCurrency(kpis.avg_order_value)}</span>
          </div>
        </div>

        {/* Card 3: Network */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-lg flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Customer Base</span>
            <Users className="w-4 h-4 text-slate-400" aria-hidden="true" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-slate-900">
              {formatInteger(kpis.total_customers)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Registered buyer accounts
            </div>
          </div>
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Merchants</span>
            <span className="font-mono font-medium text-slate-900">{formatInteger(kpis.total_sellers)}</span>
          </div>
        </div>
      </div>

      {/* Charts Row 1: Line Trend & Payment Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-slate-200/80 p-4 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Monthly Revenue
            </h3>
            <span className="text-[11px] font-mono text-slate-400">2016 – 2018</span>
          </div>
          <div className="h-60">
            <Line data={lineChartData} options={chartOptions} />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-lg space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Payment Methods
          </h3>
          <div className="h-44 flex items-center justify-center">
            <Doughnut
              data={doughnutData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { color: '#64748B', font: { size: 10, family: 'Inter' }, boxWidth: 8 },
                  },
                },
              }}
            />
          </div>
          <div className="space-y-1 pt-2 border-t border-slate-100">
            {paymentMethods.map((paymentItem) => (
              <div key={paymentItem.payment_type} className="flex justify-between text-xs text-slate-600">
                <span className="capitalize">{paymentItem.payment_type.replace(/_/g, ' ')}</span>
                <span className="font-mono text-slate-900 font-medium">{formatCurrency(paymentItem.total_value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2: Top Categories & Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-slate-200/80 p-4 rounded-lg space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Top Categories by Revenue
          </h3>
          <div className="h-60">
            <Bar
              data={barChartData}
              options={{
                ...chartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  legend: { display: false },
                },
              }}
            />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-lg space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Fulfillment Pipeline
          </h3>
          <div className="space-y-2 pt-1">
            {orderStatuses.map((statusItem) => {
              const count = statusItem.count;
              const percentageString = formatPercentage((count / (kpis.total_orders || 1)) * 100);
              const isDelivered = statusItem.order_status === 'delivered';
              return (
                <div key={statusItem.order_status} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-medium capitalize">{statusItem.order_status}</span>
                    <span className="font-mono text-slate-400">
                      {formatInteger(count)} ({percentageString})
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        isDelivered ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                      style={{ width: `${Math.max(2, parseFloat(percentageString))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
