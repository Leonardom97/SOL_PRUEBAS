#!/bin/bash

###############################################################################
# OSM-WEB Deployment Script for Nginx
# This script automates the deployment process for the osm-WEB application
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="osm-WEB"
APP_PATH="/var/www/osm-WEB"
NGINX_SITE_AVAILABLE="/etc/nginx/sites-available/osm-web"
NGINX_SITE_ENABLED="/etc/nginx/sites-enabled/osm-web"
PHP_VERSION="8.1"  # Adjust as needed

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║       OSM-WEB Deployment Script for Nginx                   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print section headers
print_section() {
    echo -e "\n${YELLOW}▶ $1${NC}"
}

# Function to print success messages
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error messages
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root (use sudo)"
    exit 1
fi

print_section "Step 1: Installing required packages"
apt-get update
apt-get install -y nginx php${PHP_VERSION}-fpm php${PHP_VERSION}-pgsql php${PHP_VERSION}-sqlsrv \
    php${PHP_VERSION}-mbstring php${PHP_VERSION}-xml php${PHP_VERSION}-curl \
    php${PHP_VERSION}-gd php${PHP_VERSION}-zip postgresql-client
print_success "Packages installed"

print_section "Step 2: Creating application directory"
if [ ! -d "$APP_PATH" ]; then
    mkdir -p "$APP_PATH"
    print_success "Directory created: $APP_PATH"
else
    print_success "Directory already exists: $APP_PATH"
fi

print_section "Step 3: Setting up file permissions"
chown -R www-data:www-data "$APP_PATH"
chmod -R 755 "$APP_PATH"

# Create logs directory if it doesn't exist
if [ ! -d "$APP_PATH/logs" ]; then
    mkdir -p "$APP_PATH/logs"
    chown www-data:www-data "$APP_PATH/logs"
    chmod 755 "$APP_PATH/logs"
    print_success "Logs directory created"
fi

# Create upload directories if they don't exist
if [ ! -d "$APP_PATH/assets/img/uploads" ]; then
    mkdir -p "$APP_PATH/assets/img/uploads"
    chown www-data:www-data "$APP_PATH/assets/img/uploads"
    chmod 755 "$APP_PATH/assets/img/uploads"
    print_success "Upload directory created: assets/img/uploads"
fi

if [ ! -d "$APP_PATH/m_capacitaciones/assets/docs" ]; then
    mkdir -p "$APP_PATH/m_capacitaciones/assets/docs"
    chown www-data:www-data "$APP_PATH/m_capacitaciones/assets/docs"
    chmod 755 "$APP_PATH/m_capacitaciones/assets/docs"
    print_success "Upload directory created: m_capacitaciones/assets/docs"
fi

# Set restrictive permissions on .env file if it exists
if [ -f "$APP_PATH/.env" ]; then
    chmod 600 "$APP_PATH/.env"
    chown www-data:www-data "$APP_PATH/.env"
    print_success "Secured .env file"
else
    print_error ".env file not found! Please create it from .env.example"
    echo "  Run: cp $APP_PATH/.env.example $APP_PATH/.env"
    echo "  Then edit $APP_PATH/.env with your configuration"
fi

print_success "File permissions set"

print_section "Step 4: Configuring PHP-FPM"
PHP_INI="/etc/php/${PHP_VERSION}/fpm/php.ini"

if [ -f "$PHP_INI" ]; then
    # Backup original php.ini
    if [ ! -f "${PHP_INI}.backup" ]; then
        cp "$PHP_INI" "${PHP_INI}.backup"
        print_success "Backed up original php.ini"
    fi
    
    # Update PHP settings
    sed -i 's/^upload_max_filesize.*/upload_max_filesize = 10M/' "$PHP_INI"
    sed -i 's/^post_max_size.*/post_max_size = 10M/' "$PHP_INI"
    sed -i 's/^memory_limit.*/memory_limit = 256M/' "$PHP_INI"
    sed -i 's/^max_execution_time.*/max_execution_time = 300/' "$PHP_INI"
    sed -i 's/^expose_php.*/expose_php = Off/' "$PHP_INI"
    sed -i 's/^display_errors.*/display_errors = Off/' "$PHP_INI"
    sed -i 's/^log_errors.*/log_errors = On/' "$PHP_INI"
    
    print_success "PHP configuration updated"
