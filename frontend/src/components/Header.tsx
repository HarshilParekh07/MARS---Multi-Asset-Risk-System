import React, { useState, useEffect } from 'react';
import { Activity, Clock, ShieldCheck, Globe, Download, RefreshCw, Layers } from 'lucide-react';
import { DataSummary } from '../types';

interface HeaderProps {
  dataSummary: DataSummary | null;
  loading: boolean;
  onRefresh: () => void;
  onPresetSelect: (presetName: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  dataSummary,
  loading,
  onRefresh,
  onPresetSelect
}) => {
  const [timeUtc, setTimeUtc] = useState<string>('');
  const [timeLoc, setTimeLoc] = useState<string>('');

  useEffect(() => {
    const updateClocks = () => {
      const now = new Date();
      setTimeUtc(now.toUTCString().slice(17, 25) + ' UTC');
      setTimeLoc(now.toLocaleTimeString() + ' LOC');
    };
    updateClocks();
    const interval = setInterval(updateClocks, 1000);
    return () => clearInterval(interval);
  }, []);

  const presets = [
    { name: 'US Mega-Tech', label: 'US TECH', desc: 'AAPL, MSFT, NVDA, GOOGL' },
    { name: 'Global Balanced', label: 'GLOBAL', desc: 'AAPL, NVDA, RELIANCE.NS, TCS.NS' },
    { name: 'India Bluechips', label: 'INDIA 50', desc: 'RELIANCE.NS, TCS.NS, INFY.NS, HDFCBANK.NS' },
    { name: 'Semiconductors', label: 'SEMIS', desc: 'NVDA, TSM, AMD, ASML' }
  ];

  return (
    <header className="bg-[#0d131a] border-b border-[#1f2d3d] sticky top-0 z-50">
      {/* Top terminal ribbon */}
      <div className="bg-[#080c10] border-b border-[#1f2d3d] px-4 py-1.5 flex flex-wrap items-center justify-between text-[11px] font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 terminal-blink"></span>
            <span className="text-[#ff9800] font-bold tracking-wider">BLOOMBERG MARS</span>
            <span className="text-[#475569]">|</span>
            <span className="text-[#8b9bb4]">MULTI-ASSET RISK SYSTEM</span>
          </div>
          <span className="text-[#475569]">|</span>
          <div className="text-[#00e5ff] flex items-center gap-1">
            <Globe className="w-3 h-3" />
            <span>FEED: YAHOO_FINANCE_PRO</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[#8b9bb4]">
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-[#ff9800]" />
            <span className="tabular-nums text-white font-semibold">{timeUtc}</span>
            <span className="text-[#475569]">/</span>
            <span className="tabular-nums">{timeLoc}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>MODEL CALIBRATED</span>
          </div>
        </div>
      </div>

      {/* Main command bar */}
      <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-[#141d27] border border-[#ff9800] px-2.5 py-1 rounded text-xs font-mono font-bold text-[#ff9800] flex items-center gap-1.5 shadow-sm">
            <Activity className="w-4 h-4 text-[#ff9800]" />
            <span>RISK ENGINE v1.0</span>
          </div>

          {/* Quick presets buttons */}
          <div className="flex items-center gap-1 bg-[#141d27] p-1 rounded border border-[#1f2d3d]">
            <span className="text-[10px] text-[#8b9bb4] font-mono px-1.5 uppercase font-medium">Presets:</span>
            {presets.map((p) => (
              <button
                key={p.name}
                onClick={() => onPresetSelect(p.name)}
                className="px-2 py-0.5 text-[11px] font-mono bg-[#0d131a] hover:bg-[#ff9800] hover:text-black text-[#c5d1e0] rounded border border-[#1f2d3d] transition-all"
                title={p.desc}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live ticker tape prices */}
        {dataSummary && dataSummary.latest_prices && (
          <div className="flex items-center gap-3 overflow-x-auto py-1 max-w-full">
            {Object.entries(dataSummary.latest_prices).map(([ticker, price]) => {
              const curr = dataSummary.currencies[ticker] || 'USD';
              return (
                <div key={ticker} className="flex items-center gap-1.5 text-xs font-mono bg-[#141d27] px-2 py-0.5 rounded border border-[#1f2d3d] whitespace-nowrap">
                  <span className="text-[#00e5ff] font-semibold">{ticker}</span>
                  <span className="text-white font-bold tabular-nums">
                    {curr === 'INR' ? '₹' : '$'}{price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-semibold transition-all shadow-md ${
              loading
                ? 'bg-[#1f2d3d] text-[#8b9bb4] cursor-not-allowed'
                : 'bg-[#ff9800] text-black hover:bg-[#ffa726] active:scale-95'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'CALCULATING...' : 'RECALCULATE'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
