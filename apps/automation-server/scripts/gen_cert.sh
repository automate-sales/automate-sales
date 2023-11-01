#!/bin/bash

# GENERATE AN SSL CERTIFICATE WITH CERTBOT
if [ -z "$1" ]; then
    echo "Usage: $0 <domain>"
    exit 1
fi

DOMAIN=$1

# Install snapd and certbot
sudo apt update
sudo apt install -y snapd
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot

# Create a symbolic link to the certbot binary
sudo ln -sf /snap/bin/certbot /usr/bin/certbot

# Generate a certificate using the standalone plugin
sudo certbot certonly --standalone -d $DOMAIN

# COPY THE CERTIFICATE INTO THE PROJECTS certs/ DIRECTORY 
CURRENT_DIR=$(pwd)
CERTS_DIR="$CURRENT_DIR/certs"
SYMLINK_FULLCHAIN="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
SYMLINK_PRIVKEY="/etc/letsencrypt/live/$DOMAIN/privkey.pem"

if [ ! -d "$CERTS_DIR" ]; then
    mkdir -p "$CERTS_DIR"
fi

if [ -L "$SYMLINK_FULLCHAIN" ] && [ -L "$SYMLINK_PRIVKEY" ]; then
    REAL_FULLCHAIN=$(readlink -f "$SYMLINK_FULLCHAIN")
    REAL_PRIVKEY=$(readlink -f "$SYMLINK_PRIVKEY")
    
    cp "$REAL_FULLCHAIN" "$CERTS_DIR/fullchain.pem"
    cp "$REAL_PRIVKEY" "$CERTS_DIR/privkey.pem"

    # UPDATE PERMISSION TO GIVE ACCESS TO THE CURRENT USER AND DOCKER
    CURRENT_USER=$(whoami)
    sudo chown "$CURRENT_USER" "$CERTS_DIR/fullchain.pem" "$CERTS_DIR/privkey.pem"
    sudo chmod 644 "$CERTS_DIR/fullchain.pem" "$CERTS_DIR/privkey.pem"
else
    echo "The symbolic links for fullchain.pem or privkey.pem do not exist"
    exit 1
fi

echo "Certificates have been copied and permissions updated"