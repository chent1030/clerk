"""Gateway API launcher with Windows-compatible event loop.

Usage:
    PYTHONPATH=. uv run python start_gateway.py
"""

import asyncio
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import uvicorn
from app.gateway.app import app

uvicorn.run(app, host="0.0.0.0", port=8001, loop="asyncio")
