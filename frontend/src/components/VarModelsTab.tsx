import React from 'react';
import { Layers, HelpCircle, BarChart3, Grid } from 'lucide-react';
import { FullDashboardResponse } from '../types';
import { PlotlyChart } from './common/PlotlyChart';

interface VarModelsTabProps {
  data: FullDashboardResponse;
}

export const VarModelsTab: React.FC<VarModelsTabProps> = ({ data }) => {
  const { var_comparison, distribution_stats } = data;
  const { models, matrix_by_confidence, matrix_by_horizon, portfolio_value } = var_comparison;

  // Bar Chart comparing VaR and ES across the 4 models
  const modelNames = models.map(m => m.method.split(' ')[0] + (m.method.includes('Cornish') ? ' CF' : ''));
  const varPctValues = models.map(m => m.var_pct);
  const esPctValues = models.map(m => m.es_pct);

  const barChartTraces = [
    {
      x: modelNames,
      y: varPctValues,
      name: `VaR (${(var_comparison.confidence_level * 100).toFixed(0)}%)`,
      type: 'bar' as const,
      marker: { color: '#ff9800' }
    },
    {
      x: modelNames,
      y: esPctValues,
      name: `Expected Shortfall (ES)`,
      type: 'bar' as const,
      marker: { color: '#ff5252' }
    }
  ];

  const barLayout = {
    title: {
      text: 'VALUE AT RISK (VaR) vs EXPECTED SHORTFALL (ES) BY MODEL (% OF PORTFOLIO)',
      font: { family: 'JetBrains Mono', size: 12, color: '#e0e6ed' },
      x: 0.02
    },
    barmode: 'group' as const,
    yaxis: {
      title: { text: 'Loss Magnitude (%)', font: { size: 10, color: '#8b9bb4' } },
      gridcolor: '#1f2d3d'
    },
    xaxis: {
      tickfont: { size: 11, color: '#ffffff' }
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner explaining the 4 methodologies */}
      <div className="bg-[#0d131a] border border-[#1f2d3d] p-4 rounded-lg shadow-xl">
        <div className="flex items-center gap-2 pb-2 mb-3 border-b border-[#1f2d3d]">
          <Layers className="w-4 h-4 text-[#ff9800]" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
            VaR & Expected Shortfall Multi-Model Comparison Table
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="text-[#8b9bb4] border-b border-[#1f2d3d] text-[11px] uppercase">
                <th className="pb-2.5">Methodology</th>
                <th className="pb-2.5">Horizon</th>
                <th className="pb-2.5">Confidence</th>
                <th className="pb-2.5 text-right">VaR (%)</th>
                <th className="pb-2.5 text-right">VaR ($ Value)</th>
                <th className="pb-2.5 text-right">ES / CVaR (%)</th>
                <th className="pb-2.5 text-right">ES ($ Value)</th>
                <th className="pb-2.5 text-right">ES / VaR Tail Ratio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2d3d]/60">
              {models.map((m) => {
                const ratio = m.var_pct > 0 ? (m.es_pct / m.var_pct).toFixed(2) : '1.00';
                return (
                  <tr key={m.method} className="hover:bg-[#141d27]/70 transition-colors">
                    <td className="py-3 font-semibold text-white">
                      <div className="flex flex-col">
                        <span>{m.method}</span>
                        <span className="text-[10px] text-[#8b9bb4] font-normal">{m.description}</span>
                      </div>
                    </td>
                    <td className="py-3 text-[#c5d1e0]">{m.holding_period_days} Day(s)</td>
                    <td className="py-3 text-[#00e5ff]">{(m.confidence_level * 100).toFixed(1)}%</td>
                    <td className="py-3 text-right text-[#ff9800] font-bold tabular-nums">
                      {m.var_pct.toFixed(2)}%
                    </td>
                    <td className="py-3 text-right text-white font-bold tabular-nums">
                      ${m.var_amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-3 text-right text-rose-400 font-bold tabular-nums">
                      {m.es_pct.toFixed(2)}%
                    </td>
                    <td className="py-3 text-right text-rose-300 font-bold tabular-nums">
                      ${m.es_amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-3 text-right text-yellow-400 font-mono font-semibold tabular-nums">
                      {ratio}x
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bar Chart comparing models */}
      <div className="bg-[#0d131a] border border-[#1f2d3d] p-4 rounded-lg shadow-xl">
        <div className="h-[320px]">
          <PlotlyChart data={barChartTraces} layout={barLayout} />
        </div>
      </div>

      {/* Two-Column Matrix Tables: Cross-Confidence and Cross-Horizon */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Matrix by Confidence Levels */}
        <div className="bg-[#0d131a] border border-[#1f2d3d] p-4 rounded-lg shadow-xl">
          <div className="flex items-center gap-2 pb-2 mb-3 border-b border-[#1f2d3d]">
            <Grid className="w-4 h-4 text-[#00e5ff]" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              VaR Sensitivity by Confidence Level (1-Day Horizon)
            </h3>
          </div>

          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="text-[#8b9bb4] border-b border-[#1f2d3d] text-[11px] uppercase">
                <th className="pb-2">Confidence Level</th>
                <th className="pb-2 text-right">Historical</th>
                <th className="pb-2 text-right">Parametric</th>
                <th className="pb-2 text-right">Cornish-Fisher</th>
                <th className="pb-2 text-right">Monte Carlo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2d3d]/50">
              {Object.entries(matrix_by_confidence).map(([confLabel, row]) => (
                <tr key={confLabel} className="hover:bg-[#141d27]/70">
                  <td className="py-2.5 text-[#00e5ff] font-bold">{confLabel}</td>
                  <td className="py-2.5 text-right text-white tabular-nums">{row.Historical?.toFixed(2)}%</td>
                  <td className="py-2.5 text-right text-white tabular-nums">{row.Parametric?.toFixed(2)}%</td>
                  <td className="py-2.5 text-right text-[#ff9800] font-semibold tabular-nums">{row['Cornish-Fisher']?.toFixed(2)}%</td>
                  <td className="py-2.5 text-right text-white tabular-nums">{row['Monte Carlo']?.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[10px] font-mono text-[#8b9bb4]">
            Note how Cornish-Fisher scales dynamically in the 99% and 99.5% tail as kurtosis expands critical value bounds.
          </p>
        </div>

        {/* Matrix by Holding Horizons */}
        <div className="bg-[#0d131a] border border-[#1f2d3d] p-4 rounded-lg shadow-xl">
          <div className="flex items-center gap-2 pb-2 mb-3 border-b border-[#1f2d3d]">
            <Grid className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              VaR Sensitivity by Holding Horizon (√t Scaling)
            </h3>
          </div>

          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="text-[#8b9bb4] border-b border-[#1f2d3d] text-[11px] uppercase">
                <th className="pb-2">Holding Period</th>
                <th className="pb-2 text-right">Historical</th>
                <th className="pb-2 text-right">Parametric</th>
                <th className="pb-2 text-right">Cornish-Fisher</th>
                <th className="pb-2 text-right">Monte Carlo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2d3d]/50">
              {Object.entries(matrix_by_horizon).map(([horizonLabel, row]) => (
                <tr key={horizonLabel} className="hover:bg-[#141d27]/70">
                  <td className="py-2.5 text-emerald-400 font-bold">{horizonLabel}</td>
                  <td className="py-2.5 text-right text-white tabular-nums">{row.Historical?.toFixed(2)}%</td>
                  <td className="py-2.5 text-right text-white tabular-nums">{row.Parametric?.toFixed(2)}%</td>
                  <td className="py-2.5 text-right text-[#ff9800] font-semibold tabular-nums">{row['Cornish-Fisher']?.toFixed(2)}%</td>
                  <td className="py-2.5 text-right text-white tabular-nums">{row['Monte Carlo']?.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[10px] font-mono text-[#8b9bb4]">
            Standard square root of time rule: VaR(h) = VaR(1d) × √h. Assumes identically distributed return increments.
          </p>
        </div>
      </div>
    </div>
  );
};
