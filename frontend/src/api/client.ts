import { PortfolioRequest, FullDashboardResponse, StressTestResponse } from '../types';

const API_BASE = '/api';
const DIRECT_BACKEND = 'http://127.0.0.1:8000/api';

async function fetchWithFallback(endpoint: string, options: RequestInit = {}): Promise<Response> {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, options);
    if (res.ok) return res;

    // If Vite proxy returns Bad Gateway (502/504) or server error, try direct backend URL
    if (res.status === 502 || res.status === 504) {
      const directRes = await fetch(`${DIRECT_BACKEND}${endpoint}`, options).catch(() => null);
      if (directRes && directRes.ok) return directRes;
    }
    return res;
  } catch {
    // If proxy completely failed to connect, try direct backend call
    try {
      const directRes = await fetch(`${DIRECT_BACKEND}${endpoint}`, options);
      return directRes;
    } catch {
      throw new Error(
        'Backend Risk Engine is unreachable on http://localhost:8000. ' +
        'Please start the backend server by running: cd backend && python run.py'
      );
    }
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = 'Failed to compute risk analytics';
    try {
      const errJson = await res.json();
      detail = errJson.detail || detail;
    } catch {
      const text = await res.text().catch(() => '');
      if (text && text.length < 300) detail = text;
    }
    throw new Error(detail);
  }
  return res.json();
}

export const apiClient = {
  async getHealth() {
    const res = await fetchWithFallback('/health');
    return handleResponse(res);
  },

  async getDashboard(req: PortfolioRequest): Promise<FullDashboardResponse> {
    const res = await fetchWithFallback('/dashboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    return handleResponse<FullDashboardResponse>(res);
  },

  async runCustomStressTest(portfolioReq: PortfolioRequest, shockPct: number): Promise<StressTestResponse> {
    const res = await fetchWithFallback('/stress-test/custom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        portfolio_request: portfolioReq,
        factor_shock_pct: shockPct
      })
    });
    return handleResponse<StressTestResponse>(res);
  },

  async downloadSummaryCSV(req: PortfolioRequest) {
    const res = await fetchWithFallback('/export/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    if (!res.ok) throw new Error('Export summary failed');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bloomberg_MARS_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  async downloadReturnsCSV(req: PortfolioRequest) {
    const res = await fetchWithFallback('/export/returns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    if (!res.ok) throw new Error('Export returns failed');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Daily_Returns_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  async downloadBreachesCSV(req: PortfolioRequest) {
    const res = await fetchWithFallback('/export/breaches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    if (!res.ok) throw new Error('Export breaches failed');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VaR_Breaches_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
};
