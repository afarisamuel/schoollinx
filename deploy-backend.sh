#!/bin/bash
# Ultimate Production Deployment Script for basic-sms backend
# Usage: sudo bash deploy-backend.sh

set -e

# Configuration
APP_NAME="basic-sms-backend"
APP_DIR="/opt/basic-sms/backend"
USER="softivite"
GROUP="www-data"
DOMAIN="schoollinx.com"

# Database Configuration (set these before running the script)
DB_NAME=""
DB_USER=""
DB_PASSWORD=""

# Cloudflare Cache Purge (optional - fill in to auto-purge on deploy)
CF_ZONE_ID=""
CF_API_TOKEN=""

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
echo -e "${BLUE} basic-sms Backend Ultimate Deployment${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

echo -e "${YELLOW}Phase 1: System Setup${NC}"

# Ensure Go and common bin dirs are in PATH when running under sudo
export PATH=$PATH:/usr/local/go/bin:/usr/bin:/usr/local/bin:/snap/bin

# Find Go executable or install if missing
GO_BIN=$(command -v go || true)
if [ -z "$GO_BIN" ]; then
    echo -e "${YELLOW}Go is not installed. Installing Go...${NC}"
    LATEST_GO=$(curl -s "https://go.dev/VERSION?m=text" | head -1)
    [ -z "$LATEST_GO" ] && LATEST_GO="go1.24.1"
    wget -q "https://go.dev/dl/${LATEST_GO}.linux-amd64.tar.gz"
    rm -rf /usr/local/go
    tar -C /usr/local -xzf "${LATEST_GO}.linux-amd64.tar.gz"
    rm "${LATEST_GO}.linux-amd64.tar.gz"
    export PATH=$PATH:/usr/local/go/bin
    echo "export PATH=\$PATH:/usr/local/go/bin" >> /etc/profile
    GO_BIN="/usr/local/go/bin/go"
    echo -e "${GREEN}Go (${LATEST_GO}) installed successfully.${NC}"
fi

echo -e "${GREEN}✓ Go $($GO_BIN version) found at $GO_BIN${NC}"

# Ensure system dependencies
echo -e "${YELLOW}Installing system dependencies (git, curl, make, postgresql, nginx)...${NC}"
apt-get update
apt-get install -y git curl make postgresql nginx

echo -e "${YELLOW}Phase 2: Application Setup${NC}"

# Ensure app directory exists
mkdir -p "$APP_DIR"
chown -R $USER:$GROUP "$APP_DIR"

echo -e "${YELLOW}Copying files to $APP_DIR...${NC}"
# Assuming we run this from the project root
cp -a backend/. "$APP_DIR/"
chown -R $USER:$GROUP "$APP_DIR"

cd "$APP_DIR"

# echo -e "${YELLOW}Phase 2.5: Database Setup and Backups${NC}"

# echo -e "${YELLOW}Do you want to set up the PostgreSQL database?${NC}"
# echo "   1) Yes - Create database and user"
# echo "   2) No - Skip database creation"
# read -p "   Enter choice [1-2]: " DB_SETUP_CHOICE

# if [ "$DB_SETUP_CHOICE" = "1" ]; then
#     [ -z "$DB_NAME" ] && read -p "Enter Database Name (e.g. sms): " DB_NAME
#     [ -z "$DB_USER" ] && read -p "Enter Database User: " DB_USER
#     if [ -z "$DB_PASSWORD" ]; then
#         read -s -p "Enter Database Password: " DB_PASSWORD
#         echo ""
#     fi
    
#     echo -e "${YELLOW}Creating PostgreSQL database...${NC}"
#     sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" || echo "Database already exists"
#     sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" || echo "User already exists"
#     sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
#     sudo -u postgres psql -c "ALTER DATABASE $DB_NAME OWNER TO $DB_USER;"
#     echo -e "${GREEN}✓ Database configured${NC}"
# fi

# echo -e "${YELLOW}Do you want to set up automated daily backups?${NC}"
# echo "   1) Yes - Configure daily backups (30 day retention)"
# echo "   2) No - Skip backup configuration"
# read -p "   Enter choice [1-2]: " BACKUP_CHOICE

