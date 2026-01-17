#!/bin/bash
# Port-forward Velox service to localhost for easy access

set -e

# Configuration
NAMESPACE=${NAMESPACE:-"velox-dev"}
SERVICE_NAME=${SERVICE_NAME:-"velox-velox"}
LOCAL_PORT=${LOCAL_PORT:-"3000"}
SERVICE_PORT=${SERVICE_PORT:-"3000"}

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}Setting up port forwarding for Velox...${NC}\n"

# Check if service exists
if ! kubectl get svc "$SERVICE_NAME" -n "$NAMESPACE" &> /dev/null; then
    echo -e "${YELLOW}Service $SERVICE_NAME not found in namespace $NAMESPACE${NC}"
    echo -e "${BLUE}Available services:${NC}"
    kubectl get svc -n "$NAMESPACE"
    exit 1
fi

echo -e "${GREEN}✓ Service found: $SERVICE_NAME${NC}"
echo -e "${BLUE}Forwarding ${LOCAL_PORT}:${SERVICE_PORT}...${NC}\n"
echo -e "${GREEN}Access Velox at: http://localhost:${LOCAL_PORT}${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}\n"

kubectl port-forward -n "$NAMESPACE" "svc/$SERVICE_NAME" "${LOCAL_PORT}:${SERVICE_PORT}"
