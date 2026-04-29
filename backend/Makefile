install:
	uv sync

dev:
	uv run langgraph dev --no-browser --no-reload --n-jobs-per-worker 10 --host 0.0.0.0

dev-win:
	PYTHONPATH=. uv run python start_langgraph.py --no-browser --no-reload --n-jobs-per-worker 10 --host 0.0.0.0

gateway-win:
	PYTHONPATH=. uv run python start_gateway.py

gateway:
	PYTHONPATH=. uv run uvicorn app.gateway.app:app --host 0.0.0.0 --port 8001

test:
	PYTHONPATH=. uv run pytest tests/ -v

lint:
	uvx ruff check .
	uvx ruff format --check .

format:
	uvx ruff check . --fix && uvx ruff format .
