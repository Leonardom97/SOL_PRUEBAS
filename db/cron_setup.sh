#!/bin/bash

# ============================================================================
# Cron Job Setup for Training Notification Updates
# ============================================================================
# This script sets up a daily cron job to update training notifications
# 
# Requirements:
# - PostgreSQL client (psql) installed
# - Database credentials configured
# - Proper permissions to edit crontab
# ============================================================================

# Configuration variables - EDIT THESE
DB_NAME="your_database_name"
DB_USER="your_database_user"
DB_HOST="localhost"
DB_PORT="5432"
LOG_FILE="/var/log/cap_notif_recalc.log"

# Create log directory if it doesn't exist
LOG_DIR=$(dirname "$LOG_FILE")
if [ ! -d "$LOG_DIR" ]; then
    echo "Creating log directory: $LOG_DIR"
    sudo mkdir -p "$LOG_DIR"
    sudo chown $(whoami):$(whoami) "$LOG_DIR"
fi

# Create log file if it doesn't exist
if [ ! -f "$LOG_FILE" ]; then
    touch "$LOG_FILE"
fi

# Cron job command
CRON_CMD="5 0 * * * PGPASSWORD=\$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT actualizar_notificaciones_capacitacion();\" >> $LOG_FILE 2>&1"

echo "============================================================================"
echo "Setting up cron job for training notification updates"
echo "============================================================================"
echo ""
echo "The following cron job will be added:"
echo "$CRON_CMD"
echo ""
echo "This will run daily at 00:05 AM"
echo ""
echo "IMPORTANT: Before proceeding:"
echo "1. Edit this script and set the correct DB_NAME, DB_USER, DB_HOST"
echo "2. Ensure PGPASSWORD environment variable is set or use .pgpass file"
echo "3. Test the psql command manually first"
echo ""
echo "To manually add the cron job, run:"
echo "  crontab -e"
echo ""
echo "Then add this line:"
echo "  5 0 * * * PGPASSWORD=\$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT actualizar_notificaciones_capacitacion();\" >> $LOG_FILE 2>&1"
echo ""
echo "============================================================================"
echo ""

# Optional: Uncomment to automatically add to crontab
# (crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -

echo "To view current crontab entries:"
echo "  crontab -l"
echo ""
echo "To view the log file:"
echo "  tail -f $LOG_FILE"
echo ""
echo "============================================================================"
