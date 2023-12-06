#!/bin/bash

set -e

export $(grep -v '^#' .env | xargs)

INFRA=$1

# Configuration
SERVER_USER="ubuntu"
SERVER_IP=$SERVER_DNS
IMAGE_NAME="automation-server"
DOCKER_REPO="$DOCKER_USER/$PROJECT_NAME"
DOCKER_TAG=$(node -p "require('./package.json').version")
CONTAINER_NAME=$PROJECT_NAME
CONTAINER_PORT=8000

pnpm install

echo "Building Docker image..."
docker build -t $IMAGE_NAME -f apps/automation-server/Dockerfile .

echo "Tagging the image..."
docker tag $IMAGE_NAME $DOCKER_REPO:$DOCKER_TAG
docker tag $IMAGE_NAME $DOCKER_REPO:latest

echo "Pushing the image to the registry..."
docker push $DOCKER_REPO:$DOCKER_TAG
docker push $DOCKER_REPO:latest

if [ "$INFRA" = "--infrastructure" ] ; then
  echo "Deploying infrastructure..."
  # Set Environment variables

  # Configuration variables
  export TF_VAR_DOCKER_USER=$DOCKER_USER
  export TF_VAR_DOCKER_PASSWORD=$DOCKER_PASSWORD
  export TF_VAR_PROJECT_NAME=$PROJECT_NAME
  export TF_VAR_SERVER_DOMAIN=$SERVER_DOMAIN
  export TF_VAR_EC2_KEY_PAIR=$EC2_KEY_PAIR
  export TF_VAR_PROJECT_REPO=$PROJECT_REPO

  # client variables
  export TF_VAR_SERVER_URL=$SERVER_URL
  export TF_VAR_MONDAY_URL=$MONDAY_URL
  export TF_VAR_EMAIL_HOST=$EMAIL_HOST
  export TF_VAR_EMAIL_USER=$EMAIL_USER
  export TF_VAR_EMAIL_PASSWORD=$EMAIL_PASSWORD

  # server variables
  export TF_VAR_CLIENT_URL=$CLIENT_URL
  export TF_VAR_MEDIA_BASE_URL=$MEDIA_BASE_URL
  export TF_VAR_META_APP_SECRET=$META_APP_SECRET
  export TF_VAR_META_ACCESS_TOKEN=$META_ACCESS_TOKEN
  export TF_VAR_WHATSAPP_BUSINESS_ID=$WHATSAPP_BUSINESS_ID
  export TF_VAR_WHATSAPP_API_TOKEN=$WHATSAPP_API_TOKEN
  export TF_VAR_WHATSAPP_PHONE_ID=$WHATSAPP_PHONE_ID
  export TF_VAR_WHATSAPP_VERIFY_TOKEN=$WHATSAPP_VERIFY_TOKEN
  export TF_VAR_GOOGLE_CLOUD_API_KEY=$GOOGLE_CLOUD_API_KEY
  export TF_VAR_OPENAI_API_KEY=$OPENAI_API_KEY

  # Terraform commands
  terraform init
  terraform validate
  terraform plan -out=plan && read -p "Apply this plan? (y/n) " confirm
  if [[ $confirm == [yY] ]]; then
    terraform apply plan
  else
    echo "Plan not applied."
  fi
else
  echo "Deploying Docker image to the server..."
  ssh $SERVER_USER@$SERVER_IP << EOF
    docker pull $DOCKER_REPO:latest
    if [ \$(docker container ls -q -f name=$CONTAINER_NAME) != '' ]; then
        docker container stop $CONTAINER_NAME
        docker container rm $CONTAINER_NAME
    fi
    docker run -d --name $CONTAINER_NAME -p $CONTAINER_PORT:$CONTAINER_PORT \
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
EOF
fi
