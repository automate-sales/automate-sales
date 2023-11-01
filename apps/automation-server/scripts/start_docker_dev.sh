#!/bin/sh

# Check if the container exists
container_exists=$(docker ps -a -f "name=torus-automations" -q)

# If the container exists, start it
if [ -n "$container_exists" ]; then
  docker start -i torus-automations
else
  # If the container doesn't exist, create a new one
  docker run -p 80:8000 --name torus-automations torus-automations
fi