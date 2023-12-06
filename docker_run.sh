#!/bin/bash

set -e

export $(grep -v '^#' .env | xargs)

# Configuration
SERVER_USER="ubuntu"
SERVER_IP=$SERVER_DNS
IMAGE_NAME="automation-server"
DOCKER_REPO="$DOCKER_USER/$PROJECT_NAME"
DOCKER_TAG=$(node -p "require('./package.json').version")
CONTAINER_NAME=$PROJECT_NAME
CONTAINER_PORT=8000

if [ "$INFRA" = "--infrastructure" ] ; then
  echo "hello infra"
else
  docker login --username $DOCKER_USER --password $DOCKER_PASSWORD
  docker pull $DOCKER_REPO:latest

  # Correctly handle empty output from docker container ls
  if [ "$(docker ps -a -q -f name=$CONTAINER_NAME)" != "" ]; then
    docker container stop $CONTAINER_NAME
    docker container rm $CONTAINER_NAME
  fi

  docker run -d --name $CONTAINER_NAME -p $CONTAINER_PORT:$CONTAINER_PORT \
    --network=automate-biz_postgres \
    -e DATABASE_URL=postgresql://postgres:postgres@postgres:5432/automation \
    -e CLIENT_URL=$CLIENT_URL \
    -e MEDIA_BASE_URL=$MEDIA_BASE_URL \
    -e META_APP_SECRET=$META_APP_SECRET \
    -e META_ACCESS_TOKEN=$META_ACCESS_TOKEN \
    -e WHATSAPP_BUSINESS_ID=$WHATSAPP_BUSINESS_ID \
    -e WHATSAPP_API_TOKEN=$WHATSAPP_API_TOKEN \
    -e WHATSAPP_PHONE_ID=$WHATSAPP_PHONE_ID \
    -e WHATSAPP_VERIFY_TOKEN=$WHATSAPP_VERIFY_TOKEN \
    -e GOOGLE_CLOUD_API_KEY=$GOOGLE_CLOUD_API_KEY \
    -e OPENAI_API_KEY=$OPENAI_API_KEY \
    $DOCKER_REPO:$DOCKER_TAG
fi
