import React, { useState } from 'react';
import { Sliders, DollarSign, Calendar, Percent, Shield, ArrowDownToLine, Plus, X } from 'lucide-react';
import { PortfolioRequest } from '../types';

interface ControlsProps {
  params: PortfolioRequest;
  onChange: (updated: PortfolioRequest) => void;
  onRun: () => void;
  onExportSummary: () => void;
  onExportReturns: () => void;
  onExportBreaches: () => void;
  loading: boolean;
}

export const Controls: React.FC<ControlsProps> = ({
  params,
  onChange,
  onRun,
  onExportSummary,
  onExportReturns,
  onExportBreaches,
  loading
}) => {
  const [newTickerInput, setNewTickerInput] = useState('');
  const [equalWeight, setEqualWeight] = useState(true);

  const handleAddTicker = () => {
    const symbol = newTickerInput.trim().toUpperCase();
    if (symbol && !params.tickers.includes(symbol)) {
      const updatedTickers = [...params.tickers, symbol];
      const n = updatedTickers.length;
      const updatedWeights = equalWeight ? Array(n).fill(1 / n) : [...(params.weights || []), 0];
      onChange({
        ...params,
        tickers: updatedTickers,
        weights: updatedWeights
      });
      setNewTickerInput('');
    }
  };

  const handleRemoveTicker = (idx: number) => {
    if (params.tickers.length <= 1) return; // Keep at least one
    const updatedTickers = params.tickers.filter((_, i) => i !== idx);
    const n = updatedTickers.length;
    const updatedWeights = equalWeight ? Array(n).fill(1 / n) : (params.weights || []).filter((_, i) => i !== idx);
    onChange({
      ...params,
      tickers: updatedTickers,
      weights: updatedWeights
    });
  };

  const handleWeightChange = (idx: number, val: number) => {
    const w = [...(params.weights || Array(params.tickers.length).fill(1 / params.tickers.length))];
    w[idx] = Math.max(0, val);
    setEqualWeight(false);
    onChange({ ...params, weights: w });
  };

  const handleToggleEqualWeight = () => {
    const nextVal = !equalWeight;
    setEqualWeight(nextVal);
    if (nextVal) {
      const n = params.tickers.length;
      onChange({
        ...params,
        weights: Array(n).fill(1 / n)
      });
    }
  };

  return (
    <div className="bg-[#0d131a] border border-[#1f2d3d] p-4 rounded-lg shadow-xl mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1f2d3d] mb-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#ff9800]" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
            Portfolio Parameters & Horizon Controls
          </span>
        </div>

        {/* CSV Export Dropdown group */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-[#8b9bb4]">EXPORT:</span>
          <button
            onClick={onExportSummary}
            className="px-2.5 py-1 text-[11px] font-mono bg-[#141d27] hover:bg-[#1f2d3d] text-[#c5d1e0] hover:text-[#ff9800] rounded border border-[#1f2d3d] transition-colors flex items-center gap-1"
          >
            <ArrowDownToLine className="w-3 h-3" />
            <span>Risk Report (CSV)</span>
          </button>
          <button
            onClick={onExportReturns}
            className="px-2.5 py-1 text-[11px] font-mono bg-[#141d27] hover:bg-[#1f2d3d] text-[#c5d1e0] hover:text-[#00e5ff] rounded border border-[#1f2d3d] transition-colors flex items-center gap-1"
          >
            <ArrowDownToLine className="w-3 h-3" />
            <span>Returns (CSV)</span>
          </button>
          <button
            onClick={onExportBreaches}
            className="px-2.5 py-1 text-[11px] font-mono bg-[#141d27] hover:bg-[#1f2d3d] text-[#c5d1e0] hover:text-rose-400 rounded border border-[#1f2d3d] transition-colors flex items-center gap-1"
          >
            <ArrowDownToLine className="w-3 h-3" />
            <span>Breaches (CSV)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Portfolio Value */}
        <div>
          <label className="text-[11px] font-mono uppercase tracking-wide text-[#8b9bb4] block mb-1 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-[#ff9800]" />
            Portfolio Value ($)
          </label>
          <input
            type="number"
            min={1000}
            step={10000}
            value={params.portfolio_value}
            onChange={(e) => onChange({ ...params, portfolio_value: parseFloat(e.target.value) || 1000000 })}
            className="w-full bg-[#141d27] border border-[#1f2d3d] focus:border-[#ff9800] rounded px-3 py-1.5 text-sm font-mono text-white outline-none"
          />
        </div>

        {/* Confidence Level */}
        <div>
          <label className="text-[11px] font-mono uppercase tracking-wide text-[#8b9bb4] block mb-1 flex items-center gap-1">
            <Percent className="w-3.5 h-3.5 text-[#00e5ff]" />
            Confidence Level (α)
          </label>
          <div className="grid grid-cols-3 gap-1">
            {[0.95, 0.99, 0.995].map((conf) => (
              <button
                key={conf}
                type="button"
                onClick={() => onChange({ ...params, confidence_level: conf })}
                className={`py-1.5 text-xs font-mono font-semibold rounded border transition-all ${
                  params.confidence_level === conf
                    ? 'bg-[#ff9800] text-black border-[#ff9800]'
                    : 'bg-[#141d27] text-[#8b9bb4] border-[#1f2d3d] hover:text-white'
                }`}
              >
                {conf === 0.995 ? '99.5%' : `${conf * 100}%`}
              </button>
            ))}
          </div>
        </div>

        {/* Holding Period */}
        <div>
          <label className="text-[11px] font-mono uppercase tracking-wide text-[#8b9bb4] block mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            Holding Horizon (h)
          </label>
          <div className="grid grid-cols-3 gap-1">
            {[1, 5, 10].map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => onChange({ ...params, holding_period_days: h })}
                className={`py-1.5 text-xs font-mono font-semibold rounded border transition-all ${
                  params.holding_period_days === h
                    ? 'bg-emerald-500 text-black border-emerald-500'
                    : 'bg-[#141d27] text-[#8b9bb4] border-[#1f2d3d] hover:text-white'
                }`}
              >
                {h} {h === 1 ? 'Day' : 'Days'}
              </button>
            ))}
          </div>
        </div>

        {/* Lookback Window */}
        <div>
          <label className="text-[11px] font-mono uppercase tracking-wide text-[#8b9bb4] block mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-[#ff9800]" />
            Lookback History
          </label>
          <select
            value={params.lookback}
            onChange={(e) => onChange({ ...params, lookback: e.target.value })}
            className="w-full bg-[#141d27] border border-[#1f2d3d] focus:border-[#ff9800] rounded px-3 py-1.5 text-sm font-mono text-white outline-none cursor-pointer"
          >
            <option value="6m">6 Months (Tactical)</option>
            <option value="1y">1 Year (252 Bars)</option>
            <option value="2y">2 Years (Standard MARS)</option>
            <option value="3y">3 Years (Full Cycle)</option>
            <option value="5y">5 Years (Multi-Year Macro)</option>
          </select>
        </div>

        {/* Equal Weight Switch & Run */}
        <div className="flex flex-col justify-end">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-mono text-[#8b9bb4]">Weights:</span>
            <button
              onClick={handleToggleEqualWeight}
              className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                equalWeight
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600'
                  : 'bg-[#141d27] text-[#8b9bb4] border-[#1f2d3d]'
              }`}
            >
              {equalWeight ? 'EQUAL WEIGHT (ON)' : 'CUSTOM WEIGHTS'}
            </button>
          </div>
          <button
            onClick={onRun}
            disabled={loading}
            className="w-full bg-[#ff9800] hover:bg-[#ffa726] active:scale-[0.98] text-black font-mono font-bold text-xs py-2 rounded shadow transition-all flex items-center justify-center gap-1.5"
          >
            <Shield className="w-4 h-4" />
            <span>{loading ? 'CALCULATING RISK...' : 'UPDATE RISK ENGINE'}</span>
          </button>
        </div>
      </div>

      {/* Asset Tickers & Weights allocation row */}
      <div className="mt-4 pt-3 border-t border-[#1f2d3d]">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-[11px] font-mono text-[#8b9bb4] uppercase">Active Tickers ({params.tickers.length}):</span>
          {params.tickers.map((ticker, idx) => {
            const currentWeight = params.weights && params.weights[idx] !== undefined
              ? (params.weights[idx] * 100).toFixed(1)
              : (100 / params.tickers.length).toFixed(1);
            return (
              <div
                key={ticker}
                className="flex items-center gap-1.5 bg-[#141d27] border border-[#1f2d3d] rounded px-2 py-1 text-xs font-mono"
              >
                <span className="text-[#00e5ff] font-bold">{ticker}</span>
                {!equalWeight && (
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={currentWeight}
                    onChange={(e) => handleWeightChange(idx, (parseFloat(e.target.value) || 0) / 100)}
                    className="w-12 bg-[#0d131a] border border-[#1f2d3d] rounded px-1 py-0.5 text-[11px] text-right font-mono text-white outline-none"
                  />
                )}
                {equalWeight && (
                  <span className="text-[#8b9bb4] text-[11px]">{currentWeight}%</span>
                )}
                <button
                  onClick={() => handleRemoveTicker(idx)}
                  className="text-[#8b9bb4] hover:text-rose-400 transition-colors ml-0.5"
                  title="Remove asset"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}

          {/* Add ticker form */}
          <div className="flex items-center gap-1">
            <input
              type="text"
              placeholder="ADD TICKER (e.g. MSFT, TCS.NS)"
              value={newTickerInput}
              onChange={(e) => setNewTickerInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTicker()}
              className="bg-[#141d27] border border-[#1f2d3d] focus:border-[#ff9800] rounded px-2.5 py-1 text-xs font-mono text-white outline-none w-48 uppercase"
            />
            <button
              onClick={handleAddTicker}
              className="bg-[#1f2d3d] hover:bg-[#ff9800] hover:text-black text-[#c5d1e0] p-1 rounded transition-colors"
              title="Add Ticker"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
