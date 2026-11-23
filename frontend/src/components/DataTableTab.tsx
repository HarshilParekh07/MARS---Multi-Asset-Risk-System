import React, { useState } from 'react';
import { Table, ArrowDownToLine, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { FullDashboardResponse } from '../types';

interface DataTableTabProps {
  data: FullDashboardResponse;
  onExportSummary: () => void;
  onExportReturns: () => void;
  onExportBreaches: () => void;
}

export const DataTableTab: React.FC<DataTableTabProps> = ({
  data,
  onExportSummary,
  onExportReturns,
  onExportBreaches
}) => {
  const { raw_dates, portfolio_daily_returns, asset_daily_returns, rolling_risk } = data;
  const [searchDate, setSearchDate] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const tickers = Object.keys(asset_daily_returns);

  // Combine rows
  const allRows = raw_dates.map((dt, idx) => ({
    date: dt,
    portfolio_return: portfolio_daily_returns[idx] || 0,
    rolling_vol: rolling_risk.rolling_vol_annualized[idx],
    rolling_var99: rolling_risk.rolling_var_99[idx],
    asset_rets: tickers.reduce((acc, t) => {
      acc[t] = asset_daily_returns[t]?.[idx] || 0;
      return acc;
    }, {} as Record<string, number>)
  }));

  const filteredRows = allRows.filter(r => r.date.includes(searchDate));
  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      {/* Top action bar: Search & CSV Download Buttons */}
      <div className="bg-[#0d131a] border border-[#1f2d3d] p-4 rounded-lg shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#141d27] border border-[#1f2d3d] rounded px-2.5 py-1 text-xs font-mono text-[#8b9bb4]">
            <Search className="w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="FILTER DATE (YYYY-MM-DD)..."
              value={searchDate}
              onChange={(e) => { setSearchDate(e.target.value); setPage(1); }}
              className="bg-transparent border-none text-white outline-none w-48 font-mono text-xs"
            />
          </div>
          <span className="text-[11px] font-mono text-[#8b9bb4]">
            Showing {filteredRows.length} observations
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onExportSummary}
            className="px-3 py-1.5 text-xs font-mono bg-[#141d27] hover:bg-[#ff9800] hover:text-black text-white rounded border border-[#1f2d3d] transition-all flex items-center gap-1.5 shadow"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>Full Risk Report (CSV)</span>
          </button>
          <button
            onClick={onExportReturns}
            className="px-3 py-1.5 text-xs font-mono bg-[#141d27] hover:bg-[#00e5ff] hover:text-black text-white rounded border border-[#1f2d3d] transition-all flex items-center gap-1.5 shadow"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>Daily Returns (CSV)</span>
          </button>
          <button
            onClick={onExportBreaches}
            className="px-3 py-1.5 text-xs font-mono bg-[#141d27] hover:bg-rose-500 hover:text-white text-white rounded border border-[#1f2d3d] transition-all flex items-center gap-1.5 shadow"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>Breach Log (CSV)</span>
          </button>
        </div>
      </div>

      {/* Historical Data Table */}
      <div className="bg-[#0d131a] border border-[#1f2d3d] rounded-lg shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#141d27]">
              <tr className="text-[#8b9bb4] border-b border-[#1f2d3d] text-[11px] uppercase">
                <th className="p-3">Observation Date</th>
                <th className="p-3 text-right">Portfolio Return (%)</th>
                <th className="p-3 text-right">Rolling Vol (Ann %)</th>
                <th className="p-3 text-right">Rolling 99% VaR (%)</th>
                {tickers.map(t => (
                  <th key={t} className="p-3 text-right text-[#00e5ff]">{t} (%)</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2d3d]/50">
              {paginatedRows.map((row) => (
                <tr key={row.date} className="hover:bg-[#141d27]/70 transition-colors">
                  <td className="p-3 font-semibold text-white">{row.date}</td>
                  <td className="p-3 text-right font-bold tabular-nums">
                    <span className={row.portfolio_return < 0 ? 'text-rose-400' : 'text-emerald-400'}>
                      {(row.portfolio_return * 100).toFixed(3)}%
                    </span>
                  </td>
                  <td className="p-3 text-right text-[#c5d1e0] tabular-nums">
                    {row.rolling_vol !== null && row.rolling_vol !== undefined ? `${row.rolling_vol.toFixed(2)}%` : '-'}
                  </td>
                  <td className="p-3 text-right text-[#ff9800] font-semibold tabular-nums">
                    {row.rolling_var99 !== null && row.rolling_var99 !== undefined ? `-${row.rolling_var99.toFixed(2)}%` : '-'}
                  </td>
                  {tickers.map(t => {
                    const ret = row.asset_rets[t] || 0;
                    return (
                      <td key={t} className="p-3 text-right text-white tabular-nums">
                        <span className={ret < 0 ? 'text-rose-400' : 'text-[#c5d1e0]'}>
                          {(ret * 100).toFixed(2)}%
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div className="bg-[#141d27] border-t border-[#1f2d3d] p-3 flex items-center justify-between text-xs font-mono text-[#8b9bb4]">
          <div>
            Page <span className="text-white font-bold">{page}</span> of <span className="text-white font-bold">{totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded bg-[#0d131a] border border-[#1f2d3d] text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#1f2d3d]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded bg-[#0d131a] border border-[#1f2d3d] text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#1f2d3d]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
