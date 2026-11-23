"""Export service generating institutional CSV reports."""
import io
import csv
from typing import Dict, Any, List
import pandas as pd

class ExportService:
    @staticmethod
    def generate_risk_summary_csv(dashboard_data: Dict[str, Any]) -> str:
        """
        Produce a formatted institutional risk report CSV.
        """
        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow(["=== BLOOMBERG MARS - RISK ANALYTICS SUMMARY REPORT ==="])
        writer.writerow([])

        # Data summary
        ds = dashboard_data.get("data_summary", {})
        writer.writerow(["[PORTFOLIO CONFIGURATION & DATA SOURCE]"])
        writer.writerow(["Tickers", ", ".join(ds.get("tickers", []))])
        writer.writerow(["Data Source", ds.get("data_source", "Yahoo Finance")])
        writer.writerow(["Start Date", ds.get("start_date", "")])
        writer.writerow(["End Date", ds.get("end_date", "")])
        writer.writerow(["Observations", ds.get("total_observations", "")])
        writer.writerow(["Report Timestamp", ds.get("fetch_timestamp", "")])
        writer.writerow([])

        # Distribution stats
        dist = dashboard_data.get("distribution_stats", {})
        writer.writerow(["[PORTFOLIO DISTRIBUTION DIAGNOSTICS]"])
        writer.writerow(["Annualized Return (%)", dist.get("annualized_return", "")])
        writer.writerow(["Annualized Volatility (%)", dist.get("annualized_volatility", "")])
        writer.writerow(["Daily Mean Return (%)", dist.get("mean_daily_return", "")])
        writer.writerow(["Daily Volatility (%)", dist.get("std_daily_return", "")])
        writer.writerow(["Skewness", dist.get("skewness", "")])
        writer.writerow(["Kurtosis", dist.get("kurtosis", "")])
        writer.writerow(["Excess Kurtosis", dist.get("excess_kurtosis", "")])
        writer.writerow(["Jarque-Bera Stat", dist.get("jarque_bera_stat", "")])
        writer.writerow(["Jarque-Bera p-value", dist.get("jarque_bera_pvalue", "")])
        writer.writerow(["Normally Distributed (p>0.05)", "YES" if dist.get("is_normal") else "NO"])
        writer.writerow(["Max Drawdown (%)", dist.get("max_drawdown_pct", "")])
        writer.writerow(["Current Drawdown (%)", dist.get("current_drawdown_pct", "")])
        writer.writerow([])

        # VaR Models
        var_comp = dashboard_data.get("var_comparison", {})
        writer.writerow(["[VALUE AT RISK & EXPECTED SHORTFALL MODELS]"])
        writer.writerow(["Method", "Confidence", "Horizon (Days)", "VaR (%)", "VaR ($)", "ES (%)", "ES ($)"])
        for m in var_comp.get("models", []):
            writer.writerow([
                m.get("method"),
                f"{m.get('confidence_level')*100}%",
                m.get("holding_period_days"),
                m.get("var_pct"),
                m.get("var_amount"),
                m.get("es_pct"),
                m.get("es_amount")
            ])
        writer.writerow([])

        # Backtesting
        bt = dashboard_data.get("backtesting_99", {})
        writer.writerow(["[BACKTESTING DIAGNOSTICS (99% CONFIDENCE)]"])
        writer.writerow(["Observations", bt.get("total_observations", "")])
        writer.writerow(["Violations Count", bt.get("violation_count", "")])
        writer.writerow(["Violation Ratio (%)", bt.get("violation_ratio", "")])
        writer.writerow(["Expected Violations", bt.get("expected_violations", "")])
        writer.writerow(["Kupiec POF LR Stat", bt.get("kupiec_lr_stat", "")])
        writer.writerow(["Kupiec p-value", bt.get("kupiec_pvalue", "")])
        writer.writerow(["Kupiec Decision", bt.get("kupiec_result", "")])
        writer.writerow(["Christoffersen Ind Stat", bt.get("christoffersen_ind_stat", "")])
        writer.writerow(["Christoffersen Ind p-value", bt.get("christoffersen_ind_pvalue", "")])
        writer.writerow(["Christoffersen Ind Decision", bt.get("christoffersen_ind_result", "")])
        writer.writerow(["Christoffersen CC Stat", bt.get("christoffersen_cc_stat", "")])
        writer.writerow(["Christoffersen CC p-value", bt.get("christoffersen_cc_pvalue", "")])
        writer.writerow(["Christoffersen CC Decision", bt.get("christoffersen_cc_result", "")])
        writer.writerow(["Basel Traffic Light Zone", bt.get("basel_traffic_light", "")])
        writer.writerow([])

        # Risk Contributions
        pr = dashboard_data.get("portfolio_risk", {})
        writer.writerow(["[PORTFOLIO RISK DECOMPOSITION]"])
        writer.writerow(["Ticker", "Weight", "Annual Vol (%)", "Marginal VaR (%)", "Component VaR ($)", "% Risk Contribution"])
        tickers = pr.get("tickers", [])
        weights = pr.get("weights", [])
        asset_vols = pr.get("asset_volatilities_annualized", {})
        marginal_vars = pr.get("marginal_var_pct", {})
        component_vars = pr.get("component_var_amount", {})
        risk_contrs = pr.get("percentage_risk_contributions", {})

        for i, t in enumerate(tickers):
            w = weights[i] if i < len(weights) else 0.0
            writer.writerow([
                t,
                w,
                asset_vols.get(t, ""),
                marginal_vars.get(t, ""),
                component_vars.get(t, ""),
                risk_contrs.get(t, "")
            ])
        writer.writerow([])

        # Stress testing
        st = dashboard_data.get("stress_testing", {})
        writer.writerow(["[STRESS TESTING & SCENARIO ANALYSIS]"])
        writer.writerow(["Scenario", "Category", "Period", "Portfolio Loss (%)", "Portfolio Loss ($)", "Stressed VaR ($)", "Stressed Value ($)"])
        for sc in st.get("scenarios", []):
            writer.writerow([
                sc.get("name"),
                sc.get("category"),
                sc.get("historical_period") or "N/A",
                sc.get("portfolio_loss_pct"),
                sc.get("portfolio_loss_amount"),
                sc.get("stressed_var_amount"),
                sc.get("stressed_portfolio_value")
            ])

        return output.getvalue()

    @staticmethod
    def generate_returns_csv(dates: List[str], port_returns: List[float], asset_returns: Dict[str, List[float]]) -> str:
        """
        Generate CSV of daily return time series.
        """
        output = io.StringIO()
        writer = csv.writer(output)

        headers = ["Date", "Portfolio_Return_Pct"] + [f"{t}_Return_Pct" for t in asset_returns.keys()]
        writer.writerow(headers)

        for i, d in enumerate(dates):
            row = [d, round(port_returns[i] * 100.0, 4) if i < len(port_returns) else ""]
            for t, rets in asset_returns.items():
                row.append(round(rets[i] * 100.0, 4) if i < len(rets) else "")
            writer.writerow(row)

        return output.getvalue()

    @staticmethod
    def generate_breaches_csv(violations: List[Dict[str, Any]]) -> str:
        """
        Generate CSV of backtest violations.
        """
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Date", "Daily_Return_Pct", "VaR_Threshold_Pct", "Loss_Amount", "Breach_Amount"])
        for v in violations:
            writer.writerow([
                v.get("date"),
                v.get("return_pct"),
                v.get("var_threshold_pct"),
                v.get("loss_amount"),
                v.get("breach_amount")
            ])
        return output.getvalue()

export_service = ExportService()
