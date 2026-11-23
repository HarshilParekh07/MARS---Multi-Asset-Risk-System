"""FastAPI REST routes for Market Data, Risk Engine, Backtesting, Stress Testing, and CSV Export."""
import logging
from typing import Dict, Any, List
import pandas as pd
import numpy as np
from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import PlainTextResponse

from app.models.schemas import (
    PortfolioRequest,
    StressShockRequest,
    FullDashboardResponse,
    DataSummary,
    DistributionStats,
    VaRComparisonResponse,
    PortfolioRiskResponse,
    BacktestResponse,
    RollingRiskResponse,
    StressTestResponse,
    PriceSeriesPoint
)
from app.services.data_loader import data_loader
from app.services.risk_engine import risk_engine
from app.services.backtesting import backtesting_engine
from app.services.rolling_risk import rolling_risk_service
from app.services.stress_testing import stress_testing_engine
from app.services.export_service import export_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "engine": "Bloomberg MARS Risk Analytics Engine",
        "version": "1.0.0"
    }

def _process_portfolio(request: PortfolioRequest):
    """Helper to fetch and clean data, compute returns and weights."""
    try:
        df_prices, meta = data_loader.fetch_historical_prices(
            tickers=request.tickers,
            lookback=request.lookback
        )
        df_returns = data_loader.compute_returns(df_prices)
        port_returns, weights = data_loader.compute_portfolio_returns(
            returns=df_returns,
            weights=request.weights
        )
        return df_prices, df_returns, port_returns, weights, meta
    except Exception as e:
        logger.error(f"Error in portfolio data preparation: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/dashboard", response_model=FullDashboardResponse)
def get_full_dashboard(request: PortfolioRequest):
    """
    Primary endpoint delivering complete institutional risk dataset for the Bloomberg MARS UI.
    """
    df_prices, df_returns, port_returns, weights, meta = _process_portfolio(request)

    # 1. Data summary
    data_summary = DataSummary(
        tickers=meta["tickers"],
        start_date=meta["start_date"],
        end_date=meta["end_date"],
        total_observations=meta["total_observations"],
        data_source=meta["data_source"],
        fetch_timestamp=meta["fetch_timestamp"],
        latest_prices=meta["latest_prices"],
        currencies=meta["currencies"],
        portfolio_currency=meta.get("portfolio_currency", "USD"),
        currency_symbol=meta.get("currency_symbol", "$"),
        disclaimer=meta["disclaimer"]
    )

    # 2. Distribution statistics
    dist_stats = risk_engine.compute_distribution_stats(port_returns)

    # 3. VaR Comparison (all 4 methods, plus cross-matrices)
    var_comparison = risk_engine.compute_all_var_models(
        returns_df=df_returns,
        weights=weights,
        portfolio_value=request.portfolio_value,
        confidence_level=request.confidence_level,
        holding_period_days=request.holding_period_days
    )

    # 4. Portfolio Risk Decomposition (Euler's theorem, Marginal & Component VaR)
    port_risk = risk_engine.compute_portfolio_risk_breakdown(
        returns_df=df_returns,
        weights=weights,
        portfolio_value=request.portfolio_value,
        confidence_level=request.confidence_level
    )

    # 5. Backtesting (both 99% and 95%)
    bt_99 = backtesting_engine.run_backtest(
        returns=port_returns,
        portfolio_value=request.portfolio_value,
        confidence_level=0.99
    )
    bt_95 = backtesting_engine.run_backtest(
        returns=port_returns,
        portfolio_value=request.portfolio_value,
        confidence_level=0.95
    )

    # 6. Rolling Risk (rolling vol, VaR, ES)
    rolling_risk = rolling_risk_service.compute_rolling_risk(port_returns, window=60)

    # 7. Stress Testing (Historical + Default Custom Shock)
    stress_results = stress_testing_engine.run_stress_tests(
        returns_df=df_returns,
        weights=weights,
        portfolio_value=request.portfolio_value,
        custom_shock_pct=-10.0
    )

    # 8. Cumulative return & drawdown series for chart
    cum_returns = (1.0 + port_returns).cumprod() - 1.0
    running_max = (1.0 + cum_returns).cummax()
    drawdown_series = ((1.0 + cum_returns) - running_max) / running_max

    price_series_points = []
    for dt, cret in cum_returns.items():
        dt_str = dt.strftime("%Y-%m-%d")
        dd = float(drawdown_series[dt]) * 100.0
        price_series_points.append(PriceSeriesPoint(
            date=dt_str,
            portfolio_cumulative_return=round(float(cret) * 100.0, 3),
            portfolio_drawdown=round(dd, 3)
        ))

    # 9. Distribution Histogram & QQ data
    dist_plot_data = risk_engine.prepare_distribution_histogram(port_returns, n_bins=50)

    # Raw dates & returns for table
    raw_dates = [dt.strftime("%Y-%m-%d") for dt in df_returns.index]
    asset_rets = {col: [round(float(x), 5) for x in df_returns[col].values] for col in df_returns.columns}
    port_rets_list = [round(float(x), 5) for x in port_returns.values]

    return FullDashboardResponse(
        data_summary=data_summary,
        distribution_stats=dist_stats,
        var_comparison=var_comparison,
        portfolio_risk=port_risk,
        backtesting_99=bt_99,
        backtesting_95=bt_95,
        rolling_risk=rolling_risk,
        stress_testing=stress_results,
        price_series=price_series_points,
        distribution_plot=dist_plot_data,
        raw_dates=raw_dates,
        asset_daily_returns=asset_rets,
        portfolio_daily_returns=port_rets_list
    )

@router.post("/stress-test/custom", response_model=StressTestResponse)
def run_custom_stress_test(req: StressShockRequest):
    """Run stress test with user-defined custom shock percentage or asset-specific shocks."""
    _, df_returns, _, weights, _ = _process_portfolio(req.portfolio_request)
    return stress_testing_engine.run_stress_tests(
        returns_df=df_returns,
        weights=weights,
        portfolio_value=req.portfolio_request.portfolio_value,
        custom_shock_pct=req.factor_shock_pct,
        custom_asset_shocks=req.custom_asset_shocks
    )

@router.post("/export/summary")
def export_summary_csv(request: PortfolioRequest):
    """Download comprehensive CSV report of portfolio risk analysis."""
    dashboard = get_full_dashboard(request)
    csv_str = export_service.generate_risk_summary_csv(dashboard.model_dump())
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=Bloomberg_MARS_Risk_Report.csv"}
    )

@router.post("/export/returns")
def export_returns_csv(request: PortfolioRequest):
    """Download daily returns CSV."""
    df_prices, df_returns, port_returns, _, _ = _process_portfolio(request)
    dates = [dt.strftime("%Y-%m-%d") for dt in df_returns.index]
    asset_rets = {c: df_returns[c].tolist() for c in df_returns.columns}
    csv_str = export_service.generate_returns_csv(dates, port_returns.tolist(), asset_rets)
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=Daily_Returns.csv"}
    )

@router.post("/export/breaches")
def export_breaches_csv(request: PortfolioRequest):
    """Download backtest violations CSV."""
    _, _, port_returns, _, _ = _process_portfolio(request)
    bt = backtesting_engine.run_backtest(
        returns=port_returns,
        portfolio_value=request.portfolio_value,
        confidence_level=request.confidence_level
    )
    violations_dict = [v.model_dump() for v in bt.violations]
    csv_str = export_service.generate_breaches_csv(violations_dict)
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=VaR_Breaches.csv"}
    )
