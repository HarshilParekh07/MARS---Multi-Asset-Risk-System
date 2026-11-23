"""Rolling risk metrics calculation: rolling volatility, rolling VaR, and rolling ES series."""
import logging
from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd

from app.models.schemas import RollingRiskResponse

logger = logging.getLogger(__name__)

class RollingRiskService:
    def compute_rolling_risk(
        self,
        returns: pd.Series,
        window: int = 60
    ) -> RollingRiskResponse:
        """
        Compute rolling 60-day annualized volatility, rolling 95% & 99% Historical VaR and ES.
        Flag date breaches where daily loss > rolling VaR.
        """
        r = returns.dropna()
        n = len(r)
        effective_window = min(window, max(20, n // 3))

        dates = [dt.strftime("%Y-%m-%d") for dt in r.index]
        ret_values = [round(float(val * 100.0), 3) for val in r.values]

        rolling_vol_ann: List[Optional[float]] = [None] * len(r)
        rolling_var_95: List[Optional[float]] = [None] * len(r)
        rolling_var_99: List[Optional[float]] = [None] * len(r)
        rolling_es_95: List[Optional[float]] = [None] * len(r)
        rolling_es_99: List[Optional[float]] = [None] * len(r)

        breaches_95: List[str] = []
        breaches_99: List[str] = []

        for i in range(effective_window, n):
            sub_window = r.iloc[i - effective_window:i].values
            current_ret = float(r.iloc[i])
            dt_str = dates[i]

            # Volatility annualized
            std_daily = np.std(sub_window, ddof=1)
            vol_ann = float(std_daily * np.sqrt(252) * 100.0)
            rolling_vol_ann[i] = round(vol_ann, 2)

            # 95% Historical VaR & ES
            cutoff_95 = np.percentile(sub_window, 5.0)
            var_95 = max(0.0, -cutoff_95 * 100.0)
            tail_95 = sub_window[sub_window <= cutoff_95]
            es_95 = max(var_95, -float(np.mean(tail_95) * 100.0)) if len(tail_95) > 0 else var_95

            # 99% Historical VaR & ES
            cutoff_99 = np.percentile(sub_window, 1.0)
            var_99 = max(0.0, -cutoff_99 * 100.0)
            tail_99 = sub_window[sub_window <= cutoff_99]
            es_99 = max(var_99, -float(np.mean(tail_99) * 100.0)) if len(tail_99) > 0 else var_99

            rolling_var_95[i] = round(var_95, 3)
            rolling_var_99[i] = round(var_99, 3)
            rolling_es_95[i] = round(es_95, 3)
            rolling_es_99[i] = round(es_99, 3)

            # Check for breach
            if current_ret * 100.0 < -var_95:
                breaches_95.append(dt_str)
            if current_ret * 100.0 < -var_99:
                breaches_99.append(dt_str)

        return RollingRiskResponse(
            dates=dates,
            returns=ret_values,
            rolling_vol_annualized=rolling_vol_ann,
            rolling_var_95=rolling_var_95,
            rolling_var_99=rolling_var_99,
            rolling_es_95=rolling_es_95,
            rolling_es_99=rolling_es_99,
            breaches_95=breaches_95,
            breaches_99=breaches_99
        )

rolling_risk_service = RollingRiskService()
