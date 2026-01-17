#!/bin/bash
# Deploy Velox using Terraform

set -e

# Configuration
TERRAFORM_DIR=${TERRAFORM_DIR:-"./terraform/environments/local"}

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== Velox Terraform Deployment ===${NC}\n"

# Check if terraform is available
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}Error: terraform not found. Please install Terraform.${NC}"
    exit 1
fi

# Navigate to terraform directory
cd "$TERRAFORM_DIR"

# Check if terraform.tfvars exists
if [ ! -f "terraform.tfvars" ]; then
    echo -e "${YELLOW}Warning: terraform.tfvars not found${NC}"
    echo -e "${BLUE}Creating from example...${NC}"
    if [ -f "terraform.tfvars.example" ]; then
        cp terraform.tfvars.example terraform.tfvars
        echo -e "${GREEN}✓ Created terraform.tfvars from example${NC}"
        echo -e "${YELLOW}Please edit terraform.tfvars with your configuration${NC}"
    else
        echo -e "${RED}Error: terraform.tfvars.example not found${NC}"
        exit 1
    fi
fi

# Initialize Terraform
echo -e "\n${BLUE}Initializing Terraform...${NC}"
terraform init

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Terraform initialization failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Terraform initialized${NC}"

# Plan deployment
echo -e "\n${BLUE}Planning deployment...${NC}"
terraform plan -out=tfplan

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Terraform plan failed${NC}"
    exit 1
fi

# Ask for confirmation
echo -e "\n${YELLOW}Ready to apply the plan. Continue? (yes/no)${NC}"
read -r response

if [ "$response" != "yes" ]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

# Apply deployment
echo -e "\n${BLUE}Applying deployment...${NC}"
terraform apply tfplan

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✓ Deployment successful!${NC}\n"

    # Show outputs
    echo -e "${BLUE}=== Deployment Information ===${NC}"
    terraform output

    # Cleanup plan file
    rm -f tfplan

    echo -e "\n${YELLOW}=== Next Steps ===${NC}"
    echo -e "Run port forwarding:"
    echo -e "${GREEN}cd ../../.. && ./scripts/port-forward.sh${NC}"
else
    echo -e "\n${RED}✗ Deployment failed${NC}"
    exit 1
fi
