#!/bin/bash
# Deployment script for Inspection System
# Auto-deploy via GitHub Actions
set -e  # Exit on error

echo "[1/7] Starting deployment..."

# Navigate to project directory
echo "[2/7] Navigating to project directory..."
cd /root/Inspection-System || exit 1

# Activate virtual environment
echo "[3/7] Activating virtual environment..."
source venv/bin/activate || exit 1

# Pull latest changes
echo "[4/7] Pulling latest code..."
git pull origin master -q || exit 1

# Run migrations
echo "[5/7] Running migrations..."
python3 manage.py makemigrations --merge --noinput 2>&1 | grep -v "No changes detected" || true
python3 manage.py migrate --noinput || exit 1

# Collect static files
echo "[5.5/7] Collecting static files..."
python3 manage.py collectstatic --noinput || exit 1

# Restart services with timeout
echo "[6/7] Restarting services..."
timeout 30 sudo systemctl restart gunicorn || echo "Gunicorn restart timeout"
timeout 30 sudo systemctl restart nginx || echo "Nginx restart timeout"

# Start background services
echo "[7/7] Starting background services..."
chmod +x start_all_services.sh
nohup ./start_all_services.sh >/dev/null 2>&1 &

echo "Deployment complete!"
exit 0
