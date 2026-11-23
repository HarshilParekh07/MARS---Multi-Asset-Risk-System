"""CLI runner to launch backend with uvicorn."""
import os
import sys
from pathlib import Path

# Ensure backend root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

import uvicorn
from app.main import app

if __name__ == "__main__":
    print(">>> Starting Bloomberg MARS Risk Analytics Engine on http://127.0.0.1:8000 ...")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