# if [ "$BACKUP_CHOICE" = "1" ]; then
#     if [ -z "$DB_NAME" ]; then
#         read -p "Enter Database Name to backup: " DB_NAME
#     fi
#     BACKUP_DIR="/opt/basic-sms/backups/postgres"
#     mkdir -p $BACKUP_DIR
#     chown -R postgres:postgres /opt/basic-sms/backups

#     cat << 'BACKUP_SCRIPT' > $APP_DIR/backup_postgres.sh
# #!/bin/bash
# # Automated PostgreSQL backup script
# DB_NAME="REPLACE_ME"
# BACKUP_DIR="/opt/basic-sms/backups/postgres"
# DATE=\$(date +"%Y%m%d_%H%M%S")
# RETENTION_DAYS=30
# BACKUP_FILE="\$BACKUP_DIR/\${DB_NAME}_\${DATE}.sql.gz"

# mkdir -p \$BACKUP_DIR
# sudo -u postgres pg_dump \$DB_NAME | gzip > \$BACKUP_FILE
# find \$BACKUP_DIR -name "*.sql.gz" -type f -mtime +\$RETENTION_DAYS -delete
# echo "Backup completed: \$BACKUP_FILE"
# BACKUP_SCRIPT

#     sed -i "s/REPLACE_ME/$DB_NAME/g" $APP_DIR/backup_postgres.sh
#     chmod +x $APP_DIR/backup_postgres.sh
    
#     (crontab -l 2>/dev/null; echo "0 2 * * * $APP_DIR/backup_postgres.sh >> $APP_DIR/backup.log 2>&1") | crontab -
#     echo -e "${GREEN}✓ Automated backups configured (daily at 2 AM)${NC}"
# fi


echo -e "${YELLOW}Phase 3: Configuration${NC}"
echo -e "${YELLOW}Set up .env configuration?${NC}"
echo "Your .env file is required before running migrations."
if [ ! -f "$APP_DIR/.env" ]; then
    if [ -f "$APP_DIR/.env.example" ]; then
        echo -e "${RED}⚠ No .env found at $APP_DIR/.env${NC}"
        echo "Copying .env.example to .env..."
        sudo -u $USER cp "$APP_DIR/.env.example" "$APP_DIR/.env"
        read -p "Please edit $APP_DIR/.env now in another terminal if needed. Press ENTER to continue:"
    else
        echo -e "${RED}⚠ No .env and no .env.example found!${NC}"
    fi
else
    echo -e "${GREEN}✓ .env found at $APP_DIR/.env${NC}"
fi

# Ensure GIN_MODE=release is in .env
if [ -f "$APP_DIR/.env" ]; then
    if ! grep -q "GIN_MODE" "$APP_DIR/.env"; then
        echo "GIN_MODE=release" >> "$APP_DIR/.env"
        echo -e "${GREEN}✓ Added GIN_MODE=release to .env${NC}"
    else
        sed -i 's/^GIN_MODE=.*/GIN_MODE=release/' "$APP_DIR/.env"
        echo -e "${GREEN}✓ Ensured GIN_MODE=release in .env${NC}"
    fi
fi

echo -e "${YELLOW}Phase 4: Build and Deploy${NC}"

RESOLVED_PATH="$PATH"

echo -e "${YELLOW}Downloading Go modules...${NC}"
sudo -u $USER env PATH="$RESOLVED_PATH" "$GO_BIN" mod tidy

echo -e "${YELLOW}Building the Go application...${NC}"
sudo -u $USER env PATH="$RESOLVED_PATH" "$GO_BIN" build -o bin/server main.go

echo ""
# echo -e "${YELLOW}Do you want to run database migrations?${NC}"
# echo "   1) Yes"
# echo "   2) No"
# read -p "   Enter choice [1-2]: " MIGRATE_CHOICE
# if [ "$MIGRATE_CHOICE" = "1" ]; then
#     echo -e "${YELLOW}Running migrations...${NC}"
#     sudo -u $USER /usr/local/go/bin/go run ./cmd/migrate up || echo -e "${RED}Migration failed${NC}"
# fi

