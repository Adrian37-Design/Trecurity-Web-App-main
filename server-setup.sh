#!/bin/bash

##############################################################################
# Trecurity Server Setup Script for Contabo
# Run this script ONCE on a fresh server to set up the environment
##############################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "========================================="
echo "Trecurity Server Setup"
echo "========================================="
echo ""

# Database password must be provided via environment variable
DB_PASS="${DB_PASS:?'DB_PASS must be set before running this script (e.g. export DB_PASS=yourpassword)'}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}✗${NC} Please run this script as root (use sudo)"
    exit 1
fi

print_step() {
    echo ""
    echo -e "${BLUE}==>${NC} $1"
    echo "-----------------------------------"
}

print_step "Step 1: Updating System Packages"
apt-get update
apt-get upgrade -y
echo -e "${GREEN}✓${NC} System updated"

print_step "Step 2: Installing Essential Build Tools"
apt-get install -y build-essential curl wget git
echo -e "${GREEN}✓${NC} Build tools installed"

print_step "Step 3: Installing Node.js v20 LTS"
# Remove old Node.js if exists
apt-get remove -y nodejs npm || true

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verify installation
NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
echo -e "${GREEN}✓${NC} Node.js $NODE_VERSION installed"
echo -e "${GREEN}✓${NC} npm $NPM_VERSION installed"

print_step "Step 4: Installing PM2 Process Manager"
npm install -g pm2
PM2_VERSION=$(pm2 -v)
echo -e "${GREEN}✓${NC} PM2 $PM2_VERSION installed"

print_step "Step 5: Installing MySQL Server"
# Check if MySQL is already installed
if command -v mysql &> /dev/null; then
    echo -e "${GREEN}✓${NC} MySQL already installed"
    mysql --version
else
    echo "Installing MySQL Server..."
    apt-get install -y mysql-server
    
    # Start MySQL service
    systemctl start mysql
    systemctl enable mysql
    
    echo -e "${GREEN}✓${NC} MySQL Server installed"
fi

print_step "Step 6: Configuring MySQL Database"
# Note: Update the password in the script or ask user to run mysql_secure_installation
echo "Creating Trecurity database..."

# Create database and user (adjust password as needed)
mysql -u root <<MYSQL_SCRIPT
CREATE DATABASE IF NOT EXISTS trecurity CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'root'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON trecurity.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
MYSQL_SCRIPT

echo -e "${GREEN}✓${NC} Database 'trecurity' created"

print_step "Step 7: Installing Nginx"
apt-get install -y nginx
systemctl start nginx
systemctl enable nginx
echo -e "${GREEN}✓${NC} Nginx installed and started"

print_step "Step 8: Configuring Firewall"
# Install UFW if not already installed
apt-get install -y ufw

# Configure firewall rules
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 3000/tcp  # Application port (optional, if not using reverse proxy)

# Enable firewall (with confirmation bypass)
echo "y" | ufw enable || true

echo -e "${GREEN}✓${NC} Firewall configured"

print_step "Step 9: Setting up PM2 Startup Script"
# This ensures PM2 starts on system reboot
pm2 startup systemd -u root --hp /root
echo -e "${GREEN}✓${NC} PM2 startup script configured"

print_step "Step 10: Creating Application Directory"
APP_DIR="/var/www/trecurity"
mkdir -p $APP_DIR
chown -R $USER:$USER $APP_DIR
echo -e "${GREEN}✓${NC} Application directory created at $APP_DIR"

print_step "Step 11: Installing SSL Certificate (Optional)"
echo "To install SSL certificate with Let's Encrypt, run:"
echo "  apt-get install -y certbot python3-certbot-nginx"
echo "  certbot --nginx -d trecurity.com -d www.trecurity.com"
echo ""
echo -e "${YELLOW}Note:${NC} Make sure your domain is pointing to this server before running certbot"

echo ""
echo "========================================="
echo "Server Setup Complete!"
echo "========================================="
echo ""
echo -e "${GREEN}✓${NC} Your Contabo server is ready for Trecurity deployment"
echo ""
echo "Next Steps:"
echo "  1. Upload your application files to: $APP_DIR"
echo "  2. Navigate to the application directory: cd $APP_DIR"
echo "  3. Run the deployment script: bash deploy.sh"
echo ""
echo "Installed Software Versions:"
echo "  Node.js:    $NODE_VERSION"
echo "  npm:        $NPM_VERSION"
echo "  PM2:        $PM2_VERSION"
echo "  MySQL:      $(mysql --version | awk '{print $5}' | sed 's/,//')"
echo "  Nginx:      $(nginx -v 2>&1 | awk '{print $3}')"
echo ""
