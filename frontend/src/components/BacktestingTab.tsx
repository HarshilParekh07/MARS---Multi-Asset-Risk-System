import React, { useState } from 'react';
import { ShieldCheck, AlertOctagon, CheckCircle2, XCircle, ArrowDownToLine, Calendar, Info } from 'lucide-react';
import { FullDashboardResponse } from '../types';
import { PlotlyChart } from './common/PlotlyChart';

interface BacktestingTabProps {
  data: FullDashboardResponse;
  onExportBreaches: () => void;
}

export const BacktestingTab: React.FC<BacktestingTabProps> = ({ data, onExportBreaches }) => {
  const [selectedConf, setSelectedConf] = useState<'99' | '95'>('99');
  const bt = selectedConf === '99' ? data.backtesting_99 : data.backtesting_95;
  const { rolling_risk, data_summary } = data;
  const currencySymbol = data_summary?.currency_symbol || (data_summary?.tickers.every(t => t.endsWith('.NS') || t.endsWith('.BO')) ? '₹' : '$');

  // Build chart traces: Daily return series, rolling VaR threshold, and breach scatter markers
  const dates = rolling_risk.dates;
  const returns = rolling_risk.returns;
  const varLine = selectedConf === '99' ? rolling_risk.rolling_var_99 : rolling_risk.rolling_var_95;
  const breachDatesSet = new Set(selectedConf === '99' ? rolling_risk.breaches_99 : rolling_risk.breaches_95);

  // Separate breach points for high-contrast scatter
  const breachPointsX: string[] = [];
  const breachPointsY: number[] = [];

  dates.forEach((d, i) => {
    if (breachDatesSet.has(d)) {
      breachPointsX.push(d);
      breachPointsY.push(returns[i]);
    }
  });

  const backtestTraces = [
    {
      x: dates,
      y: returns,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Actual Daily Return (%)',
      line: { color: 'rgba(139, 155, 180, 0.5)', width: 1 }
    },
    {
      x: dates,
      y: varLine.map(v => (v !== null ? -v : null)),
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: `${selectedConf}% Rolling VaR Limit`,
      line: { color: '#ff9800', width: 2, dash: 'dash' as const }
    },
    {
      x: breachPointsX,
      y: breachPointsY,
      type: 'scatter' as const,
      mode: 'markers' as const,
      name: `Violations (${bt.violation_count})`,
      marker: { color: '#ff5252', size: 7, symbol: 'x' }
    }
  ];

  const backtestLayout = {
    title: {
      text: `OUT-OF-SAMPLE ROLLING VaR BACKTEST (${selectedConf}% CONFIDENCE)`,
      font: { family: 'JetBrains Mono', size: 12, color: '#e0e6ed' },
      x: 0.02
    },
    yaxis: {
      title: { text: 'Daily Return / VaR Limit (%)', font: { size: 10, color: '#8b9bb4' } },
      gridcolor: '#1f2d3d'
    },
    xaxis: {
      gridcolor: '#1f2d3d',
      type: 'date' as const
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls: 99% vs 95% Toggle & Basel Indicator */}
      <div className="bg-[#0d131a] border border-[#1f2d3d] p-4 rounded-lg shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Select Regulatory Confidence:</span>
          </div>
          <div className="flex bg-[#141d27] p-1 rounded border border-[#1f2d3d]">
            <button
              onClick={() => setSelectedConf('99')}
              className={`px-3 py-1 text-xs font-mono font-bold rounded transition-colors ${
                selectedConf === '99'
                  ? 'bg-[#ff9800] text-black'
                  : 'text-[#8b9bb4] hover:text-white'
              }`}
            >
              99% CONFIDENCE (BASEL STANDARD)
            </button>
            <button
              onClick={() => setSelectedConf('95')}
              className={`px-3 py-1 text-xs font-mono font-bold rounded transition-colors ${
                selectedConf === '95'
                  ? 'bg-[#00e5ff] text-black'
                  : 'text-[#8b9bb4] hover:text-white'
              }`}
            >
              95% CONFIDENCE
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-[#8b9bb4]">BASEL TRAFFIC LIGHT:</span>
          <span
            className={`px-2.5 py-1 text-xs font-mono font-bold rounded border uppercase ${
              bt.basel_traffic_light.startsWith('GREEN')
                ? 'bg-emerald-950 text-emerald-400 border-emerald-600'
                : bt.basel_traffic_light.startsWith('YELLOW')
                ? 'bg-amber-950 text-amber-300 border-amber-600'
                : 'bg-rose-950 text-rose-400 border-rose-600'
            }`}
          >
            {bt.basel_traffic_light}
          </span>
        </div>
      </div>

      {/* Backtest Statistics Summary Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#0d131a] border border-[#1f2d3d] p-3.5 rounded shadow">
          <div className="text-[11px] font-mono text-[#8b9bb4] uppercase">Observations Evaluated</div>
          <div className="text-xl font-mono font-bold text-white tabular-nums mt-1">{bt.total_observations} Days</div>
          <div className="text-[10px] font-mono text-[#8b9bb4] mt-0.5">Out-of-sample window: 126d</div>
        </div>

        <div className="bg-[#0d131a] border border-[#1f2d3d] p-3.5 rounded shadow">
          <div className="text-[11px] font-mono text-[#8b9bb4] uppercase">Violations Count</div>
          <div className="text-xl font-mono font-bold text-[#ff9800] tabular-nums mt-1">
            {bt.violation_count} <span className="text-xs text-[#8b9bb4] font-normal">/ Expected ~{bt.expected_violations}</span>
          </div>
          <div className="text-[10px] font-mono text-[#8b9bb4] mt-0.5">Days with Loss &gt; VaR</div>
        </div>

        <div className="bg-[#0d131a] border border-[#1f2d3d] p-3.5 rounded shadow">
          <div className="text-[11px] font-mono text-[#8b9bb4] uppercase">Violation Ratio</div>
          <div className="text-xl font-mono font-bold text-white tabular-nums mt-1">
            {bt.violation_ratio.toFixed(2)}% <span className="text-xs text-[#8b9bb4] font-normal">vs {bt.expected_ratio.toFixed(2)}%</span>
          </div>
          <div className="text-[10px] font-mono text-[#8b9bb4] mt-0.5">Empirical failure proportion (p̂)</div>
        </div>

        <div className="bg-[#0d131a] border border-[#1f2d3d] p-3.5 rounded shadow">
          <div className="text-[11px] font-mono text-[#8b9bb4] uppercase">Kupiec POF LR Test</div>
          <div className={`text-xl font-mono font-bold tabular-nums mt-1 ${bt.kupiec_pvalue >= 0.05 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {bt.kupiec_pvalue >= 0.05 ? 'PASSED' : 'REJECTED'}
          </div>
          <div className="text-[10px] font-mono text-[#8b9bb4] mt-0.5">p-value: {bt.kupiec_pvalue.toFixed(4)}</div>
        </div>
      </div>

      {/* Main Breach Timeline Plot */}
      <div className="bg-[#0d131a] border border-[#1f2d3d] p-4 rounded-lg shadow-xl">
        <div className="h-[360px]">
          <PlotlyChart data={backtestTraces} layout={backtestLayout} />
        </div>
      </div>

      {/* Statistical Hypothesis Test Decision Matrix */}
      <div className="bg-[#0d131a] border border-[#1f2d3d] p-4 rounded-lg shadow-xl">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white pb-2 mb-3 border-b border-[#1f2d3d]">
          Statistical Hypothesis Test Suite (Basel & Regulatory Frameworks)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="text-[#8b9bb4] border-b border-[#1f2d3d] text-[11px] uppercase">
                <th className="pb-2">Test Name</th>
                <th className="pb-2">Target Hypothesis (H₀)</th>
                <th className="pb-2 text-right">LR Statistic</th>
                <th className="pb-2 text-right">p-value</th>
                <th className="pb-2 text-right">Critical Limit (5%)</th>
                <th className="pb-2 text-right">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2d3d]/50">
              <tr className="hover:bg-[#141d27]/70">
                <td className="py-2.5 font-bold text-white">Kupiec POF (Proportion of Failures)</td>
                <td className="py-2.5 text-[#8b9bb4]">Failure probability equals nominal α level (p = {bt.expected_ratio/100})</td>
                <td className="py-2.5 text-right tabular-nums text-white">{bt.kupiec_lr_stat.toFixed(4)}</td>
                <td className="py-2.5 text-right tabular-nums text-white font-semibold">{bt.kupiec_pvalue.toFixed(4)}</td>
                <td className="py-2.5 text-right tabular-nums text-[#8b9bb4]">χ²(1) = 3.841</td>
                <td className="py-2.5 text-right font-bold">
                  {bt.kupiec_pvalue >= 0.05 ? (
                    <span className="text-emerald-400">ACCEPT H₀ (Calibrated)</span>
                  ) : (
                    <span className="text-rose-400">REJECT H₀ (Miscalibrated)</span>
                  )}
                </td>
              </tr>

              <tr className="hover:bg-[#141d27]/70">
                <td className="py-2.5 font-bold text-white">Christoffersen Independence</td>
                <td className="py-2.5 text-[#8b9bb4]">Breaches are independent across time (no violation clustering)</td>
                <td className="py-2.5 text-right tabular-nums text-white">{bt.christoffersen_ind_stat.toFixed(4)}</td>
                <td className="py-2.5 text-right tabular-nums text-white font-semibold">{bt.christoffersen_ind_pvalue.toFixed(4)}</td>
                <td className="py-2.5 text-right tabular-nums text-[#8b9bb4]">χ²(1) = 3.841</td>
                <td className="py-2.5 text-right font-bold">
                  {bt.christoffersen_ind_pvalue >= 0.05 ? (
                    <span className="text-emerald-400">ACCEPT H₀ (Independent)</span>
                  ) : (
                    <span className="text-rose-400">REJECT H₀ (Clustering)</span>
                  )}
                </td>
              </tr>

              <tr className="hover:bg-[#141d27]/70">
                <td className="py-2.5 font-bold text-white">Christoffersen Conditional Coverage</td>
                <td className="py-2.5 text-[#8b9bb4]">Combined hypothesis: Correct failure rate AND independence</td>
                <td className="py-2.5 text-right tabular-nums text-white">{bt.christoffersen_cc_stat.toFixed(4)}</td>
                <td className="py-2.5 text-right tabular-nums text-white font-semibold">{bt.christoffersen_cc_pvalue.toFixed(4)}</td>
                <td className="py-2.5 text-right tabular-nums text-[#8b9bb4]">χ²(2) = 5.991</td>
                <td className="py-2.5 text-right font-bold">
                  {bt.christoffersen_cc_pvalue >= 0.05 ? (
                    <span className="text-emerald-400">ACCEPT H₀ (Sound Model)</span>
                  ) : (
                    <span className="text-rose-400">REJECT H₀ (Unsound)</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Historical Breach Log Table */}
      <div className="bg-[#0d131a] border border-[#1f2d3d] p-4 rounded-lg shadow-xl">
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#1f2d3d]">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-400" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              Historical VaR Breach Registry ({bt.violations.length} Events)
            </h3>
          </div>
          <button
            onClick={onExportBreaches}
            className="px-2.5 py-1 text-[11px] font-mono bg-[#141d27] hover:bg-[#1f2d3d] text-rose-400 rounded border border-[#1f2d3d] transition-colors flex items-center gap-1"
          >
            <ArrowDownToLine className="w-3 h-3" />
            <span>Export Breaches (CSV)</span>
          </button>
        </div>

        {bt.violations.length === 0 ? (
          <div className="text-center py-8 text-xs font-mono text-[#8b9bb4]">
            No historical VaR breaches recorded over the evaluation sample.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[300px]">
            <table className="w-full text-left font-mono text-xs">
              <thead className="sticky top-0 bg-[#0d131a]">
                <tr className="text-[#8b9bb4] border-b border-[#1f2d3d] text-[11px] uppercase">
                  <th className="pb-2">Date</th>
                  <th className="pb-2 text-right">Actual Daily Return</th>
                  <th className="pb-2 text-right">VaR Threshold Limit</th>
                  <th className="pb-2 text-right">Portfolio Loss ({currencySymbol})</th>
                  <th className="pb-2 text-right">Excess Breach Loss ({currencySymbol})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2d3d]/50">
                {bt.violations.map((v) => (
                  <tr key={v.date} className="hover:bg-[#141d27]/70">
                    <td className="py-2 text-[#00e5ff] font-semibold flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-[#8b9bb4]" />
                      {v.date}
                    </td>
                    <td className="py-2 text-right text-rose-400 font-bold tabular-nums">
                      {v.return_pct.toFixed(2)}%
                    </td>
                    <td className="py-2 text-right text-[#ff9800] font-semibold tabular-nums">
                      -{v.var_threshold_pct.toFixed(2)}%
                    </td>
                    <td className="py-2 text-right text-white font-bold tabular-nums">
                      {currencySymbol}{v.loss_amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-2 text-right text-rose-300 font-bold tabular-nums">
                      +{currencySymbol}{v.breach_amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