echo -e "${YELLOW}Phase 5: Service Setup${NC}"

cat << EOF > /etc/systemd/system/$APP_NAME.service
[Unit]
Description=Basic SMS Backend Service
After=network.target postgresql.service

[Service]
User=$USER
Group=$GROUP
WorkingDirectory=$APP_DIR
ExecStart=$APP_DIR/bin/server
Restart=always
RestartSec=5
EnvironmentFile=$APP_DIR/.env

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable $APP_NAME
systemctl restart $APP_NAME

echo -e "${YELLOW}Phase 6: Nginx Configuration${NC}"

    cat << 'NGINX_EOF' > /etc/nginx/sites-available/$APP_NAME
# ── WebSocket connection upgrade map ────────────────────────────────────────
# This MUST be in the http{} context. For sites-available configs included by
# nginx, it is placed here at file scope — nginx accepts this.
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

# Backend API + WebSocket server (api.schoollinx.com)
# Cloudflare terminates TLS and forwards plain HTTP on port 80 to origin.
# Do NOT redirect 80 → 443 here — that creates an infinite redirect loop
# when Cloudflare's SSL mode is Flexible or Full (non-strict).
server {
    listen 80;
    server_name api.schoollinx.com;

    # Block raw IP-based access
    if ($host ~* "^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$") {
        return 444;
    }

    # ── WebSocket endpoints ─────────────────────────────────────────────────
    # Must be listed before location / so they get the long timeout.
    location /ws/ {
        proxy_pass          http://localhost:8080;
        proxy_http_version  1.1;
        proxy_set_header    Upgrade           $http_upgrade;
        proxy_set_header    Connection        $connection_upgrade;
        proxy_set_header    Host              $host;
        proxy_set_header    X-Real-IP         $remote_addr;
        proxy_set_header    X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header    X-Forwarded-Proto $http_x_forwarded_proto;
        proxy_read_timeout  3600s;   # keep WS connections alive for 1 hour
        proxy_send_timeout  3600s;
    }

    location /api/ws {
        proxy_pass          http://localhost:8080;
        proxy_http_version  1.1;
        proxy_set_header    Upgrade           $http_upgrade;
        proxy_set_header    Connection        $connection_upgrade;
        proxy_set_header    Host              $host;
        proxy_set_header    X-Real-IP         $remote_addr;
        proxy_set_header    X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header    X-Forwarded-Proto $http_x_forwarded_proto;
        proxy_read_timeout  3600s;
        proxy_send_timeout  3600s;
    }

    # ── Regular HTTP API ────────────────────────────────────────────────────
    location / {
        proxy_pass         http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $http_x_forwarded_proto;
        proxy_read_timeout 120s;
    }
}
NGINX_EOF

ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/

# Remove default site — it conflicts with our server_name
rm -f /etc/nginx/sites-enabled/default

# Validate and reload (not restart — reload is zero-downtime)
nginx -t && systemctl reload nginx && echo -e "${GREEN}✓ Nginx reloaded${NC}" || {
    echo -e "${RED}✗ Nginx config test failed — check above${NC}"
    exit 1
}


# Purge Cloudflare cache if credentials are set
if [ -n "$CF_ZONE_ID" ] && [ -n "$CF_API_TOKEN" ]; then
    echo -e "${YELLOW}Purging Cloudflare cache...${NC}"
    CF_RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/purge_cache" \
        -H "Authorization: Bearer $CF_API_TOKEN" \
        -H "Content-Type: application/json" \
        --data '{"purge_everything":true}')
    if echo "$CF_RESPONSE" | grep -q '"success":true'; then
        echo -e "${GREEN}✓ Cloudflare cache purged successfully${NC}"
    else
        echo -e "${RED}⚠ Cloudflare purge may have failed: $CF_RESPONSE${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Cloudflare credentials not set — skipping cache purge${NC}"
    echo -e "${YELLOW}  Set CF_ZONE_ID and CF_API_TOKEN in this script to enable auto-purge${NC}"
fi

echo -e "${GREEN}Backend Deployment completed successfully!${NC}"
echo -e "${BLUE}Check status with: sudo systemctl status $APP_NAME${NC}"
