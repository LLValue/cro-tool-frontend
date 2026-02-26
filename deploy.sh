#!/bin/bash
set -e

# ============================================
# Cloud Run Deploy Script
# ============================================

# Configuration - modify these values
PROJECT_ID="stone-notch-483715-k4"
REGION="${GCP_REGION:-europe-west1}"
SERVICE_NAME="cro-tool-frontend"
REPO_NAME="cro-tool-frontend"
IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Deploying ${SERVICE_NAME} to Cloud Run${NC}"
echo -e "${YELLOW}========================================${NC}"

# Check if PROJECT_ID is set
if [ "$PROJECT_ID" = "your-project-id" ]; then
    echo -e "${RED}Error: Set GCP_PROJECT_ID environment variable${NC}"
    echo "  export GCP_PROJECT_ID=your-actual-project-id"
    exit 1
fi

echo -e "\n${GREEN}1. Building Docker image...${NC}"
docker build -t ${IMAGE_NAME} .

echo -e "\n${GREEN}2. Pushing image to Container Registry...${NC}"
docker push ${IMAGE_NAME}

echo -e "\n${GREEN}3. Deploying to Cloud Run...${NC}"
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME} \
    --platform managed \
    --region ${REGION} \
    --project ${PROJECT_ID} \
    --allow-unauthenticated \
    --timeout=600 \
    --min-instances=1

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Deploy complete!${NC}"
echo -e "${GREEN}========================================${NC}"
