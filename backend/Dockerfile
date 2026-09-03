FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (geospatial libs + OpenCV/FFmpeg video codecs)
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    curl \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Pre-install CPU-only PyTorch & TorchVision for fast, lightweight inference
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Install backend & ML dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code and ML pipeline package into container
COPY backend /app
COPY ml /app/ml

ENV PYTHONPATH="/app"
ENV MOCK_ML_MODE="false"

# Start uvicorn server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

