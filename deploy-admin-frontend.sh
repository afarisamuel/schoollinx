#!/bin/bash
# Ultimate Production Deployment Script for basic-sms admin-frontend (SPA)
# Usage: sudo bash deploy-admin-frontend.sh

set -e

# Configuration
APP_NAME="basic-sms-admin"
BUILD_DIR="/opt/basic-sms/admin-build"
WEB_DIR="/var/www/admin-frontend"
USER="softivite"
GROUP="www-data"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE} basic-sms Admin Frontend Ultimate Deployment${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

echo -e "${YELLOW}Phase 1: System Setup${NC}"

# Ensure Node is installed
if ! command -v node &> /dev/null
then
    echo -e "${YELLOW}Node.js is not installed. Installing Node 20...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    echo -e "${GREEN}Node.js installed successfully.${NC}"
fi

# Ensure npm/node are in PATH when running under sudo
# sudo strips the user PATH, so we need to find node/npm manually
export PATH=$PATH:/usr/bin:/usr/local/bin:/snap/bin

# Check common nvm install locations for the invoking user
SUDO_USER_HOME=$(getent passwd "${SUDO_USER:-$USER}" | cut -d: -f6)
for NVM_DIR in "$SUDO_USER_HOME/.nvm" "/root/.nvm"; do
    if [ -d "$NVM_DIR" ]; then
        NVM_NODE=$(ls "$NVM_DIR/versions/node" 2>/dev/null | sort -V | tail -1)
        [ -n "$NVM_NODE" ] && export PATH="$NVM_DIR/versions/node/$NVM_NODE/bin:$PATH"
        break
    fi
done

# Verify npm is now accessible
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm not found. Node.js may be installed via nvm for a specific user.${NC}"
    echo -e "${YELLOW}Please install Node.js system-wide first:${NC}"
    echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -"
    echo "  apt-get install -y nodejs"
    exit 1
fi

echo -e "${GREEN}✓ Node $(node -v) / npm $(npm -v) found at $(which npm)${NC}"

echo -e "${YELLOW}Installing Nginx...${NC}"
apt-get update
apt-get install -y nginx

echo -e "${YELLOW}Phase 2: Build Application${NC}"

mkdir -p "$BUILD_DIR"
chown -R $USER:$GROUP "$BUILD_DIR"

echo -e "${YELLOW}Copying files to $BUILD_DIR...${NC}"
cp -r admin-frontend/* "$BUILD_DIR/"
chown -R $USER:$GROUP "$BUILD_DIR"

cd "$BUILD_DIR"

# Capture the resolved PATH so sudo -u preserves it
RESOLVED_PATH="$PATH"

# Fix npm cache ownership in case previous root runs left root-owned files
if [ -d "/home/$USER/.npm" ]; then
    chown -R $USER:$USER "/home/$USER/.npm"
fi

echo -e "${YELLOW}Installing dependencies...${NC}"
sudo -u $USER env PATH="$RESOLVED_PATH" npm ci --legacy-peer-deps

echo -e "${YELLOW}Building the Admin Angular SPA...${NC}"
sudo -u $USER env PATH="$RESOLVED_PATH" npm run build -- --configuration production

echo -e "${YELLOW}Phase 3: Deploy to Web Directory${NC}"

mkdir -p "$WEB_DIR"
# Assuming Angular 21 builds to dist/admin-frontend/browser
cp -r dist/admin-frontend/browser/* "$WEB_DIR/"
chown -R $GROUP:$GROUP "$WEB_DIR"
chmod -R 755 "$WEB_DIR"

echo -e "${YELLOW}Phase 4: Nginx Configuration${NC}"

read -p "Do you want to configure Nginx with Cloudflare SSL for Admin? (y/n) " SETUP_SSL
if [ "$SETUP_SSL" = "y" ]; then
    read -p "Enter your domain (e.g. admin.yourdomain.com): " DOMAIN
    
    mkdir -p /etc/nginx/ssl/$DOMAIN
    
    if [ ! -f "/etc/nginx/ssl/$DOMAIN/cert.pem" ]; then
        echo "Please paste your Cloudflare Origin Certificate (Ctrl+D to save):"
        cat > /etc/nginx/ssl/$DOMAIN/cert.pem
    else
        echo -e "${GREEN}✓ Cloudflare Origin Certificate already exists${NC}"
    fi
    
    if [ ! -f "/etc/nginx/ssl/$DOMAIN/key.pem" ]; then
        echo "Please paste your Cloudflare Private Key (Ctrl+D to save):"
        cat > /etc/nginx/ssl/$DOMAIN/key.pem
    else
        echo -e "${GREEN}✓ Cloudflare Private Key already exists${NC}"
    fi
    
    cat << EOF > /etc/nginx/sites-available/$APP_NAME
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name hq.$DOMAIN;

    root $WEB_DIR;
    index index.html;

    ssl_certificate /etc/nginx/ssl/$DOMAIN/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/$DOMAIN/key.pem;

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
else
    cat << EOF > /etc/nginx/sites-available/$APP_NAME
server {
    listen 80;
    server_name _;
    
    root $WEB_DIR;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
fi

ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
systemctl restart nginx

echo -e "${GREEN}Admin Frontend Deployment completed successfully!${NC}"
