import React from 'react';
import { PieChart, Grid, Shield, BarChart3, Info } from 'lucide-react';
import { FullDashboardResponse } from '../types';
import { PlotlyChart } from './common/PlotlyChart';

interface PortfolioRiskTabProps {
  data: FullDashboardResponse;
}

export const PortfolioRiskTab: React.FC<PortfolioRiskTabProps> = ({ data }) => {
  const { portfolio_risk, var_comparison, data_summary } = data;
  const { tickers, weights, asset_volatilities_annualized, marginal_var_pct, component_var_amount, percentage_risk_contributions, correlation_matrix, portfolio_volatility_annualized, diversification_benefit_pct } = portfolio_risk;
  const currencySymbol = data_summary?.currency_symbol || (data_summary?.tickers.every(t => t.endsWith('.NS') || t.endsWith('.BO')) ? '₹' : '$');

  // Bar chart: % Weight vs % Risk Contribution
  const riskContribTraces = [
    {
      x: tickers,
      y: weights.map(w => w * 100),
      name: 'Portfolio Weight (%)',
      type: 'bar' as const,
      marker: { color: '#00e5ff' }
    },
    {
      x: tickers,
      y: tickers.map(t => percentage_risk_contributions[t] || 0),
      name: 'Risk Contribution (%)',
      type: 'bar' as const,
      marker: { color: '#ff9800' }
    }
  ];

  const riskContribLayout = {
    title: {
      text: 'PORTFOLIO WEIGHT vs PERCENTAGE RISK CONTRIBUTION (EULER DECOMPOSITION)',
      font: { family: 'JetBrains Mono', size: 12, color: '#e0e6ed' },
      x: 0.02
    },
    barmode: 'group' as const,
    yaxis: {
      title: { text: 'Percentage (%)', font: { size: 10, color: '#8b9bb4' } },
      gridcolor: '#1f2d3d'
    },
    xaxis: {
      tickfont: { size: 11, color: '#ffffff' }
    }
  };

  // Correlation Matrix Heatmap
  const zValues = tickers.map(t1 => tickers.map(t2 => correlation_matrix[t1]?.[t2] ?? 1.0));

  const heatmapTrace = [
    {
      z: zValues,
      x: tickers,
      y: tickers,
      type: 'heatmap' as const,
      colorscale: [
        [0.0, '#0d131a'],
        [0.3, '#1f2d3d'],
        [0.5, '#00e5ff'],
        [0.75, '#ff9800'],
        [1.0, '#ff5252']
      ],
      zmin: -0.2,
      zmax: 1.0,
      hoverongaps: false
    }
  ];

  const heatmapLayout = {
    title: {
      text: 'ASSET CORRELATION MATRIX (PEARSON)',
      font: { family: 'JetBrains Mono', size: 12, color: '#e0e6ed' },
      x: 0.02
    },
    xaxis: { tickfont: { size: 11, color: '#ffffff' } },
    yaxis: { tickfont: { size: 11, color: '#ffffff' }, autorange: 'reversed' as const },
    margin: { t: 40, r: 40, b: 40, l: 60 }
  };

  return (
    <div className="space-y-4">
      {/* Top metrics bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-[#0d131a] border border-[#1f2d3d] p-3.5 rounded shadow">
          <div className="text-[11px] font-mono text-[#8b9bb4] uppercase">Portfolio Annual Volatility</div>
          <div className="text-xl font-mono font-bold text-white tabular-nums mt-1">
            {portfolio_volatility_annualized.toFixed(2)}%
          </div>
          <div className="text-[10px] font-mono text-[#8b9bb4] mt-0.5">Daily: {portfolio_risk.portfolio_volatility_daily.toFixed(3)}%</div>
        </div>

        <div className="bg-[#0d131a] border border-[#1f2d3d] p-3.5 rounded shadow">
          <div className="text-[11px] font-mono text-[#8b9bb4] uppercase">Diversification Benefit</div>
          <div className="text-xl font-mono font-bold text-emerald-400 tabular-nums mt-1">
            {diversification_benefit_pct.toFixed(2)}%
          </div>
          <div className="text-[10px] font-mono text-[#8b9bb4] mt-0.5">Risk reduction vs undiversified sum</div>
        </div>

        <div className="bg-[#0d131a] border border-[#1f2d3d] p-3.5 rounded shadow">
          <div className="text-[11px] font-mono text-[#8b9bb4] uppercase">Total Portfolio Capital</div>
          <div className="text-xl font-mono font-bold text-[#ff9800] tabular-nums mt-1">
            {currencySymbol}{var_comparison.portfolio_value.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-[#8b9bb4] mt-0.5">{tickers.length} Active Positions</div>
        </div>
      </div>

      {/* Component & Marginal VaR Decomposition Table */}
      <div className="bg-[#0d131a] border border-[#1f2d3d] p-4 rounded-lg shadow-xl">
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#1f2d3d]">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-[#ff9800]" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              Euler Marginal & Component VaR Risk Attribution
            </h2>
          </div>
          <span className="text-[11px] font-mono text-emerald-400">
            ∑ Component VaR = Total VaR ({currencySymbol})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="text-[#8b9bb4] border-b border-[#1f2d3d] text-[11px] uppercase">
                <th className="pb-2">Asset Symbol</th>
                <th className="pb-2 text-right">Weight (%)</th>
                <th className="pb-2 text-right">Annual Vol (%)</th>
                <th className="pb-2 text-right">Marginal VaR (MVaR %)</th>
                <th className="pb-2 text-right">Component VaR ({currencySymbol})</th>
                <th className="pb-2 text-right">% Risk Contribution</th>
                <th className="pb-2 text-right">Risk/Weight Ratio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2d3d]/50">
              {tickers.map((t, idx) => {
                const w = weights[idx] * 100;
                const vol = asset_volatilities_annualized[t] || 0;
                const mvar = marginal_var_pct[t] || 0;
                const cvar = component_var_amount[t] || 0;
                const rc = percentage_risk_contributions[t] || 0;
                const ratio = w > 0 ? (rc / w).toFixed(2) : '0.00';
                return (
                  <tr key={t} className="hover:bg-[#141d27]/70">
                    <td className="py-2.5 text-[#00e5ff] font-bold">{t}</td>
                    <td className="py-2.5 text-right text-white font-semibold tabular-nums">{w.toFixed(1)}%</td>
                    <td className="py-2.5 text-right text-[#c5d1e0] tabular-nums">{vol.toFixed(1)}%</td>
                    <td className="py-2.5 text-right text-[#8b9bb4] tabular-nums">{mvar.toFixed(3)}%</td>
                    <td className="py-2.5 text-right text-[#ff9800] font-bold tabular-nums">
                      {currencySymbol}{cvar.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-2.5 text-right font-bold tabular-nums">
                      <span className={rc > w ? 'text-rose-400' : 'text-emerald-400'}>
                        {rc.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-semibold tabular-nums">
                      <span className={parseFloat(ratio) > 1.2 ? 'text-rose-400' : parseFloat(ratio) < 0.8 ? 'text-emerald-400' : 'text-white'}>
                        {ratio}x
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two Column Visualizations: Risk vs Weight & Correlation Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Risk Contribution Chart */}
        <div className="bg-[#0d131a] border border-[#1f2d3d] p-4 rounded-lg shadow-xl">
          <div className="h-[360px]">
            <PlotlyChart data={riskContribTraces} layout={riskContribLayout} />
          </div>
        </div>

        {/* Correlation Heatmap */}
        <div className="bg-[#0d131a] border border-[#1f2d3d] p-4 rounded-lg shadow-xl">
          <div className="h-[360px]">
            <PlotlyChart data={heatmapTrace} layout={heatmapLayout} />
          </div>
        </div>
      </div>
    </div>
  );
};
