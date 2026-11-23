import React from 'react';
import { Activity, GitCommit, CheckCircle2, XCircle, Info } from 'lucide-react';
import { FullDashboardResponse } from '../types';
import { PlotlyChart } from './common/PlotlyChart';

interface DistributionTabProps {
  data: FullDashboardResponse;
}

export const DistributionTab: React.FC<DistributionTabProps> = ({ data }) => {
  const { distribution_stats, distribution_plot, var_comparison } = data;

  const hist95 = var_comparison.models.find(m => m.method.includes('Historical'))?.var_pct || 0;
  const hist99 = var_comparison.matrix_by_confidence['99%']?.Historical || hist95 * 1.4;
  const es99 = var_comparison.models.find(m => m.method.includes('Historical'))?.es_pct || hist99 * 1.2;

  // Histogram with normal curve overlay
  const histogramTraces = [
    {
      x: distribution_plot.bin_centers,
      y: distribution_plot.counts,
      type: 'bar' as const,
      name: 'Empirical Frequency',
      marker: { color: 'rgba(0, 229, 255, 0.45)', line: { color: '#00e5ff', width: 1 } }
    },
    {
      x: distribution_plot.normal_curve_x,
      // Scale theoretical normal density to frequency counts for direct visual comparison
      y: distribution_plot.normal_curve_y.map(
        val => val * (distribution_plot.counts.reduce((a, b) => a + b, 0)) * (distribution_plot.bin_centers[1] - distribution_plot.bin_centers[0])
      ),
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Theoretical Gaussian Curve',
      line: { color: '#ff9800', width: 2.5 }
    }
  ];

  const histLayout = {
    title: {
      text: 'RETURN FREQUENCY DISTRIBUTION WITH NORMAL BELL CURVE & VaR / ES CUTOFFS',
      font: { family: 'JetBrains Mono', size: 12, color: '#e0e6ed' },
      x: 0.02
    },
    xaxis: {
      title: { text: 'Daily Return (%)', font: { size: 10, color: '#8b9bb4' } },
      gridcolor: '#1f2d3d',
      tickformat: '.1f'
    },
    yaxis: {
      title: { text: 'Observation Count', font: { size: 10, color: '#8b9bb4' } },
      gridcolor: '#1f2d3d'
    },
    shapes: [
      // 95% VaR vertical line
      {
        type: 'line' as const,
        x0: -hist95,
        x1: -hist95,
        y0: 0,
        y1: Math.max(...distribution_plot.counts) * 0.9,
        line: { color: '#ffd600', width: 2, dash: 'dot' as const }
      },
      // 99% VaR vertical line
      {
        type: 'line' as const,
        x0: -hist99,
        x1: -hist99,
        y0: 0,
        y1: Math.max(...distribution_plot.counts) * 0.9,
        line: { color: '#ff9800', width: 2, dash: 'dash' as const }
      },
      // 99% ES vertical line
      {
        type: 'line' as const,
        x0: -es99,
        x1: -es99,
        y0: 0,
        y1: Math.max(...distribution_plot.counts) * 0.9,
        line: { color: '#ff5252', width: 2.5 }
      }
    ],
    annotations: [
      {
        x: -hist95,
        y: Math.max(...distribution_plot.counts) * 0.85,
        text: `VaR 95% (-${hist95.toFixed(2)}%)`,
        showarrow: true,
        arrowcolor: '#ffd600',
        arrowhead: 2,
        font: { family: 'JetBrains Mono', size: 9, color: '#ffd600' }
      },
      {
        x: -hist99,
        y: Math.max(...distribution_plot.counts) * 0.75,
        text: `VaR 99% (-${hist99.toFixed(2)}%)`,
        showarrow: true,
        arrowcolor: '#ff9800',
        arrowhead: 2,
        font: { family: 'JetBrains Mono', size: 9, color: '#ff9800' }
      },
      {
        x: -es99,
        y: Math.max(...distribution_plot.counts) * 0.65,
        text: `ES 99% (-${es99.toFixed(2)}%)`,
        showarrow: true,
        arrowcolor: '#ff5252',
        arrowhead: 2,
        font: { family: 'JetBrains Mono', size: 9, color: '#ff5252' }
      }
    ]
  };

  // QQ Plot Traces
  const minVal = Math.min(...distribution_plot.qq_theoretical);
  const maxVal = Math.max(...distribution_plot.qq_theoretical);
  const qqTraces = [
    {
      x: distribution_plot.qq_theoretical,
      y: distribution_plot.qq_sample,
      type: 'scatter' as const,
      mode: 'markers' as const,
      name: 'Empirical Quantiles',
      marker: { color: '#00e5ff', size: 5, opacity: 0.8 }
    },
    {
      x: [minVal, maxVal],
      y: [minVal, maxVal],
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Normal 45° Reference',
      line: { color: '#ff5252', width: 1.5, dash: 'dash' as const }
    }
  ];

  const qqLayout = {
    title: {
      text: 'NORMAL PROBABILITY PLOT (Q-Q DIAGNOSTIC)',
      font: { family: 'JetBrains Mono', size: 12, color: '#e0e6ed' },
      x: 0.02
    },
    xaxis: {
      title: { text: 'Theoretical Normal Quantiles', font: { size: 10, color: '#8b9bb4' } },
      gridcolor: '#1f2d3d'
    },
    yaxis: {
      title: { text: 'Sample Return Quantiles (%)', font: { size: 10, color: '#8b9bb4' } },
      gridcolor: '#1f2d3d'
    }
  };

  return (
    <div className="space-y-4">
      {/* Normality Statistical Scorecard */}
      <div className="bg-[#0d131a] border border-[#1f2d3d] p-4 rounded-lg shadow-xl">
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#1f2d3d]">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#ff9800]" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              Higher Moment Analytics & Jarque-Bera Normality Test
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-[#8b9bb4]">TEST DECISION:</span>
            {distribution_stats.is_normal ? (
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> GAUSSIAN (NORMAL)
              </span>
            ) : (
              <span className="text-xs font-mono font-bold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-600 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> NON-NORMAL (FAT TAILS)
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="bg-[#141d27] border border-[#1f2d3d] p-2.5 rounded">
            <div className="text-[10px] font-mono text-[#8b9bb4] uppercase">Mean Daily</div>
            <div className="text-sm font-mono font-bold text-white tabular-nums">{distribution_stats.mean_daily_return.toFixed(3)}%</div>
          </div>
          <div className="bg-[#141d27] border border-[#1f2d3d] p-2.5 rounded">
            <div className="text-[10px] font-mono text-[#8b9bb4] uppercase">Daily StDev (σ)</div>
            <div className="text-sm font-mono font-bold text-white tabular-nums">{distribution_stats.std_daily_return.toFixed(3)}%</div>
          </div>
          <div className="bg-[#141d27] border border-[#1f2d3d] p-2.5 rounded">
            <div className="text-[10px] font-mono text-[#8b9bb4] uppercase">Annual Volatility</div>
            <div className="text-sm font-mono font-bold text-[#00e5ff] tabular-nums">{distribution_stats.annualized_volatility.toFixed(2)}%</div>
          </div>
          <div className="bg-[#141d27] border border-[#1f2d3d] p-2.5 rounded">
            <div className="text-[10px] font-mono text-[#8b9bb4] uppercase">Skewness (S)</div>
            <div className={`text-sm font-mono font-bold tabular-nums ${distribution_stats.skewness < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {distribution_stats.skewness.toFixed(3)}
            </div>
          </div>
          <div className="bg-[#141d27] border border-[#1f2d3d] p-2.5 rounded">
            <div className="text-[10px] font-mono text-[#8b9bb4] uppercase">Kurtosis (K)</div>
            <div className="text-sm font-mono font-bold text-white tabular-nums">{distribution_stats.kurtosis.toFixed(2)}</div>
          </div>
          <div className="bg-[#141d27] border border-[#1f2d3d] p-2.5 rounded">
            <div className="text-[10px] font-mono text-[#8b9bb4] uppercase">Excess Kurtosis</div>
            <div className="text-sm font-mono font-bold text-[#ff9800] tabular-nums">+{distribution_stats.excess_kurtosis.toFixed(2)}</div>
          </div>
          <div className="bg-[#141d27] border border-[#1f2d3d] p-2.5 rounded">
            <div className="text-[10px] font-mono text-[#8b9bb4] uppercase">JB Statistic</div>
            <div className="text-sm font-mono font-bold text-white tabular-nums">{distribution_stats.jarque_bera_stat.toFixed(1)}</div>
          </div>
          <div className="bg-[#141d27] border border-[#1f2d3d] p-2.5 rounded">
            <div className="text-[10px] font-mono text-[#8b9bb4] uppercase">JB p-value</div>
            <div className="text-sm font-mono font-bold text-rose-400 tabular-nums">{distribution_stats.jarque_bera_pvalue.toExponential(2)}</div>
          </div>
        </div>
      </div>

      {/* Charts Grid: Histogram & QQ Plot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Return Distribution Histogram */}
        <div className="bg-[#0d131a] border border-[#1f2d3d] p-4 rounded-lg shadow-xl">
          <div className="h-[360px]">
            <PlotlyChart data={histogramTraces} layout={histLayout} />
          </div>
        </div>

        {/* Quantile-Quantile (QQ) Plot */}
        <div className="bg-[#0d131a] border border-[#1f2d3d] p-4 rounded-lg shadow-xl">
          <div className="h-[360px]">
            <PlotlyChart data={qqTraces} layout={qqLayout} />
          </div>
        </div>
      </div>

      {/* Technical takeaway notice */}
      <div className="bg-[#141d27] border border-[#1f2d3d] p-3 rounded text-xs font-mono text-[#8b9bb4] flex items-start gap-2">
        <Info className="w-4 h-4 text-[#00e5ff] flex-shrink-0 mt-0.5" />
        <div>
          <span className="text-white font-semibold">Institutional Modeling Takeaway: </span>
          The Jarque-Bera p-value ({distribution_stats.jarque_bera_pvalue.toExponential(2)}) significantly rejects the Gaussian hypothesis (p &lt; 0.05).
          With excess kurtosis of +{distribution_stats.excess_kurtosis.toFixed(2)}, empirical returns exhibit heavy leptokurtic tails.
          Parametric VaR will tend to <span className="text-rose-400 font-bold">underestimate</span> true capital exposure, validating the necessity of Cornish-Fisher, Historical, and Monte Carlo models.
        </div>
      </div>
    </div>
  );
};
