"""Procrastinate background worker application definition."""

import os
import procrastinate

# Get PostgreSQL connection string for Psycopg (remove +asyncpg driver prefix if present)
raw_db_url = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@db:5432/ai_tech_consultant",
)
db_url = raw_db_url.replace("postgresql+asyncpg://", "postgresql://")

app = procrastinate.App(
    connector=procrastinate.PsycopgConnector(conninfo=db_url),
    import_paths=["shared.worker"],
)


@app.task(name="shared.worker.ping")
async def ping() -> str:
    """Basic background task to verify worker execution."""
    return "pong"
