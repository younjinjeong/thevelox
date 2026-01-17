#!/bin/bash
# Build Docker image for Velox application

set -e

# Configuration
IMAGE_NAME=${IMAGE_NAME:-"velox-backend"}
IMAGE_TAG=${IMAGE_TAG:-"latest"}
DOCKERFILE_PATH=${DOCKERFILE_PATH:-"./docker/Dockerfile"}

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Building Docker image: ${IMAGE_NAME}:${IMAGE_TAG}${NC}"

# Check if Dockerfile exists
if [ ! -f "$DOCKERFILE_PATH" ]; then
    echo -e "${RED}Error: Dockerfile not found at $DOCKERFILE_PATH${NC}"
    exit 1
fi

# Build the Docker image
echo -e "${BLUE}Running docker build...${NC}"
docker build \
    -t "${IMAGE_NAME}:${IMAGE_TAG}" \
    -f "${DOCKERFILE_PATH}" \
    .

# Check build status
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Docker image built successfully: ${IMAGE_NAME}:${IMAGE_TAG}${NC}"

    # Display image info
    echo -e "\n${BLUE}Image details:${NC}"
    docker images "${IMAGE_NAME}:${IMAGE_TAG}"

    # Show image size
    IMAGE_SIZE=$(docker images "${IMAGE_NAME}:${IMAGE_TAG}" --format "{{.Size}}")
    echo -e "\n${GREEN}Image size: ${IMAGE_SIZE}${NC}"

    echo -e "\n${BLUE}To run the container:${NC}"
    echo "docker run -p 3000:3000 ${IMAGE_NAME}:${IMAGE_TAG}"
else
    echo -e "${RED}✗ Docker build failed${NC}"
    exit 1
fi
