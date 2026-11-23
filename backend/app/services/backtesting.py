"""VaR Backtesting service implementing Kupiec POF, Christoffersen Independence & Conditional Coverage tests, and Basel Traffic Light system."""
import logging
from typing import List, Dict, Any, Tuple
import numpy as np
import pandas as pd
from scipy import stats

from app.models.schemas import BacktestResponse, BreachItem

logger = logging.getLogger(__name__)

class BacktestingEngine:
    def __init__(self, rolling_window: int = 126):
        self.rolling_window = rolling_window

    def run_backtest(
        self,
        returns: pd.Series,
        portfolio_value: float = 1_000_000.0,
        confidence_level: float = 0.99,
        method: str = "historical"
    ) -> BacktestResponse:
        """
        Perform out-of-sample rolling VaR backtest:
        Estimates VaR on rolling window (e.g. 126 or 252 days) and evaluates against next day's realization.
        Computes Kupiec POF test, Christoffersen Independence, and Conditional Coverage.
        """
        r = returns.dropna()
        n_total = len(r)

        # Minimum required observations
        min_window = min(60, n_total // 2) if n_total < 126 else 126
        if n_total <= min_window:
            # Fallback to in-sample backtest
            min_window = 0

        p = 1.0 - confidence_level # expected violation probability (e.g. 0.01 or 0.05)
        violations: List[BreachItem] = []
        var_thresholds = []
        eval_returns = []
        eval_dates = []

        if min_window > 0:
            # Rolling out-of-sample evaluation
            for i in range(min_window, n_total):
                window_data = r.iloc[i - min_window:i].values
                actual_ret = float(r.iloc[i])
                dt_str = r.index[i].strftime("%Y-%m-%d")

                # 1-day Historical VaR threshold
                cutoff = np.percentile(window_data, p * 100.0)
                var_pct = max(0.0, -cutoff)

                var_thresholds.append(var_pct)
                eval_returns.append(actual_ret)
                eval_dates.append(dt_str)

                # Breach condition: actual return < -var_pct (loss > VaR)
                if actual_ret < cutoff:
                    loss_amount = abs(actual_ret) * portfolio_value
                    breach_amount = (abs(actual_ret) - var_pct) * portfolio_value
                    violations.append(BreachItem(
                        date=dt_str,
                        return_pct=round(actual_ret * 100.0, 3),
                        var_threshold_pct=round(var_pct * 100.0, 3),
                        loss_amount=round(loss_amount, 2),
                        breach_amount=round(breach_amount, 2)
                    ))
        else:
            # In-sample evaluation
            cutoff = np.percentile(r.values, p * 100.0)
            var_pct = max(0.0, -cutoff)
            for dt, val in r.items():
                dt_str = dt.strftime("%Y-%m-%d")
                actual_ret = float(val)
                var_thresholds.append(var_pct)
                eval_returns.append(actual_ret)
                eval_dates.append(dt_str)
                if actual_ret < cutoff:
                    loss_amount = abs(actual_ret) * portfolio_value
                    breach_amount = (abs(actual_ret) - var_pct) * portfolio_value
                    violations.append(BreachItem(
                        date=dt_str,
                        return_pct=round(actual_ret * 100.0, 3),
                        var_threshold_pct=round(var_pct * 100.0, 3),
                        loss_amount=round(loss_amount, 2),
                        breach_amount=round(breach_amount, 2)
                    ))

        N = len(eval_returns)
        x = len(violations)
        hat_p = x / N if N > 0 else 0.0
        expected_x = p * N

        # 1. Kupiec POF Likelihood Ratio Test
        # LR_pof = 2 * [ x * ln(hat_p / p) + (N - x) * ln((1 - hat_p) / (1 - p)) ]
        lr_pof = 0.0
        if x == 0:
            lr_pof = -2.0 * N * np.log(1.0 - p)
        elif x == N:
            lr_pof = -2.0 * N * np.log(p)
        else:
            term1 = x * np.log(hat_p / p) if hat_p > 0 else 0.0
            term2 = (N - x) * np.log((1.0 - hat_p) / (1.0 - p)) if (1.0 - hat_p) > 0 else 0.0
            lr_pof = 2.0 * (term1 + term2)

        lr_pof = max(0.0, float(lr_pof))
        kupiec_pvalue = float(1.0 - stats.chi2.cdf(lr_pof, df=1))
        kupiec_result = "ACCEPT (Model Calibrated)" if kupiec_pvalue >= 0.05 else "REJECT (Miscalibrated)"

        # 2. Christoffersen Independence Test
        # State sequence: 1 if violation, 0 otherwise
        indicators = np.array([1 if r_val < -v_th else 0 for r_val, v_th in zip(eval_returns, var_thresholds)])
        n00, n01, n10, n11 = 0, 0, 0, 0
        for t in range(len(indicators) - 1):
            s_cur, s_next = indicators[t], indicators[t+1]
            if s_cur == 0 and s_next == 0:
                n00 += 1
            elif s_cur == 0 and s_next == 1:
                n01 += 1
            elif s_cur == 1 and s_next == 0:
                n10 += 1
            elif s_cur == 1 and s_next == 1:
                n11 += 1

        pi01 = n01 / (n00 + n01) if (n00 + n01) > 0 else 0.0
        pi11 = n11 / (n10 + n11) if (n10 + n11) > 0 else 0.0
        pi_all = (n01 + n11) / (N - 1) if (N - 1) > 0 else 0.0

        # Likelihood under independence L(I) vs alternative L(A)
        # Avoid log(0) with safe eps
        eps = 1e-12
        def safe_log(v):
            return np.log(max(eps, min(1.0 - eps, v)))

        log_L_ind = (n00 + n10) * safe_log(1.0 - pi_all) + (n01 + n11) * safe_log(pi_all)
        log_L_alt = (
            n00 * safe_log(1.0 - pi01) + n01 * safe_log(pi01) +
            n10 * safe_log(1.0 - pi11) + n11 * safe_log(pi11)
        )

        lr_ind = max(0.0, float(-2.0 * (log_L_ind - log_L_alt)))
        christoffersen_ind_pvalue = float(1.0 - stats.chi2.cdf(lr_ind, df=1))
        christoffersen_ind_result = "ACCEPT (Independent Breaches)" if christoffersen_ind_pvalue >= 0.05 else "REJECT (Breach Clustering)"

        # 3. Christoffersen Conditional Coverage Test: LR_cc = LR_pof + LR_ind ~ chi2(2)
        lr_cc = lr_pof + lr_ind
        christoffersen_cc_pvalue = float(1.0 - stats.chi2.cdf(lr_cc, df=2))
        christoffersen_cc_result = "ACCEPT (Sound Model)" if christoffersen_cc_pvalue >= 0.05 else "REJECT (Unsound Coverage)"

        # 4. Basel Traffic Light System
        # For 250 days at 99%: Green <= 4, Yellow 5-9, Red >= 10
        # Scale thresholds with N/250
        scale = max(1.0, N / 250.0)
        green_max = int(round(4 * scale))
        yellow_max = int(round(9 * scale))

        if confidence_level >= 0.99:
            if x <= green_max:
                basel_status = "GREEN (Valid)"
            elif x <= yellow_max:
                basel_status = "YELLOW (Supervisory Review)"
            else:
                basel_status = "RED (Rejected)"
        else:
            # For 95% confidence level
            green_max_95 = int(round(18 * scale))
            yellow_max_95 = int(round(25 * scale))
            if x <= green_max_95:
                basel_status = "GREEN (Valid)"
            elif x <= yellow_max_95:
                basel_status = "YELLOW (Supervisory Review)"
            else:
                basel_status = "RED (Rejected)"

        return BacktestResponse(
            confidence_level=confidence_level,
            total_observations=N,
            violation_count=x,
            violation_ratio=round(hat_p * 100.0, 3),
            expected_violations=round(expected_x, 1),
            expected_ratio=round(p * 100.0, 3),
            kupiec_lr_stat=round(lr_pof, 4),
            kupiec_pvalue=round(kupiec_pvalue, 6),
            kupiec_result=kupiec_result,
            christoffersen_ind_stat=round(lr_ind, 4),
            christoffersen_ind_pvalue=round(christoffersen_ind_pvalue, 6),
            christoffersen_ind_result=christoffersen_ind_result,
            christoffersen_cc_stat=round(lr_cc, 4),
            christoffersen_cc_pvalue=round(christoffersen_cc_pvalue, 6),
            christoffersen_cc_result=christoffersen_cc_result,
            basel_traffic_light=basel_status,
            violations=violations
        )

backtesting_engine = BacktestingEngine()
