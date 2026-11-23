import React from 'react';
import { ShieldAlert, AlertTriangle, TrendingDown, Percent, DollarSign, Database, Info, Award } from 'lucide-react';
import { FullDashboardResponse } from '../types';
import { MetricCard } from './MetricCard';
import { PlotlyChart } from './common/PlotlyChart';

interface OverviewTabProps {
  data: FullDashboardResponse;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ data }) => {
  const { data_summary, distribution_stats, var_comparison, backtesting_99, price_series, portfolio_risk } = data;
  const currencySymbol = data_summary.currency_symbol || (data_summary.tickers.every(t => t.endsWith('.NS') || t.endsWith('.BO')) ? '₹' : '$');

  // Primary 99% 1-day Historical VaR baseline
  const histModel = var_comparison.models.find(m => m.method.includes('Historical')) || var_comparison.models[0];
  const mcModel = var_comparison.models.find(m => m.method.includes('Monte Carlo')) || var_comparison.models[3];

  const trafficBadgeType = backtesting_99.basel_traffic_light.startsWith('GREEN')
    ? 'green'
    : backtesting_99.basel_traffic_light.startsWith('YELLOW')
    ? 'yellow'
    : 'red';

  // Format chart series
  const dates = price_series.map(p => p.date);
  const cumReturns = price_series.map(p => p.portfolio_cumulative_return);
  const drawdowns = price_series.map(p => p.portfolio_drawdown);

  const performanceTraces = [
    {
      x: dates,
      y: cumReturns,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Cumulative Return (%)',
      line: { color: '#00e5ff', width: 2 }
    },
    {
      x: dates,
      y: drawdowns,
      type: 'scatter' as const,
      mode: 'lines' as const,
      fill: 'tozeroy' as const,
      name: 'Drawdown (%)',
      line: { color: '#ff5252', width: 1.5 },
      fillcolor: 'rgba(255, 82, 82, 0.15)',
      yaxis: 'y2'
    }
  ];

  const chartLayout = {
    title: {
      text: 'PORTFOLIO CUMULATIVE RETURN & UNDERWATER DRAWDOWN DYNAMICS',
      font: { family: 'JetBrains Mono', size: 12, color: '#e0e6ed' },
      x: 0.02
    },
    yaxis: {
      title: { text: 'Cumulative Return (%)', font: { size: 10, color: '#00e5ff' } },
      gridcolor: '#1f2d3d',
      tickformat: '+.1f'
    },
    yaxis2: {
      title: { text: 'Drawdown (%)', font: { size: 10, color: '#ff5252' } },
      overlaying: 'y' as const,
      side: 'right' as const,
      gridcolor: 'rgba(0,0,0,0)',
      range: [Math.min(...drawdowns) * 1.25, 5]
    },
    xaxis: {
      gridcolor: '#1f2d3d',
      type: 'date' as const
    }
  };

  return (
    <div className="space-y-4">
      {/* Yahoo Finance Data Layer Status Notice */}
      <div className="bg-[#141d27] border border-[#1f2d3d] rounded p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-[#8b9bb4]">
          <Database className="w-4 h-4 text-[#ff9800]" />
          <span>DATA LAYER:</span>
          <span className="text-white font-semibold">{data_summary.data_source}</span>
          <span className="text-[#475569]">|</span>
          <span>RANGE:</span>
          <span className="text-white font-semibold">{data_summary.start_date} to {data_summary.end_date}</span>
          <span className="text-[#475569]">|</span>
          <span>BARS:</span>
          <span className="text-[#00e5ff] font-semibold">{data_summary.total_observations}</span>
        </div>
        <div className="text-[11px] text-[#8b9bb4]">
          TIMESTAMP: <span className="text-white">{data_summary.fetch_timestamp}</span>
        </div>
      </div>

      {/* Primary Bloomberg KPI metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          label={`VaR (${(var_comparison.confidence_level * 100).toFixed(0)}%, ${var_comparison.holding_period_days}d)`}
          value={`${currencySymbol}${histModel.var_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subValue={`-${histModel.var_pct.toFixed(2)}%`}
          badge="HISTORICAL"
          badgeType="amber"
          tooltip="Maximum expected loss over holding period at chosen confidence."
          icon={<ShieldAlert className="w-3.5 h-3.5 text-[#ff9800]" />}
        />

        <MetricCard
          label="Expected Shortfall (ES)"
          value={`${currencySymbol}${histModel.es_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subValue={`-${histModel.es_pct.toFixed(2)}%`}
          badge="TAIL CVaR"
          badgeType="red"
          tooltip="Conditional expected loss in extreme tail beyond the VaR threshold."
          icon={<TrendingDown className="w-3.5 h-3.5 text-rose-400" />}
        />

        <MetricCard
          label="Monte Carlo VaR"
          value={`${currencySymbol}${mcModel.var_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subValue={`-${mcModel.var_pct.toFixed(2)}%`}
          badge="10K SIMS"
          badgeType="cyan"
          tooltip="Multivariate Cholesky correlated stochastic simulation."
          icon={<span className="text-[#00e5ff] font-bold text-xs">{currencySymbol}</span>}
        />

        <MetricCard
          label="Annualized Volatility"
          value={`${distribution_stats.annualized_volatility.toFixed(2)}%`}
          subValue={`Daily: ${distribution_stats.std_daily_return.toFixed(2)}%`}
          badge="VOL"
          badgeType="neutral"
          tooltip="Annualized standard deviation of portfolio daily returns."
          icon={<Percent className="w-3.5 h-3.5 text-slate-300" />}
        />

        <MetricCard
          label="Max Peak-to-Trough Drawdown"
          value={`${distribution_stats.max_drawdown_pct.toFixed(2)}%`}
          subValue={`Current: ${distribution_stats.current_drawdown_pct.toFixed(2)}%`}
          badge="MAX DD"
          badgeType="red"
          tooltip="Worst peak-to-trough cumulative decline over the historical sample."
          icon={<AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
        />

        <MetricCard
          label="Basel Framework Status"
          value={backtesting_99.basel_traffic_light.split(' ')[0]}
          subValue={`${backtesting_99.violation_count} Violations / ${backtesting_99.total_observations}d`}
          badge="TRAFFIC LIGHT"
          badgeType={trafficBadgeType}
          tooltip="Basel Committee 99% regulatory backtesting traffic light classification."
          icon={<Award className="w-3.5 h-3.5 text-emerald-400" />}
        />
      </div>

      {/* Main Chart: Cumulative Performance & Underwater Drawdown */}
      <div className="bg-[#0d131a] border border-[#1f2d3d] p-4 rounded-lg shadow-xl">
        <div className="h-[380px]">
          <PlotlyChart data={performanceTraces} layout={chartLayout} />
        </div>
      </div>

      {/* Bottom two-column block: Asset Allocation & Quick Risk Decomposition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Asset Weights & Latest Market Pricing */}
        <div className="bg-[#0d131a] border border-[#1f2d3d] rounded-lg p-4 shadow-xl">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#1f2d3d]">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              Portfolio Holdings & Market Snapshot
            </h3>
            <span className="text-[11px] font-mono text-[#8b9bb4]">
              Div. Benefit: <span className="text-emerald-400 font-semibold">{portfolio_risk.diversification_benefit_pct}%</span>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="text-[#8b9bb4] border-b border-[#1f2d3d] text-[11px] uppercase">
                  <th className="pb-2">Symbol</th>
                  <th className="pb-2">Currency</th>
                  <th className="pb-2 text-right">Latest Price</th>
                  <th className="pb-2 text-right">Weight</th>
                  <th className="pb-2 text-right">Position Value</th>
                  <th className="pb-2 text-right">Annual Vol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2d3d]/50">
                {portfolio_risk.tickers.map((ticker, idx) => {
                  const weight = portfolio_risk.weights[idx];
                  const posVal = weight * var_comparison.portfolio_value;
                  const price = data_summary.latest_prices[ticker] || 0;
                  const curr = data_summary.currencies[ticker] || 'USD';
                  const vol = portfolio_risk.asset_volatilities_annualized[ticker] || 0;
                  return (
                    <tr key={ticker} className="hover:bg-[#141d27]/70 transition-colors">
                      <td className="py-2 text-[#00e5ff] font-bold">{ticker}</td>
                      <td className="py-2 text-[#8b9bb4]">{curr}</td>
                      <td className="py-2 text-right text-white tabular-nums">
                        {curr === 'INR' ? '₹' : '$'}{price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 text-right text-white font-semibold tabular-nums">
                        {(weight * 100).toFixed(1)}%
                      </td>
                      <td className="py-2 text-right text-[#c5d1e0] tabular-nums">
                        {currencySymbol}{posVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-2 text-right text-[#ff9800] tabular-nums">
                        {vol.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Methodology Snapshot Summary */}
        <div className="bg-[#0d131a] border border-[#1f2d3d] rounded-lg p-4 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#1f2d3d]">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                Multi-Methodology VaR Comparison ({var_comparison.holding_period_days}d Horizon)
              </h3>
              <span className="text-[11px] font-mono text-[#ff9800]">
                α = {(var_comparison.confidence_level * 100).toFixed(1)}%
              </span>
            </div>

            <div className="space-y-2.5">
              {var_comparison.models.map((m) => (
                <div key={m.method} className="bg-[#141d27] border border-[#1f2d3d] p-2.5 rounded flex items-center justify-between">
                  <div>
                    <div className="text-xs font-mono font-semibold text-white">{m.method}</div>
                    <div className="text-[10px] font-mono text-[#8b9bb4] truncate max-w-xs">{m.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-[#ff9800] tabular-nums">
                      {currencySymbol}{m.var_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[#8b9bb4] text-[10px]">(-{m.var_pct.toFixed(2)}%)</span>
                    </div>
                    <div className="text-[10px] font-mono text-rose-400 tabular-nums">
                      ES: {currencySymbol}{m.es_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (-{m.es_pct.toFixed(2)}%)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-[#1f2d3d] flex items-center gap-2 text-[10px] font-mono text-[#8b9bb4]">
            <Info className="w-3.5 h-3.5 text-[#ff9800] flex-shrink-0" />
            <span>
              Cornish-Fisher expands critical values for skewness ({distribution_stats.skewness.toFixed(2)}) & excess kurtosis ({distribution_stats.excess_kurtosis.toFixed(2)}).
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
