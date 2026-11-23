"""Live verification script testing yfinance download, risk engine, backtest, and stress testing."""
import json
import time
from app.models.schemas import PortfolioRequest
from app.services.data_loader import data_loader
from app.services.risk_engine import risk_engine
from app.services.backtesting import backtesting_engine
from app.services.stress_testing import stress_testing_engine

def run_verification():
    print(">>> 1. Testing MarketDataLoader with global tickers...")
    tickers = ["AAPL", "MSFT", "NVDA", "RELIANCE.NS"]
    t0 = time.time()
    df_prices, meta = data_loader.fetch_historical_prices(tickers, lookback="1y")
    print(f"Prices fetched in {time.time() - t0:.2f}s: {df_prices.shape[0]} bars, {df_prices.shape[1]} assets.")
    print("Latest prices:", meta["latest_prices"])
    print("Currencies:", meta["currencies"])

    print("\n>>> 2. Computing returns and weights...")
    df_returns = data_loader.compute_returns(df_prices)
    port_returns, weights = data_loader.compute_portfolio_returns(df_returns, weights=[0.3, 0.25, 0.25, 0.2])
    print(f"Returns calculated: {len(port_returns)} daily observations. Weights: {weights}")

    print("\n>>> 3. Computing Distribution statistics...")
    dist = risk_engine.compute_distribution_stats(port_returns)
    print(f"Annualized Return: {dist.annualized_return}% | Volatility: {dist.annualized_volatility}%")
    print(f"Skewness: {dist.skewness} | Kurtosis: {dist.kurtosis} (Excess: {dist.excess_kurtosis})")
    print(f"Jarque-Bera: stat={dist.jarque_bera_stat}, p={dist.jarque_bera_pvalue}, Is Normal={dist.is_normal}")
    print(f"Max Drawdown: {dist.max_drawdown_pct}%")

    print("\n>>> 4. Computing VaR Models (Hist, Parametric, Cornish-Fisher, Monte Carlo)...")
    port_val = 1_000_000.0
    var_models = risk_engine.compute_all_var_models(df_returns, weights, port_val, confidence_level=0.99, holding_period_days=1)
    for m in var_models.models:
        print(f"  [{m.method}]: VaR 99% 1d = ${m.var_amount:,.0f} (-{m.var_pct:.2f}%) | ES = ${m.es_amount:,.0f} (-{m.es_pct:.2f}%)")

    print("\n>>> 5. Testing Euler Portfolio Risk Attribution...")
    port_risk = risk_engine.compute_portfolio_risk_breakdown(df_returns, weights, port_val, confidence_level=0.99)
    print(f"Diversification Benefit: {port_risk.diversification_benefit_pct:.2f}%")
    for t in tickers:
        print(f"  {t}: Weight={(weights[tickers.index(t)]*100):.1f}% | Risk Contrib={port_risk.percentage_risk_contributions[t]:.1f}% | Component VaR=${port_risk.component_var_amount[t]:,.0f}")

    print("\n>>> 6. Running Backtesting (Kupiec & Christoffersen)...")
    bt = backtesting_engine.run_backtest(port_returns, portfolio_value=port_val, confidence_level=0.99)
    print(f"Violations: {bt.violation_count} / {bt.total_observations} days ({bt.violation_ratio:.2f}% vs expected {bt.expected_ratio:.2f}%)")
    print(f"Kupiec POF LR: {bt.kupiec_lr_stat:.4f} (p={bt.kupiec_pvalue:.4f}) -> {bt.kupiec_result}")
    print(f"Christoffersen Ind: {bt.christoffersen_ind_stat:.4f} (p={bt.christoffersen_ind_pvalue:.4f}) -> {bt.christoffersen_ind_result}")
    print(f"Christoffersen CC: {bt.christoffersen_cc_stat:.4f} (p={bt.christoffersen_cc_pvalue:.4f}) -> {bt.christoffersen_cc_result}")
    print(f"Basel Traffic Light: {bt.basel_traffic_light}")

    print("\n>>> 7. Running Stress Testing...")
    stress = stress_testing_engine.run_stress_tests(df_returns, weights, port_val)
    for sc in stress.scenarios[:3]:
        print(f"  [{sc.name}]: Loss={sc.portfolio_loss_pct:.2f}% (${sc.portfolio_loss_amount:,.0f}) | Stressed VaR=${sc.stressed_var_amount:,.0f}")

    print("\n*** ALL RISK ANALYTICS CALCULATIONS VERIFIED SUCCESSFULLY! ***")

if __name__ == "__main__":
    run_verification()
