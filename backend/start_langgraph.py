"""LangGraph dev launcher with Windows-compatible event loop.

Fixes psycopg "cannot use ProactorEventLoop" on Windows by forcing
SelectorEventLoop before any async code runs.

Usage:
    uv run python start_langgraph.py --no-browser --no-reload --n-jobs-per-worker 10 --host 0.0.0.0
"""

import asyncio
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from langgraph_cli.cli import cli

dev_cmd = cli.commands["dev"]
sys.argv = ["langgraph"] + sys.argv[1:]
dev_cmd.main(standalone_mode=True)
