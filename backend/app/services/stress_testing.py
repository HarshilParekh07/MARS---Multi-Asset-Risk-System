"""Stress testing and scenario analysis for historical crises and hypothetical macro/factor shocks."""
import logging
from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd

from app.models.schemas import StressScenarioItem, StressTestResponse

logger = logging.getLogger(__name__)

# Predefined historical crisis scenario shock calibrations
HISTORICAL_SCENARIOS = [
    {
        "name": "COVID-19 Market Crash (2020)",
        "category": "Historical Crisis",
        "description": "Rapid global market selloff triggered by the onset of the pandemic (Feb - Mar 2020). Equities experienced acute volatility and liquidity compression.",
        "historical_period": "Feb 19, 2020 - Mar 23, 2020",
        "benchmark_drop": -33.9,
        "vol_multiplier": 2.8,
        "default_asset_shock": -28.5
    },
    {
        "name": "Global Financial Crisis (2008)",
        "category": "Historical Crisis",
        "description": "Systemic banking collapse following Lehman Brothers bankruptcy. Severe credit contraction and prolonged equity drawdown.",
        "historical_period": "Sep 2008 - Mar 2009",
        "benchmark_drop": -48.0,
        "vol_multiplier": 3.2,
        "default_asset_shock": -42.0
    },
    {
        "name": "Tech & Inflation Selloff (2022)",
        "category": "Macro & Monetary",
        "description": "Aggressive central bank rate hikes to combat 40-year high inflation, leading to multiple contraction especially in tech and high-growth equities.",
        "historical_period": "Jan 2022 - Oct 2022",
        "benchmark_drop": -25.4,
        "vol_multiplier": 1.7,
        "default_asset_shock": -29.0
    },
    {
        "name": "Black Monday Crash (1987)",
        "category": "Extreme Tail Shock",
        "description": "Largest single-day percentage decline in financial market history driven by portfolio insurance cascading triggers.",
        "historical_period": "Oct 19, 1987",
        "benchmark_drop": -20.5,
        "vol_multiplier": 3.5,
        "default_asset_shock": -20.5
    },
    {
        "name": "US Sovereign Rating Downgrade (2011)",
        "category": "Credit & Sovereign",
        "description": "S&P downgrade of US debt rating from AAA to AA+ alongside worsening European sovereign debt crisis.",
        "historical_period": "Aug 2011 - Oct 2011",
        "benchmark_drop": -16.8,
        "vol_multiplier": 2.1,
        "default_asset_shock": -15.5
    },
    {
        "name": "Interest Rate Spike (+200 bps)",
        "category": "Hypothetical Scenario",
        "description": "Sudden upward shift in sovereign yield curve (+200 basis points) compressing equity valuation multiples and increasing borrowing costs.",
        "historical_period": "Hypothetical",
        "benchmark_drop": -12.0,
        "vol_multiplier": 1.5,
        "default_asset_shock": -11.0
    },
    {
        "name": "Severe Stagflation Shock",
        "category": "Hypothetical Scenario",
        "description": "Persistent supply-side commodity shock accompanied by negative real GDP growth and sticky inflation.",
        "historical_period": "Hypothetical",
        "benchmark_drop": -18.5,
        "vol_multiplier": 2.0,
        "default_asset_shock": -17.5
    }
]

