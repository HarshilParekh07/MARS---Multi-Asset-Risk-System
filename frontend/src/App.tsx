import React, { useState, useEffect } from 'react';
import {
  Activity,
  Layers,
  BarChart2,
  ShieldAlert,
  PieChart,
  Flame,
  Database,
  AlertCircle
} from 'lucide-react';

import { PortfolioRequest, FullDashboardResponse } from './types';
import { apiClient } from './api/client';
import { Header } from './components/Header';
import { Controls } from './components/Controls';
import { OverviewTab } from './components/OverviewTab';
import { VarModelsTab } from './components/VarModelsTab';
import { DistributionTab } from './components/DistributionTab';
import { BacktestingTab } from './components/BacktestingTab';
import { PortfolioRiskTab } from './components/PortfolioRiskTab';
import { StressTestingTab } from './components/StressTestingTab';
import { DataTableTab } from './components/DataTableTab';

export type TabType =
  | 'overview'
  | 'models'
  | 'distribution'
  | 'backtesting'
  | 'portfolio'
  | 'stress'
  | 'data';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [params, setParams] = useState<PortfolioRequest>({
    tickers: ['AAPL', 'MSFT', 'NVDA', 'RELIANCE.NS'],
    portfolio_value: 1_000_000,
    lookback: '2y',
    confidence_level: 0.99,
    holding_period_days: 1
  });

  const [dashboardData, setDashboardData] = useState<FullDashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async (currentParams: PortfolioRequest = params) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getDashboard(currentParams);
      setDashboardData(data);
    } catch (err: any) {
      console.error('Failed to load risk dashboard:', err);
      setError(err.message || 'Error executing MARS Risk Engine. Please verify ticker symbols and connectivity.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handlePresetSelect = (presetName: string) => {
    let newTickers: string[] = [];
    if (presetName === 'US Mega-Tech') {
      newTickers = ['AAPL', 'MSFT', 'NVDA', 'GOOGL'];
    } else if (presetName === 'Global Balanced') {
      newTickers = ['AAPL', 'NVDA', 'RELIANCE.NS', 'TCS.NS'];
    } else if (presetName === 'India Bluechips') {
      newTickers = ['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS'];
    } else if (presetName === 'Semiconductors') {
      newTickers = ['NVDA', 'TSM', 'AMD', 'ASML'];
    }

    const n = newTickers.length;
    const updated = {
      ...params,
      tickers: newTickers,
      weights: Array(n).fill(1 / n)
    };
    setParams(updated);
    fetchDashboard(updated);
  };

  const tabs = [
    { id: 'overview' as TabType, label: 'OVERVIEW', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'models' as TabType, label: 'VaR MODELS', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'distribution' as TabType, label: 'DISTRIBUTION & NORMALITY', icon: <BarChart2 className="w-3.5 h-3.5" /> },
    { id: 'backtesting' as TabType, label: 'BACKTESTING', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
    { id: 'portfolio' as TabType, label: 'PORTFOLIO RISK', icon: <PieChart className="w-3.5 h-3.5" /> },
    { id: 'stress' as TabType, label: 'STRESS TESTING', icon: <Flame className="w-3.5 h-3.5" /> },
    { id: 'data' as TabType, label: 'DATA & EXPORT', icon: <Database className="w-3.5 h-3.5" /> }
  ];

  const currencySymbol = dashboardData?.data_summary?.currency_symbol || (params.tickers.some(t => t.endsWith('.NS') || t.endsWith('.BO')) ? '₹' : '$');
  const portfolioCurrency = dashboardData?.data_summary?.portfolio_currency || (currencySymbol === '₹' ? 'INR' : 'USD');

  return (
    <div className="min-h-screen bg-[#080c10] text-[#e0e6ed] flex flex-col font-sans">
      {/* Institutional Bloomberg Header */}
      <Header
        dataSummary={dashboardData ? dashboardData.data_summary : null}
        loading={loading}
        onRefresh={() => fetchDashboard(params)}
        onPresetSelect={handlePresetSelect}
      />

      <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 py-4">
        {/* Controls Panel */}
        <Controls
          params={params}
          currencySymbol={currencySymbol}
          onChange={(updated) => setParams(updated)}
          onRun={() => fetchDashboard(params)}
          onExportSummary={() => apiClient.downloadSummaryCSV(params)}
          onExportReturns={() => apiClient.downloadReturnsCSV(params)}
          onExportBreaches={() => apiClient.downloadBreachesCSV(params)}
          loading={loading}
        />

        {/* Error notification alert banner */}
        {error && (
          <div className="mb-4 bg-rose-950/70 border border-rose-600/50 p-3.5 rounded flex items-center justify-between text-xs font-mono text-rose-200 shadow-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => fetchDashboard(params)}
              className="px-2.5 py-1 bg-rose-900 hover:bg-rose-800 rounded font-semibold text-white transition-colors"
            >
              RETRY
            </button>
          </div>
        )}

        {/* Tab Navigation Ribbon */}
        <div className="border-b border-[#1f2d3d] mb-4 flex overflow-x-auto gap-1 bg-[#0d131a] p-1 rounded-t-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold tracking-wider rounded transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#ff9800] text-black shadow-md'
                  : 'text-[#8b9bb4] hover:text-white hover:bg-[#141d27]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Loading State Skeleton */}
        {loading && !dashboardData && (
          <div className="bg-[#0d131a] border border-[#1f2d3d] rounded-lg p-16 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-2 border-[#1f2d3d] border-t-[#ff9800] rounded-full animate-spin"></div>
            <div className="text-sm font-mono text-[#ff9800] font-semibold tracking-wider">
              FETCHING YAHOO FINANCE DATA & EXECUTING RISK ENGINE...
            </div>
            <div className="text-xs font-mono text-[#8b9bb4]">
              Simulating 10,000 Monte Carlo paths, Cornish-Fisher expansion, Kupiec LR backtesting
            </div>
          </div>
        )}

        {/* Active Tab View */}
        {dashboardData && (
          <div className="relative">
            {activeTab === 'overview' && <OverviewTab data={dashboardData} />}
            {activeTab === 'models' && <VarModelsTab data={dashboardData} />}
            {activeTab === 'distribution' && <DistributionTab data={dashboardData} />}
            {activeTab === 'backtesting' && (
              <BacktestingTab
                data={dashboardData}
                onExportBreaches={() => apiClient.downloadBreachesCSV(params)}
              />
            )}
            {activeTab === 'portfolio' && <PortfolioRiskTab data={dashboardData} />}
            {activeTab === 'stress' && (
              <StressTestingTab data={dashboardData} portfolioReq={params} />
            )}
            {activeTab === 'data' && (
              <DataTableTab
                data={dashboardData}
                onExportSummary={() => apiClient.downloadSummaryCSV(params)}
                onExportReturns={() => apiClient.downloadReturnsCSV(params)}
                onExportBreaches={() => apiClient.downloadBreachesCSV(params)}
              />
            )}
          </div>
        )}
      </main>

      {/* Terminal Footer */}
      <footer className="bg-[#0d131a] border-t border-[#1f2d3d] px-4 py-2 text-[11px] font-mono text-[#8b9bb4] flex flex-wrap items-center justify-between gap-2 mt-8">
        <div>
          BLOOMBERG MARS // RISK ANALYTICS SUITE • PYTHON FASTAPI + REACT PLOTLY • 10K MONTE CARLO SIMULATIONS
        </div>
        <div className="flex items-center gap-3">
          <span>PORTFOLIO VALUATION: {portfolioCurrency} ({currencySymbol}) NORMALIZED</span>
          <span className="text-[#475569]">|</span>
          <span className="text-emerald-400">STATISTICAL INTEGRITY VERIFIED</span>
        </div>
      </footer>
    </div>
  );
};
