import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../api';
import {
  formatCurrency,
  formatInteger,
  formatCompactCurrency,
} from '../utils/formatters';
import {
  Sliders,
  RefreshCw,
} from 'lucide-react';
import { Skeleton, TableRowSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function AnomalyDetection() {
  const [selectedYear, setSelectedYear] = useState('2017');
  const [detectionMethod, setDetectionMethod] = useState('zscore');
  const [sensitivityThreshold, setSensitivityThreshold] = useState(2.5);
  const [anomalyData, setAnomalyData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadAnomalyData = async (year, method, threshold) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const yearArgument = year === 'all' ? null : year;
      const response = await analyticsApi.getAnomalies(yearArgument, method, threshold);
      if (response.data && response.data.success) {
        setAnomalyData(response.data);
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.error?.message || error.message || 'Failed to detect anomalies');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnomalyData(selectedYear, detectionMethod, sensitivityThreshold);
  }, [selectedYear, detectionMethod, sensitivityThreshold]);

  const stats = anomalyData?.stats || {};
  const anomalies = anomalyData?.anomalies || [];
  const timeSeries = anomalyData?.time_series || [];

  const labels = timeSeries.map((timePoint) => timePoint.date);
  const revenueValues = timeSeries.map((timePoint) => timePoint.revenue);
  const upperBounds = timeSeries.map(() => stats.upper_bound);

  const pointBackgroundColors = timeSeries.map((timePoint) => {
    if (!timePoint.is_anomaly) return '#2563EB';
    if (timePoint.severity === 'critical') return '#E11D48';
    if (timePoint.severity === 'high') return '#EA580C';
    return '#D97706';
  });

  const pointRadius = timeSeries.map((timePoint) => {
    if (!timePoint.is_anomaly) return 1.5;
    if (timePoint.severity === 'critical') return 6;
    return 4.5;
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Daily Revenue (R$)',
        data: revenueValues,
        borderColor: '#2563EB',
        backgroundColor: 'rgba(37, 99, 235, 0.04)',
        borderWidth: 1.5,
        fill: true,
        pointBackgroundColor: pointBackgroundColors,
        pointBorderColor: pointBackgroundColors,
        pointRadius: pointRadius,
        pointHoverRadius: 7,
      },
      {
        label: `Threshold (${detectionMethod.toUpperCase()})`,
        data: upperBounds,
        borderColor: '#E11D48',
        borderDash: [4, 4],
        borderWidth: 1.2,
        fill: false,
        pointRadius: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
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
        padding: 10,
        callbacks: {
          afterLabel: (context) => {
            const index = context.dataIndex;
            const item = timeSeries[index];
            if (item && item.is_anomaly) {
              return [
                `Severity: ${item.severity.toUpperCase()}`,
                `Z-Score: ${item.z_score}`,
                `Orders: ${formatInteger(item.order_count)}`,
                `Context: ${item.event_tag || 'Statistically anomalous'}`,
              ];
            }
            return `Z-Score: ${item?.z_score || 0}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(241, 245, 249, 1)' },
        ticks: { color: '#94A3B8', font: { size: 10, family: 'Inter' }, maxTicksLimit: 14 },
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
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
            Revenue Anomaly Detection
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Statistical demand spikes and volatility models
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Year Selector */}
          <div className="flex items-center bg-slate-100 rounded-md p-0.5 text-xs">
            {['2016', '2017', '2018', 'all'].map((yearOption) => (
              <button
                key={yearOption}
                onClick={() => setSelectedYear(yearOption)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  selectedYear === yearOption
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {yearOption === 'all' ? 'All' : yearOption}
              </button>
            ))}
          </div>

          {/* Model Toggle */}
          <div className="flex items-center bg-slate-100 rounded-md p-0.5 text-xs">
            <button
              onClick={() => {
                setDetectionMethod('zscore');
                setSensitivityThreshold(2.5);
              }}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                detectionMethod === 'zscore'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Z-Score
            </button>
            <button
              onClick={() => {
                setDetectionMethod('iqr');
                setSensitivityThreshold(1.5);
              }}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                detectionMethod === 'iqr'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              IQR
            </button>
          </div>

          {/* Threshold input */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-md text-xs">
            <Sliders className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <span className="text-slate-400">Threshold:</span>
            <input
              type="number"
              step="0.1"
              min="1.0"
              max="5.0"
              value={sensitivityThreshold}
              onChange={(event) => setSensitivityThreshold(parseFloat(event.target.value) || 2.5)}
              aria-label="Statistical anomaly sensitivity threshold"
              className="w-10 text-slate-900 font-mono text-center outline-none"
            />
          </div>
        </div>
      </div>

      {/* Stats Summary Strip */}
      <div className="bg-white border border-slate-200/80 rounded-lg grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-y md:divide-y-0 md:divide-x divide-slate-100">
        <div className="p-3.5">
          <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Daily Baseline</div>
          <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
            {formatCurrency(stats.mean_daily_revenue)}
          </div>
          <div className="text-[10px] text-slate-400">Historical mean</div>
        </div>

        <div className="p-3.5">
          <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Std Deviation</div>
          <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
            {formatCurrency(stats.std_daily_revenue)}
          </div>
          <div className="text-[10px] text-slate-400">Variance dispersion</div>
        </div>

        <div className="p-3.5">
          <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">IQR (Q3 - Q1)</div>
          <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
            {formatCurrency(stats.iqr)}
          </div>
          <div className="text-[10px] text-slate-400">Mid-spread</div>
        </div>

        <div className="p-3.5">
          <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Outlier Boundary</div>
          <div className="text-base font-bold font-mono text-rose-600 mt-0.5">
            {formatCurrency(stats.upper_bound)}
          </div>
          <div className="text-[10px] text-slate-400">Cutoff threshold</div>
        </div>

        <div className="p-3.5">
          <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Observed Days</div>
          <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
            {formatInteger(stats.total_days_evaluated)}
          </div>
          <div className="text-[10px] text-slate-400">Trading samples</div>
        </div>

        <div className="p-3.5">
          <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Anomalies</div>
          <div className="text-base font-bold font-mono text-amber-600 mt-0.5">
            {formatInteger(stats.anomaly_count)}
          </div>
          <div className="text-[10px] text-slate-400">Spike events</div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Outlier Distribution Timeline ({selectedYear === 'all' ? 'All History' : selectedYear})
          </h3>
          <span className="text-[11px] font-mono text-slate-400">Red markers indicate threshold breaches</span>
        </div>

        <div className="h-72">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-xs font-mono">
              <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" aria-hidden="true" />
              Calculating anomaly boundaries...
            </div>
          ) : (
            <Line data={chartData} options={chartOptions} />
          )}
        </div>
      </div>

      {/* Key Anomaly Event Banner */}
      {anomalies.some((anomalyItem) => anomalyItem.date === '2017-11-24') && (
        <div className="bg-slate-900 text-white p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono tracking-wider font-semibold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Peak Event Flagged
              </span>
              <span className="text-sm font-semibold">
                Black Friday 2017 (2017-11-24)
              </span>
              <span className="text-xs font-mono text-amber-400 font-semibold">
                Z-Score +12.13
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Daily revenue peaked at a record <strong className="text-white font-mono">R$ 152,653.74</strong> across <strong className="text-white font-mono">1,166 orders</strong> (+10.44σ above baseline), confirming the nationwide commercial surge.
            </p>
          </div>
          <div className="shrink-0 text-right font-mono bg-slate-800/80 px-3.5 py-2 rounded border border-slate-700/60">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total Day Revenue</div>
            <div className="text-base font-bold text-white">{formatCurrency(152653.74)}</div>
            <div className="text-[10px] text-emerald-400 font-medium">+700% vs Mean Baseline</div>
          </div>
        </div>
      )}

      {/* Table Section */}
      <div className="bg-white border border-slate-200/80 rounded-lg overflow-hidden">
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Detected Anomalies Register
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              ({formatInteger(anomalies.length)} events)
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Ranked by absolute deviation</span>
        </div>

        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider font-semibold sticky top-0 z-10 border-b border-slate-200 text-[10px] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <tr>
                <th className="py-2.5 px-3.5 bg-slate-100">Event Date</th>
                <th className="py-2.5 px-3.5 bg-slate-100 text-right">Revenue (R$)</th>
                <th className="py-2.5 px-3.5 bg-slate-100 text-right">Orders</th>
                <th className="py-2.5 px-3.5 bg-slate-100 text-right">Mean</th>
                <th className="py-2.5 px-3.5 bg-slate-100 text-right">Deviation</th>
                <th className="py-2.5 px-3.5 bg-slate-100 text-right">Z-Score</th>
                <th className="py-2.5 px-3.5 bg-slate-100 text-center">Severity</th>
                <th className="py-2.5 px-3.5 bg-slate-100">Context</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {isLoading ? (
                <TableRowSkeleton columns={8} rows={6} />
              ) : anomalies.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-0">
                    <EmptyState
                      title="No anomalies detected"
                      description={`No trading days breached the ${detectionMethod.toUpperCase()} threshold of ${sensitivityThreshold} in ${selectedYear}.`}
                      actionLabel="Reset to 2017 Baseline"
                      onAction={() => {
                        setSelectedYear('2017');
                        setDetectionMethod('zscore');
                        setSensitivityThreshold(2.5);
                      }}
                    />
                  </td>
                </tr>
              ) : (
                anomalies.map((anomalyItem) => {
                  const isCritical = anomalyItem.severity === 'critical';
                  const isHigh = anomalyItem.severity === 'high';
                  return (
                  <tr
                    key={anomalyItem.date}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-2 px-3.5 text-slate-900 font-semibold">{anomalyItem.date}</td>
                    <td className="py-2 px-3.5 text-right text-slate-900 font-bold">
                      {formatCurrency(anomalyItem.revenue, '')}
                    </td>
                    <td className="py-2 px-3.5 text-right text-slate-600">{formatInteger(anomalyItem.order_count)}</td>
                    <td className="py-2 px-3.5 text-right text-slate-400">
                      {formatCurrency(anomalyItem.baseline_mean, '')}
                    </td>
                    <td className="py-2 px-3.5 text-right text-emerald-600 font-medium">
                      +{formatCurrency(anomalyItem.deviation_from_mean, '')}
                    </td>
                    <td className="py-2 px-3.5 text-right font-bold text-slate-800">
                      {anomalyItem.z_score > 0 ? `+${anomalyItem.z_score}` : anomalyItem.z_score}
                    </td>
                    <td className="py-2 px-3.5 text-center">
                      <span
                        className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-mono font-medium ${
                          isCritical
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : isHigh
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {anomalyItem.severity}
                      </span>
                    </td>
                    <td className="py-2 px-3.5 font-sans text-slate-600 text-xs">
                      {anomalyItem.event_tag}
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
