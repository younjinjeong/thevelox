#!/bin/bash

# Build Velox Frontend Docker Image
# Usage: ./scripts/build-frontend.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo "Building Velox Frontend Docker Image"
echo "=========================================="

# Navigate to frontend directory
cd "$PROJECT_ROOT/frontend"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build the frontend
echo "Building frontend..."
npm run build

# Build Docker image
echo "Building Docker image..."
docker build -t velox-frontend:latest .

echo ""
echo "=========================================="
echo "Frontend build complete!"
echo "=========================================="
echo ""
echo "To deploy to Kubernetes, run:"
echo "  helm install velox-frontend ./helm/velox-frontend -f ./helm/velox-frontend/values-dev.yaml"
echo ""
