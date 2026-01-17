#!/bin/bash

# Deploy Velox Frontend to Kubernetes
# Usage: ./scripts/deploy-frontend.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo "Deploying Velox Frontend to Kubernetes"
echo "=========================================="

# Check if velox-frontend release exists
if helm list | grep -q "velox-frontend"; then
    echo "Upgrading existing velox-frontend release..."
    helm upgrade velox-frontend "$PROJECT_ROOT/helm/velox-frontend" \
        -f "$PROJECT_ROOT/helm/velox-frontend/values-dev.yaml"
else
    echo "Installing new velox-frontend release..."
    helm install velox-frontend "$PROJECT_ROOT/helm/velox-frontend" \
        -f "$PROJECT_ROOT/helm/velox-frontend/values-dev.yaml"
fi

echo ""
echo "Waiting for deployment to be ready..."
kubectl rollout status deployment/velox-frontend --timeout=120s

echo ""
echo "=========================================="
echo "Frontend deployment complete!"
echo "=========================================="
echo ""
echo "To access the frontend, run:"
echo "  kubectl port-forward svc/velox-frontend 8080:80"
echo ""
echo "Then open: http://localhost:8080"
echo ""
