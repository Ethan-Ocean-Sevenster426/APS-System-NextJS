#!/bin/bash
# Auto-start all background services with auto-restart on crash

cd /root/Inspection-System

# Activate virtual environment
source venv/bin/activate

# Kill any existing instances to avoid duplicates
pkill -f "start_data_sync" 2>/dev/null || true
pkill -f "process_compliance_documents" 2>/dev/null || true
pkill -f "run_onedrive_scheduler" 2>/dev/null || true

sleep 2

# Function to run a service with auto-restart
run_with_restart() {
    local cmd="$1"
    local name="$2"
    while true; do
        echo "[$(date)] Starting $name..."
        python manage.py $cmd
        echo "[$(date)] $name stopped. Restarting in 10 seconds..."
        sleep 10
    done
}

# Start services with auto-restart (each in background)
run_with_restart "start_data_sync" "Data Sync Service" >> /var/log/fsa_data_sync.log 2>&1 &
run_with_restart "process_compliance_documents" "Compliance Documents Service" >> /var/log/fsa_compliance_sync.log 2>&1 &
run_with_restart "run_onedrive_scheduler" "OneDrive Scheduler Service" >> /var/log/fsa_onedrive_sync.log 2>&1 &

echo "[$(date)] All background services started with auto-restart enabled"
echo "Logs available at:"
echo "  - /var/log/fsa_data_sync.log"
echo "  - /var/log/fsa_compliance_sync.log"
echo "  - /var/log/fsa_onedrive_sync.log"
