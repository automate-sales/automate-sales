#!/bin/bash

set -e

# Navigate to the root of the TurboRepo if not already there
#cd "$(dirname "$0")"
#cd ..

# Load environment variables
export $(grep -v '^#' .env | xargs)

# Build the automation-server app
pnpm install
npx turbo build --filter=automation-server

# Configuration for Docker
SERVER_USER="ubuntu"
SERVER_IP=$SERVER_DNS
IMAGE_NAME="automation-server"
DOCKER_REPO="$DOCKER_USER/$PROJECT_NAME"
DOCKER_TAG=$(node -p "require('./package.json').version")
CONTAINER_NAME=$PROJECT_NAME

# Build the Docker image
docker build -t $DOCKER_REPO:$DOCKER_TAG -f apps/automation-server/Dockerfile .

# Optionally tag as latest
docker tag $DOCKER_REPO:$DOCKER_TAG $DOCKER_REPO:latest

# Push to Docker registry
docker push $DOCKER_REPO:$DOCKER_TAG
docker push $DOCKER_REPO:latest
