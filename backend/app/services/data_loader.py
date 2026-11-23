"""Market Data Loader service with yfinance, caching, cleaning, and returns computation."""
import os
import json
import time
import hashlib
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
import numpy as np
import pandas as pd
import yfinance as yf

from app.config import CACHE_DIR, settings

logger = logging.getLogger(__name__)

LOOKBACK_MAP = {
    "6m": 180,
    "1y": 365,
    "2y": 730,
    "3y": 1095,
    "5y": 1825,
    "max": 3650
}

class MarketDataLoader:
    def __init__(self, cache_ttl_hours: int = 12):
        self.cache_dir = Path(CACHE_DIR)
        self.cache_ttl_seconds = cache_ttl_hours * 3600
        self._memory_cache: Dict[str, Tuple[float, Any]] = {}

    def _get_cache_key(self, tickers: List[str], lookback: str) -> str:
        sorted_tickers = sorted([t.upper().strip() for t in tickers])
        key_str = f"{','.join(sorted_tickers)}|{lookback}"
        return hashlib.md5(key_str.encode('utf-8')).hexdigest()

    def fetch_historical_prices(
        self,
        tickers: List[str],
        lookback: str = "2y",
        force_refresh: bool = False
    ) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Fetch historical close prices for given tickers, clean data, and return price DataFrame.
        Also returns metadata such as latest prices, currencies, and timestamps.
        """
        tickers = [t.strip().upper() for t in tickers if t.strip()]
        if not tickers:
            raise ValueError("No valid tickers provided.")

        cache_key = self._get_cache_key(tickers, lookback)
        cache_file = self.cache_dir / f"{cache_key}.csv"
        meta_file = self.cache_dir / f"{cache_key}_meta.json"
        now = time.time()

        # Check memory cache
        if not force_refresh and cache_key in self._memory_cache:
            ts, (df_cached, meta_cached) = self._memory_cache[cache_key]
            if now - ts < self.cache_ttl_seconds:
                logger.info("Serving price data from in-memory cache.")
                return df_cached.copy(), meta_cached

        # Check disk cache
        if not force_refresh and cache_file.exists() and meta_file.exists():
            file_mtime = cache_file.stat().st_mtime
            if now - file_mtime < self.cache_ttl_seconds:
                try:
                    df = pd.read_csv(cache_file, index_col=0, parse_dates=True)
                    with open(meta_file, "r") as f:
                        meta = json.load(f)
                    self._memory_cache[cache_key] = (now, (df, meta))
                    logger.info("Serving price data from disk cache.")
                    return df.copy(), meta
                except Exception as e:
                    logger.warning(f"Failed to read disk cache: {e}. Refetching.")

        # Download from Yahoo Finance
        logger.info(f"Downloading historical data for {tickers} over {lookback}...")
        period = lookback if lookback in ["6m", "1y", "2y", "3y", "5y", "max"] else "2y"

        price_series_dict = {}
        currencies = {}
        latest_prices = {}

        # Fetch using yf.download or Ticker objects
        for ticker in tickers:
            try:
                t_obj = yf.Ticker(ticker)
                hist = t_obj.history(period=period, auto_adjust=True)
                if hist.empty or "Close" not in hist.columns:
                    # Fallback to download
                    hist = yf.download(ticker, period=period, progress=False, auto_adjust=True)
                    if isinstance(hist.columns, pd.MultiIndex):
                        hist = hist["Close"]
                    elif "Close" in hist:
                        hist = hist["Close"]

                if hist.empty:
                    raise ValueError(f"No price data returned for ticker: {ticker}")

                series = hist["Close"] if isinstance(hist, pd.DataFrame) and "Close" in hist.columns else hist
                series = series.squeeze()
                # Ensure index is timezone-naive datetime
                if series.index.tz is not None:
                    series.index = series.index.tz_localize(None)

                price_series_dict[ticker] = series
                latest_prices[ticker] = float(series.iloc[-1])

                # Get currency if available
                try:
                    info = t_obj.fast_info
                    currencies[ticker] = getattr(info, "currency", "USD") or "USD"
                except Exception:
                    currencies[ticker] = "INR" if ticker.endswith(".NS") or ticker.endswith(".BO") else "USD"

            except Exception as e:
                logger.error(f"Error fetching data for {ticker}: {e}")
                raise ValueError(f"Failed to retrieve data for ticker '{ticker}'. Please verify the symbol.") from e

        # Combine into aligned DataFrame
        df_prices = pd.DataFrame(price_series_dict)

        # Handle different market calendars (e.g. US vs India holidays)
        # Forward fill missing values up to 5 days, then backward fill edge
        df_prices = df_prices.ffill().bfill()
        df_prices = df_prices.dropna()

        if len(df_prices) < 20:
            raise ValueError(f"Insufficient historical data ({len(df_prices)} bars) for reliable risk calculation.")

        meta = {
            "tickers": tickers,
            "start_date": df_prices.index[0].strftime("%Y-%m-%d"),
            "end_date": df_prices.index[-1].strftime("%Y-%m-%d"),
            "total_observations": int(len(df_prices)),
            "fetch_timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC"),
            "latest_prices": latest_prices,
            "currencies": currencies,
            "data_source": "Yahoo Finance (via yfinance)",
            "disclaimer": "Market data is sourced from Yahoo Finance for analytical purposes. "
                          "Multi-currency portfolios are evaluated on normalized local adjusted returns."
        }

        # Cache data
        try:
            df_prices.to_csv(cache_file)
            with open(meta_file, "w") as f:
                json.dump(meta, f)
            self._memory_cache[cache_key] = (now, (df_prices, meta))
        except Exception as e:
            logger.warning(f"Could not persist cache to disk: {e}")

        return df_prices.copy(), meta

    def compute_returns(self, df_prices: pd.DataFrame) -> pd.DataFrame:
        """
        Compute daily arithmetic / percentage returns from adjusted close prices.
        """
        returns = df_prices.pct_change().dropna()
        return returns

    def compute_portfolio_returns(
        self,
        returns: pd.DataFrame,
        weights: Optional[List[float]] = None
    ) -> Tuple[pd.Series, np.ndarray]:
        """
        Compute portfolio daily return series given weights.
        Normalizes weights to sum to 1.0.
        """
        n_assets = returns.shape[1]
        if weights is None or len(weights) != n_assets:
            w = np.ones(n_assets) / n_assets
        else:
            w = np.array(weights, dtype=float)
            if np.sum(w) > 0:
                w = w / np.sum(w)
            else:
                w = np.ones(n_assets) / n_assets

        portfolio_ret = returns.dot(w)
        portfolio_ret.name = "Portfolio"
        return portfolio_ret, w

data_loader = MarketDataLoader()
