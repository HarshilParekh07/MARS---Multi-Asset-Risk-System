"""Unit tests for VaR Backtesting: Kupiec POF and Christoffersen Tests."""
import numpy as np
import pandas as pd
import pytest

from app.services.backtesting import BacktestingEngine

def test_kupiec_pof_zero_violations():
    engine = BacktestingEngine()
    # 250 days of small positive returns -> 0 violations
    dates = pd.date_range("2023-01-01", periods=250)
    rets = pd.Series([0.001] * 250, index=dates)

    res = engine.run_backtest(rets, confidence_level=0.99)
    assert res.violation_count == 0
    assert res.violation_ratio == 0.0
    assert res.kupiec_lr_stat >= 0

def test_kupiec_and_christoffersen_with_controlled_violations():
    engine = BacktestingEngine()
    np.random.seed(123)
    # Generate 500 normal returns
    dates = pd.date_range("2023-01-01", periods=500)
    rets = pd.Series(np.random.normal(0.0005, 0.015, size=500), index=dates)

    res_99 = engine.run_backtest(rets, confidence_level=0.99)
    res_95 = engine.run_backtest(rets, confidence_level=0.95)

    assert res_95.violation_count >= res_99.violation_count
    assert res_99.total_observations > 0
    assert 0.0 <= res_99.kupiec_pvalue <= 1.0
    assert 0.0 <= res_99.christoffersen_ind_pvalue <= 1.0
    assert 0.0 <= res_99.christoffersen_cc_pvalue <= 1.0
    assert res_99.basel_traffic_light in ["GREEN (Valid)", "YELLOW (Supervisory Review)", "RED (Rejected)"]
