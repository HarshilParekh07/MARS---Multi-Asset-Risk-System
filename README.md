# Stock Market Risk Analytics Engine

An institutional-grade Stock Market Risk Analytics platform inspired by the Bloomberg Terminal **Multi-Asset Risk System (MARS)**. Powered by real market data via Yahoo Finance, this application delivers multi-methodology Value at Risk (VaR), Expected Shortfall (CVaR), statistical normality tests, regulatory backtesting (Kupiec & Christoffersen), rolling risk, Euler portfolio risk decomposition, and historical crisis stress testing.

---

## Key Highlights

- **MARS Dark Terminal UI**: Professional high-density terminal interface with amber (`#ff9800`), cyan (`#00e5ff`), and emerald accents, live market clocks, ticker tape, and interactive controls.
- **Global Ticker Support**: US, European, and Asian equities (e.g. `AAPL`, `MSFT`, `NVDA`, `RELIANCE.NS`, `TCS.NS`, `ASML`).
- **4 Validated VaR Methodologies**:
  1. **Historical VaR & Expected Shortfall (CVaR)**: Empirical quantile calculation without distribution assumptions.
  2. **Parametric VaR (Variance-Covariance)**: Analytical Gaussian model with exact mean-variance scaling.
  3. **Cornish-Fisher Expansion VaR**: Higher-order polynomial expansion adjusting critical values for empirical skewness ($S$) and excess kurtosis ($K$).
  4. **Monte Carlo VaR (10,000 simulations)**: Cholesky decomposition of multivariate covariance matrix simulating correlated stochastic return paths.
- **Euler Portfolio Risk Decomposition**:
  - Marginal VaR ($\text{MVaR}_i = \frac{\partial \text{VaR}_p}{\partial w_i}$)
  - Component VaR ($\text{CVaR}_i = w_i \times \text{MVaR}_i$)
  - Percentage Risk Contribution ($\sum_i \% \text{RC}_i = 100\%$)
  - Diversification Benefit index & Interactive Pearson Correlation Heatmap.
- **Regulatory Backtesting Suite**:
  - Out-of-sample rolling VaR breach analysis.
  - **Kupiec POF (Proportion of Failures) Likelihood Ratio test** ($LR_{pof} \sim \chi^2(1)$).
  - **Christoffersen Independence test** ($LR_{ind} \sim \chi^2(1)$) to detect breach clustering.
  - **Christoffersen Conditional Coverage test** ($LR_{cc} \sim \chi^2(2)$).
  - **Basel Committee Traffic Light Framework** (Green / Yellow / Red classification).
- **Stress Testing & Scenario Analysis**:
  - Historical crises: 2020 COVID-19 Crash, 2008 Lehman GFC, 2022 Tech Selloff, 1987 Black Monday, 2011 US Debt Downgrade, +200 bps Interest Rate Hike, Stagflation Shock.
  - Interactive factor shock slider with real-time recalculation of stressed portfolio value and stressed VaR.
- **Production Architecture**:
  - **Backend**: FastAPI, Pandas, NumPy, SciPy, yfinance, Pydantic v2.
  - **Frontend**: React 18, TypeScript, Tailwind CSS, Plotly.js.
  - **Caching**: Multi-tier in-memory and local disk caching with configurable TTL.
  - **Reporting**: One-click exportable institutional CSV reports (Full Risk Summary, Daily Returns, Breach Log).

---

## Mathematical Formulations

### 1. Value at Risk (VaR) & Expected Shortfall (ES / CVaR)

For a confidence level $\alpha \in \{0.95, 0.99, 0.995\}$ and holding period $h \in \{1, 5, 10\}$ days:

#### A. Historical VaR

$$\text{VaR}_{\alpha, h} = - \text{Quantile}(R_p, 1 - \alpha) \times \sqrt{h}$$
$$\text{ES}_{\alpha, h} = - \mathbb{E}\left[ R_p \mid R_p \le - \text{VaR}_{\alpha, 1} \right] \times \sqrt{h}$$

#### B. Parametric VaR (Variance-Covariance)

$$\text{VaR}_{\alpha, h} = \left( Z_\alpha \cdot \sigma_p - \mu_p \right) \times \sqrt{h}$$
$$\text{ES}_{\alpha, h} = \left( \sigma_p \frac{\phi(Z_\alpha)}{1 - \alpha} - \mu_p \right) \times \sqrt{h}$$
where $Z_\alpha = \Phi^{-1}(\alpha)$ and $\phi(z)$ is the standard normal probability density function.

#### C. Cornish-Fisher Expansion VaR

