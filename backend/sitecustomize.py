"""Process-wide Python startup tweaks for DeerFlow.

This module is auto-imported by Python's ``site`` module when present on
``sys.path``. We use it to enforce a Windows event loop policy compatible with
psycopg's async APIs across *all* entrypoints and child processes.
"""

from __future__ import annotations

import asyncio
import sys


if sys.platform == "win32":
    # psycopg async connections are incompatible with ProactorEventLoop.
    # Enforce SelectorEventLoop globally as early as possible.
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
