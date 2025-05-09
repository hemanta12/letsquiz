

############################
# Base image
############################
FROM python:3.13-slim AS base

# Don’t write .pyc, turn off buffering
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      build-essential \
      libpq-dev \
 && rm -rf /var/lib/apt/lists/*

# Copy & install Python deps
COPY requirements.txt .
RUN pip install --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

# Copy project code
COPY . .

############################
# Collect static (if any)
############################
RUN python manage.py collectstatic --no-input

############################
# Final image
############################
FROM base

# Expose the port Gunicorn will listen on
EXPOSE 8000

# Use Gunicorn to serve the app
CMD ["gunicorn", "core.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "3", \
     "--timeout", "120"]
