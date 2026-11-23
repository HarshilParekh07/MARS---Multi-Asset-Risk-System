"""Core Risk Engine: Historical, Parametric, Cornish-Fisher, Monte Carlo VaR, Expected Shortfall, and Portfolio Risk Breakdown."""
import logging
from typing import Dict, List, Tuple, Any, Optional
import numpy as np
import pandas as pd
from scipy import stats

from app.config import settings
from app.models.schemas import (
    VaRMetricItem,
    VaRComparisonResponse,
    DistributionStats,
    PortfolioRiskResponse,
    DistributionHistogramData
)

logger = logging.getLogger(__name__)

class RiskEngine:
    def __init__(self, n_simulations: int = 10_000, random_seed: int = 42):
        self.n_simulations = n_simulations
        self.random_seed = random_seed

    def compute_distribution_stats(self, returns: pd.Series) -> DistributionStats:
        """
        Compute standard descriptive statistics, higher moments, normality test, and drawdowns.
        """
        r = returns.dropna().values
        n = len(r)
        if n < 5:
            raise ValueError("Insufficient returns data for distribution statistics.")

        mean_daily = float(np.mean(r))
        std_daily = float(np.std(r, ddof=1))
        annualized_ret = float(mean_daily * 252)
        annualized_vol = float(std_daily * np.sqrt(252))

        # Skewness and Kurtosis
        skew_val = float(stats.skew(r, bias=False))
        # scipy kurtosis defaults to fisher=True (excess kurtosis: normal = 0)
        excess_kurt = float(stats.kurtosis(r, fisher=True, bias=False))
        kurt_val = excess_kurt + 3.0

        # Jarque-Bera Test
        jb_stat, jb_pvalue = stats.jarque_bera(r)
        jb_stat = float(jb_stat)
        jb_pvalue = float(jb_pvalue)
        is_normal = bool(jb_pvalue > 0.05)

        # Drawdown calculation
        cum_ret = (1.0 + returns).cumprod()
        running_max = cum_ret.cummax()
        drawdown = (cum_ret - running_max) / running_max
        max_drawdown = float(drawdown.min() * 100.0)
        current_drawdown = float(drawdown.iloc[-1] * 100.0)

        return DistributionStats(
            mean_daily_return=round(mean_daily * 100, 4),
            std_daily_return=round(std_daily * 100, 4),
            annualized_return=round(annualized_ret * 100, 2),
            annualized_volatility=round(annualized_vol * 100, 2),
            skewness=round(skew_val, 4),
            kurtosis=round(kurt_val, 4),
            excess_kurtosis=round(excess_kurt, 4),
            jarque_bera_stat=round(jb_stat, 2),
            jarque_bera_pvalue=round(jb_pvalue, 6),
            is_normal=is_normal,
            min_daily_return=round(float(np.min(r)) * 100, 4),
            max_daily_return=round(float(np.max(r)) * 100, 4),
            max_drawdown_pct=round(max_drawdown, 2),
            current_drawdown_pct=round(current_drawdown, 2)
        )

    def calculate_var_historical(
        self,
        returns: pd.Series,
        confidence_level: float = 0.99,
        holding_period_days: int = 1
    ) -> Tuple[float, float]:
        """
        Historical Value at Risk and Expected Shortfall using empirical distribution.
        Returns: (var_pct, es_pct) as positive loss percentages.
        """
        r = returns.dropna().values
        alpha = 1.0 - confidence_level
        # Quantile of returns (loss is negative return)
        cutoff = np.percentile(r, alpha * 100.0)
        daily_var = max(0.0, -cutoff)

        # Expected Shortfall: average of returns <= cutoff
        tail_losses = r[r <= cutoff]
        if len(tail_losses) > 0:
            daily_es = max(daily_var, -float(np.mean(tail_losses)))
        else:
            daily_es = daily_var

        # Scale with holding period sqrt(h)
        scaled_var = daily_var * np.sqrt(holding_period_days)
        scaled_es = daily_es * np.sqrt(holding_period_days)

        return float(scaled_var * 100.0), float(scaled_es * 100.0)

    def calculate_var_parametric(
        self,
        returns: pd.Series,
        confidence_level: float = 0.99,
        holding_period_days: int = 1
    ) -> Tuple[float, float]:
        """
        Parametric (Variance-Covariance) VaR and ES assuming normal distribution.
        """
        r = returns.dropna().values
        mu = float(np.mean(r))
        sigma = float(np.std(r, ddof=1))

        z = stats.norm.ppf(confidence_level)
        # 1-day parametric VaR = z * sigma - mu
        daily_var = z * sigma - mu
        daily_var = max(0.0, daily_var)

        # 1-day parametric ES = sigma * pdf(z) / (1 - alpha) - mu
        alpha = 1.0 - confidence_level
        phi_z = stats.norm.pdf(z)
        daily_es = (sigma * phi_z / alpha) - mu
        daily_es = max(daily_var, daily_es)

        scaled_var = daily_var * np.sqrt(holding_period_days)
        scaled_es = daily_es * np.sqrt(holding_period_days)

        return float(scaled_var * 100.0), float(scaled_es * 100.0)

    def calculate_var_cornish_fisher(
        self,
        returns: pd.Series,
        confidence_level: float = 0.99,
        holding_period_days: int = 1
    ) -> Tuple[float, float]:
        """
        Cornish-Fisher expansion VaR adjusting for skewness and excess kurtosis.
        """
        r = returns.dropna().values
        mu = float(np.mean(r))
        sigma = float(np.std(r, ddof=1))
        s = float(stats.skew(r, bias=False))
        k = float(stats.kurtosis(r, fisher=True, bias=False)) # Excess kurtosis

        z = stats.norm.ppf(confidence_level)

        # Cornish-Fisher expansion for z-score
        # z_cf = z + (z^2 - 1)*S/6 + (z^3 - 3*z)*K/24 - (2*z^3 - 5*z)*S^2/36
        term1 = (z**2 - 1.0) * s / 6.0
        term2 = (z**3 - 3.0 * z) * k / 24.0
        term3 = (2.0 * z**3 - 5.0 * z) * (s**2) / 36.0
        z_cf = z + term1 + term2 - term3

        daily_var = z_cf * sigma - mu
        daily_var = max(0.0, daily_var)

        # For Cornish-Fisher ES, approximate using numerical tail expectation with empirical correction
        tail_threshold = -(daily_var)
        tail_losses = r[r <= tail_threshold]
        if len(tail_losses) > 0:
            daily_es = max(daily_var, -float(np.mean(tail_losses)))
        else:
            daily_es = daily_var * 1.15  # Fallback analytical factor

        scaled_var = daily_var * np.sqrt(holding_period_days)
        scaled_es = daily_es * np.sqrt(holding_period_days)

        return float(scaled_var * 100.0), float(scaled_es * 100.0)

    def calculate_var_monte_carlo(
        self,
        returns_df: pd.DataFrame,
        weights: np.ndarray,
        confidence_level: float = 0.99,
        holding_period_days: int = 1
    ) -> Tuple[float, float]:
        """
        Monte Carlo VaR using Cholesky decomposition of historical covariance matrix.
        """
        np.random.seed(self.random_seed)
        mu_vec = returns_df.mean().values
        cov_matrix = returns_df.cov().values

        # Ensure covariance matrix is positive semi-definite (add small jitter if needed)
        try:
            L = np.linalg.cholesky(cov_matrix)
        except np.linalg.LinAlgError:
            jitter = np.eye(cov_matrix.shape[0]) * 1e-7
            L = np.linalg.cholesky(cov_matrix + jitter)

        n_assets = len(weights)
        # Generate standard normal random numbers
        Z = np.random.normal(0.0, 1.0, size=(self.n_simulations, n_assets))

        # Correlated simulated 1-day returns
        simulated_asset_returns = mu_vec + Z.dot(L.T)

        # Scale to holding period: compounded or sqrt(h)
        simulated_scaled_returns = (
            mu_vec * holding_period_days +
            np.sqrt(holding_period_days) * (Z.dot(L.T))
        )

        # Portfolio simulated returns
        simulated_port_returns = simulated_scaled_returns.dot(weights)

        alpha = 1.0 - confidence_level
        cutoff = np.percentile(simulated_port_returns, alpha * 100.0)
        mc_var = max(0.0, -cutoff)

        tail_losses = simulated_port_returns[simulated_port_returns <= cutoff]
        if len(tail_losses) > 0:
            mc_es = max(mc_var, -float(np.mean(tail_losses)))
        else:
            mc_es = mc_var

        return float(mc_var * 100.0), float(mc_es * 100.0)

    def compute_all_var_models(
        self,
        returns_df: pd.DataFrame,
        weights: np.ndarray,
        portfolio_value: float,
        confidence_level: float = 0.99,
        holding_period_days: int = 1
    ) -> VaRComparisonResponse:
        """
        Compute Historical, Parametric, Cornish-Fisher, and Monte Carlo VaR & ES.
        Also builds cross-matrices by confidence level and holding horizon.
        """
        port_returns = returns_df.dot(weights)

        # 1. Historical
        h_var, h_es = self.calculate_var_historical(port_returns, confidence_level, holding_period_days)
        # 2. Parametric
        p_var, p_es = self.calculate_var_parametric(port_returns, confidence_level, holding_period_days)
        # 3. Cornish-Fisher
        cf_var, cf_es = self.calculate_var_cornish_fisher(port_returns, confidence_level, holding_period_days)
        # 4. Monte Carlo
        mc_var, mc_es = self.calculate_var_monte_carlo(returns_df, weights, confidence_level, holding_period_days)

        models = [
            VaRMetricItem(
                method="Historical VaR",
                confidence_level=confidence_level,
                holding_period_days=holding_period_days,
                var_pct=round(h_var, 3),
                var_amount=round((h_var / 100.0) * portfolio_value, 2),
                es_pct=round(h_es, 3),
                es_amount=round((h_es / 100.0) * portfolio_value, 2),
                description="Empirical non-parametric distribution using exact historical return quantiles."
            ),
            VaRMetricItem(
                method="Parametric VaR (Variance-Covariance)",
                confidence_level=confidence_level,
                holding_period_days=holding_period_days,
                var_pct=round(p_var, 3),
                var_amount=round((p_var / 100.0) * portfolio_value, 2),
                es_pct=round(p_es, 3),
                es_amount=round((p_es / 100.0) * portfolio_value, 2),
                description="Analytical normal distribution assumption scaled with portfolio mean and variance."
            ),
            VaRMetricItem(
                method="Cornish-Fisher VaR",
                confidence_level=confidence_level,
                holding_period_days=holding_period_days,
                var_pct=round(cf_var, 3),
                var_amount=round((cf_var / 100.0) * portfolio_value, 2),
                es_pct=round(cf_es, 3),
                es_amount=round((cf_es / 100.0) * portfolio_value, 2),
                description="Higher-moment polynomial expansion adjusting critical values for empirical skewness and fat kurtosis."
            ),
            VaRMetricItem(
                method="Monte Carlo VaR",
                confidence_level=confidence_level,
                holding_period_days=holding_period_days,
                var_pct=round(mc_var, 3),
                var_amount=round((mc_var / 100.0) * portfolio_value, 2),
                es_pct=round(mc_es, 3),
                es_amount=round((mc_es / 100.0) * portfolio_value, 2),
                description=f"Cholesky stochastic multivariate simulation with {self.n_simulations:,} correlated paths."
            )
        ]

        # Build matrix by confidence levels: 95%, 99%, 99.5%
        matrix_conf = {}
        for conf in [0.95, 0.99, 0.995]:
            label = f"{int(conf*100) if conf!=0.995 else 99.5}%"
            h_v, _ = self.calculate_var_historical(port_returns, conf, holding_period_days)
            p_v, _ = self.calculate_var_parametric(port_returns, conf, holding_period_days)
            cf_v, _ = self.calculate_var_cornish_fisher(port_returns, conf, holding_period_days)
            mc_v, _ = self.calculate_var_monte_carlo(returns_df, weights, conf, holding_period_days)
            matrix_conf[label] = {
                "Historical": round(h_v, 2),
                "Parametric": round(p_v, 2),
                "Cornish-Fisher": round(cf_v, 2),
                "Monte Carlo": round(mc_v, 2)
            }

        # Build matrix by horizons: 1-day, 5-day, 10-day
        matrix_horiz = {}
        for h in [1, 5, 10]:
            label = f"{h}-day"
            h_v, _ = self.calculate_var_historical(port_returns, confidence_level, h)
            p_v, _ = self.calculate_var_parametric(port_returns, confidence_level, h)
            cf_v, _ = self.calculate_var_cornish_fisher(port_returns, confidence_level, h)
            mc_v, _ = self.calculate_var_monte_carlo(returns_df, weights, confidence_level, h)
            matrix_horiz[label] = {
                "Historical": round(h_v, 2),
                "Parametric": round(p_v, 2),
                "Cornish-Fisher": round(cf_v, 2),
                "Monte Carlo": round(mc_v, 2)
            }

        return VaRComparisonResponse(
            portfolio_value=portfolio_value,
            confidence_level=confidence_level,
            holding_period_days=holding_period_days,
            models=models,
            matrix_by_confidence=matrix_conf,
            matrix_by_horizon=matrix_horiz
        )

    def compute_portfolio_risk_breakdown(
        self,
        returns_df: pd.DataFrame,
        weights: np.ndarray,
        portfolio_value: float,
        confidence_level: float = 0.99
    ) -> PortfolioRiskResponse:
        """
        Compute Component VaR, Marginal VaR, Risk Contributions, Correlation Matrix, and Diversification Benefit.
        Uses Euler's theorem: sum(Component VaR) = Portfolio VaR.
        """
        tickers = list(returns_df.columns)
        w = np.array(weights, dtype=float)
        cov_matrix = returns_df.cov().values
        corr_matrix = returns_df.corr().values

        # Portfolio daily volatility
        port_var_daily = float(w.dot(cov_matrix).dot(w))
        port_std_daily = np.sqrt(max(1e-12, port_var_daily))
        port_std_annual = float(port_std_daily * np.sqrt(252))

        # Z-score for confidence level
        z = stats.norm.ppf(confidence_level)
        port_var_pct = z * port_std_daily

        # Covariance of each asset with portfolio: cov_i_p = (Sigma * w)_i
        cov_assets_port = cov_matrix.dot(w)

        # Marginal VaR: MVaR_i = z * (cov_i_p / sigma_p)
        marginal_vars = z * (cov_assets_port / port_std_daily)

        # Component VaR: CVaR_i = w_i * MVaR_i (in percent of portfolio value)
        component_vars_pct = w * marginal_vars
        component_vars_amount = component_vars_pct * portfolio_value

        # Percentage Risk Contribution: CVaR_i / Portfolio VaR
        # Sum of component_vars_pct equals port_var_pct
        if port_var_pct > 0:
            percentage_contributions = (component_vars_pct / port_var_pct) * 100.0
        else:
            percentage_contributions = np.ones(len(w)) / len(w) * 100.0

        # Individual asset annualized volatilities and stand-alone VaRs
        asset_stds_daily = np.sqrt(np.diag(cov_matrix))
        asset_vols_annual = {t: round(float(s * np.sqrt(252) * 100.0), 2) for t, s in zip(tickers, asset_stds_daily)}

        # Undiversified portfolio VaR = sum(w_i * VaR_i)
        stand_alone_vars = w * (z * asset_stds_daily)
        undiversified_var = np.sum(stand_alone_vars)

        diversification_benefit = 0.0
        if undiversified_var > 0:
            diversification_benefit = max(0.0, float((1.0 - (port_var_pct / undiversified_var)) * 100.0))

        # Format correlation matrix
        corr_dict = {}
        for i, t1 in enumerate(tickers):
            corr_dict[t1] = {}
            for j, t2 in enumerate(tickers):
                corr_dict[t1][t2] = round(float(corr_matrix[i, j]), 4)

        return PortfolioRiskResponse(
            tickers=tickers,
            weights=[round(float(weight), 4) for weight in w],
            portfolio_value=portfolio_value,
            portfolio_volatility_daily=round(float(port_std_daily * 100.0), 3),
            portfolio_volatility_annualized=round(float(port_std_annual * 100.0), 2),
            diversification_benefit_pct=round(diversification_benefit, 2),
            asset_volatilities_annualized=asset_vols_annual,
            marginal_var_pct={t: round(float(mv * 100.0), 3) for t, mv in zip(tickers, marginal_vars)},
            component_var_amount={t: round(float(cva), 2) for t, cva in zip(tickers, component_vars_amount)},
            percentage_risk_contributions={t: round(float(rc), 2) for t, rc in zip(tickers, percentage_contributions)},
            correlation_matrix=corr_dict
        )

    def prepare_distribution_histogram(self, returns: pd.Series, n_bins: int = 50) -> DistributionHistogramData:
        """
        Generate empirical histogram bins and overlaid theoretical Gaussian density curve and QQ plot coordinates.
        """
        r = returns.dropna().values
        counts, bin_edges = np.histogram(r * 100.0, bins=n_bins, density=False)
        bin_centers = [(bin_edges[i] + bin_edges[i+1]) / 2.0 for i in range(len(bin_edges) - 1)]

        # Density
        densities, _ = np.histogram(r * 100.0, bins=n_bins, density=True)

        # Normal theoretical curve
        mean = float(np.mean(r * 100.0))
        std = float(np.std(r * 100.0, ddof=1))
        norm_x = np.linspace(min(bin_edges), max(bin_edges), 200)
        norm_y = stats.norm.pdf(norm_x, mean, std)

        # QQ plot theoretical and sample quantiles
        qq_theoretical, qq_sample = stats.probplot(r * 100.0, dist="norm")
        qq_x = qq_theoretical[0].tolist()
        qq_y = qq_theoretical[1].tolist()

        return DistributionHistogramData(
            bin_centers=[round(float(x), 4) for x in bin_centers],
            counts=[int(c) for c in counts],
            density=[round(float(d), 6) for d in densities],
            normal_curve_x=[round(float(x), 4) for x in norm_x],
            normal_curve_y=[round(float(y), 6) for y in norm_y],
            qq_theoretical=[round(float(x), 4) for x in qq_x],
            qq_sample=[round(float(y), 4) for y in qq_y]
        )

risk_engine = RiskEngine(
    n_simulations=settings.MONTE_CARLO_SIMULATIONS,
    random_seed=settings.RANDOM_SEED
)
