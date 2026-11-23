"""Integration tests for FastAPI endpoints."""
from fastapi.testclient import TestClient
import pytest
from app.main import app

def test_health_endpoint():
    with TestClient(app) as client:
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "MARS" in data["engine"]

def test_dashboard_endpoint_validation():
    with TestClient(app) as client:
        response = client.post("/api/dashboard", json={"tickers": [], "portfolio_value": -100})
        assert response.status_code == 422
