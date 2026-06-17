FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for postgres
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Set environment variables
ENV PYTHONPATH=/app
ENV DATABASE_TYPE=postgres

CMD ["python", "run.py"]
