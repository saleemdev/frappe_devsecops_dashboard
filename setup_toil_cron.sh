#!/bin/bash
#
# TOIL System - Automated Cron Setup Script
#
# This script automatically configures cron jobs for the TOIL system.
# It adds two scheduled tasks:
#   1. Daily TOIL expiry (runs at 2 AM)
#   2. Weekly expiry reminders (runs Monday at 9 AM)
#
# Usage: ./setup_toil_cron.sh [site-name]
# Example: ./setup_toil_cron.sh desk.kns.co.ke
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BENCH_PATH="/Users/salim/frappe/my-bench"
BENCH_CMD="/Users/salim/.local/share/uv/tools/frappe-bench/bin/bench"
LOG_DIR="/var/log/toil"

# Check if site name provided
if [ -z "$1" ]; then
    echo -e "${RED}ERROR: Site name required${NC}"
    echo "Usage: $0 <site-name>"
    echo "Example: $0 desk.kns.co.ke"
    exit 1
fi

SITE_NAME="$1"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}TOIL System - Cron Job Setup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Site: $SITE_NAME"
echo "Bench Path: $BENCH_PATH"
echo "Bench Command: $BENCH_CMD"
echo ""

# Verify bench exists
if [ ! -f "$BENCH_CMD" ]; then
    echo -e "${RED}ERROR: Bench command not found at $BENCH_CMD${NC}"
    exit 1
fi

# Verify bench directory exists
if [ ! -d "$BENCH_PATH" ]; then
    echo -e "${RED}ERROR: Bench directory not found at $BENCH_PATH${NC}"
    exit 1
fi

# Create log directory if it doesn't exist
echo -e "${YELLOW}Creating log directory...${NC}"
if [ ! -d "$LOG_DIR" ]; then
    sudo mkdir -p "$LOG_DIR"
    sudo chown $(whoami):$(whoami) "$LOG_DIR"
    echo -e "${GREEN}✓ Log directory created: $LOG_DIR${NC}"
else
    echo -e "${GREEN}✓ Log directory exists: $LOG_DIR${NC}"
fi

# Backup existing crontab
echo ""
echo -e "${YELLOW}Backing up existing crontab...${NC}"
crontab -l > /tmp/crontab_backup_$(date +%Y%m%d_%H%M%S).txt 2>/dev/null || true
echo -e "${GREEN}✓ Crontab backed up to /tmp/${NC}"

# Check if TOIL cron jobs already exist
echo ""
echo -e "${YELLOW}Checking for existing TOIL cron jobs...${NC}"
EXISTING_TOIL_JOBS=$(crontab -l 2>/dev/null | grep -c "toil_expiry\|toil_reminders" || true)

if [ "$EXISTING_TOIL_JOBS" -gt 0 ]; then
    echo -e "${YELLOW}WARNING: Found $EXISTING_TOIL_JOBS existing TOIL cron job(s)${NC}"
    echo -e "${YELLOW}Would you like to remove them and add new ones? (y/n)${NC}"
    read -r RESPONSE
    if [ "$RESPONSE" != "y" ]; then
        echo -e "${RED}Aborted by user${NC}"
        exit 1
    fi

    # Remove existing TOIL jobs
    crontab -l 2>/dev/null | grep -v "toil_expiry\|toil_reminders" | crontab -
    echo -e "${GREEN}✓ Removed existing TOIL cron jobs${NC}"
fi

# Create new crontab with TOIL jobs
echo ""
echo -e "${YELLOW}Adding TOIL cron jobs...${NC}"

# Get current crontab
CURRENT_CRON=$(crontab -l 2>/dev/null || echo "")

# Add TOIL cron jobs
NEW_CRON="$CURRENT_CRON

# ============================================================================
# TOIL System - Automated Tasks
# Added: $(date '+%Y-%m-%d %H:%M:%S')
# ============================================================================

# TOIL Expiry Task - Runs daily at 2:00 AM
# Marks TOIL allocations as expired after 6 months
0 2 * * * cd $BENCH_PATH && $BENCH_CMD --site $SITE_NAME execute frappe_devsecops_dashboard.tasks.toil_expiry.expire_toil_allocations >> $LOG_DIR/expiry.log 2>&1

# TOIL Expiry Reminders - Runs weekly on Monday at 9:00 AM
# Sends email reminders for TOIL expiring within 30 days
0 9 * * 1 cd $BENCH_PATH && $BENCH_CMD --site $SITE_NAME execute frappe_devsecops_dashboard.tasks.toil_expiry.send_expiry_reminders >> $LOG_DIR/reminders.log 2>&1
"

# Install new crontab
echo "$NEW_CRON" | crontab -

echo -e "${GREEN}✓ TOIL cron jobs added successfully${NC}"

# Verify installation
echo ""
echo -e "${YELLOW}Verifying installation...${NC}"
INSTALLED_JOBS=$(crontab -l | grep -c "toil_expiry\|toil_reminders" || true)

if [ "$INSTALLED_JOBS" -eq 2 ]; then
    echo -e "${GREEN}✓ Verification passed: 2 TOIL cron jobs installed${NC}"
else
    echo -e "${RED}✗ Verification failed: Expected 2 jobs, found $INSTALLED_JOBS${NC}"
    exit 1
fi

# Display installed cron jobs
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Installed TOIL Cron Jobs:${NC}"
echo -e "${GREEN}========================================${NC}"
crontab -l | grep -A 1 "TOIL System"

# Test cron jobs (dry run)
echo ""
echo -e "${YELLOW}Testing cron jobs (this may take a moment)...${NC}"

echo -e "${YELLOW}1. Testing expiry task...${NC}"
cd $BENCH_PATH && $BENCH_CMD --site $SITE_NAME execute frappe_devsecops_dashboard.tasks.toil_expiry.expire_toil_allocations 2>&1 | head -5
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Expiry task executed successfully${NC}"
else
    echo -e "${RED}✗ Expiry task failed${NC}"
fi

echo ""
echo -e "${YELLOW}2. Testing reminder task...${NC}"
cd $BENCH_PATH && $BENCH_CMD --site $SITE_NAME execute frappe_devsecops_dashboard.tasks.toil_expiry.send_expiry_reminders 2>&1 | head -5
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Reminder task executed successfully${NC}"
else
    echo -e "${RED}✗ Reminder task failed${NC}"
fi

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Cron jobs configured:"
echo "  • Daily expiry: 2:00 AM"
echo "  • Weekly reminders: Monday 9:00 AM"
echo ""
echo "Logs will be written to:"
echo "  • $LOG_DIR/expiry.log"
echo "  • $LOG_DIR/reminders.log"
echo ""
echo "To view cron jobs: crontab -l"
echo "To edit cron jobs: crontab -e"
echo "To view logs: tail -f $LOG_DIR/expiry.log"
echo ""
echo -e "${GREEN}TOIL system cron setup complete!${NC}"
