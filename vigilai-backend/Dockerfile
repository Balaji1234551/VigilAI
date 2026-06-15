FROM python:3.11-slim

# Install graphics, networking and compilation utilities
RUN apt-get update && apt-get install -y \
    build-essential \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libgomp1 \
    ffmpeg \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency specifications first to leverage Docker build cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all codebase files
COPY . .

# Ensure recordings, clips, and snapshots folders are present
RUN mkdir -p recordings clips snapshots

# Expose Uvicorn listening port
EXPOSE 8000

# Run FastAPI server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
