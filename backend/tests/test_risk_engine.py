"""Unit tests for the Risk Engine: Historical, Parametric, Cornish-Fisher, Monte Carlo VaR and Portfolio Risk."""
import numpy as np
import pandas as pd
import pytest
from scipy import stats

from app.services.risk_engine import RiskEngine

@pytest.fixture
def sample_returns():
    np.random.seed(42)
    # 500 days of daily returns for 3 assets
    cov = np.array([
        [0.0004, 0.00015, 0.0001],
        [0.00015, 0.0003, 0.00008],
        [0.0001, 0.00008, 0.0005]
    ])
    mean = np.array([0.0005, 0.0003, 0.0006])
    rets = np.random.multivariate_normal(mean, cov, size=500)
    df = pd.DataFrame(rets, columns=["AAPL", "MSFT", "NVDA"], index=pd.date_range("2023-01-01", periods=500))
    return df

def test_distribution_stats(sample_returns):
    engine = RiskEngine()
    port_rets = sample_returns.mean(axis=1)
    stats_out = engine.compute_distribution_stats(port_rets)

    assert stats_out.annualized_volatility > 0
    assert -5.0 < stats_out.skewness < 5.0
    assert stats_out.kurtosis > 0
    assert stats_out.jarque_bera_stat >= 0
    assert 0.0 <= stats_out.jarque_bera_pvalue <= 1.0

def test_var_historical(sample_returns):
    engine = RiskEngine()
    port_rets = sample_returns["AAPL"]
    var_95, es_95 = engine.calculate_var_historical(port_rets, confidence_level=0.95, holding_period_days=1)
    var_99, es_99 = engine.calculate_var_historical(port_rets, confidence_level=0.99, holding_period_days=1)

    assert var_95 > 0
    assert var_99 > var_95, "99% VaR must be greater than 95% VaR"
    assert es_95 >= var_95, "Expected Shortfall must be >= VaR"
    assert es_99 >= var_99, "Expected Shortfall must be >= VaR"

    # Test holding period scaling sqrt(10)
    var_10d, es_10d = engine.calculate_var_historical(port_rets, confidence_level=0.99, holding_period_days=10)
    assert np.isclose(var_10d, var_99 * np.sqrt(10), rtol=1e-3)

def test_var_parametric(sample_returns):
    engine = RiskEngine()
    port_rets = sample_returns["MSFT"]
    var_95, es_95 = engine.calculate_var_parametric(port_rets, confidence_level=0.95, holding_period_days=1)
    var_99, es_99 = engine.calculate_var_parametric(port_rets, confidence_level=0.99, holding_period_days=1)

    assert var_99 > var_95
    assert es_99 > var_99

def test_var_cornish_fisher(sample_returns):
    engine = RiskEngine()
    port_rets = sample_returns["NVDA"]
    var_cf, es_cf = engine.calculate_var_cornish_fisher(port_rets, confidence_level=0.99, holding_period_days=1)

    assert var_cf > 0
    assert es_cf >= var_cf

def test_var_monte_carlo(sample_returns):
    engine = RiskEngine(n_simulations=5000, random_seed=42)
    weights = np.array([0.4, 0.3, 0.3])
    var_mc, es_mc = engine.calculate_var_monte_carlo(sample_returns, weights, confidence_level=0.99, holding_period_days=1)

    assert var_mc > 0
    assert es_mc >= var_mc

def test_portfolio_risk_euler_theorem(sample_returns):
    """
    Euler's theorem check: Sum of Component VaR must equal Portfolio VaR.
    """
    engine = RiskEngine()
    weights = np.array([0.5, 0.3, 0.2])
    port_val = 1_000_000.0
    res = engine.compute_portfolio_risk_breakdown(sample_returns, weights, port_val, confidence_level=0.99)

    # Sum of percentage contributions must equal 100%
    sum_contrib = sum(res.percentage_risk_contributions.values())
    assert np.isclose(sum_contrib, 100.0, atol=0.1)

    # Sum of component VaR amounts must equal portfolio dollar VaR
    cov = sample_returns.cov().values
    port_std = np.sqrt(weights.dot(cov).dot(weights))
    z = stats.norm.ppf(0.99)
    theoretical_port_var_dollar = z * port_std * port_val
    sum_component_var = sum(res.component_var_amount.values())
    assert np.isclose(sum_component_var, theoretical_port_var_dollar, rtol=1e-3)
