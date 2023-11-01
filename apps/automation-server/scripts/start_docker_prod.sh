#!/bin/sh

# Check if the container exists
container_exists=$(docker ps -a -f "name=torus-automations" -q)

# If the container exists, start it
if [ -n "$container_exists" ]; then
  docker start -i torus-automations
else
  # If the container doesn't exist, create a new one with ssl enabled
  docker run -d -p 443:8000 --name torus-automations --env SSL_ENABLED=true torus-automations
fi