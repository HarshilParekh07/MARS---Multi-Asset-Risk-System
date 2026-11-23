import React, { useState } from 'react';
import { Flame, Sliders, AlertTriangle, ShieldAlert, ArrowDownRight, RefreshCw } from 'lucide-react';
import { FullDashboardResponse, StressTestResponse } from '../types';
import { apiClient } from '../api/client';

interface StressTestingTabProps {
  data: FullDashboardResponse;
  portfolioReq: any;
}

export const StressTestingTab: React.FC<StressTestingTabProps> = ({ data, portfolioReq }) => {
  const { stress_testing, var_comparison } = data;
  const [sliderShock, setSliderShock] = useState<number>(-15);
  const [customStress, setCustomStress] = useState<StressTestResponse | null>(null);
  const [simulating, setSimulating] = useState(false);

  const handleSimulateCustom = async () => {
    setSimulating(true);
    try {
      const res = await apiClient.runCustomStressTest(portfolioReq, sliderShock);
      setCustomStress(res);
    } catch (e) {
      console.error(e);
    } finally {
      setSimulating(false);
    }
  };

  const activeCustom = customStress?.custom_factor_shock || stress_testing.custom_factor_shock;

  return (
    <div className="space-y-4">
      {/* Interactive Custom Shock Simulator Panel */}
      <div className="bg-[#0d131a] border border-[#ff9800]/40 p-4 rounded-lg shadow-xl">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1f2d3d]">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#ff9800]" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              Dynamic Macro Factor Shock Simulator
            </h2>
          </div>
          <span className="text-[11px] font-mono text-[#8b9bb4]">
            Portfolio Baseline: <span className="text-white font-bold">${var_comparison.portfolio_value.toLocaleString()}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2 space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-[#8b9bb4]">Hypothetical Factor Shock:</span>
              <span className={`text-base font-bold tabular-nums ${sliderShock < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {sliderShock > 0 ? `+${sliderShock}` : sliderShock}%
              </span>
            </div>
            <input
              type="range"
              min={-50}
              max={30}
              step={1}
              value={sliderShock}
              onChange={(e) => setSliderShock(parseFloat(e.target.value))}
              className="w-full h-2 bg-[#141d27] rounded-lg appearance-none cursor-pointer accent-[#ff9800]"
            />
            <div className="flex justify-between text-[10px] font-mono text-[#8b9bb4]">
              <span>Severe Depression (-50%)</span>
              <span>Crash (-20%)</span>
              <span>Correction (-10%)</span>
              <span>Neutral (0%)</span>
              <span>Rally (+30%)</span>
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <button
              onClick={handleSimulateCustom}
              disabled={simulating}
              className="w-full bg-[#ff9800] hover:bg-[#ffa726] text-black font-mono font-bold text-xs py-2.5 rounded shadow transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${simulating ? 'animate-spin' : ''}`} />
              <span>{simulating ? 'SIMULATING...' : 'EXECUTE SHOCK SIMULATION'}</span>
            </button>
          </div>
        </div>

        {/* Custom Shock Result Preview Card */}
        {activeCustom && (
          <div className="mt-4 pt-3 border-t border-[#1f2d3d] grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#141d27] p-2.5 rounded border border-[#1f2d3d]">
              <div className="text-[10px] font-mono text-[#8b9bb4] uppercase">Portfolio Loss (%)</div>
              <div className={`text-base font-mono font-bold tabular-nums mt-0.5 ${activeCustom.portfolio_loss_pct < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {activeCustom.portfolio_loss_pct.toFixed(2)}%
              </div>
            </div>
            <div className="bg-[#141d27] p-2.5 rounded border border-[#1f2d3d]">
              <div className="text-[10px] font-mono text-[#8b9bb4] uppercase">Dollar Loss Impact</div>
              <div className="text-base font-mono font-bold text-white tabular-nums mt-0.5">
                ${activeCustom.portfolio_loss_amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="bg-[#141d27] p-2.5 rounded border border-[#1f2d3d]">
              <div className="text-[10px] font-mono text-[#8b9bb4] uppercase">Post-Shock Portfolio Value</div>
              <div className="text-base font-mono font-bold text-[#00e5ff] tabular-nums mt-0.5">
                ${activeCustom.stressed_portfolio_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="bg-[#141d27] p-2.5 rounded border border-[#1f2d3d]">
              <div className="text-[10px] font-mono text-[#8b9bb4] uppercase">Stressed 99% VaR</div>
              <div className="text-base font-mono font-bold text-[#ff9800] tabular-nums mt-0.5">
                ${activeCustom.stressed_var_amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Historical Crisis Scenarios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stress_testing.scenarios.map((sc) => (
          <div
            key={sc.name}
            className="bg-[#0d131a] border border-[#1f2d3d] hover:border-[#ff9800]/50 transition-colors p-4 rounded-lg shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1f2d3d]">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-xs font-mono font-bold text-white uppercase">{sc.name}</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#141d27] text-[#00e5ff] border border-[#1f2d3d]">
                  {sc.category}
                </span>
              </div>

              <p className="text-[11px] font-mono text-[#8b9bb4] mb-3 leading-relaxed">
                {sc.description}
              </p>

              {sc.historical_period && (
                <div className="text-[10px] font-mono text-[#475569] mb-3">
                  Historical Window: <span className="text-[#8b9bb4]">{sc.historical_period}</span>
                </div>
              )}

              <div className="space-y-1.5 bg-[#141d27] p-2.5 rounded border border-[#1f2d3d] text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-[#8b9bb4]">Portfolio Loss:</span>
                  <span className="text-rose-400 font-bold tabular-nums">
                    {sc.portfolio_loss_pct.toFixed(2)}% (${sc.portfolio_loss_amount.toLocaleString(undefined, { maximumFractionDigits: 0 })})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8b9bb4]">Stressed Portfolio Value:</span>
                  <span className="text-white font-bold tabular-nums">
                    ${sc.stressed_portfolio_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8b9bb4]">Stressed 1d VaR:</span>
                  <span className="text-[#ff9800] font-semibold tabular-nums">
                    ${sc.stressed_var_amount.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({sc.stressed_var_pct.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Asset-specific shock breakdown */}
            <div className="mt-3 pt-2.5 border-t border-[#1f2d3d]">
              <div className="text-[10px] font-mono uppercase text-[#8b9bb4] mb-1">Asset Drawdowns (Beta-scaled):</div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(sc.asset_impacts).map(([ticker, impact]) => (
                  <span key={ticker} className="text-[10px] font-mono bg-[#080c10] px-1.5 py-0.5 rounded border border-[#1f2d3d] text-[#c5d1e0]">
                    <span className="text-[#00e5ff] font-semibold">{ticker}:</span>{' '}
                    <span className="text-rose-400 tabular-nums">{impact.toFixed(1)}%</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