else
    print_error "PHP configuration file not found: $PHP_INI"
fi

print_section "Step 5: Configuring Nginx"

# Copy nginx configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
NGINX_CONF_SOURCE="${SCRIPT_DIR}/osm-web.conf"

if [ -f "$NGINX_CONF_SOURCE" ]; then
    cp "$NGINX_CONF_SOURCE" "$NGINX_SITE_AVAILABLE"
    print_success "Nginx configuration copied"
    
    echo -e "${YELLOW}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "IMPORTANT: Edit the nginx configuration file to set:"
    echo "  - Your domain name"
    echo "  - SSL certificate paths"
    echo "  - Application path if different from /var/www/osm-WEB"
    echo ""
    echo "Run: sudo nano $NGINX_SITE_AVAILABLE"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${NC}"
    
    read -p "Press Enter after you've edited the configuration..."
else
    print_error "Nginx configuration source not found: $NGINX_CONF_SOURCE"
    echo "Please manually copy the configuration from deployment/nginx/osm-web.conf"
    exit 1
fi

# Enable site
if [ ! -L "$NGINX_SITE_ENABLED" ]; then
    ln -s "$NGINX_SITE_AVAILABLE" "$NGINX_SITE_ENABLED"
    print_success "Nginx site enabled"
else
    print_success "Nginx site already enabled"
fi

# Remove default nginx site if it exists
if [ -L "/etc/nginx/sites-enabled/default" ]; then
    rm "/etc/nginx/sites-enabled/default"
    print_success "Removed default nginx site"
fi

print_section "Step 6: Testing Nginx configuration"
if nginx -t; then
    print_success "Nginx configuration test passed"
else
    print_error "Nginx configuration test failed"
    echo "Please check the configuration file: $NGINX_SITE_AVAILABLE"
    exit 1
fi

print_section "Step 7: Restarting services"
systemctl restart php${PHP_VERSION}-fpm
print_success "PHP-FPM restarted"

systemctl restart nginx
print_success "Nginx restarted"

print_section "Step 8: Enabling services to start on boot"
systemctl enable php${PHP_VERSION}-fpm
systemctl enable nginx
print_success "Services enabled"

print_section "Step 9: Setting up SSL with Let's Encrypt (optional)"
echo -e "${YELLOW}"
echo "To set up SSL with Let's Encrypt, run:"
echo "  sudo apt install certbot python3-certbot-nginx"
echo "  sudo certbot --nginx -d your-domain.com -d www.your-domain.com"
echo ""
echo "This will automatically configure SSL and update your nginx configuration."
echo -e "${NC}"

print_section "Step 10: Final checks"
echo ""
echo -e "${GREEN}✓ Deployment script completed!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Ensure your .env file is properly configured"
echo "2. Test database connections"
echo "3. Set up SSL certificate if not using Let's Encrypt"
echo "4. Review security settings in $NGINX_SITE_AVAILABLE"
echo "5. Test your application by accessing https://your-domain.com"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  Check nginx status:   sudo systemctl status nginx"
echo "  Check PHP-FPM status: sudo systemctl status php${PHP_VERSION}-fpm"
echo "  View nginx logs:      sudo tail -f /var/log/nginx/osm-web-error.log"
echo "  View PHP logs:        sudo tail -f $APP_PATH/logs/php_errors.log"
echo "  Test nginx config:    sudo nginx -t"
echo "  Reload nginx:         sudo systemctl reload nginx"
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Deployment completed successfully!              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
