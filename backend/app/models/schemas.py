"""Pydantic schemas for request validation and API responses."""
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field, field_validator

class PortfolioRequest(BaseModel):
    tickers: List[str] = Field(default=["AAPL", "MSFT", "NVDA", "RELIANCE.NS"], min_length=1)
    weights: Optional[List[float]] = Field(default=None)
    portfolio_value: float = Field(default=1_000_000.0, gt=0)
    lookback: str = Field(default="2y")
    confidence_level: float = Field(default=0.99, gt=0.5, lt=1.0)
    holding_period_days: int = Field(default=1, ge=1, le=30)
    benchmark: Optional[str] = Field(default="^GSPC")

    @field_validator("tickers")
    @classmethod
    def clean_tickers(cls, v: List[str]) -> List[str]:
        cleaned = [t.strip().upper() for t in v if t.strip()]
        if not cleaned:
            raise ValueError("At least one valid ticker symbol must be provided.")
        return cleaned

    @field_validator("weights")
    @classmethod
    def validate_weights(cls, v: Optional[List[float]]) -> Optional[List[float]]:
        if v is not None and len(v) > 0:
            if any(w < 0 for w in v):
                raise ValueError("Weights cannot be negative in long-only configuration.")
            s = sum(v)
            if s <= 0:
                raise ValueError("Sum of weights must be greater than zero.")
        return v

class StressShockRequest(BaseModel):
    portfolio_request: PortfolioRequest
    factor_shock_pct: float = Field(default=-10.0, ge=-90.0, le=100.0)
    custom_asset_shocks: Optional[Dict[str, float]] = None

class DataSummary(BaseModel):
    tickers: List[str]
    start_date: str
    end_date: str
    total_observations: int
    data_source: str = "Yahoo Finance (via yfinance)"
    fetch_timestamp: str
    latest_prices: Dict[str, float]
    currencies: Dict[str, str]
    portfolio_currency: str = "USD"
    currency_symbol: str = "$"
    disclaimer: str

class DistributionStats(BaseModel):
    mean_daily_return: float
    std_daily_return: float
    annualized_return: float
    annualized_volatility: float
    skewness: float
    kurtosis: float
    excess_kurtosis: float
    jarque_bera_stat: float
    jarque_bera_pvalue: float
    is_normal: bool
    min_daily_return: float
    max_daily_return: float
    max_drawdown_pct: float
    current_drawdown_pct: float

class VaRMetricItem(BaseModel):
    method: str
    confidence_level: float
    holding_period_days: int
    var_pct: float
    var_amount: float
    es_pct: float
    es_amount: float
    description: str

class VaRComparisonResponse(BaseModel):
    portfolio_value: float
    confidence_level: float
    holding_period_days: int
    models: List[VaRMetricItem]
    matrix_by_confidence: Dict[str, Dict[str, float]] # e.g. {"95%": {"Historical": ..., "Parametric": ...}}
    matrix_by_horizon: Dict[str, Dict[str, float]]    # e.g. {"1-day": {"Historical": ...}, "5-day": ...}

class BreachItem(BaseModel):
    date: str
    return_pct: float
    var_threshold_pct: float
    loss_amount: float
    breach_amount: float

class BacktestResponse(BaseModel):
    confidence_level: float
    total_observations: int
    violation_count: int
    violation_ratio: float
    expected_violations: float
    expected_ratio: float
    kupiec_lr_stat: float
    kupiec_pvalue: float
    kupiec_result: str # "ACCEPT (Green)", "REJECT (Red)"
    christoffersen_ind_stat: float
    christoffersen_ind_pvalue: float
    christoffersen_ind_result: str
    christoffersen_cc_stat: float
    christoffersen_cc_pvalue: float
    christoffersen_cc_result: str
    basel_traffic_light: str # "GREEN", "YELLOW", "RED"
    violations: List[BreachItem]

class RollingRiskResponse(BaseModel):
    dates: List[str]
    returns: List[float]
    rolling_vol_annualized: List[Optional[float]]
    rolling_var_95: List[Optional[float]]
    rolling_var_99: List[Optional[float]]
    rolling_es_95: List[Optional[float]]
    rolling_es_99: List[Optional[float]]
    breaches_95: List[str]
    breaches_99: List[str]

class PortfolioRiskResponse(BaseModel):
    tickers: List[str]
    weights: List[float]
    portfolio_value: float
    portfolio_volatility_daily: float
    portfolio_volatility_annualized: float
    diversification_benefit_pct: float
    asset_volatilities_annualized: Dict[str, float]
    marginal_var_pct: Dict[str, float]
    component_var_amount: Dict[str, float]
    percentage_risk_contributions: Dict[str, float]
    correlation_matrix: Dict[str, Dict[str, float]]

class StressScenarioItem(BaseModel):
    name: str
    category: str
    description: str
    historical_period: Optional[str]
    portfolio_loss_pct: float
    portfolio_loss_amount: float
    stressed_var_pct: float
    stressed_var_amount: float
    stressed_portfolio_value: float
    asset_impacts: Dict[str, float]

class StressTestResponse(BaseModel):
    scenarios: List[StressScenarioItem]
    custom_factor_shock: Optional[StressScenarioItem]

class PriceSeriesPoint(BaseModel):
    date: str
    portfolio_cumulative_return: float
    portfolio_drawdown: float
    benchmark_cumulative_return: Optional[float] = None

class DistributionHistogramData(BaseModel):
    bin_centers: List[float]
    counts: List[int]
    density: List[float]
    normal_curve_x: List[float]
    normal_curve_y: List[float]
    qq_theoretical: List[float]
    qq_sample: List[float]

class FullDashboardResponse(BaseModel):
    data_summary: DataSummary
    distribution_stats: DistributionStats
    var_comparison: VaRComparisonResponse
    portfolio_risk: PortfolioRiskResponse
    backtesting_99: BacktestResponse
    backtesting_95: BacktestResponse
    rolling_risk: RollingRiskResponse
    stress_testing: StressTestResponse
    price_series: List[PriceSeriesPoint]
    distribution_plot: DistributionHistogramData
    raw_dates: List[str]
    asset_daily_returns: Dict[str, List[float]]
    portfolio_daily_returns: List[float]