Adjusts the standard normal quantile for sample skewness $S$ and excess kurtosis $K = \text{Kurtosis} - 3$:
$$\widetilde{Z}_\alpha = Z_\alpha + \frac{1}{6}(Z_\alpha^2 - 1)S + \frac{1}{24}(Z_\alpha^3 - 3Z_\alpha)K - \frac{1}{36}(2Z_\alpha^3 - 5Z_\alpha)S^2$$
$$\text{VaR}_{\text{CF}, \alpha, h} = \left( \widetilde{Z}_\alpha \cdot \sigma_p - \mu_p \right) \times \sqrt{h}$$

#### D. Monte Carlo VaR (Multivariate Cholesky)

Given asset covariance matrix $\Sigma = L L^T$ where $L$ is lower-triangular:
$$R_{\text{sim}} = \mu \cdot h + \sqrt{h} \cdot (Z \cdot L^T), \quad Z \sim \mathcal{N}(0, I_N)$$
$$R_{p, \text{sim}} = R_{\text{sim}} \cdot w$$
$$\text{VaR}_{\text{MC}} = - \text{Percentile}(R_{p, \text{sim}}, (1 - \alpha) \times 100)$$

---

### 2. Portfolio Risk Decomposition (Euler's Theorem)

For a linearly homogeneous risk measure $\text{VaR}_p(w)$:
$$\text{Marginal VaR}_i = \frac{\partial \text{VaR}_p}{\partial w_i} = Z_\alpha \frac{(\Sigma w)_i}{\sigma_p}$$
$$\text{Component VaR}_i = w_i \times \text{Marginal VaR}_i$$
$$\sum_{i=1}^N \text{Component VaR}_i = \text{Total Portfolio VaR}$$
$$\% \text{Risk Contribution}_i = \frac{\text{Component VaR}_i}{\text{Total Portfolio VaR}} \times 100\%$$
$$\text{Diversification Benefit (\%)} = \left( 1 - \frac{\text{VaR}_p}{\sum_{i=1}^N w_i \text{VaR}_i} \right) \times 100\%$$

---

### 3. Backtesting Statistics

Let $x$ be the number of breaches out of $N$ out-of-sample days where actual loss exceeded predicted VaR, and $p = 1 - \alpha$:

#### A. Kupiec POF (Proportion of Failures) Likelihood Ratio Test

$$LR_{\text{pof}} = 2 \left[ x \ln\left(\frac{\hat{p}}{p}\right) + (N - x) \ln\left(\frac{1 - \hat{p}}{1 - p}\right) \right] \sim \chi^2(1)$$
If $p\text{-value} \ge 0.05$, the null hypothesis $H_0: \hat{p} = p$ is accepted (model is calibrated).

#### B. Christoffersen Independence Test

Let $n_{ij}$ count transitions from state $i \in \{0, 1\}$ on day $t-1$ to state $j \in \{0, 1\}$ on day $t$:
$$LR_{\text{ind}} = -2 \ln \left[ \frac{(1-\pi)^{n_{00}+n_{10}} \pi^{n_{01}+n_{11}}}{(1-\pi_{01})^{n_{00}} \pi_{01}^{n_{01}} (1-\pi_{11})^{n_{10}} \pi_{11}^{n_{11}}} \right] \sim \chi^2(1)$$
If $p\text{-value} \ge 0.05$, breaches do not cluster across time.

#### C. Christoffersen Conditional Coverage Test

$$LR_{\text{cc}} = LR_{\text{pof}} + LR_{\text{ind}} \sim \chi^2(2)$$

#### D. Basel Traffic Light System (99% 1-day VaR)

- **Green Zone**: Valid model ($x \le 4$ per 250 days).
- **Yellow Zone**: Supervisory monitoring ($5 \le x \le 9$ per 250 days).
- **Red Zone**: Model rejected ($x \ge 10$ per 250 days).

---

## Project Structure