class StressTestingEngine:
    def run_stress_tests(
        self,
        returns_df: pd.DataFrame,
        weights: np.ndarray,
        portfolio_value: float,
        custom_shock_pct: Optional[float] = None,
        custom_asset_shocks: Optional[Dict[str, float]] = None
    ) -> StressTestResponse:
        """
        Evaluate portfolio resilience under predefined historical crises and custom factor shocks.
        Uses beta-adjusted sensitivity to asset shock or historical drawdown simulation.
        """
        tickers = list(returns_df.columns)
        w = np.array(weights, dtype=float)
        scenarios_output: List[StressScenarioItem] = []

        # Calculate asset betas relative to portfolio return as sensitivity factor
        port_returns = returns_df.dot(w)
        port_var = np.var(port_returns, ddof=1)
        betas = {}
        for t in tickers:
            cov = np.cov(returns_df[t].values, port_returns.values)[0, 1]
            beta = cov / port_var if port_var > 0 else 1.0
            betas[t] = max(0.2, min(2.5, beta)) # Bound reasonable beta range

        # Baseline 99% 1-day VaR
        baseline_var_pct = float(np.percentile(port_returns.values, 1.0)) * -100.0
        baseline_var_pct = max(1.0, baseline_var_pct)

        for sc in HISTORICAL_SCENARIOS:
            bm_drop = sc["benchmark_drop"]
            vol_mult = sc["vol_multiplier"]

            # Asset level shock scaled by beta
            asset_impacts = {}
            for t in tickers:
                # Assets with higher beta experience larger drawdown in market crisis
                asset_shock = bm_drop * betas[t]
                asset_impacts[t] = round(float(asset_shock), 2)

            # Portfolio loss = sum(w_i * asset_shock_i)
            port_loss_pct = sum(w[i] * asset_impacts[tickers[i]] for i in range(len(tickers)))
            port_loss_amount = (abs(port_loss_pct) / 100.0) * portfolio_value
            stressed_port_val = portfolio_value * (1.0 + (port_loss_pct / 100.0))

            # VaR expands during stress conditions due to heightened volatility
            stressed_var_pct = baseline_var_pct * vol_mult
            stressed_var_amt = (stressed_var_pct / 100.0) * max(0.0, stressed_port_val)

            scenarios_output.append(StressScenarioItem(
                name=sc["name"],
                category=sc["category"],
                description=sc["description"],
                historical_period=sc["historical_period"],
                portfolio_loss_pct=round(float(port_loss_pct), 2),
                portfolio_loss_amount=round(float(port_loss_amount), 2),
                stressed_var_pct=round(float(stressed_var_pct), 2),
                stressed_var_amount=round(float(stressed_var_amt), 2),
                stressed_portfolio_value=round(float(stressed_port_val), 2),
                asset_impacts=asset_impacts
            ))

        # Custom shock calculation if requested
        custom_item = None
        shock_val = custom_shock_pct if custom_shock_pct is not None else -10.0
        custom_impacts = {}

        for i, t in enumerate(tickers):
            if custom_asset_shocks and t in custom_asset_shocks:
                custom_impacts[t] = round(float(custom_asset_shocks[t]), 2)
            else:
                custom_impacts[t] = round(float(shock_val * betas[t]), 2)

        c_port_loss_pct = sum(w[i] * custom_impacts[tickers[i]] for i in range(len(tickers)))
        c_port_loss_amt = (abs(c_port_loss_pct) / 100.0) * portfolio_value
        c_stressed_val = portfolio_value * (1.0 + (c_port_loss_pct / 100.0))
        c_stressed_var_pct = baseline_var_pct * 1.8
        c_stressed_var_amt = (c_stressed_var_pct / 100.0) * max(0.0, c_stressed_val)

        custom_item = StressScenarioItem(
            name=f"Custom Shock ({shock_val:+.1f}%)",
            category="Custom Simulation",
            description=f"User-specified parameter shock of {shock_val:+.1f}% applied across portfolio assets.",
            historical_period=None,
            portfolio_loss_pct=round(float(c_port_loss_pct), 2),
            portfolio_loss_amount=round(float(c_port_loss_amt), 2),
            stressed_var_pct=round(float(c_stressed_var_pct), 2),
            stressed_var_amount=round(float(c_stressed_var_amt), 2),
            stressed_portfolio_value=round(float(c_stressed_val), 2),
            asset_impacts=custom_impacts
        )

        return StressTestResponse(
            scenarios=scenarios_output,
            custom_factor_shock=custom_item
        )

stress_testing_engine = StressTestingEngine()
