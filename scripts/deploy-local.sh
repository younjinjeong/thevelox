#!/bin/bash
# Deploy Velox to local Docker Desktop Kubernetes using Helm

set -e

# Configuration
NAMESPACE=${NAMESPACE:-"velox-dev"}
RELEASE_NAME=${RELEASE_NAME:-"velox"}
CHART_PATH=${CHART_PATH:-"./helm/velox"}
VALUES_FILE=${VALUES_FILE:-"./helm/velox/values-dev.yaml"}

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Velox Local Deployment ===${NC}\n"

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl not found. Please install kubectl.${NC}"
    exit 1
fi

# Check if helm is available
if ! command -v helm &> /dev/null; then
    echo -e "${RED}Error: helm not found. Please install Helm.${NC}"
    exit 1
fi

# Check Kubernetes cluster connectivity
echo -e "${BLUE}Checking Kubernetes cluster...${NC}"
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}Error: Cannot connect to Kubernetes cluster.${NC}"
    echo -e "${YELLOW}Make sure Docker Desktop Kubernetes is running.${NC}"
    exit 1
fi

CURRENT_CONTEXT=$(kubectl config current-context)
echo -e "${GREEN}✓ Connected to: ${CURRENT_CONTEXT}${NC}\n"

# Add Bitnami Helm repository for MongoDB and Redis
echo -e "${BLUE}Adding Bitnami Helm repository...${NC}"
helm repo add bitnami https://charts.bitnami.com/bitnami || true
helm repo update
echo -e "${GREEN}✓ Helm repositories updated${NC}\n"

# Update Helm dependencies
echo -e "${BLUE}Updating Helm chart dependencies...${NC}"
cd "$CHART_PATH"
helm dependency update
cd - > /dev/null
echo -e "${GREEN}✓ Dependencies updated${NC}\n"

# Create namespace if it doesn't exist
echo -e "${BLUE}Creating namespace: ${NAMESPACE}${NC}"
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
echo -e "${GREEN}✓ Namespace ready${NC}\n"

# Deploy or upgrade Helm release
echo -e "${BLUE}Deploying Velox with Helm...${NC}"
helm upgrade --install "$RELEASE_NAME" "$CHART_PATH" \
    --namespace "$NAMESPACE" \
    --values "$VALUES_FILE" \
    --wait \
    --timeout 10m

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✓ Deployment successful!${NC}\n"

    # Display deployment status
    echo -e "${BLUE}=== Deployment Status ===${NC}"
    kubectl get all -n "$NAMESPACE"

    echo -e "\n${BLUE}=== Persistent Volumes ===${NC}"
    kubectl get pvc -n "$NAMESPACE"

    # Get service information
    SERVICE_NAME="${RELEASE_NAME}-velox"
    echo -e "\n${BLUE}=== Service Information ===${NC}"
    kubectl get svc "$SERVICE_NAME" -n "$NAMESPACE"

    # Instructions for accessing the application
    echo -e "\n${YELLOW}=== Access Instructions ===${NC}"
    echo -e "To access Velox locally, run:"
    echo -e "${GREEN}kubectl port-forward -n $NAMESPACE svc/$SERVICE_NAME 3000:3000${NC}"
    echo -e "\nThen open: ${GREEN}http://localhost:3000${NC}"

    echo -e "\nOr add to /etc/hosts (Linux/Mac) or C:\\Windows\\System32\\drivers\\etc\\hosts (Windows):"
    echo -e "${GREEN}127.0.0.1 velox.local${NC}"
    echo -e "And access via: ${GREEN}http://velox.local${NC} (requires ingress controller)"

    # Logs command
    echo -e "\n${YELLOW}=== Useful Commands ===${NC}"
    echo -e "View logs:"
    echo -e "${GREEN}kubectl logs -n $NAMESPACE -l app.kubernetes.io/name=velox -f${NC}"
    echo -e "\nView pods:"
    echo -e "${GREEN}kubectl get pods -n $NAMESPACE${NC}"
    echo -e "\nUninstall:"
    echo -e "${GREEN}helm uninstall $RELEASE_NAME -n $NAMESPACE${NC}"
else
    echo -e "\n${RED}✗ Deployment failed${NC}"
    echo -e "${YELLOW}Check logs with:${NC}"
    echo -e "${GREEN}kubectl logs -n $NAMESPACE -l app.kubernetes.io/name=velox${NC}"
    exit 1
fi
