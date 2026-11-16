import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../api';
import {
  formatCurrency,
  formatInteger,
  formatCompactCurrency,
} from '../utils/formatters';
import {
  Download,
  RefreshCw,
} from 'lucide-react';
import { Skeleton, TableRowSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const CALENDAR_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function exportDailyRevenueToCsv(dailyEntries, selectedYear, selectedMonth) {
  if (!dailyEntries || dailyEntries.length === 0) return;
  const tableHeaders = [
    'Date', 'Day', 'Month', 'Year',
    'Revenue (BRL)', 'Freight (BRL)', 'Gross (BRL)',
    'Order Count', 'Item Count', 'AOV (BRL)'
  ];
  const tableRows = dailyEntries.map((entry) => [
    entry.date,
    entry.day,
    entry.month,
    entry.year,
    entry.revenue,
    entry.freight,
    entry.gross_revenue,
    entry.order_count,
    entry.item_count,
    entry.average_order_value,
  ]);
  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [tableHeaders.join(','), ...tableRows.map((e) => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `netcom_daily_revenue_${selectedYear || 'all'}_${selectedMonth || 'all'}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function RevenueAnalytics() {
  const [selectedYear, setSelectedYear] = useState('2017');
  const [selectedMonth, setSelectedMonth] = useState(11);
  const [revenueData, setRevenueData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadDailyRevenue = async (year, month) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const yearParam = year === 'all' ? 'all' : year;
      const monthParam = month ? month : null;
      const response = await analyticsApi.getDailyRevenue(yearParam, monthParam);
      if (response.data && response.data.success) {
        setRevenueData(response.data);
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.error?.message || error.message || 'Failed to load daily revenue');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDailyRevenue(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  const summary = revenueData?.summary || {};
  // Handle both 'data' (API standard envelope) and 'daily_revenue' for bulletproof compatibility
  const dailyData = revenueData?.data || revenueData?.daily_revenue || [];
  const filters = revenueData?.filters || {};
  const availableYears = filters.available_years || [2016, 2017, 2018];
  const availableMonths = filters.available_months || Array.from({ length: 12 }, (_, i) => i + 1);

  // When viewing single month, label with Day number (e.g. 01, 02.. 30)
  // When viewing all months / annual view, label with Month-Day (e.g. 11-24)
  const chartLabels = dailyData.map((d) => {
    if (!d.date) return '';
    return selectedMonth ? d.date.split('-')[2] : d.date.substring(5);
  });
  const chartRevenues = dailyData.map((d) => d.revenue);
  const chartOrders = dailyData.map((d) => d.order_count);

  const barBackgroundColors = dailyData.map((d) => {
    if (d.date === summary.peak_day?.date) return '#E11D48';
    return '#2563EB';
  });

  const barChartData = {
    labels: chartLabels,
    datasets: [
      {
        type: 'bar',
        label: 'Daily Revenue (R$)',
        data: chartRevenues,
        backgroundColor: barBackgroundColors,
        borderRadius: 2,
        yAxisID: 'y',
      },
      {
        type: 'line',
        label: 'Order Volume',
        data: chartOrders,
        borderColor: '#475569',
        backgroundColor: '#475569',
        borderWidth: 1.5,
        pointRadius: dailyData.length > 60 ? 1 : 2.5,
        tension: 0.15,
        yAxisID: 'y1',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        labels: { color: '#64748B', font: { size: 11, family: 'Inter' }, boxWidth: 8 },
      },
      tooltip: {
        backgroundColor: '#0F172A',
        titleColor: '#FFFFFF',
        bodyColor: '#E2E8F0',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 8,
        callbacks: {
          title: (tooltipItems) => {
            if (!tooltipItems || !tooltipItems.length) return '';
            const idx = tooltipItems[0].dataIndex;
            return dailyData[idx]?.date || tooltipItems[0].label;
          },
          label: (context) => {
            if (context.dataset.yAxisID === 'y') {
              return `Revenue: ${formatCurrency(context.parsed.y)}`;
            }
            return `Orders: ${formatInteger(context.parsed.y)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(241, 245, 249, 1)' },
        ticks: {
          color: '#94A3B8',
          font: { size: 10, family: 'Inter' },
          maxTicksLimit: selectedMonth ? 31 : 14,
        },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        grid: { color: 'rgba(241, 245, 249, 1)' },
        ticks: {
          color: '#94A3B8',
          font: { size: 10, family: 'Inter' },
          callback: (value) => formatCompactCurrency(value),
        },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: {
          color: '#64748B',
          font: { size: 10, family: 'Inter' },
        },
      },
    },
  };

  return (
    <div className="space-y-5">
      {/* Header & Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
            Daily Revenue Breakdown
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Daily sales volume and order cadence
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Year selector */}
          <div className="flex items-center bg-slate-100 rounded-md p-0.5">
            {[...availableYears.map(String), 'all'].map((yearOption) => (
              <button
                key={yearOption}
                onClick={() => setSelectedYear(yearOption)}
                className={`px-2.5 py-1 rounded text-xs transition-all active:scale-[0.98] ${
                  String(selectedYear) === String(yearOption)
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {yearOption === 'all' ? 'All Years' : yearOption}
              </button>
            ))}
          </div>

          {/* Month selector */}
          <select
            value={selectedMonth ?? ''}
            onChange={(event) => {
              const val = event.target.value;
              setSelectedMonth(val ? Number(val) : null);
            }}
            aria-label="Select month"
            className="bg-white border border-slate-200 text-slate-800 text-xs font-medium rounded-md px-2.5 py-1 outline-none transition-colors focus:border-slate-400"
          >
            <option value="">All Months</option>
            {availableMonths.map((monthNumber) => (
              <option key={monthNumber} value={monthNumber}>
                {CALENDAR_MONTH_NAMES[monthNumber - 1]}
              </option>
            ))}
          </select>

          <button
            onClick={() => exportDailyRevenueToCsv(dailyData, selectedYear, selectedMonth)}
            aria-label="Export daily revenue as CSV"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-md border border-slate-200 transition-all active:scale-[0.98] shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Integrated Stats Strip */}
      <div className="bg-white border border-slate-200/80 rounded-lg grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-slate-100">
        <div className="p-3.5">
          <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Total Revenue</div>
          <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
            {formatCurrency(summary.total_revenue)}
          </div>
          <div className="text-[10px] text-slate-400">{summary.days_count || 0} active days</div>
        </div>

        <div className="p-3.5">
          <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Orders Volume</div>
          <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
            {formatInteger(summary.total_orders)}
          </div>
          <div className="text-[10px] text-slate-400">{formatInteger(summary.total_items)} items</div>
        </div>

        <div className="p-3.5">
          <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Daily Mean</div>
          <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
            {formatCurrency(summary.avg_daily_revenue)}
          </div>
          <div className="text-[10px] text-slate-400">Mean per day</div>
        </div>

        <div className="p-3.5">
          <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Avg Order Value</div>
          <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
            {formatCurrency(summary.avg_order_value)}
          </div>
          <div className="text-[10px] text-slate-400">AOV metric</div>
        </div>

        <div className="p-3.5">
          <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Peak Day</div>
          <div className="text-base font-bold font-mono text-rose-600 mt-0.5">
            {formatCurrency(summary.peak_day?.revenue)}
          </div>
          <div className="text-[10px] text-slate-400">
            {summary.peak_day?.date ? `${summary.peak_day.date} (${summary.peak_day.orders} orders)` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Daily Revenue: {selectedMonth ? CALENDAR_MONTH_NAMES[selectedMonth - 1] : 'All Months'} {selectedYear === 'all' ? '(All Years)' : selectedYear}
          </h3>
          <span className="text-[11px] font-mono text-slate-400">Bars: Revenue • Line: Order Count</span>
        </div>

        <div className="h-72">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-xs font-mono">
              <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" aria-hidden="true" />
              Loading series...
            </div>
          ) : dailyData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-xs font-sans">
              No revenue records for the selected period.
            </div>
          ) : (
            <Bar data={barChartData} options={chartOptions} />
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-slate-200/80 rounded-lg overflow-hidden">
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">Ledger Details</h3>
          <span className="text-[11px] text-slate-400 font-mono">{dailyData.length} records</span>
        </div>

        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider font-semibold sticky top-0 z-10 border-b border-slate-200 text-[10px] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <tr>
                <th className="py-2.5 px-3.5 bg-slate-100">Date</th>
                <th className="py-2.5 px-3.5 bg-slate-100 text-right">Orders</th>
                <th className="py-2.5 px-3.5 bg-slate-100 text-right">Items</th>
                <th className="py-2.5 px-3.5 bg-slate-100 text-right">Merchandise (R$)</th>
                <th className="py-2.5 px-3.5 bg-slate-100 text-right">Freight (R$)</th>
                <th className="py-2.5 px-3.5 bg-slate-100 text-right">Total (R$)</th>
                <th className="py-2.5 px-3.5 bg-slate-100 text-right">AOV (R$)</th>
                <th className="py-2.5 px-3.5 bg-slate-100 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {isLoading ? (
                <TableRowSkeleton columns={8} rows={8} />
              ) : dailyData.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-0">
                    <EmptyState
                      title="No revenue records found"
                      description={`No transactions found for ${selectedMonth ? CALENDAR_MONTH_NAMES[selectedMonth - 1] : 'selected month'} ${selectedYear}.`}
                      actionLabel="Reset to November 2017"
                      onAction={() => {
                        setSelectedYear('2017');
                        setSelectedMonth(11);
                      }}
                    />
                  </td>
                </tr>
              ) : (
                dailyData.map((dailyRecord) => {
                  const isPeak = dailyRecord.date === summary.peak_day?.date;
                  const isAboveAverage = dailyRecord.revenue > (summary.avg_daily_revenue || 0);
                  return (
                    <tr
                      key={dailyRecord.date}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-2 px-3.5 text-slate-900 font-semibold flex items-center gap-1.5">
                        {dailyRecord.date}
                        {isPeak && (
                          <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                            Peak
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3.5 text-right text-slate-600">{formatInteger(dailyRecord.order_count)}</td>
                      <td className="py-2 px-3.5 text-right text-slate-400">{formatInteger(dailyRecord.item_count)}</td>
                      <td className="py-2 px-3.5 text-right text-slate-900 font-medium">
                        {formatCurrency(dailyRecord.revenue, '')}
                      </td>
                      <td className="py-2 px-3.5 text-right text-slate-400">
                        {formatCurrency(dailyRecord.freight, '')}
                      </td>
                      <td className="py-2 px-3.5 text-right text-slate-900 font-semibold">
                        {formatCurrency(dailyRecord.gross_revenue, '')}
                      </td>
                      <td className="py-2 px-3.5 text-right text-slate-600">
                        {formatCurrency(dailyRecord.average_order_value, '')}
                      </td>
                      <td className="py-2 px-3.5 text-center">
                        <span
                          className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded font-medium ${
                            isAboveAverage
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isAboveAverage ? 'Above Avg' : 'Normal'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
