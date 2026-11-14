FROM python:3.14-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app

WORKDIR /app

# Install system dependencies required for compiling C-extensions and health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy pyproject.toml and install Python dependencies
COPY pyproject.toml /app/
RUN pip install --no-cache-dir --upgrade pip && \
    python -c "import tomllib; deps = tomllib.load(open('pyproject.toml', 'rb'))['project']['dependencies']; import subprocess, sys; subprocess.check_call([sys.executable, '-m', 'pip', 'install', *deps])"

# Copy application repository
COPY . /app/

# Install application package
RUN pip install --no-cache-dir --no-deps -e .

EXPOSE 8000

CMD ["uvicorn", "shared.main:app", "--host", "0.0.0.0", "--port", "8000"]