```text
d:\VaR Model/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py              # Application settings and cache directory
│   │   ├── main.py                # FastAPI entry point, CORS, and error handlers
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── schemas.py         # Pydantic v2 request and response schemas
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── data_loader.py     # yfinance fetcher, validation, returns, caching
│   │   │   ├── risk_engine.py     # Historical, Parametric, Cornish-Fisher, Monte Carlo, Euler
│   │   │   ├── backtesting.py     # Kupiec POF, Christoffersen, Basel traffic light
│   │   │   ├── rolling_risk.py    # Rolling volatility, VaR, and ES time series
│   │   │   ├── stress_testing.py  # Historical crisis scenarios and custom factor shocks
│   │   │   └── export_service.py  # Institutional CSV report generation
│   │   └── api/
│   │       ├── __init__.py
│   │       └── routes.py          # REST endpoints
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_risk_engine.py    # Unit tests for all VaR models and Euler attribution
│   │   ├── test_backtesting.py    # Unit tests for Kupiec and Christoffersen tests
│   │   └── test_api.py            # Integration tests for FastAPI endpoints
│   ├── cache/                     # Disk cache directory for downloaded market data
│   ├── requirements.txt           # Python dependency requirements
│   ├── run.py                     # CLI launcher for backend server
│   └── verify_calculations.py     # End-to-end verification script
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts          # Typed REST API client
│   │   ├── types/
│   │   │   └── index.ts           # TypeScript interfaces matching backend models
│   │   ├── components/
│   │   │   ├── Header.tsx         # Bloomberg header, clocks, ticker tape, presets
│   │   │   ├── Controls.tsx       # Parameters, weights, confidence, horizons, lookback
│   │   │   ├── MetricCard.tsx     # Institutional KPI cards with badges
│   │   │   ├── OverviewTab.tsx    # Key metrics, cumulative performance, drawdown
│   │   │   ├── VarModelsTab.tsx   # Detailed VaR comparison table, charts, matrices
│   │   │   ├── DistributionTab.tsx# Frequency histogram, normal curve, QQ plot, Jarque-Bera
│   │   │   ├── BacktestingTab.tsx # Rolling breaches, Kupiec/Christoffersen matrix, breach log
│   │   │   ├── PortfolioRiskTab.tsx# Euler risk contribution, correlation heatmap
│   │   │   ├── StressTestingTab.tsx# Crisis scenarios & interactive factor shock slider
│   │   │   ├── DataTableTab.tsx   # Paginated historical risk table with CSV export
│   │   │   └── common/
│   │   │       └── PlotlyChart.tsx# Responsive Bloomberg dark theme Plotly wrapper
│   │   ├── App.tsx                # Main container coordinating 7 tabs
│   │   ├── main.tsx               # React root entry point
│   │   └── index.css              # Custom Bloomberg styling and scrollbars
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── start.bat                      # One-click Windows startup script
├── start.ps1                      # PowerShell startup script
└── README.md
```

---

## Installation & Setup

### Prerequisites

- Python 3.10+
- Node.js 18+ and npm

### 1. Backend Setup

1. Open PowerShell and navigate to the backend directory:

   ```powershell
   cd "d:\VaR Model\backend"
   ```

2. Activate or create a virtual environment:

   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

3. Install required Python packages:

   ```powershell
   pip install -r requirements.txt
   ```

4. Verify calculations and test suite:

   ```powershell
   python -m pytest tests/
   python verify_calculations.py
   ```

5. Launch the backend server:

   ```powershell
   python run.py
   ```

   *The FastAPI server will start on `http://localhost:8000` with interactive Swagger docs at `http://localhost:8000/docs`.*

---

### 2. Frontend Setup

1. Open a second terminal window and navigate to the frontend directory:

   ```powershell
   cd "d:\VaR Model\frontend"
   ```

2. Install frontend dependencies:

   ```powershell
   npm install
   ```

3. Build or launch the development server:

   ```powershell
   npm run dev
   ```

   *The application UI will open on `http://localhost:3000`.*

---

### 3. One-Click Launch (Windows)

Double-click `start.bat` or run `start.ps1` in PowerShell:

```powershell
.\start.ps1
```

This automatically launches both the FastAPI backend and the React frontend in separate windows.

---

## API Endpoints Reference

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Health check endpoint returning engine status and version |
| `POST` | `/api/dashboard` | Main endpoint delivering the complete institutional risk dataset |
| `POST` | `/api/stress-test/custom` | Re-executes scenario stress tests with custom factor shocks |
| `POST` | `/api/export/summary` | Downloads comprehensive formatted Risk Analytics Report (CSV) |
| `POST` | `/api/export/returns` | Downloads daily arithmetic return time series (CSV) |
| `POST` | `/api/export/breaches` | Downloads historical out-of-sample VaR breach registry (CSV) |

---

## Yahoo Finance Data Layer & Institutional Disclosures

1. **Adjusted Prices**: All daily returns are derived from split- and dividend-adjusted closing prices (`Close` or `Adj Close`).
2. **Multi-Currency Portfolios**: Yahoo Finance quotes assets in local currencies (e.g. USD for `AAPL`, INR for `RELIANCE.NS`). Daily returns represent local currency percentage changes; portfolio aggregate risk assumes local currency normalization.
3. **Missing Observations**: Non-trading days and cross-market holiday differences (e.g. US Thanksgiving vs Indian Diwali) are aligned via 5-day forward fill (`ffill`) followed by edge backward fill (`bfill`).
4. **Data Limitations**: Yahoo Finance is intended for research and analytical prototyping. For production trading, direct market data feeds (e.g., Bloomberg B-PIPE, Refinitiv) should be connected.
