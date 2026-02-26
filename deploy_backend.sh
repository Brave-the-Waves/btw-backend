#!/bin/bash

# Stops script if any command fails
set -e 

PROJECT_ID="brave-the-waves-backend"
REGION="northamerica-northeast1"
REPO_NAME="btw-backend-repo"
IMAGE_NAME="server"
TAG="latest"

echo "🚀 Starting Backend Deployment..."

# 1. Initialize Terraform (to ensure APIs are enabled and Repo exists)
cd terraform
terraform init
terraform apply -target=google_artifact_registry_repository.repo -auto-approve
cd ..

# 2. Build and Push Docker Image
echo "📦 Building Docker Image..."
gcloud auth configure-docker ${REGION}-docker.pkg.dev
docker build --platform linux/amd64 -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${IMAGE_NAME}:${TAG} .
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${IMAGE_NAME}:${TAG}

# 3. Deploy Infrastructure
echo "🏗 Applying Terraform..."
cd terraform
# We pass the image URL dynamically
terraform apply -auto-approve \
  -var="container_image=${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${IMAGE_NAME}:${TAG}"

echo "✅ Backend Deployed Successfully!"