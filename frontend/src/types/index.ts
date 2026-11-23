export interface PortfolioRequest {
  tickers: string[];
  weights?: number[];
  portfolio_value: number;
  lookback: string;
  confidence_level: number;
  holding_period_days: number;
  benchmark?: string;
}

export interface DataSummary {
  tickers: string[];
  start_date: string;
  end_date: string;
  total_observations: number;
  data_source: string;
  fetch_timestamp: string;
  latest_prices: Record<string, number>;
  currencies: Record<string, string>;
  disclaimer: string;
}

export interface DistributionStats {
  mean_daily_return: number;
  std_daily_return: number;
  annualized_return: number;
  annualized_volatility: number;
  skewness: number;
  kurtosis: number;
  excess_kurtosis: number;
  jarque_bera_stat: number;
  jarque_bera_pvalue: number;
  is_normal: boolean;
  min_daily_return: number;
  max_daily_return: number;
  max_drawdown_pct: number;
  current_drawdown_pct: number;
}

export interface VaRMetricItem {
  method: string;
  confidence_level: number;
  holding_period_days: number;
  var_pct: number;
  var_amount: number;
  es_pct: number;
  es_amount: number;
  description: string;
}

export interface VaRComparisonResponse {
  portfolio_value: number;
  confidence_level: number;
  holding_period_days: number;
  models: VaRMetricItem[];
  matrix_by_confidence: Record<string, Record<string, number>>;
  matrix_by_horizon: Record<string, Record<string, number>>;
}

export interface BreachItem {
  date: string;
  return_pct: number;
  var_threshold_pct: number;
  loss_amount: number;
  breach_amount: number;
}

export interface BacktestResponse {
  confidence_level: number;
  total_observations: number;
  violation_count: number;
  violation_ratio: number;
  expected_violations: number;
  expected_ratio: number;
  kupiec_lr_stat: number;
  kupiec_pvalue: number;
  kupiec_result: string;
  christoffersen_ind_stat: number;
  christoffersen_ind_pvalue: number;
  christoffersen_ind_result: string;
  christoffersen_cc_stat: number;
  christoffersen_cc_pvalue: number;
  christoffersen_cc_result: string;
  basel_traffic_light: string;
  violations: BreachItem[];
}

export interface RollingRiskResponse {
  dates: string[];
  returns: number[];
  rolling_vol_annualized: (number | null)[];
  rolling_var_95: (number | null)[];
  rolling_var_99: (number | null)[];
  rolling_es_95: (number | null)[];
  rolling_es_99: (number | null)[];
  breaches_95: string[];
  breaches_99: string[];
}

export interface PortfolioRiskResponse {
  tickers: string[];
  weights: number[];
  portfolio_value: number;
  portfolio_volatility_daily: number;
  portfolio_volatility_annualized: number;
  diversification_benefit_pct: number;
  asset_volatilities_annualized: Record<string, number>;
  marginal_var_pct: Record<string, number>;
  component_var_amount: Record<string, number>;
  percentage_risk_contributions: Record<string, number>;
  correlation_matrix: Record<string, Record<string, number>>;
}

export interface StressScenarioItem {
  name: string;
  category: string;
  description: string;
  historical_period: string | null;
  portfolio_loss_pct: number;
  portfolio_loss_amount: number;
  stressed_var_pct: number;
  stressed_var_amount: number;
  stressed_portfolio_value: number;
  asset_impacts: Record<string, number>;
}

export interface StressTestResponse {
  scenarios: StressScenarioItem[];
  custom_factor_shock?: StressScenarioItem;
}

export interface PriceSeriesPoint {
  date: string;
  portfolio_cumulative_return: number;
  portfolio_drawdown: number;
  benchmark_cumulative_return?: number;
}

export interface DistributionHistogramData {
  bin_centers: number[];
  counts: number[];
  density: number[];
  normal_curve_x: number[];
  normal_curve_y: number[];
  qq_theoretical: number[];
  qq_sample: number[];
}

export interface FullDashboardResponse {
  data_summary: DataSummary;
  distribution_stats: DistributionStats;
  var_comparison: VaRComparisonResponse;
  portfolio_risk: PortfolioRiskResponse;
  backtesting_99: BacktestResponse;
  backtesting_95: BacktestResponse;
  rolling_risk: RollingRiskResponse;
  stress_testing: StressTestResponse;
  price_series: PriceSeriesPoint[];
  distribution_plot: DistributionHistogramData;
  raw_dates: string[];
  asset_daily_returns: Record<string, number[]>;
  portfolio_daily_returns: number[];
}
